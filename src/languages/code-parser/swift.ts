import { BaseCodeParser } from '../base-code-parser';

export class SwiftCodeParser extends BaseCodeParser {
    protected methodRegex = "^(?:\\s*(?:public|private|internal|fileprivate|static|override|final)\\s+)*(?:func\\s+)?([A-Za-z0-9_]+)\\s*\\(([^)]*)\\)\\s*(?:(?:->)|(?:\\{[\\s\\S]*?\\})|(?=;))";
    protected parameterRegex = "([A-Za-z0-9_]+)\\s*:\\s*([A-Za-z0-9_<>?\\[\\]]+)\\s*(?:,\\s*|\\))";
    protected commentRegex = "\\/\\/\\s*(.*)";
    protected extractClassesRegExp = "/(?:^|\\s)class\\s+([A-Za-z0-9_]+)\\s*\\{/g";
    protected extractImportsRegExp = "/import\\s+['\"]([^'\"]+)['\"]/g";
    protected fileExtension: string[] = [".swift"];
}
