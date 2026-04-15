package eu.puhony.latex_editor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import eu.puhony.latex_editor.dto.AiDebugRequest;
import eu.puhony.latex_editor.dto.AiDebugResult;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiDebugService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "en", "English",
            "cs", "Czech"
    );

    private static final int MAX_FILE_CHARS = 12000;
    private static final int MAX_LOG_CHARS = 6000;

    private final FolderPermissionService folderPermissionService;
    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final FileBranchService fileBranchService;
    private final MinioService minioService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ai.debug.provider:anthropic}")
    private String provider;

    @Value("${ai.debug.anthropic.api-key:}")
    private String anthropicApiKey;

    @Value("${ai.debug.anthropic.model:claude-opus-4-5}")
    private String anthropicModel;

    @Value("${ai.debug.openai.api-key:}")
    private String openaiApiKey;

    @Value("${ai.debug.openai.model:gpt-4o}")
    private String openaiModel;

    @Value("${ai.debug.max-tokens:1500}")
    private int maxTokens;

    public AiDebugResult debug(AiDebugRequest request, Long userId) {
        Project project = projectRepository
                .findByIdNonDeleted(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));
        folderPermissionService.ensureCanReadProject(project.getId(), userId);

        List<ProjectFile> allFiles = projectFileRepository.findByProjectIdNonDeleted(project.getId());

        StringBuilder texDump = new StringBuilder();
        int totalChars = 0;
        String sourceFileName = request.getSourceFile();

        for (ProjectFile file : allFiles) {
            String name = file.getOriginalFileName();
            if (name == null || !name.toLowerCase().endsWith(".tex")) continue;

            String content = readTexContent(project.getId(), file);
            if (content == null) continue;

            boolean isSource = sourceFileName != null && name.equalsIgnoreCase(sourceFileName);
            int budget = Math.max(0, MAX_FILE_CHARS - totalChars);
            if (budget <= 0 && !isSource) break;

            String snippet = content;
            if (snippet.length() > (isSource ? MAX_FILE_CHARS : budget)) {
                snippet = snippet.substring(0, isSource ? MAX_FILE_CHARS : budget) + "\n... [truncated]";
            }

            texDump.append("=== FILE: ").append(name);
            if (isSource) texDump.append(" (main compile target)");
            texDump.append(" ===\n").append(snippet).append("\n\n");
            totalChars += snippet.length();
            if (totalChars >= MAX_FILE_CHARS && !isSource) break;
        }

        String log = request.getCompilationLog() == null ? "" : request.getCompilationLog();
        if (log.length() > MAX_LOG_CHARS) {
            log = log.substring(log.length() - MAX_LOG_CHARS);
        }

        String languageCode = request.getLanguage() == null ? "en" : request.getLanguage().toLowerCase();
        String languageName = LANGUAGE_NAMES.getOrDefault(languageCode, "English");

        String prompt = buildPrompt(
                languageName,
                request.getErrorMessage(),
                log,
                texDump.toString(),
                sourceFileName
        );

        try {
            if ("openai".equalsIgnoreCase(provider)) {
                return callOpenAi(prompt);
            }
            return callAnthropic(prompt);
        } catch (Exception e) {
            return new AiDebugResult(false, null, "AI debug request failed: " + e.getMessage(), null);
        }
    }

    private String readTexContent(Long projectId, ProjectFile file) {
        try {
            String content = fileBranchService.resolveInputReference(
                    projectId, file.getOriginalFileName(), "main", true);
            if (content != null) return content;
            if (file.getActiveBranch() != null) {
                return fileBranchService.resolveContent(file.getActiveBranch());
            }
            return minioService.getFileContent(file.getS3Url());
        } catch (Exception e) {
            return null;
        }
    }

    private String buildPrompt(String languageName, String errorMessage, String log, String texDump, String sourceFile) {
        return "You are an expert LaTeX debugging assistant. A user's LaTeX project failed to compile with pdflatex.\n\n"
                + "Analyze the error and the source files below, then respond in " + languageName + ".\n\n"
                + "Your response must:\n"
                + "1. Briefly explain what the error means.\n"
                + "2. Identify the exact file and line (when possible) where the issue is.\n"
                + "3. Show a concrete fix as a short LaTeX code snippet in a ```latex``` block.\n"
                + "4. Keep it concise and practical.\n\n"
                + "IMPORTANT: Write the explanation text in " + languageName + ". Keep LaTeX code in the snippets unchanged.\n\n"
                + "PROJECT-SPECIFIC SYNTAX — DO NOT FLAG AS ERRORS AND DO NOT SUGGEST REMOVING:\n"
                + "This editor supports versioned \\input / \\include references:\n"
                + "  - \\input{file@branch} includes the content of `file.tex` from the named file-branch (e.g. \\input{chapter1@draft}).\n"
                + "  - \\input{file#hash}   includes the content of `file.tex` at a specific commit hash (e.g. \\input{chapter1#a1b2c3}).\n"
                + "  - The same applies to \\include{...}.\n"
                + "These are resolved server-side before pdflatex runs — the backend writes the resolved content to `file.tex` and rewrites the command to plain `\\input{file}`. So when you see `@branch` or `#hash` suffixes inside \\input/\\include, they are VALID and intentional. Never tell the user to delete or rename them. If an error seems related to such a reference, assume the content was resolved correctly and look for the real cause elsewhere (unless the referenced file/branch/commit genuinely does not exist, in which case suggest fixing the name — not removing the syntax).\n\n"
                + "Main compile target: " + (sourceFile == null ? "main.tex" : sourceFile) + "\n\n"
                + "Error message:\n" + (errorMessage == null ? "(none)" : errorMessage) + "\n\n"
                + "Compilation log (tail):\n```\n" + log + "\n```\n\n"
                + "Project .tex files:\n" + texDump;
    }

    private AiDebugResult callAnthropic(String prompt) throws Exception {
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            return new AiDebugResult(false, null,
                    "Anthropic API key is not configured. Set ANTHROPIC_API_KEY in backend .env", null);
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", anthropicModel);
        body.put("max_tokens", maxTokens);
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(60))
                .header("content-type", "application/json")
                .header("x-api-key", anthropicApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build()
                .send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() / 100 != 2) {
            return new AiDebugResult(false, null,
                    "Anthropic API returned " + response.statusCode() + ": " + response.body(), anthropicModel);
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode content = root.path("content");
        StringBuilder text = new StringBuilder();
        if (content.isArray()) {
            for (JsonNode block : content) {
                if ("text".equals(block.path("type").asText())) {
                    text.append(block.path("text").asText());
                }
            }
        }

        return new AiDebugResult(true, text.toString(), null, anthropicModel);
    }

    private AiDebugResult callOpenAi(String prompt) throws Exception {
        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            return new AiDebugResult(false, null,
                    "OpenAI API key is not configured. Set OPENAI_API_KEY in backend .env", null);
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", openaiModel);
        body.put("max_tokens", maxTokens);
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("content-type", "application/json")
                .header("authorization", "Bearer " + openaiApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build()
                .send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() / 100 != 2) {
            return new AiDebugResult(false, null,
                    "OpenAI API returned " + response.statusCode() + ": " + response.body(), openaiModel);
        }

        JsonNode root = objectMapper.readTree(response.body());
        String text = root.path("choices").path(0).path("message").path("content").asText("");
        return new AiDebugResult(true, text, null, openaiModel);
    }
}
