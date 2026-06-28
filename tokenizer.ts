/*
 * Copyright (C) 2026 Belisov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { t } from './i18n';

export interface Span {
  line: number;
  column: number;
  start: number;
  end: number;
}

export type TokenType =
  | 'DEFINE'
  | 'TITLE'
  | 'SAY'
  | 'SAY_THINK'
  | 'LISTEN'
  | 'THINK'
  | 'IF'
  | 'ELSE'
  | 'LOOP'
  | 'EXIT_LOOP'
  | 'CONTINUE_LOOP'
  | 'EXIT'
  | 'ASK'
  | 'IDENTIFIER'
  | 'URL'
  | 'STRING'
  | 'NEWLINE'
  | 'INDENT'
  | 'COLON'
  | 'EOF'
  ;

export interface TokenMap {
  DEFINE: { type: 'DEFINE'; value: '#DEFINE' };
  TITLE: { type: 'TITLE'; value: 'TITLE' };
  SAY: { type: 'SAY'; value: 'SAY' };
  SAY_THINK: { type: 'SAY_THINK'; value: 'SAY THINK' };
  LISTEN: { type: 'LISTEN'; value: 'LISTEN' };
  THINK: { type: 'THINK'; value: 'THINK' };
  IF: { type: 'IF'; value: 'IF' };
  ELSE: { type: 'ELSE'; value: 'ELSE' };
  LOOP: { type: 'LOOP'; value: 'LOOP' };
  EXIT_LOOP: { type: 'EXIT_LOOP'; value: 'EXIT LOOP' };
  CONTINUE_LOOP: { type: 'CONTINUE_LOOP'; value: 'CONTINUE LOOP' };
  EXIT: { type: 'EXIT'; value: 'EXIT' };
  ASK: { type: 'ASK'; value: 'ASK' };
  IDENTIFIER: { type: 'IDENTIFIER'; value: string };
  URL: { type: 'URL'; value: string };
  STRING: { type: 'STRING'; value: string };
  NEWLINE: { type: 'NEWLINE'; value: string };
  INDENT: { type: 'INDENT'; value: string };
  COLON: { type: 'COLON'; value: ':' };
  EOF: { type: 'EOF'; value: '' };
}

export type Token = {
  [K in TokenType]: TokenMap[K] & { span: Span };
}[TokenType];

export interface TokenizeError {
  errorKey: string;
  args?: Record<string, string | number>;
  message: string;
  span: Span;
}

export interface TokenizeResult {
  tokens: Token[];
  errors: TokenizeError[];
}

function matchKeyword(str: string, keyword: string): boolean {
  if (!str.startsWith(keyword)) return false;
  const nextChar = str[keyword.length];
  if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) return false;
  return true;
}

function parseStringArg(text: string, lineNum: number, lineStartOffset: number, relativeOffset: number): Token {
  const trimmed = text.trim();
  const startSpaces = text.length - text.trimStart().length;
  const endSpaces = text.length - text.trimEnd().length;

  const rawVal = trimmed;
  const isQuoted = rawVal.startsWith('"') && rawVal.endsWith('"');

  const val = isQuoted ? rawVal.slice(1, -1) : rawVal;

  return {
    type: 'STRING',
    value: val,
    span: {
      line: lineNum,
      column: relativeOffset + startSpaces + 1,
      start: lineStartOffset + relativeOffset + startSpaces,
      end: lineStartOffset + relativeOffset + text.length - endSpaces
    }
  } as Token;
}

function getIndentLevel(indentStr: string, indentUnit: number): number {
  let level = 0;
  for (let i = 0; i < indentStr.length; i++) {
    if (indentStr[i] === '\t') {
      level += 1;
    } else if (indentStr[i] === ' ') {
      let spaceRun = 0;
      while (i < indentStr.length && indentStr[i] === ' ') {
        spaceRun++;
        i++;
      }
      i--;
      level += Math.floor(spaceRun / indentUnit);
    }
  }
  return level;
}

export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = [];
  const errors: TokenizeError[] = [];

  const lines = source.split(/\r?\n/);

  // Auto-detect indentation unit
  let indentUnit = 2; // Default fallback
  const spaceCounts: number[] = [];
  for (const lineText of lines) {
    let commentStart = -1;
    let inStr = false;
    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === '"') {
        inStr = !inStr;
      } else if (!inStr && lineText[i] === '/' && lineText[i + 1] === '/') {
        const before = lineText.slice(0, i);
        if (/(http|https):$/i.test(before)) {
          continue;
        }
        commentStart = i;
        break;
      }
    }
    const codePart = commentStart !== -1 ? lineText.slice(0, commentStart) : lineText;
    if (/^\s*$/.test(codePart)) {
      continue;
    }

    const indentMatch = lineText.match(/^([ \t]*)/);
    const indentStr = indentMatch ? indentMatch[0] : '';
    if (indentStr && !indentStr.includes('\t')) {
      spaceCounts.push(indentStr.length);
    }
  }

  if (spaceCounts.length > 0) {
    const candidates = [4, 3, 2, 1];
    const threshold = spaceCounts.length * 0.5;
    for (const c of candidates) {
      const score = spaceCounts.filter(n => n % c === 0).length;
      if (score > threshold) {
        indentUnit = c;
        break;
      }
    }
  }

  let currentOffset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx] ?? '';
    const lineNum = lineIdx + 1;
    const lineStartOffset = currentOffset;
    currentOffset += lineText.length + (lineIdx < lines.length - 1 ? (source[lineStartOffset + lineText.length] === '\r' ? 2 : 1) : 0);

    // Find comment start, ignoring inside string literals and http/https URLs
    let commentStart = -1;
    let inStr = false;
    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === '"') {
        inStr = !inStr;
      } else if (!inStr && lineText[i] === '/' && lineText[i + 1] === '/') {
        const before = lineText.slice(0, i);
        if (/(http|https):$/i.test(before)) {
          continue;
        }
        commentStart = i;
        break;
      }
    }

    const codePart = commentStart !== -1 ? lineText.slice(0, commentStart) : lineText;

    // Skip completely empty or comment-only lines for indentation and processing
    if (/^\s*$/.test(codePart)) {
      continue;
    }

    // Calculate indentation level and emit INDENT tokens stateless on every line
    const indentMatch = lineText.match(/^([ \t]*)/);
    const indentStr = indentMatch ? indentMatch[0] : '';

    // Validate indentation is multiple of indentUnit
    let isMultiple = true;
    let spaceRun = 0;
    for (let i = 0; i < indentStr.length; i++) {
      if (indentStr[i] === ' ') {
        let run = 0;
        while (i < indentStr.length && indentStr[i] === ' ') {
          run++;
          i++;
        }
        i--;
        if (run % indentUnit !== 0) {
          isMultiple = false;
          spaceRun = run;
        }
      }
    }

    if (!isMultiple) {
      errors.push({
        errorKey: 'indentation_not_multiple',
        args: { indentUnit, spaceRun },
        message: t('indentation_not_multiple', { indentUnit, spaceRun }),
        span: {
          line: lineNum,
          column: 1,
          start: lineStartOffset,
          end: lineStartOffset + indentStr.length
        }
      });
    }

    const level = getIndentLevel(indentStr, indentUnit);

    for (let i = 0; i < level; i++) {
      // Find the character range for this level step in the indentStr (ignoring the remainder in start offset calculation)
      const maxBaseLength = level * indentUnit;
      const charStart = i * indentUnit;
      const charEnd = (i + 1) * indentUnit;
      const stepVal = indentStr.slice(charStart, charEnd);

      tokens.push({
        type: 'INDENT',
        value: stepVal,
        span: {
          line: lineNum,
          column: charStart + 1,
          start: lineStartOffset + charStart,
          end: lineStartOffset + charEnd
        }
      } as Token);
    }

    let remaining = codePart.slice(indentStr.length);
    let relativeOffset = indentStr.length;

    // Skip leading spaces of statement
    const leadMatch = remaining.match(/^([ \t]*)/);
    const leadLen = leadMatch ? leadMatch[0].length : 0;
    remaining = remaining.slice(leadLen);
    relativeOffset += leadLen;

    if (remaining.length === 0) {
      continue;
    }

    let hasTokensOnThisLine = false;

    // 1. CONTINUE LOOP
    if (matchKeyword(remaining, 'CONTINUE LOOP')) {
      tokens.push({
        type: 'CONTINUE_LOOP',
        value: 'CONTINUE LOOP',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 13
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2. EXIT LOOP
    else if (matchKeyword(remaining, 'EXIT LOOP')) {
      tokens.push({
        type: 'EXIT_LOOP',
        value: 'EXIT LOOP',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 9
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2.2. TITLE
    else if (matchKeyword(remaining, 'TITLE')) {
      tokens.push({
        type: 'TITLE',
        value: 'TITLE',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 5
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(5);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + 5));
      }
    }
    // 2.5. EXIT
    else if (matchKeyword(remaining, 'EXIT')) {
      tokens.push({
        type: 'EXIT',
        value: 'EXIT',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 4
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2.75. ASK
    else if (matchKeyword(remaining, 'ASK')) {
      tokens.push({
        type: 'ASK',
        value: 'ASK',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 3
        }
      } as Token);
      hasTokensOnThisLine = true;
      let rest = remaining.slice(3);
      let restOffset = relativeOffset + 3;

      // Match next whitespace
      const wsMatch = rest.match(/^([ \t]+)/);
      if (wsMatch) {
        const wsLen = wsMatch[0].length;
        rest = rest.slice(wsLen);
        restOffset += wsLen;
      }

      // Match agent identifier
      const idMatch = rest.match(/^[a-zA-Z0-9_]+/);
      if (idMatch) {
        const idLen = idMatch[0].length;
        tokens.push({
          type: 'IDENTIFIER',
          value: idMatch[0],
          span: {
            line: lineNum,
            column: restOffset + 1,
            start: lineStartOffset + restOffset,
            end: lineStartOffset + restOffset + idLen
          }
        } as Token);
        rest = rest.slice(idLen);
        restOffset += idLen;

        if (rest.trim().length > 0) {
          tokens.push(parseStringArg(rest, lineNum, lineStartOffset, restOffset));
        }
      }
    }
    // 3. SAY THINK
    else if (matchKeyword(remaining, 'SAY THINK')) {
      tokens.push({
        type: 'SAY_THINK',
        value: 'SAY THINK',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 9
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(9);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + 9));
      }
    }
    // 4. SAY
    else if (matchKeyword(remaining, 'SAY')) {
      tokens.push({
        type: 'SAY',
        value: 'SAY',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 3
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(3);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + 3));
      }
    }
    // 5. LISTEN
    else if (matchKeyword(remaining, 'LISTEN')) {
      tokens.push({
        type: 'LISTEN',
        value: 'LISTEN',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 6
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 6. THINK
    else if (matchKeyword(remaining, 'THINK')) {
      tokens.push({
        type: 'THINK',
        value: 'THINK',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 5
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(5);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + 5));
      }
    }
    // 7. IF
    else if (matchKeyword(remaining, 'IF')) {
      tokens.push({
        type: 'IF',
        value: 'IF',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 2
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(2);
      const colonIdx = rest.lastIndexOf(':');
      if (colonIdx !== -1) {
        const argText = rest.slice(0, colonIdx);
        if (argText.trim().length > 0) {
          tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + 2));
        }
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + 2 + colonIdx + 1,
            start: lineStartOffset + relativeOffset + 2 + colonIdx,
            end: lineStartOffset + relativeOffset + 2 + colonIdx + 1
          }
        } as Token);
      } else {
        errors.push({
          errorKey: 'expected_if_colon',
          message: t('expected_if_colon'),
          span: {
            line: lineNum,
            column: lineText.length + 1,
            start: lineStartOffset + lineText.length,
            end: lineStartOffset + lineText.length + 1
          }
        });
      }
    }
    // 8. ELSE
    else if (matchKeyword(remaining, 'ELSE') || remaining.startsWith('ELSE:')) {
      const elseLen = 4;
      tokens.push({
        type: 'ELSE',
        value: 'ELSE',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + elseLen
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(elseLen);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + elseLen + colonIdx + 1,
            start: lineStartOffset + relativeOffset + elseLen + colonIdx,
            end: lineStartOffset + relativeOffset + elseLen + colonIdx + 1
          }
        } as Token);
      }
    }
    // 9. LOOP
    else if (matchKeyword(remaining, 'LOOP') || remaining.startsWith('LOOP:')) {
      const loopLen = 4;
      tokens.push({
        type: 'LOOP',
        value: 'LOOP',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + loopLen
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(loopLen);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + loopLen + colonIdx + 1,
            start: lineStartOffset + relativeOffset + loopLen + colonIdx,
            end: lineStartOffset + relativeOffset + loopLen + colonIdx + 1
          }
        } as Token);
      }
    }
    // 10. DEFINE
    else if (matchKeyword(remaining, '#DEFINE')) {
      tokens.push({
        type: 'DEFINE',
        value: '#DEFINE',
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + 7
        }
      } as Token);
      hasTokensOnThisLine = true;
      let rest = remaining.slice(7);
      let restOffset = relativeOffset + 7;

      // Match next whitespace
      const wsMatch = rest.match(/^([ \t]+)/);
      if (wsMatch) {
        const wsLen = wsMatch[0].length;
        rest = rest.slice(wsLen);
        restOffset += wsLen;
      }

      // Match identifier (CALL_...)
      const idMatch = rest.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (idMatch) {
        const idLen = idMatch[0].length;
        tokens.push({
          type: 'IDENTIFIER',
          value: idMatch[0],
          span: {
            line: lineNum,
            column: restOffset + 1,
            start: lineStartOffset + restOffset,
            end: lineStartOffset + restOffset + idLen
          }
        } as Token);
        rest = rest.slice(idLen);
        restOffset += idLen;
      }

      // Match next whitespace
      const wsMatch2 = rest.match(/^([ \t]+)/);
      if (wsMatch2) {
        const wsLen = wsMatch2[0].length;
        rest = rest.slice(wsLen);
        restOffset += wsLen;
      }

      // The rest of the line is the URL
      if (rest.trim().length > 0) {
        const urlStartSpaces = rest.length - rest.trimStart().length;
        const urlEndSpaces = rest.length - rest.trimEnd().length;
        const urlVal = rest.trim();
        tokens.push({
          type: 'URL',
          value: urlVal,
          span: {
            line: lineNum,
            column: restOffset + urlStartSpaces + 1,
            start: lineStartOffset + restOffset + urlStartSpaces,
            end: lineStartOffset + restOffset + rest.length - urlEndSpaces
          }
        } as Token);
      }
    }
    // 11. CALL_ macro call
    else if (remaining.startsWith('CALL_')) {
      const idMatch = remaining.match(/^CALL_[a-zA-Z0-9_]*/);
      if (idMatch) {
        const idLen = idMatch[0].length;
        tokens.push({
          type: 'IDENTIFIER',
          value: idMatch[0],
          span: {
            line: lineNum,
            column: relativeOffset + 1,
            start: lineStartOffset + relativeOffset,
            end: lineStartOffset + relativeOffset + idLen
          }
        } as Token);
        hasTokensOnThisLine = true;
        const argText = remaining.slice(idLen);
        if (argText.trim().length > 0) {
          tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + idLen));
        }
      }
    }
    // Unknown statement
    else {
      errors.push({
        errorKey: 'unrecognized_statement',
        args: { remaining },
        message: t('unrecognized_statement', { remaining }),
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + remaining.length
        }
      });
    }

    if (hasTokensOnThisLine) {
      tokens.push({
        type: 'NEWLINE',
        value: '\n',
        span: {
          line: lineNum,
          column: lineText.length + 1,
          start: lineStartOffset + lineText.length,
          end: lineStartOffset + lineText.length + 1
        }
      } as Token);
    }
  }

  const finalLine = lines.length || 1;
  const finalOffset = source.length;
  tokens.push({
    type: 'EOF',
    value: '',
    span: {
      line: finalLine,
      column: 1,
      start: finalOffset,
      end: finalOffset
    }
  } as Token);

  return { tokens, errors };
}
