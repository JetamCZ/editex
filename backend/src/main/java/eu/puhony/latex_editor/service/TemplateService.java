package eu.puhony.latex_editor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FileBranchRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final ObjectMapper objectMapper;
    private final MinioService minioService;
    private final ProjectFileRepository projectFileRepository;
    private final FileBranchRepository fileBranchRepository;

    private static final String TEMPLATES_CONFIG = "templates/templates.json";
    private static final String SOURCES_ROOT = "/sources";

    public List<TemplateInfo> getAvailableTemplates() {
        List<TemplateInfo> templates = new ArrayList<>();
        try {
            ClassPathResource resource = new ClassPathResource(TEMPLATES_CONFIG);
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            JsonNode templatesNode = root.get("templates");

            if (templatesNode != null && templatesNode.isArray()) {
                for (JsonNode templateNode : templatesNode) {
                    templates.add(new TemplateInfo(
                        templateNode.get("id").asText(),
                        templateNode.get("name").asText(),
                        templateNode.get("description").asText()
                    ));
                }
            }
        } catch (IOException e) {
            log.error("Failed to load templates config", e);
        }
        return templates;
    }

    @Transactional
    public List<ProjectFile> initializeProjectFromTemplate(Project project, String templateId, User user) {
        List<ProjectFile> createdFiles = new ArrayList<>();

        if (templateId == null) {
            return createdFiles;
        }

        try {
            ClassPathResource resource = new ClassPathResource(TEMPLATES_CONFIG);
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            JsonNode templatesNode = root.get("templates");

            if (templatesNode != null && templatesNode.isArray()) {
                for (JsonNode templateNode : templatesNode) {
                    if (templateNode.get("id").asText().equals(templateId)) {
                        JsonNode filesNode = templateNode.get("files");
                        if (filesNode != null && filesNode.isArray()) {
                            for (JsonNode fileNode : filesNode) {
                                String path = fileNode.get("path").asText();
                                String filename = fileNode.get("filename").asText();
                                String templateFile = fileNode.get("templateFile").asText();

                                ProjectFile projectFile = createFileFromTemplate(
                                    project, path, filename, templateFile, user
                                );
                                if (projectFile != null) {
                                    createdFiles.add(projectFile);
                                }
                            }
                        }
                        break;
                    }
                }
            }
        } catch (IOException e) {
            log.error("Failed to initialize project from template", e);
            throw new RuntimeException("Failed to initialize project from template", e);
        }

        return createdFiles;
    }

    private ProjectFile createFileFromTemplate(Project project, String folder,
            String filename, String templateFile, User user) {
        try {
            ClassPathResource templateResource = new ClassPathResource("templates/" + templateFile);
            byte[] content;
            try (InputStream is = templateResource.getInputStream()) {
                content = is.readAllBytes();
            }

            File tempFile = File.createTempFile("template-", "-" + filename);
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(content);
            }

            // S3 path: {baseProject}/{branch}/sources{folder}
            String s3Path = project.getBaseProject() + "/main" + SOURCES_ROOT + folder;
            String s3Url = minioService.uploadFile(tempFile, s3Path, getContentType(filename));

            tempFile.delete();

            ProjectFile projectFile = new ProjectFile();
            projectFile.setProject(project);
            projectFile.setProjectFolder(folder);
            projectFile.setFileName(filename);
            projectFile.setOriginalFileName(filename);
            projectFile.setFileSize((long) content.length);
            projectFile.setFileType(getContentType(filename));
            projectFile.setS3Url(s3Url);
            projectFile.setUploadedBy(user);

            projectFile = projectFileRepository.save(projectFile);

            // Auto-create "main" branch
            FileBranch mainBranch = new FileBranch();
            mainBranch.setFile(projectFile);
            mainBranch.setName("main");
            mainBranch.setCreatedBy(user);
            mainBranch = fileBranchRepository.save(mainBranch);

            projectFile.setActiveBranch(mainBranch);
            projectFile = projectFileRepository.save(projectFile);

            return projectFile;
        } catch (Exception e) {
            log.error("Failed to create file from template: {}", templateFile, e);
            throw new RuntimeException("Failed to upload template file to S3: " + templateFile, e);
        }
    }

    private String getContentType(String filename) {
        if (filename.endsWith(".tex")) {
            return "application/x-tex";
        } else if (filename.endsWith(".bib")) {
            return "application/x-bibtex";
        } else if (filename.endsWith(".sty")) {
            return "text/x-tex";
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (filename.endsWith(".png")) {
            return "image/png";
        } else if (filename.endsWith(".gif")) {
            return "image/gif";
        } else if (filename.endsWith(".pdf")) {
            return "application/pdf";
        }
        return "text/plain";
    }

    public record TemplateInfo(String id, String name, String description) {}
}
