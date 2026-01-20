import { describe, it, expect } from 'vitest';
import { computeMinimalChanges, squashOperations, type ChangeOperation } from './changeTracking';

describe('computeMinimalChanges', () => {
    describe('single line modifications', () => {
        it('should detect modification of one line', () => {
            const previous = ['line 1', 'line 2', 'line 3'];
            const current = ['line 1', 'modified', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2); // DELETE old line 2, INSERT new line 2
            // The algorithm produces DELETE then INSERT for a modification
            expect(ops).toContainEqual({ operation: 'DELETE', line: 2 });
            expect(ops).toContainEqual({ operation: 'INSERT_AFTER', line: 1, content: 'modified' });
        });

        it('should return empty array when no changes', () => {
            const lines = ['line 1', 'line 2', 'line 3'];

            const ops = computeMinimalChanges(lines, lines);

            expect(ops).toHaveLength(0);
        });
    });

    describe('line deletions', () => {
        it('should detect deletion of one line', () => {
            const previous = ['line 1', 'line 2', 'line 3'];
            const current = ['line 1', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'DELETE', line: 2 });
        });

        it('should detect deletion of first line', () => {
            const previous = ['line 1', 'line 2', 'line 3'];
            const current = ['line 2', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'DELETE', line: 1 });
        });

        it('should detect deletion of last line', () => {
            const previous = ['line 1', 'line 2', 'line 3'];
            const current = ['line 1', 'line 2'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'DELETE', line: 3 });
        });

        it('should detect deletion of multiple consecutive lines', () => {
            const previous = ['line 1', 'line 2', 'line 3', 'line 4'];
            const current = ['line 1', 'line 4'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2);
            // After deleting line 2, line 3 becomes line 2
            expect(ops[0]).toEqual({ operation: 'DELETE', line: 2 });
            expect(ops[1]).toEqual({ operation: 'DELETE', line: 2 });
        });
    });

    describe('line insertions', () => {
        it('should detect insertion of one line', () => {
            const previous = ['line 1', 'line 3'];
            const current = ['line 1', 'line 2', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'INSERT_AFTER', line: 1, content: 'line 2' });
        });

        it('should detect insertion at the beginning', () => {
            const previous = ['line 2', 'line 3'];
            const current = ['line 1', 'line 2', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'INSERT_AFTER', line: 0, content: 'line 1' });
        });

        it('should detect insertion at the end', () => {
            const previous = ['line 1', 'line 2'];
            const current = ['line 1', 'line 2', 'line 3'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(1);
            expect(ops[0]).toEqual({ operation: 'INSERT_AFTER', line: 2, content: 'line 3' });
        });

        it('should detect insertion of multiple lines', () => {
            const previous = ['line 1', 'line 4'];
            const current = ['line 1', 'line 2', 'line 3', 'line 4'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2);
            expect(ops[0]).toEqual({ operation: 'INSERT_AFTER', line: 1, content: 'line 2' });
            expect(ops[1]).toEqual({ operation: 'INSERT_AFTER', line: 2, content: 'line 3' });
        });
    });

    describe('mixed operations', () => {
        it('should handle insert and delete together', () => {
            const previous = ['A', 'B', 'C'];
            const current = ['A', 'X', 'C'];

            const ops = computeMinimalChanges(previous, current);

            // Should delete B and insert X
            expect(ops).toHaveLength(2);
            expect(ops).toContainEqual({ operation: 'DELETE', line: 2 });
            expect(ops).toContainEqual({ operation: 'INSERT_AFTER', line: 1, content: 'X' });
        });

        it('should handle complete replacement', () => {
            const previous = ['old 1', 'old 2'];
            const current = ['new 1', 'new 2', 'new 3'];

            const ops = computeMinimalChanges(previous, current);

            // All old lines deleted, all new lines inserted
            expect(ops.filter(op => op.operation === 'DELETE')).toHaveLength(2);
            expect(ops.filter(op => op.operation === 'INSERT_AFTER')).toHaveLength(3);
        });
    });

    describe('edge cases', () => {
        it('should handle empty previous lines', () => {
            const previous: string[] = [];
            const current = ['line 1', 'line 2'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2);
            expect(ops[0]).toEqual({ operation: 'INSERT_AFTER', line: 0, content: 'line 1' });
            expect(ops[1]).toEqual({ operation: 'INSERT_AFTER', line: 1, content: 'line 2' });
        });

        it('should handle empty current lines', () => {
            const previous = ['line 1', 'line 2'];
            const current: string[] = [];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2);
            expect(ops[0]).toEqual({ operation: 'DELETE', line: 1 });
            expect(ops[1]).toEqual({ operation: 'DELETE', line: 1 });
        });

        it('should handle single line document', () => {
            const previous = ['only line'];
            const current = ['changed line'];

            const ops = computeMinimalChanges(previous, current);

            expect(ops).toHaveLength(2);
            expect(ops).toContainEqual({ operation: 'DELETE', line: 1 });
            expect(ops).toContainEqual({ operation: 'INSERT_AFTER', line: 0, content: 'changed line' });
        });
    });
});

describe('squashOperations', () => {
    describe('MODIFY squashing', () => {
        it('should squash consecutive MODIFY on same line', () => {
            const existing: ChangeOperation[] = [
                { operation: 'MODIFY', line: 1, content: 'first edit' }
            ];
            const newOps: ChangeOperation[] = [
                { operation: 'MODIFY', line: 1, content: 'second edit' }
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ operation: 'MODIFY', line: 1, content: 'second edit' });
        });

        it('should not squash MODIFY on different lines', () => {
            const existing: ChangeOperation[] = [
                { operation: 'MODIFY', line: 1, content: 'edit line 1' }
            ];
            const newOps: ChangeOperation[] = [
                { operation: 'MODIFY', line: 2, content: 'edit line 2' }
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(2);
        });
    });

    describe('INSERT_AFTER + DELETE cancellation', () => {
        it('should cancel INSERT_AFTER followed by DELETE of same line', () => {
            const existing: ChangeOperation[] = [
                { operation: 'INSERT_AFTER', line: 1, content: 'new line' }
            ];
            const newOps: ChangeOperation[] = [
                { operation: 'DELETE', line: 2 } // line 2 is the inserted line (after line 1)
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(0);
        });

        it('should not cancel INSERT_AFTER when DELETE is on different line', () => {
            const existing: ChangeOperation[] = [
                { operation: 'INSERT_AFTER', line: 1, content: 'new line' }
            ];
            const newOps: ChangeOperation[] = [
                { operation: 'DELETE', line: 5 } // different line
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(2);
        });
    });

    describe('multiple operations', () => {
        it('should handle multiple new operations', () => {
            const existing: ChangeOperation[] = [];
            const newOps: ChangeOperation[] = [
                { operation: 'MODIFY', line: 1, content: 'a' },
                { operation: 'MODIFY', line: 1, content: 'ab' },
                { operation: 'MODIFY', line: 1, content: 'abc' }
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ operation: 'MODIFY', line: 1, content: 'abc' });
        });

        it('should preserve unrelated operations', () => {
            const existing: ChangeOperation[] = [
                { operation: 'DELETE', line: 5 }
            ];
            const newOps: ChangeOperation[] = [
                { operation: 'MODIFY', line: 1, content: 'edit' },
                { operation: 'INSERT_AFTER', line: 2, content: 'new' }
            ];

            const result = squashOperations(existing, newOps);

            expect(result).toHaveLength(3);
        });
    });
});
