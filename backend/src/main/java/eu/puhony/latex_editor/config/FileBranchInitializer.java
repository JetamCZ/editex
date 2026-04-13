package eu.puhony.latex_editor.config;

import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.FileBranchRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Creates "main" branches for existing files that don't have one yet.
 * Runs at startup after Flyway migrations.
 */
@Component
@RequiredArgsConstructor
public class FileBranchInitializer {

    private final ProjectFileRepository fileRepository;
    private final FileBranchRepository branchRepository;
    private final DocumentChangeRepository changeRepository;

    @PostConstruct
    @Transactional
    public void initializeMainBranches() {
        List<ProjectFile> allFiles = fileRepository.findAllNonDeleted();

        for (ProjectFile file : allFiles) {
            if (file.getActiveBranch() != null) {
                continue; // Already has a branch
            }

            // Check if a "main" branch already exists for this file
            var existingBranch = branchRepository.findByFileIdAndNameNonDeleted(file.getId(), "main");
            FileBranch mainBranch;

            if (existingBranch.isPresent()) {
                mainBranch = existingBranch.get();
            } else {
                // Create "main" branch
                mainBranch = new FileBranch();
                mainBranch.setFile(file);
                mainBranch.setName("main");
                mainBranch.setCreatedBy(file.getUploadedBy());
                mainBranch = branchRepository.save(mainBranch);
            }

            // Set as active branch
            file.setActiveBranch(mainBranch);
            fileRepository.save(file);

            // Update existing document_changes with null branch_id
            var changes = changeRepository.findByFileIdOrderByCreatedAt(file.getId());
            for (var change : changes) {
                if (change.getBranch() == null) {
                    change.setBranch(mainBranch);
                    changeRepository.save(change);
                }
            }
        }

        System.out.println("FileBranchInitializer: Initialized main branches for " + allFiles.size() + " files");
    }
}
