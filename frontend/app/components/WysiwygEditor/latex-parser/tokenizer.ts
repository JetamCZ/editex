import {type Token, TokenType} from './types';

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < source.length) {
        const ch = source[i];

        // Comments: % to end of line
        if (ch === '%') {
            const start = i;
            let end = i;
            while (end < source.length && source[end] !== '\n') end++;
            tokens.push({type: TokenType.COMMENT, value: source.slice(start, end), raw: source.slice(start, end), pos: start});
            i = end;
            continue;
        }

        // Display math: $$ ... $$
        if (ch === '$' && i + 1 < source.length && source[i + 1] === '$') {
            const start = i;
            i += 2;
            let content = '';
            while (i < source.length && !(source[i] === '$' && i + 1 < source.length && source[i + 1] === '$')) {
                content += source[i];
                i++;
            }
            const raw = source.slice(start, i + 2);
            if (i < source.length) i += 2; // skip closing $$
            tokens.push({type: TokenType.MATH_DISPLAY, value: content, raw, pos: start});
            continue;
        }

        // Inline math: $ ... $ (not $$)
        if (ch === '$') {
            const start = i;
            i += 1;
            let content = '';
            while (i < source.length && source[i] !== '$') {
                if (source[i] === '\\') {
                    content += source[i];
                    i++;
                    if (i < source.length) {
                        content += source[i];
                        i++;
                    }
                    continue;
                }
                content += source[i];
                i++;
            }
            const raw = source.slice(start, i + 1);
            if (i < source.length) i += 1; // skip closing $
            tokens.push({type: TokenType.MATH_INLINE, value: content, raw, pos: start});
            continue;
        }

        // Display math: \[ ... \]
        if (ch === '\\' && i + 1 < source.length && source[i + 1] === '[') {
            const start = i;
            i += 2;
            let content = '';
            while (i < source.length && !(source[i] === '\\' && i + 1 < source.length && source[i + 1] === ']')) {
                content += source[i];
                i++;
            }
            const raw = source.slice(start, i + 2);
            if (i < source.length) i += 2; // skip \]
            tokens.push({type: TokenType.MATH_DISPLAY, value: content, raw, pos: start});
            continue;
        }

        // Double backslash: \\
        if (ch === '\\' && i + 1 < source.length && source[i + 1] === '\\') {
            tokens.push({type: TokenType.DOUBLE_BACKSLASH, value: '\\\\', raw: '\\\\', pos: i});
            i += 2;
            continue;
        }

        // Commands: \commandname
        if (ch === '\\' && i + 1 < source.length && /[a-zA-Z@]/.test(source[i + 1])) {
            const start = i;
            i += 1;
            let name = '';
            while (i < source.length && /[a-zA-Z@*]/.test(source[i])) {
                name += source[i];
                i++;
            }
            tokens.push({type: TokenType.COMMAND, value: name, raw: source.slice(start, i), pos: start});
            continue;
        }

        // Escaped special character: \$ \% \& etc.
        if (ch === '\\' && i + 1 < source.length && /[^a-zA-Z\s]/.test(source[i + 1])) {
            const start = i;
            const escaped = source[i + 1];
            tokens.push({type: TokenType.TEXT, value: escaped, raw: source.slice(start, start + 2), pos: start});
            i += 2;
            continue;
        }

        if (ch === '{') {
            tokens.push({type: TokenType.OPEN_BRACE, value: '{', raw: '{', pos: i});
            i++;
            continue;
        }

        if (ch === '}') {
            tokens.push({type: TokenType.CLOSE_BRACE, value: '}', raw: '}', pos: i});
            i++;
            continue;
        }

        if (ch === '[') {
            tokens.push({type: TokenType.OPEN_BRACKET, value: '[', raw: '[', pos: i});
            i++;
            continue;
        }

        if (ch === ']') {
            tokens.push({type: TokenType.CLOSE_BRACKET, value: ']', raw: ']', pos: i});
            i++;
            continue;
        }

        if (ch === '&') {
            tokens.push({type: TokenType.AMPERSAND, value: '&', raw: '&', pos: i});
            i++;
            continue;
        }

        if (ch === '\n') {
            tokens.push({type: TokenType.NEWLINE, value: '\n', raw: '\n', pos: i});
            i++;
            continue;
        }

        // Regular text: accumulate non-special characters
        const start = i;
        let text = '';
        while (i < source.length && !'\\{}[]$%&\n'.includes(source[i])) {
            text += source[i];
            i++;
        }
        if (text) {
            tokens.push({type: TokenType.TEXT, value: text, raw: text, pos: start});
        }
    }

    tokens.push({type: TokenType.EOF, value: '', raw: '', pos: source.length});
    return tokens;
}
