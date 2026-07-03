# SWAN L4 Language Specification

## Table of Contents

- [1. Syntax & Lexical Rules](#1-syntax--lexical-rules)
  - [1.1. Debug Mode Syntax](#11-debug-mode-syntax)
  - [1.2. Explicit Context / Variables](#12-explicit-context--variables)
- [2. Document Structure & Statement Sequencing](#2-document-structure--statement-sequencing)
- [3. Indentation Rules](#3-indentation-rules)
- [4. Statement Specifications](#4-statement-specifications)
  - [4.1. SAY](#41-say)
  - [4.2. SAY THINK](#42-say-think)
  - [4.3. LISTEN](#43-listen)
  - [4.4. THINK](#44-think)
  - [4.5. CALL_ (Macro Call)](#45-call_-macro-call)
  - [4.6. ASK](#46-ask)
  - [4.7. READ](#47-read)
  - [4.8. WRITE](#48-write)
  - [4.9. FIND](#49-find)
- [5. Control Flow & Loops](#5-control-flow--loops)
  - [5.1. IF and ELSE](#51-if-and-else)
  - [5.2. LOOP](#52-loop)
  - [5.3. Loop Controls (EXIT LOOP / CONTINUE LOOP)](#53-loop-controls-exit-loop--continue-loop)
  - [5.4. EXIT](#54-exit)
  - [5.5. PARALEL](#55-paralel)
- [6. Localized Diagnostics (i18n)](#6-localized-diagnostics-i18n)
- [7. Code Examples](#7-code-examples)
  - [7.1. Simple Script (Linear Execution)](#71-simple-script-linear-execution)
  - [7.2. Moderate Script (Conditionals)](#72-moderate-script-conditionals)
  - [7.3. Complex Script (Macros, Loops, and Control Flows)](#73-complex-script-macros-loops-and-control-flows)
  - [7.4. Crypto Price Checker](#74-crypto-price-checker)
  - [7.5. Weather Agent](#75-weather-agent)


## 1. Syntax & Lexical Rules

* **File Extension:** `.swan`
* **Encoding:** UTF-8
* **Comments:** Single-line comments start with `//` and are ignored by the tokenizer.
* **Case Sensitivity:** Structural primitives, headers, and loop controls are case-sensitive and must be capitalized:
  * Primitives: `TITLE`, `#DEFINE`, `SAY`, `SAY THINK`, `LISTEN`, `THINK`, `READ`, `WRITE`, `FIND`, `EXIT`
  * Control structures: `IF`, `ELSE`, `LOOP`, `PARALEL`
  * Loop controllers: `EXIT LOOP`, `CONTINUE LOOP`
* **String Arguments:** Double-quoted strings (e.g. `"Message"`), unquoted implicit strings extending to the end of the line, or multiline block strings wrapped in triple backticks (e.g. ```` ```Multiline\nText\n``` ````) are accepted for statements that receive arguments.

### 1.1. Debug Mode Syntax

Any primitive keyword, control structure keyword, loop controller keyword, or macro call can be wrapped with square brackets (e.g., `[SAY]`, `[SAY THINK]`, `[THINK]`, `[LISTEN]`, `[ASK]`, `[IF]`, `[ELSE]`, `[LOOP]`, `[EXIT LOOP]`, `[CONTINUE LOOP]`, `[EXIT]`, `[TITLE]`, `[#DEFINE]`, or custom macro calls like `[CALL_CHECK_STOCK]`). Wrapping the keyword flags the statement node with `debug: true` in the AST. By default, nodes have `debug` set to `undefined` or `false`.

### 1.2. Explicit Context / Variables

A statement can optionally assign its output/result to an explicit context variable using the `$variable_name` syntax prefix:
* **Syntax:** `$variable_name STATEMENT`
* **Rule 1:** The variable prefix starts with `$` followed by alphanumeric characters and underscores (e.g., `$confirmation`, `$extracted_data`).
* **Rule 2:** The statement following the variable prefix is parsed normally.
* **Rule 3:** The parser adds an `assignVar` property containing the variable's name (e.g., `"$confirmation"`) to the generated statement AST node.
* **Rule 4:** When referencing/interpolating an explicit variable inside template string arguments, the variable name must be enclosed in braces including the `$` prefix, e.g., `{$confirmation}` or `{$extracted_data}`. This is optional and backwards-compatible with the implicit `{Context}` access.

## 2. Document Structure & Statement Sequencing

A SWAN L4 script is parsed in three sequential phases:

1. **`TITLE` Directive (Optional):**
   * **Syntax:** `TITLE <string_argument>`
   * **Rule 1:** Must be declared at the absolute start of the script.
   * **Rule 2:** Cannot be indented.
   * **Rule 3:** Cannot be declared more than once.
   * **Rule 4:** Cannot appear after any `#DEFINE` directive or executable statements.

2. **`#DEFINE` Macro Directives (Optional):**
   * **Syntax:** `#DEFINE <IDENTIFIER> <URL>`
   * **Rule 1:** Must start with the prefix `CALL_` or `AGENT_`.
   * **Rule 2:** Cannot be indented.
   * **Rule 3:** Must appear before any executable statement.
   * **Rule 4:** Must follow the `TITLE` directive if a `TITLE` is defined.

3. **Executable Statements:**
   * Contains the procedural commands of the program. Any `TITLE` or `#DEFINE` statements found within the executable statement block will result in parser errors.

## 3. Indentation Rules

SWAN L4 represents scopes using indentation:

* **Indentation Unit Detection:** The tokenizer evaluates all indented lines and selects the majority space-count run (e.g., 2 spaces or 4 spaces) as the baseline indent unit $N$.
* **Space Counts:** An indentation level is calculated as `space_count / N`.
* **Tab Characters:** A tab character (`\t`) counts as exactly 1 indentation level.
* **Indentation Validation:**
  * Any line featuring a number of spaces that is not a multiple of the unit $N$ (e.g., 5 spaces when $N = 2$) triggers a validation error.
  * Every statement inside an `IF`, `ELSE`, or `LOOP` block must be indented exactly 1 level deeper than the block header.
  * Statements must align with the expected indentation level for their active scope.

## 4. Statement Specifications

### 4.1. `SAY`
* **Syntax:** `SAY <string_argument>`
* **Behavior:** Processes the provided string. Injects the active pipeline context if the token `{Context}` is present inside the argument.

### 4.2. `SAY THINK`
* **Syntax:** `SAY THINK <string_argument>`
* **Behavior:** Sends the string argument as a prompt to the underlying language model to generate speech.

### 4.3. `LISTEN`
* **Syntax:** `LISTEN`
* **Rule:** Does not accept arguments. Adding any trailing tokens results in a parser error.

### 4.4. `THINK`
* **Syntax:** `THINK <string_argument>`
* **Behavior:** Queries the language model with the given instruction.

### 4.5. `CALL_` (Macro Call)
* **Syntax:** `<CALL_IDENTIFIER> [<optional_string_argument>]`
* **Rule 1:** The identifier must match a macro name defined in the `#DEFINE` section.
* **Rule 2:** The identifier must start with `CALL_`.
* **Rule 3:** If an argument is provided, it must resolve to a valid string argument.

### 4.6. `ASK`
* **Syntax:** `ASK <AGENT_IDENTIFIER> [<optional_string_argument>]`
* **Rule 1:** The identifier must match a macro name defined in the `#DEFINE` section.
* **Rule 2:** The identifier must start with `AGENT_`.
* **Rule 3:** If an argument is provided, it must resolve to a valid string argument.

### 4.7. `READ`
* **Syntax:** `READ <string_argument>`
* **Behavior:** Reads file contents from the specified path. E.g. `READ ./myfile.txt`

### 4.8. `WRITE`
* **Syntax:** `WRITE <string_argument_file_path> [<string_argument_data>]`
* **Behavior:** Writes the text data to the specified file path. E.g. `WRITE ./myfile.txt some loads of text data`. The data argument is optional; if omitted, it defaults to null or empty.

### 4.9. `FIND`
* **Syntax:** `FIND <result-chunks>/<total-chunks> <semantic keywords> [<source context>]`
* **Behavior:** Performs semantic search to find a subset of top related chunks out of the total chunks from the source context. The source context can be a multiline block string or a variable containing context data.
* **Examples:**
  * Implicit context:
    ```l4
    READ longfile.pdf
    FIND 3/15 new food on 2026
    ```
  * Explicit context (variable):
    ```l4
    $longtext READ longfile.pdf
    FIND 3/15 new food on 2026 {$longtext}
    ```
  * Multiline block string context (supports variable interpolation inside):
    ````l4
    $longtext READ longfile.pdf
    SAY finding your data...
    FIND 3/15 new food on 2026 ```
    this is some long string instead of 
    implicit/explicit context
    I can add another explicit context {$anothervar}
    or even implicit context {Context}
    ```
    ````

## 5. Control Flow & Loops

### 5.1. `IF` and `ELSE`
* **Syntax:**
  ```l4
  IF <condition_argument>:
    <indented_statements>
  [ELSE:
    <indented_statements>]
  ```
* **Rule 1:** Both `IF` and `ELSE` blocks must end with a colon (`:`) at the header level.
* **Rule 2:** The blocks must contain at least one statement.
* **Rule 3:** `ELSE` must follow an `IF` block at the same scope level.

### 5.2. `LOOP`
* **Syntax:**
  ```l4
  LOOP:
    <indented_statements>
  ```
* **Rule 1:** The `LOOP` header must end with a colon (`:`).
* **Rule 2:** The loop block must contain at least one statement.

### 5.3. Loop Controls (`EXIT LOOP` / `CONTINUE LOOP`)
* **Rule 1:** Must be placed inside a `LOOP` block.
* **Rule 2:** Cannot accept any arguments.

### 5.4. `EXIT`
* **Syntax:** `EXIT`
* **Rule:** Does not accept any arguments.

### 5.5. `PARALEL`
* **Syntax:**
  ```l4
  PARALEL:
    <indented_statements>
  ```
* **Behavior:** Runs all statements inside its block concurrently. It aggregates/concatenates all the results of these execution units into a single output string.
* **Rule 1:** The `PARALEL` statement header must end with a colon (`:`).
* **Rule 2:** The block must contain at least one statement.
* **Example:**
  ```l4
  PARALEL:
    CALL_SEARCH_GOOGLE ?q=new city in asia
    READ ./city-logs.txt
    CALL_SEARCH_BING ?keywords=city,data,asia
  ```

## 6. Localized Diagnostics (i18n)

The parser and tokenizer produce formatted error diagnostics with localized strings:

* **English (`en`)** and **Indonesian (`id`)** translations are supported for all diagnostic error keys.
* Programmatic control is managed via:
  ```typescript
  import { setLocale, getLocale } from './index';
  setLocale('en'); // or 'id'
  ```

## 7. Code Examples

### 7.1. Simple Script (Linear Execution)

```l4
TITLE Greeting Program

SAY Welcome to the test environment!
LISTEN
THINK Extract the user's name from this text.
SAY Nice to meet you, {Context}!
```

### 7.2. Moderate Script (Conditionals)

```l4
TITLE Feedback Evaluator

SAY Please rate our service from 1 to 5:
LISTEN
IF >= 4:
  SAY We are glad you enjoyed it!
ELSE:
  SAY We apologize for the inconvenience and will work to improve.
```

### 7.3. Complex Script (Macros, Loops, and Control Flows)

```l4
TITLE Warung Lele Ordering Agent
#DEFINE CALL_CHECK_STOCK https://api.warunglele.id/v1/inventory
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking
#DEFINE AGENT_STOCK https://agents.warunglele.id/v1/stock

SAY Welcome to Warung Lele! 🐟
LOOP:
  SAY What would you like to order? (Or say 'exit' to quit)
  $order LISTEN
  [IF] CONTAINS "exit":
    SAY Thank you for visiting!
    EXIT
  $menu_item THINK Extract food menu name and quantity from {$order}. Example: 2x Lele Garing.
  [CALL_CHECK_STOCK]
  $availability ASK AGENT_STOCK ask the agent to check stock for {$menu_item}
  IF CONTAINS "Available":
    SAY "Your item is in stock! Confirm booking? (yes/no)"
    $confirmation LISTEN
    IF CONTAINS "yes":
      [CALL_BOOKING] "Order placed for {$menu_item} with status {$availability} and confirmation {$confirmation}"
      SAY Your order has been placed successfully!
      EXIT LOOP
    ELSE:
      SAY Order canceled. Let's start over.
      CONTINUE LOOP
  ELSE:
    SAY Sorry, that menu item is out of stock. Please try another one.
```

### 7.4. Crypto Price Checker

```l4
TITLE Crypto Price Checker
#DEFINE CALL_CRYPTO_PRICE https://api.coingecko.com/api/v3/simple/price

SAY Welcome to Warung Kripto! Mau cari crypto apa?
LISTEN
THINK apa nama cripto currency yg user ingin tanyakan (dalam huruf kecil), misalnya bitcoin, contoh lain: ethereum
CALL_CRYPTO_PRICE ?ids={Context}&vs_currencies=usd
SAY THINK Bagaimana harga terakhirnya?
```

### 7.5. Weather Agent

```l4
TITLE Weather Agent
#DEFINE CALL_WEATHER https://wttr.in

SAY Welcome to weather agent
CALL_WEATHER
SAY THINK Bagaimana kondisi cuaca saat ini?
```
