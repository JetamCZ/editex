import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";

/**
 * Transforms local change history based on remote changes to maintain operational consistency.
 * This implements operational transformation to handle concurrent edits.
 *
 * @param localHistory - Array of local changes to transform
 * @param remoteChanges - Array of remote changes that have been applied
 * @returns Transformed local change history
 */
export const transformHistory = (
    localHistory: ChangeOperation[],
    remoteChanges: ChangeOperation[]
): ChangeOperation[] => {
    let transformedHistory = [...localHistory];

    for (const remoteChange of remoteChanges) {
        transformedHistory = transformedHistory.map(localChange => {
            const transformed = {...localChange};

            switch (remoteChange.operation) {
                case 'INSERT_AFTER':
                    // If a line was inserted before or at our local change line, shift down
                    if (localChange.line > remoteChange.line) {
                        transformed.line = localChange.line + 1;
                    }
                    break;

                case 'DELETE':
                    // If a line was deleted before our local change, shift up
                    if (localChange.line > remoteChange.line) {
                        transformed.line = localChange.line - 1;
                    } else if (localChange.line === remoteChange.line) {
                        // The line we were modifying was deleted
                        if (localChange.operation === 'MODIFY') {
                            // Convert to INSERT_AFTER at the previous line
                            transformed.operation = 'INSERT_AFTER';
                            transformed.line = Math.max(0, remoteChange.line - 1);
                        } else if (localChange.operation === 'DELETE') {
                            // Both tried to delete - already done, mark for removal
                            return null;
                        }
                    }
                    break;

                case 'MODIFY':
                    // Keep our local change (last write wins)
                    break;
            }

            return transformed;
        }).filter(change => change !== null) as ChangeOperation[];
    }

    return transformedHistory;
};
