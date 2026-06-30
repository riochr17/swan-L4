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

export { tokenize } from './tokenizer';
export type { Token, TokenType, TokenizeResult, TokenizeError, Span } from './tokenizer';

export { parse } from './parser';
export type {
  ASTNode,
  ProgramNode,
  DefineNode,
  TitleNode,
  StatementNode,
  SayStatementNode,
  SayThinkStatementNode,
  ListenStatementNode,
  ThinkStatementNode,
  CallStatementNode,
  AskStatementNode,
  IfStatementNode,
  ElseStatementNode,
  LoopStatementNode,
  ExitLoopStatementNode,
  ContinueLoopStatementNode,
  ExitStatementNode,
  ReadStatementNode,
  WriteStatementNode,
  ParseError,
  ParseResult
} from './parser';

export { setLocale, getLocale } from './i18n';
