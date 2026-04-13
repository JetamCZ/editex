package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FolderPermissionRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectFolderRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * One-shot backfill for the folder-permissions rewrite. Safe to run on every startup.
 *
 * Steps:
 *  1. Promote every path-string folder on ProjectFile rows into real ProjectFolder entities.
 *  2. Read legacy project_members rows (via JDBC so this code survives entity deletion) and
 *     convert each one into a FolderPermission on the project's root folder:
 *       OWNER  -> MANAGER
 *       EDITOR -> EDITOR
 *       VIEWER -> VIEWER
 *
 * No-ops once data is migrated. Gracefully skips step 2 if the legacy tables no longer exist.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionsMigrationRunner {

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository fileRepository;
    private final ProjectFolderRepository folderRepository;
    private final FolderPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrate() {
        log.info("Running folder-permissions backfill…");
        backfillFolders();
        backfillPermissionsFromLegacyMembers();
        log.info("Folder-permissions backfill complete.");
    }

    // ---------------- Step 1: folders ----------------

    private void backfillFolders() {
        Set<String> baseProjects = new HashSet<>();
        projectRepository.findAll().forEach(p -> {
            if (p.getDeletedAt() == null) baseProjects.add(p.getBaseProject());
        });

        for (String baseProject : baseProjects) {
            ensureFolderTreeForBaseProject(baseProject);
        }

        List<ProjectFile> files = fileRepository.findAllNonDeleted();
        int backfilled = 0;
        for (ProjectFile file : files) {
            if (file.getFolder() != null) continue;
            String baseProject = file.getProject().getBaseProject();
            String path = normalize(file.getProjectFolder());
            ProjectFolder folder = folderRepository
                    .findByBaseProjectAndPath(baseProject, path)
                    .orElseGet(() -> createFolderChain(baseProject, path));
            file.setFolder(folder);
            fileRepository.save(file);
            backfilled++;
        }
        if (backfilled > 0) log.info("Backfilled folder FK on {} files", backfilled);
    }

    private void ensureFolderTreeForBaseProject(String baseProject) {
        folderRepository.findRoot(baseProject).orElseGet(() -> {
            ProjectFolder root = new ProjectFolder();
            root.setBaseProject(baseProject);
            root.setParent(null);
            root.setName("");
            root.setPath("/");
            return folderRepository.save(root);
        });

        Set<String> paths = new HashSet<>();
        paths.add("/");
        for (ProjectFile f : fileRepository.findAllNonDeleted()) {
            if (baseProject.equals(f.getProject().getBaseProject())) {
                paths.add(normalize(f.getProjectFolder()));
            }
        }

        Set<String> expanded = new HashSet<>();
        for (String p : paths) {
            String cur = p;
            while (cur != null) {
                expanded.add(cur);
                cur = parentPath(cur);
            }
        }

        List<String> ordered = new ArrayList<>(expanded);
        ordered.sort((a, b) -> Integer.compare(a.length(), b.length()));
        for (String path : ordered) {
            if (folderRepository.findByBaseProjectAndPath(baseProject, path).isEmpty()) {
                createFolderChain(baseProject, path);
            }
        }
    }

    private ProjectFolder createFolderChain(String baseProject, String path) {
        ProjectFolder parent = folderRepository.findByBaseProjectAndPath(baseProject, "/").orElseGet(() -> {
            ProjectFolder root = new ProjectFolder();
            root.setBaseProject(baseProject);
            root.setName("");
            root.setPath("/");
            return folderRepository.save(root);
        });
        if ("/".equals(path)) return parent;

        String[] segments = path.substring(1).split("/");
        String cur = "";
        for (String seg : segments) {
            cur = cur + "/" + seg;
            final String curPath = cur;
            final ProjectFolder curParent = parent;
            final String segName = seg;
            parent = folderRepository.findByBaseProjectAndPath(baseProject, curPath).orElseGet(() -> {
                ProjectFolder f = new ProjectFolder();
                f.setBaseProject(baseProject);
                f.setParent(curParent);
                f.setName(segName);
                f.setPath(curPath);
                return folderRepository.save(f);
            });
        }
        return parent;
    }

    // ---------------- Step 2: legacy ProjectMember -> FolderPermission ----------------

    private void backfillPermissionsFromLegacyMembers() {
        List<LegacyMember> legacy;
        try {
            legacy = jdbc.query(
                    "SELECT base_project, user_id, role FROM project_members WHERE deleted_at IS NULL",
                    (rs, i) -> new LegacyMember(
                            rs.getString("base_project"),
                            rs.getLong("user_id"),
                            rs.getString("role")
                    )
            );
        } catch (DataAccessException e) {
            log.debug("Legacy project_members table not present, skipping: {}", e.getMessage());
            return;
        }

        int converted = 0;
        for (LegacyMember m : legacy) {
            ProjectFolder root = folderRepository.findRoot(m.baseProject).orElse(null);
            if (root == null) continue;
            if (permissionRepository.findByFolderAndUser(root.getId(), m.userId).isPresent()) continue;

            User user = userRepository.findById(m.userId).orElse(null);
            if (user == null) continue;

            FolderPermission grant = new FolderPermission();
            grant.setFolder(root);
            grant.setUser(user);
            grant.setRole(mapLegacyRole(m.role));
            permissionRepository.save(grant);
            converted++;
        }
        if (converted > 0) log.info("Converted {} legacy project_members rows to FolderPermission grants", converted);
    }

    private FolderRole mapLegacyRole(String legacy) {
        if (legacy == null) return FolderRole.VIEWER;
        return switch (legacy.toUpperCase()) {
            case "OWNER" -> FolderRole.MANAGER;
            case "EDITOR" -> FolderRole.EDITOR;
            default -> FolderRole.VIEWER;
        };
    }

    private record LegacyMember(String baseProject, Long userId, String role) {}

    // ---------------- Utilities ----------------

    private static String normalize(String path) {
        if (path == null || path.isEmpty()) return "/";
        String n = path.startsWith("/") ? path : "/" + path;
        while (n.length() > 1 && n.endsWith("/")) n = n.substring(0, n.length() - 1);
        return n;
    }

    private static String parentPath(String path) {
        if (path == null || "/".equals(path)) return null;
        int i = path.lastIndexOf('/');
        if (i <= 0) return "/";
        return path.substring(0, i);
    }
}
