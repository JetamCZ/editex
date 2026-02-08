export enum TokenType {
    TEXT = 'TEXT',
    COMMAND = 'COMMAND',
    OPEN_BRACE = 'OPEN_BRACE',
    CLOSE_BRACE = 'CLOSE_BRACE',
    OPEN_BRACKET = 'OPEN_BRACKET',
    CLOSE_BRACKET = 'CLOSE_BRACKET',
    MATH_INLINE = 'MATH_INLINE',
    MATH_DISPLAY = 'MATH_DISPLAY',
    NEWLINE = 'NEWLINE',
    COMMENT = 'COMMENT',
    AMPERSAND = 'AMPERSAND',
    DOUBLE_BACKSLASH = 'DOUBLE_BACKSLASH',
    EOF = 'EOF',
}

export interface Token {
    type: TokenType;
    value: string;
    /** Raw source text that produced this token (for lossless round-tripping) */
    raw: string;
    pos: number;
}

export interface TipTapNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TipTapNode[];
    marks?: TipTapMark[];
    text?: string;
}

export interface TipTapMark {
    type: string;
    attrs?: Record<string, unknown>;
}

export interface TipTapDoc {
    type: 'doc';
    content: TipTapNode[];
}
