export type ChangeOperation = {
    id?: string
    operation: "MODIFY" | "INSERT_AFTER" | "DELETE";
    line: number;
    content?: string;
}

/**
 * Compute minimal changes between two arrays of lines using LCS diff algorithm.
 * Returns operations that transform previousLines into currentLines.
 */
export function computeMinimalChanges(previousLines: string[], currentLines: string[]): ChangeOperation[] {
    const operations: ChangeOperation[] = [];

    // Build LCS table
    const m = previousLines.length;
    const n = currentLines.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (previousLines[i - 1] === currentLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the diff
    let i = m, j = n;
    const changes: { type: 'keep' | 'delete' | 'insert', prevIdx?: number, currIdx?: number }[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && previousLines[i - 1] === currentLines[j - 1]) {
            changes.unshift({ type: 'keep', prevIdx: i - 1, currIdx: j - 1 });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            changes.unshift({ type: 'insert', currIdx: j - 1 });
            j--;
        } else {
            changes.unshift({ type: 'delete', prevIdx: i - 1 });
            i--;
        }
    }

    // Convert diff to operations
    // Track line offset for DELETE operations (as lines are removed, positions shift)
    let deleteOffset = 0;

    for (const change of changes) {
        if (change.type === 'delete') {
            // DELETE line number is the original position adjusted for previous deletes
            const lineNum = change.prevIdx! + 1 + deleteOffset;
            operations.push({
                operation: "DELETE",
                line: lineNum
            });
            deleteOffset--;
        } else if (change.type === 'insert') {
            // INSERT_AFTER line number: insert after line N (1-indexed)
            // currIdx is 0-indexed position in target array
            // To insert at position 0, we use INSERT_AFTER line 0 (insert after "line 0" = at beginning)
            // To insert at position 1, we use INSERT_AFTER line 1 (insert after line 1)
            operations.push({
                operation: "INSERT_AFTER",
                line: change.currIdx!, // 0-indexed: INSERT_AFTER 0 means insert at beginning
                content: currentLines[change.currIdx!]
            });
        }
        // 'keep' - no operation needed
    }

    return operations;
}

/**
 * Squash operations to reduce redundancy:
 * - Consecutive MODIFY on same line -> keep only the last one
 * - INSERT_AFTER followed by DELETE of that line -> cancel both
 */
export function squashOperations(existingOps: ChangeOperation[], newOps: ChangeOperation[]): ChangeOperation[] {
    const result = [...existingOps];

    for (const newOp of newOps) {
        const lastOp = result[result.length - 1];

        // Squash consecutive MODIFY operations on the same line
        if (lastOp &&
            lastOp.operation === "MODIFY" &&
            newOp.operation === "MODIFY" &&
            lastOp.line === newOp.line) {
            result[result.length - 1] = newOp;
        }
        // Cancel out INSERT_AFTER + DELETE on the inserted line
        else if (lastOp &&
            lastOp.operation === "INSERT_AFTER" &&
            newOp.operation === "DELETE" &&
            newOp.line === lastOp.line + 1) {
            result.pop();
        }
        else {
            result.push(newOp);
        }
    }

    return result;
}
