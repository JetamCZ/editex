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
            CompilationResult result = compilationService.compileLatex(
                request.getProjectId(),
                request.getTargetFile(),
                user.getId()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new RuntimeException("Compilation failed: " + e.getMessage(), e);
        }
    }

    @GetMapping("/pdfs/{projectId}")
    public ResponseEntity<List<ProjectVersionPdfInfo>> getProjectVersionPdfs(
            @PathVariable Long projectId,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ProjectVersionPdfInfo> pdfs = compilationService.getProjectVersionPdfs(projectId, user.getId());
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
                    request.getProjectId(),
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
            String commitHash = request.getCommitHash();
            String zipUrl;
            if (commitHash != null && !commitHash.isBlank()) {
                zipUrl = compilationService.downloadProjectAtCommitAsZip(
                    request.getProjectId(),
                    commitHash,
                    user.getId()
                );
            } else {
                zipUrl = compilationService.downloadProjectAsZip(
                    request.getProjectId(),
                    user.getId()
                );
            }
            return ResponseEntity.ok(Map.of("zipUrl", zipUrl));
        } catch (Exception e) {
            throw new RuntimeException("Download failed: " + e.getMessage(), e);
        }
    }
}
