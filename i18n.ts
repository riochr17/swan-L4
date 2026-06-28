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

export type Locale = 'en' | 'id';

export const translations: Record<string, Record<Locale, string>> = {
  indentation_not_multiple: {
    en: 'Indentation error: expected a multiple of {indentUnit} spaces, got {spaceRun} spaces',
    id: 'Kesalahan indentasi: spasi harus kelipatan {indentUnit}, tapi disini {spaceRun} spasi'
  },
  unrecognized_statement: {
    en: "Unrecognized statement: '{remaining}'",
    id: "Statement tidak dikenal: '{remaining}'"
  },
  expected_if_colon: {
    en: "Expected ':' at the end of IF statement",
    id: "Harusnya ada ':' di akhir pernyataan IF"
  },
  define_indented: {
    en: '#DEFINE directives must not be indented',
    id: 'Keyword #DEFINE tidak boleh menjorok (diindentasi)'
  },
  expected_define_id: {
    en: 'Expected macro identifier after #DEFINE',
    id: 'Harusnya ada pengenal makro setelah #DEFINE'
  },
  expected_define_url: {
    en: 'Expected URL after macro identifier',
    id: 'Harusnya ada URL setelah pengenal makro'
  },
  define_not_at_top: {
    en: '#DEFINE directives must be at the absolute top of the file',
    id: 'Keyword #DEFINE harus berada di bagian paling atas berkas'
  },
  unexpected_indent: {
    en: 'Unexpected indentation: expected level {expectedLevel}, got {indentLevel}',
    id: 'Indentasi tidak terduga: tingkat indentasi seharusnya {expectedLevel}, tapi disini {indentLevel}'
  },
  expected_say_arg: {
    en: 'Expected string argument for SAY',
    id: 'Harusnya ada kalimat untuk SAY'
  },
  expected_say_think_arg: {
    en: 'Expected string argument for SAY THINK',
    id: 'Harusnya ada kalimat untuk SAY THINK'
  },
  listen_no_args: {
    en: 'LISTEN statement does not accept any arguments',
    id: 'Pada statement LISTEN tidak boleah ada kalimat yang mengikuti'
  },
  expected_think_arg: {
    en: 'Expected string argument for THINK',
    id: 'Harusnya ada kalimat untuk THINK'
  },
  invalid_macro_prefix: {
    en: "Invalid macro identifier '{identifier}'. Macro must start with 'CALL_' or 'AGENT_'",
    id: "Pengenal makro '{identifier}' tidak valid. Kata kunci makro harus berawalan 'CALL_' atau 'AGENT_'"
  },
  undefined_macro: {
    en: "Undefined macro identifier '{identifier}'",
    id: "Pengenal makro '{identifier}' tidak terdefinisi"
  },
  expected_macro_arg: {
    en: 'Expected string argument for macro call',
    id: 'Harusnya disini kalimat bukan keyword lain dalam pemanggilan makro'
  },
  expected_ask_agent: {
    en: 'Expected agent identifier after ASK',
    id: 'Harusnya ada pengenal agent setelah ASK'
  },
  invalid_agent_prefix: {
    en: "Invalid agent identifier '{identifier}'. Agent calls must start with 'AGENT_'",
    id: "Pengenal agent '{identifier}' tidak valid. Kata kunci agent harus dimulai dengan 'AGENT_'"
  },
  expected_ask_arg: {
    en: 'Expected string argument for ASK',
    id: 'Harusnya ada argumen string untuk ASK'
  },
  exit_loop_outside_loop: {
    en: 'EXIT LOOP must be placed inside a LOOP block',
    id: 'EXIT LOOP harus ditempatkan di dalam blok LOOP'
  },
  exit_loop_no_args: {
    en: 'EXIT LOOP does not accept any arguments',
    id: 'EXIT LOOP tidak boleh diikuti kalimat apapun'
  },
  continue_loop_outside_loop: {
    en: 'CONTINUE LOOP must be placed inside a LOOP block',
    id: 'CONTINUE LOOP harus ditempatkan di dalam blok LOOP'
  },
  continue_loop_no_args: {
    en: 'CONTINUE LOOP does not accept any arguments',
    id: 'CONTINUE LOOP tidak boleh diikuti kalimat apapun'
  },
  expected_if_cond: {
    en: 'Expected condition for IF statement',
    id: 'Harusnya ada pernyataan kalimat kondisi untuk IF'
  },
  expected_if_cond_string: {
    en: 'Expected string condition for IF statement',
    id: 'Harusnya ada pernyataan kalimat kondisi untuk IF'
  },
  empty_if_block: {
    en: 'IF statement must have at least one statement in its block',
    id: 'Statement IF harus memiliki setidaknya satu statement di dalam bloknya'
  },
  else_without_if: {
    en: 'ELSE statement without matching IF block',
    id: 'Statement ELSE harus memiliki IF sebelumnya'
  },
  expected_else_colon: {
    en: "Expected ':' at the end of ELSE statement",
    id: "Harusnya ada ':' di akhir pernyataan ELSE"
  },
  empty_else_block: {
    en: 'ELSE statement must have at least one statement in its block',
    id: 'Statement ELSE harus memiliki setidaknya satu statement di dalam bloknya'
  },
  expected_loop_colon: {
    en: "Expected ':' at the end of LOOP statement",
    id: "Harusnya ada ':' di akhir pernyataan LOOP"
  },
  empty_loop_block: {
    en: 'LOOP statement must have at least one statement in its block',
    id: 'Statement LOOP harus memiliki setidaknya satu statement di dalam bloknya'
  },
  unexpected_start_token: {
    en: "Unexpected token '{token}' at start of statement",
    id: "Token tidak terduga '{token}' di awal pernyataan"
  },
  title_indented: {
    en: 'TITLE directive must not be indented',
    id: 'Keyword TITLE tidak boleh menjorok (diindentasi)'
  },
  title_multiple: {
    en: 'TITLE directive can only be declared once',
    id: 'Keyword TITLE hanya boleh dideklarasikan sekali'
  },
  title_misplaced_after_define: {
    en: 'TITLE directive must be placed at the very top, before any #DEFINE directives',
    id: 'Keyword TITLE harus diletakkan di bagian paling atas, posisinya sebelum kata kunci #DEFINE'
  },
  expected_title_string: {
    en: 'Expected title string after TITLE',
    id: 'Harusnya ada nama judul setelah kata kunci TITLE'
  },
  title_not_at_top: {
    en: 'TITLE directives must be at the absolute top of the file',
    id: 'Kata kunci TITLE harus berada di bagian paling atas berkas'
  },
  exit_no_args: {
    en: 'EXIT does not accept any arguments',
    id: 'EXIT tidak boleah diikusi kalimat apapun'
  }
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, args?: Record<string, string | number>): string {
  const translationsItem = translations[key];
  if (!translationsItem) {
    return key;
  }
  let template = translationsItem[currentLocale];
  if (!template) {
    // Fallback to English
    template = translationsItem.en ?? key;
  }
  if (!args) {
    return template;
  }
  let result = template;
  for (const k of Object.keys(args)) {
    result = result.replace(new RegExp(`{${k}}`, 'g'), String(args[k]));
  }
  return result;
}
