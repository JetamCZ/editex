package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.AuthResponse;
import eu.puhony.latex_editor.dto.ForgotPasswordRequest;
import eu.puhony.latex_editor.dto.LoginRequest;
import eu.puhony.latex_editor.dto.RegisterRequest;
import eu.puhony.latex_editor.dto.ResendVerificationRequest;
import eu.puhony.latex_editor.dto.ResetPasswordRequest;
import eu.puhony.latex_editor.dto.UpdateUserRequest;
import eu.puhony.latex_editor.dto.VerifyEmailRequest;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.EmailService;
import eu.puhony.latex_editor.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already exists"));
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setEmailVerified(false);

        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));

        try {
            emailService.sendVerificationEmail(user, verificationToken);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to send verification email to " + user.getEmail() + ": " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Failed to send verification email. Please try again later."));
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Registration successful. Please check your email to verify your account."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Email not verified",
                "message", "Please verify your email before logging in.",
                "email", user.getEmail()
            ));
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String token = jwtService.generateToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        User user = userRepository.findByVerificationToken(request.getToken())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid verification token"));
        }

        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Verification token has expired",
                "email", user.getEmail()
            ));
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now log in."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a verification email has been sent."));
        }

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.ok(Map.of("message", "Email is already verified."));
        }

        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(user, verificationToken);

        return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a verification email has been sent."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a password reset link has been sent."));
        }

        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user, resetToken);

        return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid password reset token"));
        }

        if (user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password reset token has expired"));
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in with your new password."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("createdAt", user.getCreatedAt());
        response.put("updatedAt", user.getUpdatedAt());
        response.put("deletedAt", user.getDeletedAt());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateUser(@Valid @RequestBody UpdateUserRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update name if provided
        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }

        // Update password if provided
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("createdAt", user.getCreatedAt());
        response.put("updatedAt", user.getUpdatedAt());
        response.put("deletedAt", user.getDeletedAt());

        return ResponseEntity.ok(response);
    }
}
