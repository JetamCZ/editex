package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.mail.from:noreply@editex.eu}")
    private String fromEmail;

    public void sendVerificationEmail(User user, String token) {
        String verificationLink = frontendUrl + "/auth/verify-email?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Verify your Editex account");
        message.setText(
            "Hello " + (user.getName() != null ? user.getName() : "there") + ",\n\n" +
            "Thank you for registering with Editex!\n\n" +
            "Please verify your email address by clicking the link below:\n" +
            verificationLink + "\n\n" +
            "This link will expire in 24 hours.\n\n" +
            "If you did not create an account, please ignore this email.\n\n" +
            "Best regards,\n" +
            "The Editex Team"
        );

        mailSender.send(message);
    }

    public void sendPasswordResetEmail(User user, String token) {
        String resetLink = frontendUrl + "/auth/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Reset your Editex password");
        message.setText(
            "Hello " + (user.getName() != null ? user.getName() : "there") + ",\n\n" +
            "We received a request to reset your password.\n\n" +
            "Click the link below to reset your password:\n" +
            resetLink + "\n\n" +
            "This link will expire in 1 hour.\n\n" +
            "If you did not request a password reset, please ignore this email.\n\n" +
            "Best regards,\n" +
            "The Editex Team"
        );

        mailSender.send(message);
    }
}
