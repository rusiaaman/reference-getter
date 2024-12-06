# reference-getter

A CLI tool that finds references in TypeScript/JavaScript projects, similar to VSCode's "Find All References" feature.

## Installation

```bash
npm install -g reference-getter
```

Or install from source:
```bash
git clone https://github.com/rusiaaman/reference-getter.git
cd reference-getter
npm install
npm run build
npm install -g .
```

## Usage

```bash
reference_getter /path/to/repo /path/to/file:line:column
```

Example:
```bash
reference_getter /Users/username/projects/myapp src/components/Button.tsx:15:10
```

## Features

- Finds references across TypeScript and JavaScript files
- Works with `.ts`, `.tsx`, `.js`, and `.jsx` files
- Returns paths relative to project root
- Similar functionality to VSCode's "Find All References"
- Works with or without an existing tsconfig.json

## How it works

The tool uses `ts-morph` to analyze your codebase and find references. It:
1. Creates a temporary TypeScript configuration if needed
2. Scans the entire repository for source files
3. Uses TypeScript's language service to find references
4. Returns relative paths to files containing references

## License

ISC