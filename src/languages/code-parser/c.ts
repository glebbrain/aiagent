import { BaseCodeParser } from '../base-code-parser';

export class CCodeParser extends BaseCodeParser {
    protected methodRegex = "^(?:\\s*(?:[a-zA-Z_][a-zA-Z0-9_]*\\s+)+)([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\)\\s*(?:(?:;)|(?:\\{[\\s\\S]*?\\}))";
    protected parameterRegex = "([a-zA-Z_][a-zA-Z0-9_]*\\s+[a-zA-Z_][a-zA-Z0-9_]*)\\s*(?:,\\s*|\\))";
    protected commentRegex = "\\/\\/\\s*(.*)";
    protected extractClassesRegExp = "/(?:^|\\s)class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/g";
    protected extractImportsRegExp = "/#include\\s+['\"]([^'\"]+)['\"]/g";
    protected fileExtension: string[] = [".c", ".h"];
}
