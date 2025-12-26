package eu.puhony.latex_editor.exception;

public class LatexCompilationException extends RuntimeException {
    private final String compilationLog;

    public LatexCompilationException(String message, String compilationLog) {
        super(message);
        this.compilationLog = compilationLog;
    }

    public String getCompilationLog() {
        return compilationLog;
    }
}
