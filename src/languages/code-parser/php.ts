import { BaseCodeParser } from '../base-code-parser';

export class PhpCodeParser extends BaseCodeParser {
  protected methodRegex = "/(?:^\s*(?:public|private|protected|static|final|abstract)\s+)?(?:function\s+)([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:(?:->)|(?:\{[\s\S]*?\})|(?=;))/gm;";
  protected parameterRegex = "/([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)/g";
  protected commentRegex = "/#\s*<summary>\s*([\s\S]*?)\s*<\/summary>/";
  protected extractClassesRegExp = "/(?:class\s+)([A-Za-z0-9_]+)/g";
  protected extractImportsRegExp = "/(?:use\s+)([A-Za-z0-9_.]+)/g";
  protected fileExtension: string[] = ['.php'];
}
