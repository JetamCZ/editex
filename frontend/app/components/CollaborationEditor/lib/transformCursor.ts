import type { ChangeOperation } from "~/components/CollaborationEditor/hooks/useChangeTracking";

/**
 * Transforms a cursor position based on remote changes.
 * Adjusts the line number to account for insertions and deletions
 * that occurred before the cursor's current line.
 */
export const transformCursorPosition = (
    line: number,
    column: number,
    changes: ChangeOperation[]
): { line: number; column: number } => {
    let lineOffset = 0;

    for (const change of changes) {
        switch (change.operation) {
            case 'INSERT_AFTER':
                // If a line was inserted before or at the cursor line, shift cursor down
                if (change.line < line + lineOffset) {
                    lineOffset += 1;
                }
                break;

            case 'DELETE':
                // If a line was deleted before the cursor, shift cursor up
                if (change.line < line + lineOffset) {
                    lineOffset -= 1;
                } else if (change.line === line + lineOffset) {
                    // The cursor's line was deleted, move to the previous line
                    lineOffset -= 1;
                }
                break;

            case 'MODIFY':
                // Modifications don't affect line numbers
                break;
        }
    }

    return {
        line: Math.max(1, line + lineOffset),
        column
    };
};
