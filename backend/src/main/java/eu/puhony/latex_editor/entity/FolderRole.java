package eu.puhony.latex_editor.entity;

public enum FolderRole {
    VIEWER,
    EDITOR,
    MANAGER;

    public boolean includes(FolderRole other) {
        if (other == null) return true;
        return this.ordinal() >= other.ordinal();
    }

    public static FolderRole max(FolderRole a, FolderRole b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
