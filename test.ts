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

import { tokenize, parse, setLocale } from './index';
import * as util from 'util';

const validSource = `\
TITLE My First Program
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking
#DEFINE CALL_CHECK_STOCK https://api.warunglele.id/v1/inventory
#DEFINE AGENT_STOCK https://agents.warunglele.id/v1/stock

SAY Halo kak! Selamat datang di Warung Lele. 🐟   
LOOP:
  LISTEN
  THINK Ekstrak nama menu dan jumlah porsi dari teks tersebut. Contoh format: 2x Lele Garing
  CALL_CHECK_STOCK
  ASK AGENT_STOCK ask the agent to book ticket for one night with notes {Context}
  IF CONTAINS "exit":
    SAY "Pesanan tersedia kak!  "   
    LISTEN
    CALL_BOOKING "LOG_ACTION: User memesan: {Context}"
    SAY "Pesanan kakak berhasil dibooking!"
  ELSE:
    SAY "Aduh maaf kak, stok menu tersebut lagi kosong."
    
  IF > 88:
    SAY Nice things

SAY THINK tell users to stop
EXIT
`;

const indentationErrorSource = `\
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking
IF YapghasdgnaiosbegA:
  SAY "Pesanan tersedia kak!  "   
    LISTEN
`;

const invalidSource = `\
#DEFINE CALL_LATE https://example.com/late
#DEFINE INVALID_NAME https://example.com/bad
TITLE Misplaced Title After Define
SAY Hello
CALL_UNDEFINED_MACRO
ASK AGENT_UNDEFINED "some payload"
ASK CALL_LATE "invalid prefix"
EXIT LOOP
CONTINUE LOOP
ELSE:
  SAY "No matching IF"
`;

const debugSource = `\
[TITLE] My Debugged Program
[#DEFINE] AGENT_STOCK https://agents.warunglele.id/v1/stock
[#DEFINE] CALL_BOOKING https://api.warunglele.id/v1/booking

[SAY] "Debugging start"
[LOOP]:
  [LISTEN]
  [THINK] "Thinking about state"
  [ASK] AGENT_STOCK "status"
  [IF] "debug":
    [CALL_BOOKING] "log: {Context}"
    [CONTINUE LOOP]
  [ELSE]:
    [EXIT LOOP]
[EXIT]
`;

const variableSource = `\
TITLE Explicit Context Program
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking
#DEFINE AGENT_STOCK https://agents.warunglele.id/v1/stock

SAY "Confirm your booking:"
$confirmation LISTEN
$extracted_data THINK "Extract menu name from {$confirmation}"
$stock_status ASK AGENT_STOCK "check {$extracted_data}"
$booking_id [CALL_BOOKING] "book menu: {$extracted_data} confirmation: {$confirmation}"
SAY "Booking success: {$booking_id}"
`;

function testSource(name: string, src: string) {
  console.log(`=== TESTING: ${name} ===`);
  const tokenResult = tokenize(src);
  if (tokenResult.errors.length > 0) {
    console.log("Tokenization Errors:", tokenResult.errors);
  }
  const parseResult = parse(tokenResult.tokens);
  console.log("AST:");
  console.log(util.inspect(parseResult.ast, { depth: null, colors: true }));
  console.log("Parse/Semantic Errors:");
  console.log(util.inspect(parseResult.errors, { depth: null, colors: true }));
}

function main() {
  console.log("-- RUNNING IN ENGLISH --");
  setLocale('en');
  testSource("Valid SWAN L4 Script", validSource);
  console.log("\n");
  testSource("Indentation Error SWAN L4 Script", indentationErrorSource);
  console.log("\n");
  testSource("Invalid SWAN L4 Script with Semantic Errors", invalidSource);
  console.log("\n");
  testSource("SWAN L4 Script with Debug Mode Syntax", debugSource);
  console.log("\n");
  testSource("SWAN L4 Script with Explicit Context / Variables", variableSource);

  console.log("\n\n-- RUNNING IN INDONESIAN --");
  setLocale('id');
  testSource("Indentation Error SWAN L4 Script (Indonesian)", indentationErrorSource);
  console.log("\n");
  testSource("Invalid SWAN L4 Script with Semantic Errors (Indonesian)", invalidSource);
}

main();
