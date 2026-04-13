package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;

public class CompileCommitRequest {

    @NotBlank
    private String baseProject;

    @NotBlank
    private String branch;

    @NotBlank
    private String commitHash;

    public String getBaseProject() { return baseProject; }
    public void setBaseProject(String baseProject) { this.baseProject = baseProject; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }
}
