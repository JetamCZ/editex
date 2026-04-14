package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.AiDebugRequest;
import eu.puhony.latex_editor.dto.AiDebugResult;
import eu.puhony.latex_editor.dto.CompilationRequest;
import eu.puhony.latex_editor.dto.CompilationResult;
import eu.puhony.latex_editor.dto.CompileCommitRequest;
import eu.puhony.latex_editor.dto.DownloadRequest;
import eu.puhony.latex_editor.dto.ProjectVersionPdfInfo;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.AiDebugService;
import eu.puhony.latex_editor.service.LatexCompilationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/latex")
@RequiredArgsConstructor
public class LatexCompilationController {

    private final LatexCompilationService compilationService;
    private final AiDebugService aiDebugService;
    private final UserRepository userRepository;

    @PostMapping("/compile")
    public ResponseEntity<CompilationResult> compileLatex(
            @Valid @RequestBody CompilationRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            String branch = request.getBranch() != null ? request.getBranch() : "main";
            String targetFile = request.getTargetFile();
            CompilationResult result = compilationService.compileLatex(
                request.getBaseProject(),
                branch,
                targetFile,
                user.getId()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new RuntimeException("Compilation failed: " + e.getMessage(), e);
        }
    }

    @GetMapping("/pdfs/{baseProject}/{branch}")
    public ResponseEntity<List<ProjectVersionPdfInfo>> getProjectVersionPdfs(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ProjectVersionPdfInfo> pdfs = compilationService.getProjectVersionPdfs(baseProject, branch, user.getId());
        return ResponseEntity.ok(pdfs);
    }

    @PostMapping("/compile-commit")
    public ResponseEntity<CompilationResult> compileCommit(
            @Valid @RequestBody CompileCommitRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            CompilationResult result = compilationService.compileLatexAtCommit(
                    request.getBaseProject(),
                    request.getBranch(),
                    request.getCommitHash(),
                    user.getId()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new RuntimeException("Compilation failed: " + e.getMessage(), e);
        }
    }

    @PostMapping("/ai-debug")
    public ResponseEntity<AiDebugResult> aiDebug(
            @Valid @RequestBody AiDebugRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AiDebugResult result = aiDebugService.debug(request, user.getId());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/download")
    public ResponseEntity<Map<String, String>> downloadProject(
            @Valid @RequestBody DownloadRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            String branch = request.getBranch() != null ? request.getBranch() : "main";
            String commitHash = request.getCommitHash();
            String zipUrl;
            if (commitHash != null && !commitHash.isBlank()) {
                zipUrl = compilationService.downloadProjectAtCommitAsZip(
                    request.getBaseProject(),
                    branch,
                    commitHash,
                    user.getId()
                );
            } else {
                zipUrl = compilationService.downloadProjectAsZip(
                    request.getBaseProject(),
                    branch,
                    user.getId()
                );
            }
            return ResponseEntity.ok(Map.of("zipUrl", zipUrl));
        } catch (Exception e) {
            throw new RuntimeException("Download failed: " + e.getMessage(), e);
        }
    }
}
