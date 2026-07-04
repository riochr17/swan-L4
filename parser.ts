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

import { Token, Span } from './tokenizer';
import { t } from './i18n';

export interface ASTNode {
  type: string;
  span: Span;
  debug?: boolean;
  assignVar?: string;
}

export interface ProgramNode extends ASTNode {
  type: 'Program';
  title: TitleNode | null;
  defines: DefineNode[];
  body: StatementNode[];
}

export interface TitleNode extends ASTNode {
  type: 'Title';
  value: string;
}

export interface DefineNode extends ASTNode {
  type: 'Define';
  name: string;
  url: string;
}

export type StatementNode =
  | SayStatementNode
  | SayThinkStatementNode
  | ListenStatementNode
  | ThinkStatementNode
  | CallStatementNode
  | AskStatementNode
  | IfStatementNode
  | ElseStatementNode
  | LoopStatementNode
  | ExitLoopStatementNode
  | ContinueLoopStatementNode
  | ExitStatementNode
  | ReadStatementNode
  | WriteStatementNode
  | FindStatementNode
  | ParalelStatementNode
  | IterateStatementNode
  | ExitIterationStatementNode
  | ContinueIterationStatementNode
  | ClearContextStatementNode
  ;

export interface ParalelStatementNode extends ASTNode {
  type: 'Paralel';
  body: StatementNode[];
}

export interface FindContext {
  type: 'raw' | 'explicit' | 'implicit';
  value: string;
}

export interface FindStatementNode extends ASTNode {
  type: 'Find';
  resultChunks: number;
  totalChunks: number;
  query: string | null;
  sourceContext: FindContext | null;
}

export interface ReadStatementNode extends ASTNode {
  type: 'Read';
  path: string | null;
}

export interface WriteStatementNode extends ASTNode {
  type: 'Write';
  path: string | null;
  content: string | null;
}

export interface AskStatementNode extends ASTNode {
  type: 'Ask';
  agentName: string;
  argument: string | null;
}

export interface SayStatementNode extends ASTNode {
  type: 'Say';
  argument: string | null;
}

export interface SayThinkStatementNode extends ASTNode {
  type: 'SayThink';
  argument: string | null;
}

export interface ListenStatementNode extends ASTNode {
  type: 'Listen';
}

export interface ThinkStatementNode extends ASTNode {
  type: 'Think';
  argument: string | null;
}

export interface CallStatementNode extends ASTNode {
  type: 'Call';
  macroName: string;
  argument: string | null;
}

export interface IfStatementNode extends ASTNode {
  type: 'If';
  condition: string | null;
  body: StatementNode[];
  elseBlock: ElseStatementNode | null;
}

export interface ElseStatementNode extends ASTNode {
  type: 'Else';
  body: StatementNode[];
}

export interface LoopStatementNode extends ASTNode {
  type: 'Loop';
  body: StatementNode[];
}

export interface ExitLoopStatementNode extends ASTNode {
  type: 'ExitLoop';
}

export interface ContinueLoopStatementNode extends ASTNode {
  type: 'ContinueLoop';
}

export interface ExitStatementNode extends ASTNode {
  type: 'Exit';
}

export interface IterateStatementNode extends ASTNode {
  type: 'Iterate';
  argument: string | null;
  body: StatementNode[];
}

export interface ExitIterationStatementNode extends ASTNode {
  type: 'ExitIteration';
}

export interface ContinueIterationStatementNode extends ASTNode {
  type: 'ContinueIteration';
}

export interface ClearContextStatementNode extends ASTNode {
  type: 'ClearContext';
}

export interface ParseError {
  errorKey: string;
  args?: Record<string, string | number>;
  message: string;
  span: Span;
}

export interface ParseResult {
  ast: ProgramNode;
  errors: ParseError[];
}

interface ParseLine {
  lineNum: number;
  indentLevel: number;
  tokens: Token[];
}

function processLineTokens(lineTokens: Token[]): ParseLine {
  let indentLevel = 0;
  while (indentLevel < lineTokens.length && lineTokens[indentLevel]?.type === 'INDENT') {
    indentLevel++;
  }
  const actualTokens = lineTokens.slice(indentLevel);
  const lineNum = lineTokens[0]?.span.line ?? 1;
  return {
    lineNum,
    indentLevel,
    tokens: actualTokens
  };
}

export function parse(tokens: Token[]): ParseResult {
  const errors: ParseError[] = [];
  const lines: ParseLine[] = [];
  let currentLineTokens: Token[] = [];

  for (const t of tokens) {
    if (t.type === 'EOF') {
      if (currentLineTokens.length > 0) {
        lines.push(processLineTokens(currentLineTokens));
      }
      break;
    }
    if (t.type === 'NEWLINE') {
      if (currentLineTokens.length > 0) {
        lines.push(processLineTokens(currentLineTokens));
        currentLineTokens = [];
      }
    } else {
      currentLineTokens.push(t);
    }
  }

  let index = 0;
  const defines: DefineNode[] = [];
  const definedMacros = new Set<string>();
  let inLoopDepth = 0;
  let inIterationDepth = 0;

  function curLine(): ParseLine | undefined {
    return lines[index];
  }

  let titleNode: TitleNode | null = null;
  let seenDefine = false;

  // Phase 1: Parse TITLE and DEFINE statements at the absolute top
  while (index < lines.length) {
    const line = curLine();
    if (!line) break;
    if (line.tokens.length === 0) {
      index++;
      continue;
    }
    const first = line.tokens[0];
    if (first && first.type === 'TITLE') {
      if (line.indentLevel !== 0) {
        errors.push({
          errorKey: 'title_indented',
          message: t('title_indented'),
          span: first.span
        });
      }
      if (titleNode) {
        errors.push({
          errorKey: 'title_multiple',
          message: t('title_multiple'),
          span: first.span
        });
      }
      if (seenDefine) {
        errors.push({
          errorKey: 'title_misplaced_after_define',
          message: t('title_misplaced_after_define'),
          span: first.span
        });
      }
      const argToken = line.tokens[1];
      if (!argToken || argToken.type !== 'STRING') {
        errors.push({
          errorKey: 'expected_title_string',
          message: t('expected_title_string'),
          span: first.span
        });
      } else {
        if (!titleNode) {
          titleNode = {
            type: 'Title',
            value: argToken.value,
            debug: first.debug,
            span: {
              line: line.lineNum,
              column: first.span.column,
              start: first.span.start,
              end: argToken.span.end
            }
          };
        }
      }
      index++;
    } else if (first && first.type === 'DEFINE') {
      seenDefine = true;
      if (line.indentLevel !== 0) {
        errors.push({
          errorKey: 'define_indented',
          message: t('define_indented'),
          span: first.span
        });
      }
      const idToken = line.tokens[1];
      const urlToken = line.tokens[2];
      if (!idToken || idToken.type !== 'IDENTIFIER') {
        errors.push({
          errorKey: 'expected_define_id',
          message: t('expected_define_id'),
          span: first.span
        });
      } else if (!idToken.value.startsWith('CALL_') && !idToken.value.startsWith('AGENT_')) {
        errors.push({
          errorKey: 'invalid_macro_prefix',
          args: { identifier: idToken.value },
          message: t('invalid_macro_prefix', { identifier: idToken.value }),
          span: idToken.span
        });
      } else {
        const isAgent = idToken.value.startsWith('AGENT_');
        if (!urlToken || urlToken.type !== 'URL') {
          errors.push({
            errorKey: isAgent ? 'expected_define_url_or_path' : 'expected_define_url',
            message: t(isAgent ? 'expected_define_url_or_path' : 'expected_define_url'),
            span: idToken.span
          });
        } else {
          const val = urlToken.value;
          const valid = isAgent ? (isValidUrl(val) || isValidFilePath(val)) : isValidUrl(val);
          if (!valid) {
            errors.push({
              errorKey: isAgent ? 'expected_define_url_or_path' : 'expected_define_url',
              message: t(isAgent ? 'expected_define_url_or_path' : 'expected_define_url'),
              span: urlToken.span
            });
          } else {
            defines.push({
              type: 'Define',
              name: idToken.value,
              url: val,
              debug: first.debug,
              span: {
                line: line.lineNum,
                column: first.span.column,
                start: first.span.start,
                end: urlToken.span.end
              }
            });
            definedMacros.add(idToken.value);
          }
        }
      }
      index++;
    } else {
      break;
    }
  }

  // Phase 2: Parse statements
  function parseBlock(expectedLevel: number): StatementNode[] {
    const blockStmts: StatementNode[] = [];

    while (index < lines.length) {
      const line = curLine();
      if (!line) break;
      if (line.tokens.length === 0) {
        index++;
        continue;
      }

      if (line.tokens[0]?.type === 'DEFINE') {
        errors.push({
          errorKey: 'define_not_at_top',
          message: t('define_not_at_top'),
          span: line.tokens[0].span
        });
        index++;
        continue;
      }

      if (line.tokens[0]?.type === 'TITLE') {
        errors.push({
          errorKey: 'title_not_at_top',
          message: t('title_not_at_top'),
          span: line.tokens[0].span
        });
        index++;
        continue;
      }

      if (line.indentLevel < expectedLevel) {
        break;
      }

      if (line.indentLevel > expectedLevel) {
        errors.push({
          errorKey: 'unexpected_indent',
          args: { expectedLevel, indentLevel: line.indentLevel },
          message: t('unexpected_indent', { expectedLevel, indentLevel: line.indentLevel }),
          span: line.tokens[0]?.span ?? { line: line.lineNum, column: 1, start: 0, end: 0 }
        });
      }

      const stmt = parseStatement(line, expectedLevel);
      if (stmt) {
        blockStmts.push(stmt);
      }
      index++;
    }

    return blockStmts;
  }

  function parseElse(line: ParseLine, level: number): ElseStatementNode {
    const tokens = line.tokens;
    const first = tokens[0]!;
    const span = {
      line: line.lineNum,
      column: first.span.column,
      start: first.span.start,
      end: tokens[tokens.length - 1]?.span.end ?? first.span.end
    };

    const lastToken = tokens[tokens.length - 1];
    if (!lastToken || lastToken.type !== 'COLON') {
      errors.push({
        errorKey: 'expected_else_colon',
        message: t('expected_else_colon'),
        span: lastToken?.span ?? first.span
      });
    }

    index++;
    const body = parseBlock(level + 1);
    index--;

    if (body.length === 0) {
      errors.push({
        errorKey: 'empty_else_block',
        message: t('empty_else_block'),
        span: first.span
      });
    }

    return {
      type: 'Else',
      body,
      span
    };
  }

  function parseStatement(line: ParseLine, level: number): StatementNode | null {
    const tokens = line.tokens;
    if (tokens.length === 0) return null;
    const first = tokens[0];
    if (!first) return null;

    let hasVariable = false;
    let varName = '';
    let startToken = first;
    let actualTokens = tokens;

    if (first.type === 'VARIABLE') {
      hasVariable = true;
      varName = first.value;
      if (tokens.length < 2) {
        errors.push({
          errorKey: 'expected_statement_after_variable',
          message: t('expected_statement_after_variable'),
          span: first.span
        });
        return null;
      }
      startToken = tokens[1]!;
      actualTokens = tokens.slice(1);
    }

    const node = parseStatementInner({ ...line, tokens: actualTokens }, level);
    if (node) {
      if (startToken.debug) {
        node.debug = true;
      }
      if (hasVariable) {
        node.assignVar = varName;
      }
    }
    return node;
  }

  function parseStatementInner(line: ParseLine, level: number): StatementNode | null {
    const tokens = line.tokens;
    if (tokens.length === 0) return null;
    const first = tokens[0];
    if (!first) return null;

    const span = {
      line: line.lineNum,
      column: first.span.column,
      start: first.span.start,
      end: tokens[tokens.length - 1]?.span.end ?? first.span.end
    };

    switch (first.type) {
      case 'SAY': {
        const arg = tokens[1];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_say_arg',
              message: t('expected_say_arg'),
              span: arg.span
            });
          }
        }
        return {
          type: 'Say',
          argument: val,
          span
        };
      }

      case 'SAY_THINK': {
        const arg = tokens[1];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_say_think_arg',
              message: t('expected_say_think_arg'),
              span: arg.span
            });
          }
        }
        return {
          type: 'SayThink',
          argument: val,
          span
        };
      }

      case 'LISTEN': {
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'listen_no_args',
            message: t('listen_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'Listen',
          span
        };
      }

      case 'THINK': {
        const arg = tokens[1];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_think_arg',
              message: t('expected_think_arg'),
              span: arg.span
            });
          }
        }
        return {
          type: 'Think',
          argument: val,
          span
        };
      }

      case 'ASK': {
        const agentToken = tokens[1];
        let agentName = '';
        if (!agentToken || agentToken.type !== 'IDENTIFIER') {
          errors.push({
            errorKey: 'expected_ask_agent',
            message: t('expected_ask_agent'),
            span: first.span
          });
        } else {
          agentName = agentToken.value;
          if (!agentName.startsWith('AGENT_')) {
            errors.push({
              errorKey: 'invalid_agent_prefix',
              args: { identifier: agentName },
              message: t('invalid_agent_prefix', { identifier: agentName }),
              span: agentToken.span
            });
          } else if (!definedMacros.has(agentName)) {
            errors.push({
              errorKey: 'undefined_macro',
              args: { identifier: agentName },
              message: t('undefined_macro', { identifier: agentName }),
              span: agentToken.span
            });
          }
        }

        const arg = tokens[2];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_ask_arg',
              message: t('expected_ask_arg'),
              span: arg.span
            });
          }
        }

        return {
          type: 'Ask',
          agentName,
          argument: val,
          span
        };
      }

      case 'IDENTIFIER': {
        if (!first.value.startsWith('CALL_')) {
          errors.push({
            errorKey: 'invalid_macro_prefix',
            args: { identifier: first.value },
            message: t('invalid_macro_prefix', { identifier: first.value }),
            span: first.span
          });
        } else if (!definedMacros.has(first.value)) {
          errors.push({
            errorKey: 'undefined_macro',
            args: { identifier: first.value },
            message: t('undefined_macro', { identifier: first.value }),
            span: first.span
          });
        }
        const arg = tokens[1];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_macro_arg',
              message: t('expected_macro_arg'),
              span: arg.span
            });
          }
        }
        return {
          type: 'Call',
          macroName: first.value,
          argument: val,
          span
        };
      }

      case 'EXIT_LOOP': {
        if (inLoopDepth === 0) {
          errors.push({
            errorKey: 'exit_loop_outside_loop',
            message: t('exit_loop_outside_loop'),
            span: first.span
          });
        }
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'exit_loop_no_args',
            message: t('exit_loop_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'ExitLoop',
          span
        };
      }

      case 'EXIT_ITERATION': {
        if (inIterationDepth === 0) {
          errors.push({
            errorKey: 'exit_iteration_outside_iteration',
            message: t('exit_iteration_outside_iteration'),
            span: first.span
          });
        }
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'exit_iteration_no_args',
            message: t('exit_iteration_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'ExitIteration',
          span
        };
      }

      case 'CONTINUE_ITERATION': {
        if (inIterationDepth === 0) {
          errors.push({
            errorKey: 'continue_iteration_outside_iteration',
            message: t('continue_iteration_outside_iteration'),
            span: first.span
          });
        }
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'continue_iteration_no_args',
            message: t('continue_iteration_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'ContinueIteration',
          span
        };
      }

      case 'CLEAR_CONTEXT': {
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'clear_context_no_args',
            message: t('clear_context_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'ClearContext',
          span
        };
      }

      case 'ITERATE': {
        const lastToken = tokens[tokens.length - 1];
        if (!lastToken || lastToken.type !== 'COLON') {
          errors.push({
            errorKey: 'expected_iterate_colon',
            message: t('expected_iterate_colon'),
            span: lastToken?.span ?? first.span
          });
        }

        let argument: string | null = null;
        const argToken = tokens[1];
        if (argToken && argToken.type === 'STRING') {
          argument = argToken.value;
        }

        inIterationDepth++;
        index++;
        const body = parseBlock(level + 1);
        index--;
        inIterationDepth--;

        if (body.length === 0) {
          errors.push({
            errorKey: 'empty_iterate_block',
            message: t('empty_iterate_block'),
            span: first.span
          });
        }

        return {
          type: 'Iterate',
          argument,
          body,
          span
        };
      }

      case 'CONTINUE_LOOP': {
        if (inLoopDepth === 0) {
          errors.push({
            errorKey: 'continue_loop_outside_loop',
            message: t('continue_loop_outside_loop'),
            span: first.span
          });
        }
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'continue_loop_no_args',
            message: t('continue_loop_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'ContinueLoop',
          span
        };
      }

      case 'EXIT': {
        if (tokens.length > 1) {
          errors.push({
            errorKey: 'exit_no_args',
            message: t('exit_no_args'),
            span: tokens[1]?.span ?? first.span
          });
        }
        return {
          type: 'Exit',
          span
        };
      }

      case 'IF': {
        const condToken = tokens[1];
        let condition: string | null = null;

        if (!condToken) {
          errors.push({
            errorKey: 'expected_if_cond',
            message: t('expected_if_cond'),
            span: first.span
          });
        } else if (condToken.type === 'STRING') {
          condition = condToken.value;
        } else {
          errors.push({
            errorKey: 'expected_if_cond_string',
            message: t('expected_if_cond_string'),
            span: condToken.span
          });
        }

        const lastToken = tokens[tokens.length - 1];
        if (!lastToken || lastToken.type !== 'COLON') {
          errors.push({
            errorKey: 'expected_if_colon',
            message: t('expected_if_colon'),
            span: lastToken?.span ?? first.span
          });
        }

        index++;
        const body = parseBlock(level + 1);
        index--;

        if (body.length === 0) {
          errors.push({
            errorKey: 'empty_if_block',
            message: t('empty_if_block'),
            span: first.span
          });
        }

        let elseBlock: ElseStatementNode | null = null;
        let nextIdx = index + 1;
        while (nextIdx < lines.length && lines[nextIdx]?.tokens.length === 0) {
          nextIdx++;
        }

        if (nextIdx < lines.length) {
          const nextLine = lines[nextIdx];
          if (nextLine && nextLine.indentLevel === level && nextLine.tokens[0]?.type === 'ELSE') {
            index = nextIdx;
            elseBlock = parseElse(nextLine, level);
          }
        }

        return {
          type: 'If',
          condition,
          body,
          elseBlock,
          span
        };
      }

      case 'ELSE': {
        errors.push({
          errorKey: 'else_without_if',
          message: t('else_without_if'),
          span: first.span
        });

        const lastToken = tokens[tokens.length - 1];
        if (!lastToken || lastToken.type !== 'COLON') {
          errors.push({
            errorKey: 'expected_else_colon',
            message: t('expected_else_colon'),
            span: lastToken?.span ?? first.span
          });
        }

        index++;
        const body = parseBlock(level + 1);
        index--;

        return {
          type: 'Else',
          body,
          span
        };
      }

      case 'LOOP': {
        const lastToken = tokens[tokens.length - 1];
        if (!lastToken || lastToken.type !== 'COLON') {
          errors.push({
            errorKey: 'expected_loop_colon',
            message: t('expected_loop_colon'),
            span: lastToken?.span ?? first.span
          });
        }

        inLoopDepth++;
        index++;
        const body = parseBlock(level + 1);
        index--;
        inLoopDepth--;

        if (body.length === 0) {
          errors.push({
            errorKey: 'empty_loop_block',
            message: t('empty_loop_block'),
            span: first.span
          });
        }

        return {
          type: 'Loop',
          body,
          span
        };
      }

      case 'PARALEL': {
        const lastToken = tokens[tokens.length - 1];
        if (!lastToken || lastToken.type !== 'COLON') {
          errors.push({
            errorKey: 'expected_paralel_colon',
            message: t('expected_paralel_colon'),
            span: lastToken?.span ?? first.span
          });
        }

        index++;
        const body = parseBlock(level + 1);
        index--;

        if (body.length === 0) {
          errors.push({
            errorKey: 'empty_paralel_block',
            message: t('empty_paralel_block'),
            span: first.span
          });
        }

        return {
          type: 'Paralel',
          body,
          span
        };
      }

      case 'READ': {
        const arg = tokens[1];
        let val: string | null = null;
        if (arg) {
          if (arg.type === 'STRING') {
            val = arg.value;
          } else {
            errors.push({
              errorKey: 'expected_read_path',
              message: t('expected_read_path'),
              span: arg.span
            });
          }
        } else {
          errors.push({
            errorKey: 'expected_read_path',
            message: t('expected_read_path'),
            span: first.span
          });
        }
        return {
          type: 'Read',
          path: val,
          span
        };
      }

      case 'WRITE': {
        const pathArg = tokens[1];
        const contentArg = tokens[2];
        let pathVal: string | null = null;
        let contentVal: string | null = null;

        if (pathArg) {
          if (pathArg.type === 'STRING') {
            pathVal = pathArg.value;
          } else {
            errors.push({
              errorKey: 'expected_write_path',
              message: t('expected_write_path'),
              span: pathArg.span
            });
          }
        } else {
          errors.push({
            errorKey: 'expected_write_path',
            message: t('expected_write_path'),
            span: first.span
          });
        }

        if (contentArg) {
          if (contentArg.type === 'STRING') {
            contentVal = contentArg.value;
          } else {
            errors.push({
              errorKey: 'expected_write_content',
              message: t('expected_write_content'),
              span: contentArg.span
            });
          }
        }

        return {
          type: 'Write',
          path: pathVal,
          content: contentVal,
          span
        };
      }

      case 'FIND': {
        const ratioArg = tokens[1];
        const queryArg = tokens[2];
        const contextArg = tokens[3];

        let resultChunks = 0;
        let totalChunks = 0;
        let queryVal: string | null = null;
        let contextVal: FindContext | null = null;

        if (ratioArg && ratioArg.type === 'STRING') {
          const ratioVal = ratioArg.value;
          const ratioParts = ratioVal.split('/');
          resultChunks = parseInt(ratioParts[0] || '0', 10);
          totalChunks = parseInt(ratioParts[1] || '0', 10);
        } else {
          errors.push({
            errorKey: 'invalid_find_ratio',
            message: t('invalid_find_ratio'),
            span: first.span
          });
        }

        if (queryArg) {
          if (queryArg.type === 'STRING') {
            queryVal = queryArg.value;
          } else {
            errors.push({
              errorKey: 'expected_find_query',
              message: t('expected_find_query'),
              span: queryArg.span
            });
          }
        } else {
          errors.push({
            errorKey: 'expected_find_query',
            message: t('expected_find_query'),
            span: ratioArg ? ratioArg.span : first.span
          });
        }



        if (contextArg && contextArg.type === 'STRING') {
          const rawVal = contextArg.value;
          const varMatch = rawVal.match(/^\{\$([a-zA-Z0-9_]+)\}$/);
          if (varMatch) {
            contextVal = {
              type: 'explicit',
              value: '$' + varMatch[1]
            };
          } else if (rawVal === '{Context}') {
            contextVal = {
              type: 'implicit',
              value: 'Context'
            };
          } else {
            contextVal = {
              type: 'raw',
              value: rawVal
            };
          }
        } else {
          contextVal = {
            type: 'implicit',
            value: 'Context'
          };
        }

        return {
          type: 'Find',
          resultChunks,
          totalChunks,
          query: queryVal,
          sourceContext: contextVal,
          span
        };
      }

      default: {
        errors.push({
          errorKey: 'unexpected_start_token',
          args: { token: first.value },
          message: t('unexpected_start_token', { token: first.value }),
          span: first.span
        });
        return null;
      }
    }
  }

  const body = parseBlock(0);

  const finalLine = lines.length || 1;
  const finalOffset = sourceLength(tokens);
  const ast: ProgramNode = {
    type: 'Program',
    title: titleNode,
    defines,
    body,
    span: {
      line: 1,
      column: 1,
      start: 0,
      end: finalOffset
    }
  };

  return { ast, errors };
}

function sourceLength(tokens: Token[]): number {
  if (tokens.length === 0) return 0;
  return tokens[tokens.length - 1]?.span.end ?? 0;
}

function isValidUrl(val: string): boolean {
  return /^(https?:\/\/)[^\s]+$/.test(val);
}

function isValidFilePath(val: string): boolean {
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(val);
}
