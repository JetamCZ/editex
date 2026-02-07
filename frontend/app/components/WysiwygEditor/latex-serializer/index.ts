import {serializeDoc} from './serializer';
import type {TipTapDoc} from '../latex-parser/types';

export function serializeToLatex(doc: TipTapDoc): string {
    return serializeDoc(doc);
}

export {serializeDoc} from './serializer';
