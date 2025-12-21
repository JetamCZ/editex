import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";

/**
 * Applies a list of change operations to an array of lines.
 * Mutates the lines array in place.
 *
 * @param lines - Array of text lines to apply changes to
 * @param changes - Array of change operations to apply
 */
export const applyChanges = (lines: string[], changes: ChangeOperation[]): string[] => {
    const copy = [...lines]

    for (const change of changes) {
        switch (change.operation) {
            case 'MODIFY':
                if (change.line > 0 && change.line <= copy.length && change.content !== undefined) {
                    copy[change.line - 1] = change.content;
                }
                break;

            case 'INSERT_AFTER':
                if (change.line >= 0 && change.line <= copy.length && change.content !== undefined) {
                    copy.splice(change.line, 0, change.content);
                }
                break;

            case 'DELETE':
                if (change.line > 0 && change.line <= copy.length) {
                    copy.splice(change.line - 1, 1);
                }
                break;
        }
    }

    return copy
};
