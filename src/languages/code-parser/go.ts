import { BaseCodeParser } from '../base-code-parser';

export class GoCodeParser extends BaseCodeParser {
  protected methodRegex = "/(?:^\s*(?:func)\s+)([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:(?:->)|(?:\{[\s\S]*?\})|(?=;))/gm";
  protected parameterRegex = "/([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)/g";
  protected commentRegex = "/\/\/\s*<summary>\s*([\s\S]*?)\s*<\/summary>/";
  protected extractClassesRegExp = "/(?:class\s+)([A-Za-z0-9_]+)/g";
  protected extractImportsRegExp = "/(?:import\s+)([A-Za-z0-9_.]+)/g";
  protected fileExtension: string[] = [".go"];
}
