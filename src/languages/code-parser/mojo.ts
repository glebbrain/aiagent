import { BaseCodeParser } from '../base-code-parser';
/*
    https://en.wikipedia.org/wiki/Mojo_(programming_language)
    Mojo is a programming language in the Python family that is currently under development.
    It is available both in browsers via Jupyter notebooks, and locally on Linux and macOS.
    Mojo aims to combine the usability of a high-level programming language, specifically Python, 
    with the performance of a system programming language such as C++, Rust, and Zig. 
    As of February 2025, the Mojo compiler is closed source with an open source standard library. 
    Modular, the company behind Mojo, has stated an intent to eventually open source the Mojo language, as it matures.
*/
// Mojo is a programming language designed for simplicity and ease of use.
// It is often used for educational purposes and small projects.
export class MojoCodeParser extends BaseCodeParser {
    protected methodRegex = "^(?:\\s*(?:[a-zA-Z_][a-zA-Z0-9_]*\\s+)+)([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\)\\s*(?:(?:;)|(?:\\{[\\s\\S]*?\\}))";
    protected parameterRegex = "^(?:\\s*(?:[a-zA-Z_][a-zA-Z0-9_]*\\s+)+)([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\)\\s*(?:(?:;)|(?:\\{[\\s\\S]*?\\}))";
    protected commentRegex = "\\/\\/\\s*(.*)";
    protected extractClassesRegExp = "\\bclass\\s+([a-zA-Z_][a-zA-Z0-9_]*)";
    protected extractImportsRegExp = "\\bimport\\s+['\"]([^'\"]+)['\"]";
    protected fileExtension: string[] = [".mojo", ".moj"];
}