package eu.puhony.latex_editor.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "UNAUTHORIZED");

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null) {
            errorResponse.put("message", "Missing Authorization header. Please provide a Bearer token.");
        } else if (!authHeader.startsWith("Bearer ")) {
            errorResponse.put("message", "Invalid Authorization header format. Expected: Bearer <token>");
        } else {
            errorResponse.put("message", "Authentication required.");
        }

        objectMapper.writeValue(response.getOutputStream(), errorResponse);
    }
}
