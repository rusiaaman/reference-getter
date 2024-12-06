#!/usr/bin/env node

import { Project, ScriptKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

function parseFileLocation(input: string): { filePath: string; line: number; column: number } {
    const match = input.match(/^(.+):(\d+):(\d+)$/);
    if (!match) {
        throw new Error('Invalid file location format. Expected: path/to/file:line:column');
    }
    return {
        filePath: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
    };
}

function getSourceFiles(repoPath: string): string[] {
    const files: string[] = [];
    const supportedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

    function walk(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
                    walk(fullPath);
                }
            } else if (entry.isFile() && supportedExtensions.has(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
    }

    walk(repoPath);
    return files;
}

function createTempTsConfig(repoPath: string): string {
    const tsConfigPath = path.join(repoPath, 'tsconfig.temp.json');
    const tsConfig = {
        compilerOptions: {
            target: "es2018",
            module: "commonjs",
            allowJs: true,
            checkJs: true,
            esModuleInterop: true,
            skipLibCheck: true,
            noEmit: true
        },
        include: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
        exclude: ["node_modules", "dist"]
    };

    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    return tsConfigPath;
}

function findReferencesAtPosition(
    project: Project,
    filePath: string,
    line: number,
    column: number,
    repoPath: string
): string[] {
    const sourceFile = project.getSourceFileOrThrow(filePath);
    const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, column - 1);
    const node = sourceFile.getDescendantAtPos(pos);

    if (!node) {
        throw new Error(`No node found at position ${line}:${column}`);
    }

    const referencedSymbols = project.getLanguageService().findReferences(node);
    const references = new Set<string>();
    
    for (const referencedSymbol of referencedSymbols) {
        for (const reference of referencedSymbol.getReferences()) {
            const refSourceFile = reference.getSourceFile();
            const refFilePath = refSourceFile.getFilePath();
            references.add(path.relative(repoPath, refFilePath));
        }
    }

    return Array.from(references);
}

function main() {
    const [, , repoPath, fileLocation] = process.argv;

    if (!repoPath || !fileLocation) {
        console.error('Usage: reference_getter <repo_path> <file_path:line:column>');
        process.exit(1);
    }

    try {
        const { filePath, line, column } = parseFileLocation(fileLocation);
        const absoluteRepoPath = path.resolve(repoPath);
        const absoluteFilePath = path.resolve(absoluteRepoPath, filePath);

        // Create a temporary tsconfig.json if it doesn't exist
        const tsConfigPath = createTempTsConfig(absoluteRepoPath);

        const project = new Project({
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                checkJs: true
            }
        });

        // Add all JavaScript and TypeScript files in the repository
        const sourceFiles = getSourceFiles(absoluteRepoPath);
        for (const sourceFile of sourceFiles) {
            try {
                project.addSourceFileAtPath(sourceFile);
            } catch (e) {
                // Skip files that can't be parsed
            }
        }

        const references = findReferencesAtPosition(project, absoluteFilePath, line, column, absoluteRepoPath);
        references.forEach(ref => console.log(ref));

        // Clean up temporary tsconfig
        fs.unlinkSync(tsConfigPath);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error('An unknown error occurred');
        }
        process.exit(1);
    }
}

main();