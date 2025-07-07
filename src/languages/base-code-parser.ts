/**
 * @description This module provides an abstract class BaseCodeParser that defines methods for parsing code files
 * and extracting method information, class names, and import statements.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-30
 */

const helpers = require('../helpers');
const { extractFilesFromProject, extractByRegex } = require('../helpers');


/**
 * interface representing information about a method.
 * It includes the method name, parameters, and an optional description.
 * @interface
 * @property {string} name - The name of the method.
 * @property {ParameterInfo[]} parameters - An array of parameters for the method.
 * @property {string} [description] - An optional description of the method.
 * @example
 * const methodInfo: MethodInfo = {
 *   name: "calculateSum",
 *   parameters: [
 *     { name: "a", type: "number" },
 *     { name: "b", type: "number" }
 *   ],
 *   description: "Calculates the sum of two numbers."
 * }
 */
export interface MethodInfo {
    name: string;
    parameters: ParameterInfo[];
    description?: string;
}

/**
 * interface representing information about a parameter.
 * It includes the parameter name and type.
 * @interface
 * @property {string} name - The name of the parameter.
 * @property {string} type - The type of the parameter.
 * @example
 * const parameterInfo: ParameterInfo = {
 *   name: "count",
 *   type: "number"
 * }
 */
export interface ParameterInfo {
    name: string;
    type: string;
}

/**
 * BaseCodeParser is an abstract class that provides methods to parse code files
 * and extract method information, class names, and import statements.
 * It should be extended by specific language parsers to implement language-specific regex patterns.
 */
export abstract class BaseCodeParser {

    protected abstract methodRegex: string;
    protected abstract parameterRegex: string;
    protected abstract commentRegex: string;
    protected abstract extractClassesRegExp: string;
    protected abstract extractImportsRegExp: string;
    protected abstract fileExtension: string[];

    /**
     * Extract methods from the provided code.
     * @param code - The code from which to extract methods.
     * @return An array of MethodInfo objects representing the extracted methods.
     * @throws Error if the code is invalid or if no methods are found.
     */
    public extractMethods(code: string): MethodInfo[] {
        const methods: MethodInfo[] = [];
        if (!this.methodRegex || !this.parameterRegex || !this.commentRegex || this.methodRegex.trim() === "" || this.parameterRegex.trim() === "" || this.commentRegex.trim() === "") {
            helpers.log("Method, parameter, or comment regex is not defined.", "base-code-parser.ts", "extractMethods", "error");
            throw new Error("Method, parameter, or comment regex is not defined.");
        }else{
            helpers.log(`Method Regex: ${this.methodRegex}, Parameter Regex: ${this.parameterRegex}, Comment Regex: ${this.commentRegex}`, "base-code-parser.ts", "extractMethods", "debug");
        }
        let methodMatch: RegExpExecArray | null;
        if (!code || typeof code !== 'string') {
            helpers.log("Invalid code provided for method extraction.", "base-code-parser.ts", "extractMethods", "error");
            throw new Error("Invalid code provided for method extraction.");
        }
        helpers.log("Extracting methods from code...", "base-code-parser.ts", "extractMethods", "info");
        // Extract method name and parameters
        while ((methodMatch = new RegExp(this.methodRegex).exec(code)) !== null) {
            if (!methodMatch || methodMatch.length < 3) {
                helpers.log("No valid method match found in the provided code.", "base-code-parser.ts", "extractMethods", "warn");
                continue; // Skip invalid matches
            }
            
            const methodName = methodMatch[1];  
            const parametersString = methodMatch[2];
            helpers.log(`Extracting parameters from method: ${methodName} (${parametersString})`, "base-code-parser.ts", "extractMethods", "debug");

            const parameters: ParameterInfo[] = [];
            if (parametersString !== undefined && parametersString.trim() !== "") {
                // Ensure the regex is global
                let parameterMatch: RegExpExecArray | null;
                // Extract parameters from the method signature
                while ((parameterMatch = new RegExp(this.parameterRegex).exec(parametersString)) !== null) {
                    parameters.push({
                        name: parameterMatch[1].trim(),
                        type: parameterMatch[2].trim(),
                    });
                    helpers.log(`Found parameter: ${parameterMatch[1].trim()} of type ${parameterMatch[2].trim()}`, "base-code-parser.ts", "extractMethods", "debug");
                }
            }
            // Extract the comment before the method definition
            helpers.log(`Extracting comment for method: ${methodName}`, "base-code-parser.ts", "extractMethods", "debug");
            const methodStartIndex = methodMatch.index;
            const previousCode = code.substring(0, methodStartIndex);
            const commentMatch = previousCode.match(new RegExp(this.commentRegex));
            const description = commentMatch
                ? commentMatch[1].replace("//", "").replace(/\n/g, "").replace("//", "").trim()
                : undefined;

            methods.push({
                name: methodName,
                parameters,
                description,
            });
            helpers.log(`Extracted method: ${methodName} with parameters: ${JSON.stringify(parameters)} and description: ${description}`, "base-code-parser.ts", "extractMethods", "debug");
        }

        return methods;
    }
    /**
     * Extract classes from the provided code.
     * @param code - The code from which to extract classes.
     * @return An array of class names found
     */
    public extractClasses(code: string): string[] {
        let str: string = this.extractClassesRegExp || "";
        if (!str || str.trim() === "") {
            // Default regex for extracting classes
            str = "(?:export\\s+)?class\\s+([A-Za-z0-9_]+)";
        }
        if (!code || typeof code !== 'string') {
            helpers.log("Invalid code provided for class extraction.", "base-code-parser.ts", "extractClasses", "error");
            throw new Error("Invalid code provided for class extraction.");
        }
        const classes = extractByRegex(code, new RegExp(str, "g"));
        if (classes.length === 0) {
            helpers.log("No classes found in the provided code.", "base-code-parser.ts", "extractClasses", "warn");
            throw new Error("No classes found in the provided code.");
        }
        // Ensure the regex is global
        return classes.map((cls: string) => cls.trim());
    }

    /**
     * Extract import statements from the provide code.
     * @param code - The code from which to extract import statements.
     * @return An array of import statements found in the code.
     * @throws Error if the code is invalid or if no imports are found.
     */
    public extractImports(code: string): string[] {
        let str: string = this.extractImportsRegExp || "";
        if (!str || str.trim() === "") {
            // Default regex for extracting imports
            str = "^(?:using\\s+([A-Za-z0-9_.]+);)";
        }
        if (!code || typeof code !== 'string') {
            helpers.log("Invalid code provided for import extraction.", "base-code-parser.ts", "extractImports", "error");
            throw new Error("Invalid code provided for import extraction.");
        }
        // Ensure the regex is global and multiline
        const imports = extractByRegex(code, new RegExp(str, "gm"));
        if (imports.length === 0) {
            helpers.log("No imports found in the provided code.", "base-code-parser.ts", "extractImports", "warn");
            throw new Error("No imports found in the provided code.");
        }
        return imports.map((imp: string) => imp.trim());
    }

    /**
     * Extract project information from the specified project path.
     * @param projectPath - The path to the project directory.
     * @return An object containing arrays of files, methods, classes, imports, and files with methods.
     * @throws Error if the project path is invalid or if no files are found.
     * @example
     * const projectInfo = extractProjectInfo('/path/to/project');
     */ 
    public extractProjectInfo(projectPath: string): {
        files: { path: string; content: string }[]; methods: MethodInfo[]; classes: string[]; imports: string[];
        filesWithMethods: string[];
    } {
        if (!projectPath || typeof projectPath !== 'string') {
            helpers.log("Invalid project path provided.", "base-code-parser.ts", "extractProjectInfo", "error");
            throw new Error("Invalid project path provided.");
        }
        helpers.log("Extracting project information...", "base-code-parser.ts", "extractProjectInfo", "info");
        
        const files = extractFilesFromProject(projectPath.trim(), this.fileExtension);
        helpers.log(`Found ${files.length} files in the project path: ${projectPath} with extensions: ${this.fileExtension.join(", ")}`, "base-code-parser.ts", "extractProjectInfo", "debug");
        if (files.length === 0) {
            helpers.log("No files found in the specified project path.", "base-code-parser.ts", "extractProjectInfo", "error");
            throw new Error("No files found in the specified project path.");
        }
        const methods: MethodInfo[] = [];
        const classes: string[] = [];
        const imports: string[] = [];
        const filesWithMethods: string[] = [];

        for (const file of files) {
            helpers.log(`Processing file: ${file.path}`, "base-code-parser.ts", "extractProjectInfo", "debug");
            if (!file.content) {
                helpers.log(`File content is empty for: ${file.path}`, "base-code-parser.ts", "extractProjectInfo", "warn");
                continue; // Skip files with empty content
            }
            const fileMethods = this.extractMethods(file.content);
            if (fileMethods.length > 0) {
                filesWithMethods.push(file.path + ": " + fileMethods.join("; "));
                methods.push(...fileMethods);
                helpers.log(`Found methods in file: ${fileMethods}`, "base-code-parser.ts", "extractProjectInfo", "debug");
            }
            const fileClasses = this.extractClasses(file.content);
            if (fileClasses.length > 0) {
                classes.push(...fileClasses);
                helpers.log(`Found classes in file: ${fileClasses}`, "base-code-parser.ts", "extractProjectInfo", "debug");
            }
            const fileImports = this.extractImports(file.content);
            if (fileImports.length > 0) {
                imports.push(...fileImports);
                helpers.log(`Found imports in file: ${fileImports}`, "base-code-parser.ts", "extractProjectInfo", "debug");
            }
        }
        return { files, methods, classes, imports, filesWithMethods };
    }
}

/* example of how to use the BaseCodeParser class:

import { BaseCodeParser } from '../base-code-parser';

export class JavaCodeParser extends BaseCodeParser {
  protected methodRegex = "";
  protected parameterRegex = "";
  protected commentRegex = "";
  protected extractClassesRegExp = "";
  protected extractImportsRegExp = "";
  protected fileExtension: string[] = [""];
}

*/