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
TITLE Feedback Evaluator

SAY Welcome to Warung Lele! 🐟
LOOP:
  SAY What would you like to order? (Or say 'exit' to quit)
  LISTEN
  IF CONTAINS "exit":
    SAY Thank you for visiting!
    EXIT
  $name_quantity THINK Extract food menu name and quantity. Example: 2x Lele Garing.
  THINK Pretend you know random stock of {Context} on the storage
  IF the stock is available:
    SAY "Your item is in stock! Confirm booking? (yes/no)"
    LISTEN
    IF CONTAINS "yes":
      SAY Your order has been placed successfully!
      EXIT LOOP
    ELSE:
      SAY Order canceled. Let's start over.
      CONTINUE LOOP
  ELSE:
    SAY Sorry, that menu item is out of stock. Please try another one.
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

const readWriteSource = `\
TITLE \`\`\`
Read and Write
Feature Program
\`\`\`

READ ./anothertext.txt
$data_file READ ./data.txt
WRITE ./log.txt this is inline file content
WRITE ./mydata \`\`\`
This is a long file
starts with a data and
other files
\`\`\`
[READ] "./anothertext.txt"
[WRITE] "./log.txt" "some new debug inline content"

SAY \`\`\`
Hello from
a multi-line
SAY statement!
\`\`\`

THINK \`\`\`
Process the text
using the LLM with
multi-line prompt
\`\`\`
`;

const invalidReadWriteSource = `\
READ
WRITE
WRITE ./path_only.txt
WRITE ./mydata \`\`\`
This is an unclosed block string
`;

const agentFilePathSource = `\
TITLE Agent File Path Definitions
#DEFINE AGENT_STOCK ./test.l4
#DEFINE AGENT_REORDER another-agent.l4
#DEFINE AGENT_REPORT /absolute/path/to/report.l4
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking

SAY "Done"
`;

const invalidDefineSource = `\
TITLE Invalid Define Directives Program
#DEFINE CALL_WEBSERVICE ./test.l4
#DEFINE AGENT_STOCK https://agents.warunglele.id/v1/stock/invalid space
#DEFINE AGENT_HELPER not_a_valid_path!@#
`;

const feedbackSource = `\
TITLE Service Feedback Collector

LOOP:
  SAY Please rate our service from 1 to 5:
  $rating LISTEN
  IF is between 1 and 5:
    SAY Thank you! Please tell us why you gave this rating:
    LISTEN
    WRITE ./feedback.txt Rating: {$rating}. Comment: {Context}
    SAY Feedback logged successfully.
    EXIT
  ELSE:
    SAY Invalid input. Please enter a number between 1 and 5.
    CONTINUE LOOP
`;

const findSource = `\
TITLE Semantic Search with FIND
$longtext READ longfile.pdf
SAY finding your data...
FIND 3/15 new food on 2026 {$longtext}
FIND 3/15 new food on 2026
FIND 3/15 new food on 2026 {$somevar} {Context}
FIND 3/15 new food on 2026 \`\`\`
this is some long string instead of 
implicit/explicit context
I can add another explicit context {$anothervar}
or even implicit context {Context}
\`\`\`
`;

const invalidFindSource = `\
TITLE Invalid FIND Statements
FIND 3/
FIND new food on 2026
FIND
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
  console.log("\n");
  testSource("SWAN L4 Script with READ and WRITE features", readWriteSource);
  console.log("\n");
  testSource("Invalid READ and WRITE features", invalidReadWriteSource);
  console.log("\n");
  testSource("Valid Agent File Path Definitions", agentFilePathSource);
  console.log("\n");
  testSource("Invalid Define Directives", invalidDefineSource);
  console.log("\n");
  testSource("Service Feedback Collector Script", feedbackSource);
  console.log("\n");
  testSource("Valid FIND Statements", findSource);
  console.log("\n");
  testSource("Invalid FIND Statements", invalidFindSource);

  console.log("\n\n-- RUNNING IN INDONESIAN --");
  setLocale('id');
  testSource("Indentation Error SWAN L4 Script (Indonesian)", indentationErrorSource);
  console.log("\n");
  testSource("Invalid SWAN L4 Script with Semantic Errors (Indonesian)", invalidSource);
  console.log("\n");
  testSource("Invalid READ and WRITE features (Indonesian)", invalidReadWriteSource);
  console.log("\n");
  testSource("Invalid Define Directives (Indonesian)", invalidDefineSource);
  console.log("\n");
  testSource("Invalid FIND Statements (Indonesian)", invalidFindSource);
}

main();
