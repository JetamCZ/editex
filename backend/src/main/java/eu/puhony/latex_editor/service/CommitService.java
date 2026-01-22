package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.BranchPendingChanges;
import eu.puhony.latex_editor.dto.CommitResponse;
import eu.puhony.latex_editor.dto.CreateCommitRequest;
import eu.puhony.latex_editor.entity.Commit;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.CommitRepository;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommitService {

    private final CommitRepository commitRepository;
    private final ProjectRepository projectRepository;
    private final DocumentChangeRepository documentChangeRepository;
    private final ProjectMemberService projectMemberService;

    /**
     * Get all commits for a base project.
     */
    public List<CommitResponse> getCommits(String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return commitRepository.findByBaseProjectOrderByCreatedAtDesc(baseProject)
                .stream()
                .map(CommitResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get commits for a specific branch.
     */
    public List<CommitResponse> getCommitsByBranch(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return commitRepository.findByBaseProjectAndBranchOrderByCreatedAtDesc(baseProject, branch)
                .stream()
                .map(CommitResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific commit by ID.
     */
    public Optional<CommitResponse> getCommitById(String commitId, Long userId) {
        return commitRepository.findById(commitId)
                .map(commit -> {
                    projectMemberService.ensureCanRead(commit.getBaseProject(), userId);
                    return CommitResponse.from(commit);
                });
    }

    /**
     * Create a user commit (label/snapshot).
     */
    @Transactional
    public CommitResponse createUserCommit(String baseProject, CreateCommitRequest request, User user) {
        projectMemberService.ensureCanEdit(baseProject, user.getId());

        // Get the project for this branch
        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, request.getBranch())
                .orElseThrow(() -> new RuntimeException("Branch not found: " + request.getBranch()));

        // Get the latest change for this project (for snapshot reference)
        String lastChangeId = documentChangeRepository.findLatestByProjectId(project.getId())
                .map(DocumentChange::getId)
                .orElse(null);

        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(request.getBranch());
        commit.setType(Commit.Type.COMMIT);
        commit.setMessage(request.getMessage());
        commit.setLastChangeId(lastChangeId);
        commit.setCreatedBy(user);

        Commit savedCommit = commitRepository.save(commit);
        return CommitResponse.from(savedCommit);
    }

    /**
     * Create a SPLIT commit when a branch is created.
     * Called automatically by ProjectService.createBranch.
     */
    @Transactional
    public Commit createSplitCommit(String baseProject, String newBranch, String sourceBranch, User user) {
        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(newBranch);
        commit.setType(Commit.Type.SPLIT);
        commit.setSourceBranch(sourceBranch);
        commit.setMessage("Branch '" + newBranch + "' created from '" + sourceBranch + "'");
        commit.setCreatedBy(user);

        return commitRepository.save(commit);
    }

    /**
     * Create a MERGE commit when branches are merged.
     * Called automatically by MergeService.executeMerge.
     */
    @Transactional
    public Commit createMergeCommit(String baseProject, String sourceBranch, String targetBranch, User user) {
        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(targetBranch); // The commit appears on the target branch
        commit.setType(Commit.Type.MERGE);
        commit.setSourceBranch(sourceBranch);
        commit.setTargetBranch(targetBranch);
        commit.setMessage("Merged '" + sourceBranch + "' into '" + targetBranch + "'");
        commit.setCreatedBy(user);

        return commitRepository.save(commit);
    }

    /**
     * Get pending changes info for all branches in a project.
     * Compares the last COMMIT's lastChangeId with the actual latest DocumentChange.
     */
    public List<BranchPendingChanges> getPendingChanges(String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);

        List<BranchPendingChanges> result = new ArrayList<>();

        // Get all branches for this project
        List<Project> branches = projectRepository.findAllBranchesByBaseProject(baseProject);

        for (Project branch : branches) {
            BranchPendingChanges pendingChanges = new BranchPendingChanges();
            pendingChanges.setBranch(branch.getBranch());

            // Get the latest COMMIT type commit for this branch (user-created version label)
            List<Commit> userCommits = commitRepository.findUserCommitsByBranch(baseProject, branch.getBranch());
            String lastCommitChangeId = null;
            if (!userCommits.isEmpty()) {
                lastCommitChangeId = userCommits.get(0).getLastChangeId();
            }
            pendingChanges.setLastCommitChangeId(lastCommitChangeId);

            // Get the actual latest change for this branch
            Optional<DocumentChange> latestChange = documentChangeRepository.findLatestByProjectId(branch.getId());

            if (latestChange.isPresent()) {
                DocumentChange latest = latestChange.get();
                pendingChanges.setCurrentChangeId(latest.getId());
                pendingChanges.setLastChangeAt(latest.getCreatedAt());

                // Determine if there are pending changes
                if (lastCommitChangeId == null) {
                    // No commits yet - all changes are pending
                    long totalChanges = documentChangeRepository.countByProjectId(branch.getId());
                    pendingChanges.setHasPendingChanges(totalChanges > 0);
                    pendingChanges.setPendingChangeCount((int) totalChanges);
                } else if (!lastCommitChangeId.equals(latest.getId())) {
                    // There are changes after the last commit
                    long pendingCount = documentChangeRepository.countByProjectIdAfterChange(
                            branch.getId(), lastCommitChangeId);
                    pendingChanges.setHasPendingChanges(pendingCount > 0);
                    pendingChanges.setPendingChangeCount((int) pendingCount);
                } else {
                    // Last commit is up to date
                    pendingChanges.setHasPendingChanges(false);
                    pendingChanges.setPendingChangeCount(0);
                }
            } else {
                // No changes at all in this branch
                pendingChanges.setHasPendingChanges(false);
                pendingChanges.setPendingChangeCount(0);
            }

            result.add(pendingChanges);
        }

        return result;
    }
}
