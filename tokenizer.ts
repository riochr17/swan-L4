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
import { extractCodePart } from './tokenizer/extract-code-part';
import { getIndentLevel } from './tokenizer/get-indent-level';
import { isIndentMultipleByUnit } from './tokenizer/is-indent-multipe-by-unit';

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
  | 'READ'
  | 'WRITE'
  | 'FIND'
  | 'PARALEL'
  | 'ITERATE'
  | 'EXIT_ITERATION'
  | 'CONTINUE_ITERATION'
  | 'CLEAR_CONTEXT'
  | 'CONTEXT'
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
  READ: { type: 'READ'; value: 'READ' };
  WRITE: { type: 'WRITE'; value: 'WRITE' };
  FIND: { type: 'FIND'; value: 'FIND' };
  PARALEL: { type: 'PARALEL'; value: 'PARALEL' };
  ITERATE: { type: 'ITERATE'; value: 'ITERATE' };
  EXIT_ITERATION: { type: 'EXIT_ITERATION'; value: 'EXIT ITERATION' };
  CONTINUE_ITERATION: { type: 'CONTINUE_ITERATION'; value: 'CONTINUE ITERATION' };
  CLEAR_CONTEXT: { type: 'CLEAR_CONTEXT'; value: 'CLEAR CONTEXT' };
  CONTEXT: { type: 'CONTEXT'; value: 'CONTEXT' };
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
    let maxScore = -1;
    let bestCandidate = 2; // Default fallback
    for (const c of candidates) {
      const score = spaceCounts.filter(n => n % c === 0).length;
      if (score > maxScore) {
        maxScore = score;
        bestCandidate = c;
      } else if (score === maxScore && c > bestCandidate) {
        bestCandidate = c;
      }
    }
    indentUnit = bestCandidate;
  }

  let currentOffset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx] ?? '';
    const lineNum = lineIdx + 1;
    const lineStartOffset = currentOffset;
    currentOffset += lineText.length + (lineIdx < lines.length - 1 ? (source[lineStartOffset + lineText.length] === '\r' ? 2 : 1) : 0);

    const codePart = extractCodePart(lineText);
    if (codePart == '') {
      continue;
    }

    function parseAndPushStringArg(rest: string, restOffset: number) {
      // Skip whitespace
      const wsMatch = rest.match(/^([ \t]+)/);
      let content = rest;
      let offset = restOffset;
      if (wsMatch) {
        const wsLen = wsMatch[0].length;
        content = rest.slice(wsLen);
        offset += wsLen;
      }

      if (content.startsWith('```')) {
        let blockLines: string[] = [];
        let foundEnd = false;
        const blockStartLine = lineNum;
        const blockStartCol = offset + 1;
        const blockStartOffset = lineStartOffset + offset;

        let nextLineIdx = lineIdx + 1;
        while (nextLineIdx < lines.length) {
          const nextLine = lines[nextLineIdx] ?? '';
          if (nextLine.trim() === '```') {
            foundEnd = true;
            break;
          }
          blockLines.push(nextLine);
          nextLineIdx++;
        }

        if (foundEnd) {
          const blockContent = blockLines.join('\n');
          let endOffset = blockStartOffset + content.length;
          let endLine = lineNum;
          let endCol = offset + content.length + 1;

          let tempOffset = lineStartOffset + lineText.length + (lineIdx < lines.length - 1 ? (source[lineStartOffset + lineText.length] === '\r' ? 2 : 1) : 0);
          for (let idx = lineIdx + 1; idx <= nextLineIdx; idx++) {
            const lText = lines[idx] ?? '';
            if (idx === nextLineIdx) {
              const trimStartSpace = lText.length - lText.trimStart().length;
              endLine = idx + 1;
              endCol = trimStartSpace + 4;
              endOffset = tempOffset + trimStartSpace + 3;
            } else {
              tempOffset += lText.length + (idx < lines.length - 1 ? (source[tempOffset + lText.length] === '\r' ? 2 : 1) : 0);
            }
          }

          tokens.push({
            type: 'STRING',
            value: blockContent,
            span: {
              line: blockStartLine,
              column: blockStartCol,
              start: blockStartOffset,
              end: endOffset
            }
          } as Token);

          let accumOffset = lineStartOffset;
          for (let idx = lineIdx; idx <= nextLineIdx; idx++) {
            const lText = lines[idx] ?? '';
            accumOffset += lText.length + (idx < lines.length - 1 ? (source[accumOffset + lText.length] === '\r' ? 2 : 1) : 0);
          }
          currentOffset = accumOffset;
          lineIdx = nextLineIdx;
        } else {
          errors.push({
            errorKey: 'unclosed_block_string',
            message: t('unclosed_block_string'),
            span: {
              line: blockStartLine,
              column: blockStartCol,
              start: blockStartOffset,
              end: source.length
            }
          });
          const blockContent = blockLines.join('\n');
          tokens.push({
            type: 'STRING',
            value: blockContent,
            span: {
              line: blockStartLine,
              column: blockStartCol,
              start: blockStartOffset,
              end: source.length
            }
          } as Token);

          currentOffset = source.length;
          lineIdx = lines.length;
        }
      } else {
        if (content.trim().length > 0) {
          tokens.push(parseStringArg(content, lineNum, lineStartOffset, offset));
        }
      }
    }

    // Calculate indentation level and emit INDENT tokens stateless on every line
    const indentMatch = lineText.match(/^([ \t]*)/);
    const indentStr = indentMatch ? indentMatch[0] : '';

    // Validate indentation is multiple of indentUnit
    const { isMultiple, spaceRun } = isIndentMultipleByUnit(indentStr, indentUnit);
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

    // [TOKENS] push indent tokens
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

    // [TOKENS] push variable if statement starts with explicit context
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

    const continueLoopMatch = matchKeywordOrDebug(remaining, 'CONTINUE LOOP');
    const exitLoopMatch = matchKeywordOrDebug(remaining, 'EXIT LOOP');
    const titleMatch = matchKeywordOrDebug(remaining, 'TITLE');
    const exitMatch = matchKeywordOrDebug(remaining, 'EXIT');
    const askMatch = matchKeywordOrDebug(remaining, 'ASK');
    const sayThinkMatch = matchKeywordOrDebug(remaining, 'SAY THINK');
    const sayMatch = matchKeywordOrDebug(remaining, 'SAY');
    const listenMatch = matchKeywordOrDebug(remaining, 'LISTEN');
    const thinkMatch = matchKeywordOrDebug(remaining, 'THINK');
    const ifMatch = matchKeywordOrDebug(remaining, 'IF');
    const elseMatch = matchKeywordOrDebug(remaining, 'ELSE');
    const loopMatch = matchKeywordOrDebug(remaining, 'LOOP');
    const defineMatch = matchKeywordOrDebug(remaining, '#DEFINE');
    const readMatch = matchKeywordOrDebug(remaining, 'READ');
    const writeMatch = matchKeywordOrDebug(remaining, 'WRITE');
    const findMatch = matchKeywordOrDebug(remaining, 'FIND');
    const paralelMatch = matchKeywordOrDebug(remaining, 'PARALEL');
    const iterateMatch = matchKeywordOrDebug(remaining, 'ITERATE');
    const exitIterationMatch = matchKeywordOrDebug(remaining, 'EXIT ITERATION');
    const continueIterationMatch = matchKeywordOrDebug(remaining, 'CONTINUE ITERATION');
    const clearContextMatch = matchKeywordOrDebug(remaining, 'CLEAR CONTEXT');
    const contextMatch = matchKeywordOrDebug(remaining, 'CONTEXT');

    // [TOKENS] push native keywords with no arguments
    if (continueIterationMatch.matched) {
      tokens.push({
        type: 'CONTINUE_ITERATION',
        value: 'CONTINUE ITERATION',
        debug: continueIterationMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + continueIterationMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    else if (exitIterationMatch.matched) {
      tokens.push({
        type: 'EXIT_ITERATION',
        value: 'EXIT ITERATION',
        debug: exitIterationMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + exitIterationMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    else if (clearContextMatch.matched) {
      tokens.push({
        type: 'CLEAR_CONTEXT',
        value: 'CLEAR CONTEXT',
        debug: clearContextMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + clearContextMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
    }
    else if (continueLoopMatch.matched) {
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

    // [TOKENS] push native keywords with simple arguments
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
      parseAndPushStringArg(argText, relativeOffset + titleMatch.length);
    }
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
      parseAndPushStringArg(argText, relativeOffset + sayThinkMatch.length);
    }
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
      parseAndPushStringArg(argText, relativeOffset + sayMatch.length);
    }
    else if (thinkMatch.matched) {
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
      parseAndPushStringArg(argText, relativeOffset + thinkMatch.length);
    }
    else if (readMatch.matched) {
      tokens.push({
        type: 'READ',
        value: 'READ',
        debug: readMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + readMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const argText = remaining.slice(readMatch.length);
      parseAndPushStringArg(argText, relativeOffset + readMatch.length);
    }

    // [TOKENS] push native keywords with complex arguments
    else if (iterateMatch.matched) {
      tokens.push({
        type: 'ITERATE',
        value: 'ITERATE',
        debug: iterateMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + iterateMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(iterateMatch.length);
      const colonIdx = rest.lastIndexOf(':');
      if (colonIdx !== -1) {
        const argText = rest.slice(0, colonIdx);
        if (argText.trim().length > 0) {
          tokens.push(parseStringArg(argText, lineNum, lineStartOffset, relativeOffset + iterateMatch.length));
        }
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + iterateMatch.length + colonIdx + 1,
            start: lineStartOffset + relativeOffset + iterateMatch.length + colonIdx,
            end: lineStartOffset + relativeOffset + iterateMatch.length + colonIdx + 1
          }
        } as Token);
      } else {
        errors.push({
          errorKey: 'expected_iterate_colon',
          message: t('expected_iterate_colon'),
          span: {
            line: lineNum,
            column: lineText.length + 1,
            start: lineStartOffset + lineText.length,
            end: lineStartOffset + lineText.length + 1
          }
        });
      }
    }
    else if (askMatch.matched) {
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

        parseAndPushStringArg(rest, restOffset);
      }
    }
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
    else if (defineMatch.matched) {
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
        parseAndPushStringArg(argText, relativeOffset + tokenLen);
      }
    }
    else if (writeMatch.matched) {
      tokens.push({
        type: 'WRITE',
        value: 'WRITE',
        debug: writeMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + writeMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;

      let rest = remaining.slice(writeMatch.length);
      let restOffset = relativeOffset + writeMatch.length;

      // Skip whitespace
      const wsMatch = rest.match(/^([ \t]+)/);
      if (wsMatch) {
        const wsLen = wsMatch[0].length;
        rest = rest.slice(wsLen);
        restOffset += wsLen;
      }

      let pathVal = '';
      let pathLen = 0;
      let pathStartCol = restOffset + 1;
      let pathStartOffset = lineStartOffset + restOffset;

      if (rest.startsWith('"')) {
        const nextQuote = rest.indexOf('"', 1);
        if (nextQuote !== -1) {
          pathVal = rest.slice(1, nextQuote);
          pathLen = nextQuote + 1;
        } else {
          pathVal = rest.slice(1);
          pathLen = rest.length;
        }
      } else {
        const firstWs = rest.search(/[ \t]/);
        if (firstWs !== -1) {
          pathVal = rest.slice(0, firstWs);
          pathLen = firstWs;
        } else {
          pathVal = rest;
          pathLen = rest.length;
        }
      }

      if (pathLen > 0) {
        tokens.push({
          type: 'STRING',
          value: pathVal,
          span: {
            line: lineNum,
            column: pathStartCol,
            start: pathStartOffset,
            end: pathStartOffset + pathLen
          }
        } as Token);

        rest = rest.slice(pathLen);
        restOffset += pathLen;

        parseAndPushStringArg(rest, restOffset);
      }
    }
    else if (findMatch.matched) {
      tokens.push({
        type: 'FIND',
        value: 'FIND',
        debug: findMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + findMatch.length
        }
      } as Token);
      hasTokensOnThisLine = true;

      let rest = remaining.slice(findMatch.length);
      let restOffset = relativeOffset + findMatch.length;

      // Skip whitespace
      const wsMatch = rest.match(/^([ \t]+)/);
      if (wsMatch) {
        const wsLen = wsMatch[0].length;
        rest = rest.slice(wsLen);
        restOffset += wsLen;
      }

      // Now we expect a ratio: e.g. 3/15
      const ratioMatch = rest.match(/^(\d+\/\d+)/);
      if (ratioMatch) {
        const ratioStr = ratioMatch[0];
        const ratioLen = ratioStr.length;
        tokens.push({
          type: 'STRING',
          value: ratioStr,
          span: {
            line: lineNum,
            column: restOffset + 1,
            start: lineStartOffset + restOffset,
            end: lineStartOffset + restOffset + ratioLen
          }
        } as Token);

        rest = rest.slice(ratioLen);
        restOffset += ratioLen;

        // Skip whitespace
        const wsMatch2 = rest.match(/^([ \t]+)/);
        let contentOffset = restOffset;
        let contentStr = rest;
        if (wsMatch2) {
          const wsLen2 = wsMatch2[0].length;
          contentStr = rest.slice(wsLen2);
          contentOffset += wsLen2;
        }

        const blockIdx = contentStr.indexOf('```');
        if (blockIdx !== -1) {
          const queryVal = contentStr.slice(0, blockIdx).trim();
          if (queryVal.length > 0) {
            tokens.push({
              type: 'STRING',
              value: queryVal,
              span: {
                line: lineNum,
                column: contentOffset + (contentStr.length - contentStr.trimStart().length) + 1,
                start: lineStartOffset + contentOffset + (contentStr.length - contentStr.trimStart().length),
                end: lineStartOffset + contentOffset + (contentStr.length - contentStr.trimStart().length) + queryVal.length
              }
            } as Token);
          }
          const blockStr = contentStr.slice(blockIdx);
          const blockOffset = contentOffset + blockIdx;
          parseAndPushStringArg(blockStr, blockOffset);
        } else {
          // Now split contentStr into query and sourceContext
          // We look for a trailing {$variable} or {Context}
          const contextMatch = contentStr.match(/\s+(\{\$[a-zA-Z0-9_]+\}|\{Context\})\s*$/);
          if (contextMatch) {
            const matchedStr = contextMatch[0];
            const contextStr = contextMatch[1]!;
            const queryVal = contentStr.slice(0, contentStr.length - matchedStr.length).trim();

            // Push query
            if (queryVal.length > 0) {
              tokens.push({
                type: 'STRING',
                value: queryVal,
                span: {
                  line: lineNum,
                  column: contentOffset + 1,
                  start: lineStartOffset + contentOffset,
                  end: lineStartOffset + contentOffset + queryVal.length
                }
              } as Token);
            }

            // Push sourceContext
            const contextStartCol = contentOffset + contentStr.length - matchedStr.length + (matchedStr.length - contextStr.length);
            tokens.push({
              type: 'STRING',
              value: contextStr,
              span: {
                line: lineNum,
                column: contextStartCol + 1,
                start: lineStartOffset + contextStartCol,
                end: lineStartOffset + contextStartCol + contextStr.length
              }
            } as Token);
          } else {
            // No explicit context, push the entire contentStr as query if not empty
            const queryVal = contentStr.trim();
            if (queryVal.length > 0) {
              tokens.push({
                type: 'STRING',
                value: queryVal,
                span: {
                  line: lineNum,
                  column: contentOffset + (contentStr.length - contentStr.trimStart().length) + 1,
                  start: lineStartOffset + contentOffset + (contentStr.length - contentStr.trimStart().length),
                  end: lineStartOffset + contentOffset + (contentStr.length - contentStr.trimStart().length) + queryVal.length
                }
              } as Token);
            }
          }
        }
      } else {
        // Missing or invalid ratio! Push a tokenizer error.
        errors.push({
          errorKey: 'invalid_find_ratio',
          message: t('invalid_find_ratio'),
          span: {
            line: lineNum,
            column: restOffset + 1,
            start: lineStartOffset + restOffset,
            end: lineStartOffset + restOffset + Math.max(1, rest.length)
          }
        });
      }
    }
    else if (paralelMatch.matched) {
      const paralelLen = paralelMatch.length;
      tokens.push({
        type: 'PARALEL',
        value: 'PARALEL',
        debug: paralelMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + paralelLen
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(paralelLen);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + paralelLen + colonIdx + 1,
            start: lineStartOffset + relativeOffset + paralelLen + colonIdx,
            end: lineStartOffset + relativeOffset + paralelLen + colonIdx + 1
          }
        } as Token);
      }
    }
    else if (contextMatch.matched) {
      const contextLen = contextMatch.length;
      tokens.push({
        type: 'CONTEXT',
        value: 'CONTEXT',
        debug: contextMatch.isDebug,
        span: {
          line: lineNum,
          column: relativeOffset + 1,
          start: lineStartOffset + relativeOffset,
          end: lineStartOffset + relativeOffset + contextLen
        }
      } as Token);
      hasTokensOnThisLine = true;
      const rest = remaining.slice(contextLen);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        tokens.push({
          type: 'COLON',
          value: ':',
          span: {
            line: lineNum,
            column: relativeOffset + contextLen + colonIdx + 1,
            start: lineStartOffset + relativeOffset + contextLen + colonIdx,
            end: lineStartOffset + relativeOffset + contextLen + colonIdx + 1
          }
        } as Token);
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
