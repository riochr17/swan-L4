# SWAN L4

SWAN L4 is a domain-specific language (DSL) parser, tokenizer, and semantic validator designed for orchestrating agentic workflows. It supports indentation-based scoping, sequence constraints, custom macro calls, and localized diagnostics.

## Features

- **Indentation-based Scoping**: Automatically detects the majority-based indentation unit (spaces or tabs) to determine scope blocks.
- **Strict Sequencing**: Enforces script structure ordering: `TITLE` &rarr; `#DEFINE` &rarr; Executable Statements.
- **Macro and Agent Calls**: Supports `#DEFINE` directives for external API endpoints starting with `CALL_` and agent routing starting with `AGENT_`.
- **Implicit Context Pipeline**: Seamlessly tracks state through the global `Context` variable and processes `{Context}` template interpolation inside string arguments.
- **Localized Error Diagnostics**: Supports multi-language translation (English and Indonesian) for syntax and semantic parser errors.

## Usage

```ts
import { parse, tokenize } from "@ssww.one/l4";

const source = `\
TITLE Greeting Program

SAY Welcome to the test environment!
LISTEN
THINK Extract the user's name from this text.
SAY Nice to meet you, {Context}!`;

const tokens = tokenize(source);
if (tokens.errors.length > 0) {
  console.error(tokens.errors);
} else {
  const parse_result = parse(tokens.tokens);
  if (parse_result.errors.length > 0) {
    console.error(parse_result.errors);
  } else {
    console.log(JSON.stringify(parse_result.ast, null, 2));
  }
}
```

Expected output:
```json
{
  "type": "Program",
  "title": {
    "type": "Title",
    "value": "Greeting Program",
    "span": {
      "line": 1,
      "column": 1,
      "start": 0,
      "end": 22
    }
  },
  "defines": [],
  "body": [
    {
      "type": "Say",
      "argument": "Welcome to the test environment!",
      "span": {
        "line": 3,
        "column": 1,
        "start": 24,
        "end": 60
      }
    },
    // more lines...
  ]
}
```

## Installation

Ensure you have Node.js and npm installed.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run build
   ```

## Testing

Run the test suite to execute tokenization, AST generation, and error checking on valid/invalid scripts:
```bash
npm test
```

## Quick Example

```swan
TITLE Greeting Program

SAY Welcome to the test environment!
LISTEN
THINK Extract the user's name from this text.
SAY Nice to meet you, {Context}!
```

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
