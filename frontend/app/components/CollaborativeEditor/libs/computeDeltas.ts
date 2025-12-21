import type {DeltaType, LineDelta} from "../../../../types/collaboration";

// Compute line-level deltas
const computeDeltas = (oldText: string, newText: string): LineDelta[] => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const deltas: LineDelta[] = [];

    const minLines = Math.min(oldLines.length, newLines.length);

    // Check for modifications
    for (let i = 0; i < minLines; i++) {
        if (oldLines[i] !== newLines[i]) {
            deltas.push({
                lineNumber: i,
                type: "MODIFY" as DeltaType,
                oldContent: oldLines[i],
                newContent: newLines[i],
            });
        }
    }

    // Check for insertions
    if (newLines.length > oldLines.length) {
        for (let i = oldLines.length; i < newLines.length; i++) {
            deltas.push({
                lineNumber: i,
                type: "INSERT" as DeltaType,
                oldContent: null,
                newContent: newLines[i],
            });
        }
    }

    // Check for deletions
    if (oldLines.length > newLines.length) {
        for (let i = newLines.length; i < oldLines.length; i++) {
            deltas.push({
                lineNumber: i,
                type: "DELETE" as DeltaType,
                oldContent: oldLines[i],
                newContent: null,
            });
        }
    }

    return deltas;
};

export default computeDeltas
