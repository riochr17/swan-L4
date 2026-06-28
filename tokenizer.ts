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
  | 'VARIABLE'
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
  VARIABLE: { type: 'VARIABLE'; value: string };
}

export type Token = {
  [K in TokenType]: TokenMap[K] & { span: Span; debug?: boolean };
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

function matchKeywordOrDebug(str: string, keyword: string): { matched: boolean; isDebug: boolean; length: number } {
  if (matchKeyword(str, keyword)) {
    return { matched: true, isDebug: false, length: keyword.length };
  }
  const bracketed = `[${keyword}]`;
  if (str.startsWith(bracketed)) {
    const nextChar = str[bracketed.length];
    if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
      return { matched: false, isDebug: false, length: 0 };
    }
    return { matched: true, isDebug: true, length: bracketed.length };
  }
  return { matched: false, isDebug: false, length: 0 };
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

    // Check if the statement starts with a variable assignment: $[a-zA-Z0-9_]+
    const varMatch = remaining.match(/^\$[a-zA-Z0-9_]+/);
    if (varMatch) {
      const varLen = varMatch[0].length;
      tokens.push({
        type: 'VARIABLE',
        value: varMatch[0],
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + varLen
        }
      } as Token);
      hasTokensOnThisLine = true;
      remaining = remaining.slice(varLen);
      relativeOffset += varLen;

      // Skip whitespace after variable
      const postVarMatch = remaining.match(/^([ \t]*)/);
      const postVarLen = postVarMatch ? postVarMatch[0].length : 0;
      remaining = remaining.slice(postVarLen);
      relativeOffset += postVarLen;
    }

    // 1. CONTINUE LOOP
    const continueLoopMatch = matchKeywordOrDebug(remaining, 'CONTINUE LOOP');
    const exitLoopMatch = matchKeywordOrDebug(remaining, 'EXIT LOOP');
    const titleMatch = matchKeywordOrDebug(remaining, 'TITLE');
    const exitMatch = matchKeywordOrDebug(remaining, 'EXIT');

    if (continueLoopMatch.matched) {
      tokens.push({
        type: 'CONTINUE_LOOP',
        value: 'CONTINUE LOOP',
        debug: continueLoopMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + continueLoopMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2. EXIT LOOP
    else if (exitLoopMatch.matched) {
      tokens.push({
        type: 'EXIT_LOOP',
        value: 'EXIT LOOP',
        debug: exitLoopMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + exitLoopMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2.2. TITLE
    else if (titleMatch.matched) {
      tokens.push({
        type: 'TITLE',
        value: 'TITLE',
        debug: titleMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + titleMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(titleMatch.length);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + titleMatch.length));
      }
    }
    // 2.5. EXIT
    else if (exitMatch.matched) {
      tokens.push({
        type: 'EXIT',
        value: 'EXIT',
        debug: exitMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + exitMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 2.75. ASK
    const askMatch = matchKeywordOrDebug(remaining, 'ASK');
    const sayThinkMatch = matchKeywordOrDebug(remaining, 'SAY THINK');
    const sayMatch = matchKeywordOrDebug(remaining, 'SAY');
    const listenMatch = matchKeywordOrDebug(remaining, 'LISTEN');

    if (askMatch.matched) {
      tokens.push({
        type: 'ASK',
        value: 'ASK',
        debug: askMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + askMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      let rest = remaining.slice(askMatch.length);
      let restOffset = relativeOffset + askMatch.length;

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
    else if (sayThinkMatch.matched) {
      tokens.push({
        type: 'SAY_THINK',
        value: 'SAY THINK',
        debug: sayThinkMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + sayThinkMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(sayThinkMatch.length);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + sayThinkMatch.length));
      }
    }
    // 4. SAY
    else if (sayMatch.matched) {
      tokens.push({
        type: 'SAY',
        value: 'SAY',
        debug: sayMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + sayMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(sayMatch.length);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + sayMatch.length));
      }
    }
    // 5. LISTEN
    else if (listenMatch.matched) {
      tokens.push({
        type: 'LISTEN',
        value: 'LISTEN',
        debug: listenMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + listenMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    // 6. THINK
    const thinkMatch = matchKeywordOrDebug(remaining, 'THINK');
    const ifMatch = matchKeywordOrDebug(remaining, 'IF');
    const elseMatch = matchKeywordOrDebug(remaining, 'ELSE');
    const loopMatch = matchKeywordOrDebug(remaining, 'LOOP');

    if (thinkMatch.matched) {
      tokens.push({
        type: 'THINK',
        value: 'THINK',
        debug: thinkMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + thinkMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(thinkMatch.length);
      if (argText.trim().length > 0) {
        tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + thinkMatch.length));
      }
    }
    // 7. IF
    else if (ifMatch.matched) {
      tokens.push({
        type: 'IF',
        value: 'IF',
        debug: ifMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + ifMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(ifMatch.length);
      const colonIdx = rest.lastIndexOf(':');
      if (colonIdx !== -1) {
        const argText = rest.slice(0, colonIdx);
        if (argText.trim().length > 0) {
          tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + ifMatch.length));
        }
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + ifMatch.length + colonIdx + 1,
            start: lineStartOffset + relativeOffset + ifMatch.length + colonIdx,
            end: lineStartOffset + relativeOffset + ifMatch.length + colonIdx + 1
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
    else if (elseMatch.matched) {
      const elseLen = elseMatch.length;
      tokens.push({
        type: 'ELSE',
        value: 'ELSE',
        debug: elseMatch.isDebug,
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
    else if (loopMatch.matched) {
      const loopLen = loopMatch.length;
      tokens.push({
        type: 'LOOP',
        value: 'LOOP',
        debug: loopMatch.isDebug,
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
    const defineMatch = matchKeywordOrDebug(remaining, '#DEFINE');
    if (defineMatch.matched) {
      tokens.push({
        type: 'DEFINE',
        value: '#DEFINE',
        debug: defineMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + defineMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      let rest = remaining.slice(defineMatch.length);
      let restOffset = relativeOffset + defineMatch.length;

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
    else if (remaining.startsWith('CALL_') || remaining.startsWith('[CALL_')) {
      let isDebug = false;
      let matchStr = remaining;
      if (remaining.startsWith('[')) {
        const closeIdx = remaining.indexOf(']');
        if (closeIdx !== -1) {
          const inside = remaining.slice(1, closeIdx);
          if (inside.startsWith('CALL_')) {
            isDebug = true;
            matchStr = inside;
          }
        }
      }

      const idMatch = matchStr.match(/^CALL_[a-zA-Z0-9_]*/);
      if (idMatch) {
        const idLen = idMatch[0].length;
        const tokenLen = isDebug ? idLen + 2 : idLen;
        tokens.push({
          type: 'IDENTIFIER',
          value: idMatch[0],
          debug: isDebug,
          span: {
            line: lineNum,
            column: relativeOffset + 1,
            start: lineStartOffset + relativeOffset,
            end: lineStartOffset + relativeOffset + tokenLen
          }
        } as Token);
        hasTokensOnThisLine = true;
        const argText = remaining.slice(tokenLen);
        if (argText.trim().length > 0) {
          tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + tokenLen));
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
