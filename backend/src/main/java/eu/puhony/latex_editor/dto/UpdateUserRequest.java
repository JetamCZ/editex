package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {
    private String name;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
}
