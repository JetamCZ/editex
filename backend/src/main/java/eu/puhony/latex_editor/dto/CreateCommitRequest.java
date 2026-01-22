package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommitRequest {
    @NotBlank(message = "Commit message is required")
    @Size(max = 500, message = "Commit message must be at most 500 characters")
    private String message;

    @NotBlank(message = "Branch is required")
    private String branch;
}
