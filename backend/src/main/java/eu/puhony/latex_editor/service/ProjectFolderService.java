package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FolderPermissionRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectFolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectFolderService {

    private final ProjectFolderRepository folderRepository;
    private final ProjectFileRepository fileRepository;
    private final FolderPermissionRepository permissionRepository;
    private final FolderPermissionService folderPermissionService;

    // ---------------- Lookups ----------------

    public ProjectFolder getById(Long id) {
        return folderRepository.findByIdNonDeleted(id)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found: " + id));
    }

    public ProjectFolder getRoot(Long projectId) {
        return folderRepository.findRoot(projectId)
                .orElseThrow(() -> new IllegalStateException("Project root folder missing: " + projectId));
    }

    public ProjectFolder getRootOrCreate(Project project) {
        return folderRepository.findRoot(project.getId()).orElseGet(() -> {
            ProjectFolder root = new ProjectFolder();
            root.setProject(project);
            root.setParent(null);
            root.setName("");
            root.setPath("/");
            return folderRepository.save(root);
        });
    }

    public ProjectFolder getByPath(Long projectId, String path) {
        return folderRepository.findByProjectIdAndPath(projectId, normalize(path))
                .orElseThrow(() -> new IllegalArgumentException("Folder not found: " + path));
    }

    public ProjectFolder getOrCreateByPath(Project project, String path) {
        String normalized = normalize(path);
        return folderRepository.findByProjectIdAndPath(project.getId(), normalized)
                .orElseGet(() -> createChain(project, normalized));
    }

    public List<ProjectFolder> listAll(Long projectId) {
        return folderRepository.findAllByProjectId(projectId);
    }

    public List<ProjectFolder> children(ProjectFolder folder) {
        return folderRepository.findChildren(folder.getId());
    }

    // ---------------- Project bootstrap ----------------

    @Transactional
    public ProjectFolder initializeForNewProject(Project project, User owner) {
        return getRootOrCreate(project);
    }

    // ---------------- CRUD ----------------

    /**
     * Creates a subfolder. EDITOR+ on the parent folder may create. New subfolders inherit
     * parent permissions (i.e. no explicit grants are added — inheritance handles it).
     * An EDITOR who creates a subfolder therefore does NOT become MANAGER on it.
     */
    @Transactional
    public ProjectFolder createSubfolder(ProjectFolder parent, String name, Long actorUserId) {
        folderPermissionService.ensureCanEdit(actorUserId, parent);
        String cleanName = sanitizeSegment(name);
        String newPath = parent.isRoot() ? "/" + cleanName : parent.getPath() + "/" + cleanName;
        folderRepository.findByProjectIdAndPath(parent.getProject().getId(), newPath).ifPresent(f -> {
            throw new IllegalStateException("Folder already exists: " + newPath);
        });

        ProjectFolder folder = new ProjectFolder();
        folder.setProject(parent.getProject());
        folder.setParent(parent);
        folder.setName(cleanName);
        folder.setPath(newPath);
        return folderRepository.save(folder);
    }

    /**
     * Renaming a folder is a permission-affecting change, so MANAGER is required.
     * Updates the `path` on this folder and every descendant (stored denormalized).
     */
    @Transactional
    public ProjectFolder rename(ProjectFolder folder, String newName, Long actorUserId) {
        folderPermissionService.ensureCanManage(actorUserId, folder);
        if (folder.isRoot()) throw new IllegalStateException("Cannot rename the root folder");

        String cleanName = sanitizeSegment(newName);
        String oldPath = folder.getPath();
        String parentPath = folder.getParent().isRoot() ? "" : folder.getParent().getPath();
        String newPath = parentPath + "/" + cleanName;

        folder.setName(cleanName);
        folder.setPath(newPath);
        folderRepository.save(folder);

        Long projectId = folder.getProject().getId();

        // Update descendants
        for (ProjectFolder f : folderRepository.findAllByProjectId(projectId)) {
            if (f.getId().equals(folder.getId())) continue;
            if (f.getPath().equals(oldPath) || f.getPath().startsWith(oldPath + "/")) {
                f.setPath(newPath + f.getPath().substring(oldPath.length()));
                folderRepository.save(f);
            }
        }
        // Also update denormalized projectFolder string on files in this subtree
        for (ProjectFile file : fileRepository.findAllNonDeleted()) {
            if (!projectId.equals(file.getProject().getId())) continue;
            String cur = file.getProjectFolder();
            if (cur == null) continue;
            if (cur.equals(oldPath) || cur.startsWith(oldPath + "/")) {
                file.setProjectFolder(newPath + cur.substring(oldPath.length()));
                fileRepository.save(file);
            }
        }
        return folder;
    }

    /**
     * Soft-deletes the folder and all descendants + all files in the subtree.
     * EDITOR+ may delete. Root folder cannot be deleted.
     */
    @Transactional
    public void softDelete(ProjectFolder folder, Long actorUserId) {
        folderPermissionService.ensureCanEdit(actorUserId, folder);
        if (folder.isRoot()) throw new IllegalStateException("Cannot delete the root folder");

        LocalDateTime now = LocalDateTime.now();
        List<ProjectFolder> subtree = collectSubtree(folder);
        for (ProjectFolder f : subtree) {
            f.setDeletedAt(now);
            folderRepository.save(f);
            // Cascade soft-delete permissions on this folder
            for (FolderPermission p : permissionRepository.findByFolderId(f.getId())) {
                p.setDeletedAt(now);
                permissionRepository.save(p);
            }
        }
        // Soft-delete files in the subtree
        for (ProjectFile file : fileRepository.findAllNonDeleted()) {
            if (file.getFolder() != null && subtree.stream().anyMatch(f -> f.getId().equals(file.getFolder().getId()))) {
                file.setDeletedAt(now);
                fileRepository.save(file);
            }
        }
    }

    private List<ProjectFolder> collectSubtree(ProjectFolder root) {
        List<ProjectFolder> out = new ArrayList<>();
        out.add(root);
        for (ProjectFolder child : folderRepository.findChildren(root.getId())) {
            out.addAll(collectSubtree(child));
        }
        return out;
    }

    // ---------------- Utilities ----------------

    private ProjectFolder createChain(Project project, String path) {
        ProjectFolder parent = getRootOrCreate(project);
        if ("/".equals(path)) return parent;

        String[] segments = path.substring(1).split("/");
        String cur = "";
        for (String seg : segments) {
            cur = cur + "/" + seg;
            final String curPath = cur;
            final ProjectFolder curParent = parent;
            final String segName = seg;
            parent = folderRepository.findByProjectIdAndPath(project.getId(), curPath).orElseGet(() -> {
                ProjectFolder f = new ProjectFolder();
                f.setProject(project);
                f.setParent(curParent);
                f.setName(segName);
                f.setPath(curPath);
                return folderRepository.save(f);
            });
        }
        return parent;
    }

    public static String normalize(String path) {
        if (path == null || path.isEmpty()) return "/";
        String n = path.startsWith("/") ? path : "/" + path;
        while (n.length() > 1 && n.endsWith("/")) n = n.substring(0, n.length() - 1);
        if (n.contains("..")) throw new IllegalArgumentException("Invalid folder path: path traversal not allowed");
        return n;
    }

    private static String sanitizeSegment(String name) {
        if (name == null) throw new IllegalArgumentException("Folder name is required");
        String trimmed = name.trim();
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Folder name is required");
        if (trimmed.contains("/") || trimmed.contains("..")) {
            throw new IllegalArgumentException("Invalid folder name: " + name);
        }
        return trimmed;
    }
}
