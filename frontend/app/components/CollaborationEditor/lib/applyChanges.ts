import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";

/**
 * Applies a list of change operations to an array of lines.
 * Mutates the lines array in place.
 *
 * @param lines - Array of text lines to apply changes to
 * @param changes - Array of change operations to apply
 */
export const applyChanges = (lines: string[], changes: ChangeOperation[]): void => {
    for (const change of changes) {
        switch (change.operation) {
            case 'MODIFY':
                if (change.line > 0 && change.line <= lines.length && change.content !== undefined) {
                    lines[change.line - 1] = change.content;
                }
                break;

            case 'INSERT_AFTER':
                if (change.line >= 0 && change.line <= lines.length && change.content !== undefined) {
                    lines.splice(change.line, 0, change.content);
                }
                break;

            case 'DELETE':
                if (change.line > 0 && change.line <= lines.length) {
                    lines.splice(change.line - 1, 1);
                }
                break;
        }
    }
};
