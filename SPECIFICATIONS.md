# SWAN L4 Language Specification

## Table of Contents

- [1. Syntax & Lexical Rules](#1-syntax--lexical-rules)
- [2. Document Structure & Statement Sequencing](#2-document-structure--statement-sequencing)
- [3. Indentation Rules](#3-indentation-rules)
- [4. Statement Specifications](#4-statement-specifications)
  - [4.1. SAY](#41-say)
  - [4.2. SAY THINK](#42-say-think)
  - [4.3. LISTEN](#43-listen)
  - [4.4. THINK](#44-think)
  - [4.5. CALL_ (Macro Call)](#45-call_-macro-call)
  - [4.6. ASK](#46-ask)
- [5. Control Flow & Loops](#5-control-flow--loops)
  - [5.1. IF and ELSE](#51-if-and-else)
  - [5.2. LOOP](#52-loop)
  - [5.3. Loop Controls (EXIT LOOP / CONTINUE LOOP)](#53-loop-controls-exit-loop--continue-loop)
  - [5.4. EXIT](#54-exit)
- [6. Localized Diagnostics (i18n)](#6-localized-diagnostics-i18n)
- [7. Code Examples](#7-code-examples)
  - [7.1. Simple Script (Linear Execution)](#71-simple-script-linear-execution)
  - [7.2. Moderate Script (Conditionals)](#72-moderate-script-conditionals)
  - [7.3. Complex Script (Macros, Loops, and Control Flows)](#73-complex-script-macros-loops-and-control-flows)


## 1. Syntax & Lexical Rules

* **File Extension:** `.swan`
* **Encoding:** UTF-8
* **Comments:** Single-line comments start with `//` and are ignored by the tokenizer.
* **Case Sensitivity:** Structural primitives, headers, and loop controls are case-sensitive and must be capitalized:
  * Primitives: `TITLE`, `#DEFINE`, `SAY`, `SAY THINK`, `LISTEN`, `THINK`, `EXIT`
  * Control structures: `IF`, `ELSE`, `LOOP`
  * Loop controllers: `EXIT LOOP`, `CONTINUE LOOP`
* **String Arguments:** Double-quoted strings (e.g. `"Message"`) or unquoted implicit strings extending to the end of the line are accepted for statements that receive arguments.

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

## 5. Control Flow & Loops

### 5.1. `IF` and `ELSE`
* **Syntax:**
  ```swan
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
  ```swan
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

```swan
TITLE Greeting Program

SAY Welcome to the test environment!
LISTEN
THINK Extract the user's name from this text.
SAY Nice to meet you, {Context}!
```

### 7.2. Moderate Script (Conditionals)

```swan
TITLE Feedback Evaluator

SAY Please rate our service from 1 to 5:
LISTEN
IF >= 4:
  SAY We are glad you enjoyed it!
ELSE:
  SAY We apologize for the inconvenience and will work to improve.
```

### 7.3. Complex Script (Macros, Loops, and Control Flows)

```swan
TITLE Warung Lele Ordering Agent
#DEFINE CALL_CHECK_STOCK https://api.warunglele.id/v1/inventory
#DEFINE CALL_BOOKING https://api.warunglele.id/v1/booking
#DEFINE AGENT_STOCK https://agents.warunglele.id/v1/stock

SAY Welcome to Warung Lele! 🐟
LOOP:
  SAY What would you like to order? (Or say 'exit' to quit)
  LISTEN
  IF CONTAINS "exit":
    SAY Thank you for visiting!
    EXIT
  THINK Extract food menu name and quantity. Example: 2x Lele Garing.
  CALL_CHECK_STOCK
  ASK AGENT_STOCK ask the agent to book ticket for one night
  IF "Available":
    SAY "Your item is in stock! Confirm booking? (yes/no)"
    LISTEN
    IF CONTAINS "yes":
      CALL_BOOKING "Order placed: {Context}"
      SAY Your order has been placed successfully!
      EXIT LOOP
    ELSE:
      SAY Order canceled. Let's start over.
      CONTINUE LOOP
  ELSE:
    SAY Sorry, that menu item is out of stock. Please try another one.
```
