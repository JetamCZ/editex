package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Commit;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.ProjectMember;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.CommitRepository;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final DocumentChangeRepository documentChangeRepository;
    private final CommitRepository commitRepository;
    private final ProjectMemberService projectMemberService;
    private final MinioService minioService;
    private final DocumentChangeService documentChangeService;

    public List<Project> getAllProjects() {
        return projectRepository.findAllNonDeleted();
    }

    public Optional<Project> getProjectById(Long id, Long userId) {
        Optional<Project> project = projectRepository.findByIdNonDeleted(id);
        if (project.isPresent()) {
            projectMemberService.ensureCanRead(project.get().getBaseProject(), userId);
        }
        return project;
    }

    public Optional<Project> getProjectByBaseProjectAndBranch(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch);
    }

    public List<Project> getProjectsByOwner(Long ownerId) {
        return projectRepository.findByOwnerNonDeleted(ownerId);
    }

    @Transactional
    public Project createProject(Project project, User owner) {
        project.setBranch("main");
        Project savedProject = projectRepository.save(project);

        projectMemberService.addMember(
                savedProject.getBaseProject(),
                owner.getId(),
                ProjectMember.Role.OWNER,
                null
        );

        // Create initial commit for the project
        Commit initCommit = new Commit();
        initCommit.setBaseProject(savedProject.getBaseProject());
        initCommit.setBranch("main");
        initCommit.setType(Commit.Type.COMMIT);
        initCommit.setMessage("Initial project setup");
        initCommit.setCreatedBy(owner);
        commitRepository.save(initCommit);

        return savedProject;
    }

    @Transactional
    public Optional<Project> updateProject(String baseProject, String branch, Project updatedProject, Long userId) {
        projectMemberService.ensureCanEdit(baseProject, userId);

        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
            .map(project -> {
                project.setName(updatedProject.getName());
                return projectRepository.save(project);
            });
    }

    @Transactional
    public boolean deleteProject(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanManage(baseProject, userId);

        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
            .map(project -> {
                project.setDeletedAt(LocalDateTime.now());
                projectRepository.save(project);
                return true;
            })
            .orElse(false);
    }

    public List<Project> getBranches(String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return projectRepository.findAllBranchesByBaseProject(baseProject);
    }

    @Transactional
    public Project createBranch(String baseProject, String sourceBranch, String newBranchName, User user) {
        projectMemberService.ensureCanEdit(baseProject, user.getId());

        // Check if branch already exists
        if (projectRepository.existsByBaseProjectAndBranch(baseProject, newBranchName)) {
            throw new IllegalArgumentException("Branch '" + newBranchName + "' already exists");
        }

        // Get source project
        Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                .orElseThrow(() -> new RuntimeException("Source branch not found"));

        // Create new project record for the branch
        Project newBranch = new Project();
        newBranch.setBaseProject(baseProject);
        newBranch.setBranch(newBranchName);
        newBranch.setSourceBranch(sourceBranch);
        newBranch.setName(sourceProject.getName());
        newBranch.setOwner(sourceProject.getOwner());
        Project savedBranch = projectRepository.save(newBranch);

        // Copy all files from source branch to new branch (with changes applied for .tex files)
        List<ProjectFile> sourceFiles = projectFileRepository.findByProjectIdNonDeleted(sourceProject.getId());
        for (ProjectFile sourceFile : sourceFiles) {
            try {
                String destFolder = baseProject + "/" + newBranchName + sourceFile.getProjectFolder();
                String newS3Url;
                long newFileSize = sourceFile.getFileSize();

                // For .tex files, apply document changes before copying
                if (sourceFile.getOriginalFileName().endsWith(".tex")) {
                    // Get original content from S3
                    String originalContent = minioService.getFileContent(sourceFile.getS3Url());

                    // Get all changes for this file
                    List<DocumentChange> changes = documentChangeRepository.findByFileIdOrderByCreatedAt(sourceFile.getId());

                    // Apply changes to get current content
                    String currentContent = documentChangeService.applyChangesToContent(originalContent, changes);

                    // Upload the modified content
                    newS3Url = minioService.uploadContent(currentContent, destFolder, sourceFile.getFileName(), sourceFile.getFileType());
                    newFileSize = currentContent.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
                } else {
                    // For non-.tex files, just copy them directly
                    String sourceObjectName = minioService.getObjectNameFromUrl(sourceFile.getS3Url());
                    newS3Url = minioService.copyFile(sourceObjectName, destFolder, sourceFile.getFileName());
                }

                // Create new ProjectFile record
                ProjectFile newFile = new ProjectFile();
                newFile.setProject(savedBranch);
                newFile.setProjectFolder(sourceFile.getProjectFolder());
                newFile.setFileName(sourceFile.getFileName());
                newFile.setOriginalFileName(sourceFile.getOriginalFileName());
                newFile.setFileSize(newFileSize);
                newFile.setFileType(sourceFile.getFileType());
                newFile.setS3Url(newS3Url);
                newFile.setUploadedBy(user);
                projectFileRepository.save(newFile);
            } catch (Exception e) {
                throw new RuntimeException("Failed to copy file: " + sourceFile.getOriginalFileName(), e);
            }
        }

        // Create SPLIT commit to record branch creation
        Commit splitCommit = new Commit();
        splitCommit.setBaseProject(baseProject);
        splitCommit.setBranch(newBranchName);
        splitCommit.setType(Commit.Type.SPLIT);
        splitCommit.setSourceBranch(sourceBranch);
        splitCommit.setMessage("Branch '" + newBranchName + "' created from '" + sourceBranch + "'");
        splitCommit.setCreatedBy(user);
        commitRepository.save(splitCommit);

        return savedBranch;
    }
}
