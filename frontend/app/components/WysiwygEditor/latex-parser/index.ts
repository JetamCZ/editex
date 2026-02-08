import {tokenize} from './tokenizer';
import {parse} from './parser';
import type {TipTapDoc} from './types';

export function parseLatex(source: string): TipTapDoc {
    const tokens = tokenize(source);
    return parse(tokens);
}

export {tokenize} from './tokenizer';
export {parse} from './parser';
export type {Token, TokenType, TipTapDoc, TipTapNode, TipTapMark} from './types';
