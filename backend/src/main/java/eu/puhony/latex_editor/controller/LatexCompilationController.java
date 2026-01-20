package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.CompilationRequest;
import eu.puhony.latex_editor.dto.CompilationResult;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.LatexCompilationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/latex")
@RequiredArgsConstructor
public class LatexCompilationController {

    private final LatexCompilationService compilationService;
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
                user.getId()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            throw new RuntimeException("Compilation failed: " + e.getMessage(), e);
        }
    }
}
