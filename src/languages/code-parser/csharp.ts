import { BaseCodeParser } from '../base-code-parser';

export class CsharpCodeParser extends BaseCodeParser {
  protected methodRegex = "/(?:^\s*(?:public|private|protected|internal|static|override|virtual|sealed)\s+)?(?:async\s+)?(?:[A-Za-z0-9_<>?\[\]]+\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:(?:=>)|(?:\{[\s\S]*?\})|(?=;))/gm";
  protected parameterRegex = "/([A-Za-z0-9_<>?\[\]]+)\s+([A-Za-z0-9_]+)(?:\s*,\s*|\s*\))/g";
  protected commentRegex = "/\/\/\/\s*<summary>\s*([\s\S]*?)\s*<\/summary>/";
  protected extractClassesRegExp = "/(?:export\s+)?class\s+([A-Za-z0-9_]+)/g";
  protected extractImportsRegExp = "/^(?:using\s+([A-Za-z0-9_.]+);)/gm";
  protected fileExtension: string[] = [".cs"];
}
