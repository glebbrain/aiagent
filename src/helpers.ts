/**
 * @description This module handles file operations, method modifications, and MCP commands based on AI-generated responses. 
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-11
 */

const vscode = require('vscode'); // Import the vscode module for VS Code API
const fsp = require('fs/promises'); // Import the asynchronous file system module
const fs = require('fs'); // Import the synchronous file system module
const path = require('path'); // Import the path module for handling file paths
const ignore = require('ignore'); // Import the ignore module to handle .gitignore files
const { format } = require('date-fns'); // Import the format function from date-fns for date formatting

// files and directories


/**
 * Copies a directory from the source path to the destination path.
 * @param source The source directory path.
 * @param destination The destination directory path.
 * @returns A promise that resolves when the copy operation is complete.
 */
export function copyDirectory(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.cp(source, destination, { recursive: true, force: true }, (err: NodeJS.ErrnoException | null) => {
            if (err) {
                console.error(`Error copying directory from ${source} to ${destination}:`, err);
                reject(err);
            } else {
                console.log(`Directory copied from ${source} to ${destination}`);
                resolve();
            }
        });
    });
}


/**
 * Removes the specified character from the end of the string, if it exists.
 * @param str The input string.
 * @param char The character to remove.
 * @returns The modified string.
 */
export function removeCharAtEnd(str: string, char: string): string {
    if (str.endsWith(char)) {
        return str.slice(0, -1);
    }
    return str;
}
/**
 * Removes the specified character from the start of the string, if it exists.
 * @param str The input string.
 * @param char The character to remove.
 * @returns The modified string.
 */
export function removeCharAtStart(str: string, char: string): string {
    if (str.startsWith(char)) {
        return str.slice(1);
    }
    return str;
}
/**
 * Removes the specified substring from the start of the string, if it exists.
 * @param str The input string.
 * @param substring The substring to remove.
 * @returns The modified string.
 */
export function removeStringAtStart(str: string, substring: string): string {
    if (str.startsWith(substring)) {
        return str.slice(substring.length);
    }
    return str;
}
/**
 * Removes the specified substring from the end of the string, if it exists.
 * @param str The input string.
 * @param substring The substring to remove.
 * @returns The modified string.
 */
export function removeStringAtEnd(str: string, substring: string): string {
    if (str.endsWith(substring)) {
        return str.slice(0, -substring.length);
    }
    return str;
}
/**
 * @param jsonString The JSON string to be cleared of formatting characters.
 * @returns The modified JSON string.
 */
export function clearJsonString(jsonString: string): string {
    /* enter text:
    `\`\`\`json
    {
       "tasks": []
       }
    \`\`\`
    `
  */
    while (
        jsonString.startsWith('`') ||
        jsonString.endsWith('`')
        || jsonString.startsWith('`\`\`\`json') 
        || jsonString.startsWith('`\\`\\`\\`json')
    ) {
        jsonString = removeStringAtStart(jsonString, '````json');
        jsonString = removeStringAtStart(jsonString, '```json');
        jsonString = removeStringAtStart(jsonString, '``json');
        jsonString = removeStringAtStart(jsonString, '`json');
        jsonString = removeStringAtStart(jsonString, 'json');
        jsonString = removeStringAtStart(jsonString, '`\\`\\`\\`json');
        jsonString = removeStringAtEnd(jsonString, '`');
        jsonString = removeStringAtEnd(jsonString, '\r\n');
        jsonString = removeStringAtEnd(jsonString, '\\`\\`\\`');

        jsonString = removeCharAtStart(jsonString, '\\');
        jsonString = removeCharAtStart(jsonString, '`');
        jsonString = removeStringAtEnd(jsonString, '\r\n');
        jsonString = removeCharAtEnd(jsonString, '`');
        jsonString = removeCharAtEnd(jsonString, '\\');
        jsonString = removeStringAtStart(jsonString, '\r\n');

        jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        jsonString = jsonString.trim();
    }

    return jsonString;
}

/**
 * Reads a JSON file and returns its contents as an object of type T.
 * @param filePath - The path to the JSON file to read.
 * @returns The parsed JSON object of type T.
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
    try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            log(`File "${filePath}" does not exist.`, 'readJsonFile', 'helpers.ts', 'error');
            throw new Error(`File "${filePath}" does not exist.`);
        }
        const fileContent = await fsp.readFile(filePath, 'utf-8');
        const jsonData: T = JSON.parse(fileContent);
        log(`Successfully read and parsed JSON file: ${filePath}, data: ${JSON.stringify(jsonData)}`, 'readJsonFile', 'helpers.ts', 'debug');
        return jsonData;
    } catch (error: any) {
        // Log the error if reading or parsing fails
        if (error.code === 'ENOENT') {  // File not found error
            log(`File "${filePath}" not found.`, 'readJsonFile', 'helpers.ts', 'error');
        }
        log(`Error reading or parsing JSON file "${filePath}": ${error.message}`, 'readJsonFile', 'helpers.ts', 'error');
        // Handle specific error cases
        throw error; // Re-throw the error to be handled by the caller
    }
}

/**
 * Reads the JSON string and returns it as an object of type T.
 * @param fileContent - The content of the JSON file as a string.
 *  * @returns The parsed JSON object of type T.
 */
export async function readJsonString<T>(fileContent: string): Promise<T> {
    try {
        // Check if the file content is a valid JSON string
        if (typeof fileContent !== 'string' || fileContent.trim() === '') {
            log(`Invalid JSON string provided: ${fileContent}`, 'readJsonString', 'helpers.ts', 'error');
            throw new Error('Invalid JSON string provided.');
        }
        // Log the JSON string for debugging purposes
        log(`Reading JSON string: ${fileContent}`, 'readJsonString', 'helpers.ts', 'debug');
        const jsonData: T = JSON.parse(fileContent);
        log(`Successfully parsed JSON string: ${JSON.stringify(jsonData)}`, 'readJsonString', 'helpers.ts', 'debug');

        // Check if the parsed data is an object
        if (typeof jsonData !== 'object' || jsonData === null) {
            log(`Parsed data is not a valid object: ${JSON.stringify(jsonData)}`, 'readJsonString', 'helpers.ts', 'error');
            throw new Error('Parsed data is not a valid object.');
        }
        return jsonData;
    } catch (error: any) {
        log(`Error parsing JSON string: ${error.message}`, 'readJsonString', 'helpers.ts', 'error');
        throw error; // Re-throw the error to be handled by the caller
    }
}

/**
 * Formats a date from a timestamp into a string.
 * @param timestamp - Timestamp in milliseconds
 * @param format - Format string, where DD is day, MM is month, YYYY is year
 * @returns Formatted date string
 */
export function formatDate(timestamp: number, formatStr: string): string {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        log(`Invalid timestamp provided: ${timestamp}`, 'formatDate', 'helpers.ts', 'error');
        throw new Error('Invalid timestamp provided. It must be a valid number.');
    }
    log(`Formatting date from timestamp: ${timestamp} with format: ${formatStr}`, 'formatDate', 'helpers.ts', 'debug');
    const date = new Date(timestamp);

    // if the date is invalid, throw an error
    if (isNaN(date.getTime())) {
        log(`Invalid date created from timestamp: ${timestamp}`, 'formatDate', 'helpers.ts', 'error');
        throw new Error('Invalid date created from timestamp.');
    }

    // Map custom format to date-fns format
    const dateFnsFormat = formatStr
        .replace(/DD/g, 'dd')
        .replace(/MM/g, 'MM')
        .replace(/YYYY/g, 'yyyy');

    // Log the formatted date for debugging
    log(`Formatted date: ${dateFnsFormat}`, 'formatDate', 'helpers.ts', 'debug');
    // Use date-fns format function to format the date
    return format(date, dateFnsFormat);
}

/**
 * Adds new data to a JSON file at a specified level.
 * If the level is not specified, the data is added to the root object.
 * If the level is specified, the data is added to the specified nested object.
 * If the specified level does not exist, an error will be thrown.
 * If the specified level is an array, the new object will be appended to the end of the array.
 * If the specified level is an object, the new data will be merged with the existing data.
 * If the specified level is not an object or array, an error will be thrown.
 * @param filePath Path to the JSON file
 * @param newData New data to add
 * @param level Level at which to add the new data
 */
export async function addToJSON<T extends object>(  
    filePath: string,
    newData: T,
    level: string | null = null
): Promise<void> {
    try {

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            log(`File "${filePath}" does not exist. Creating a new file with initial data.`, 'addToJSON', 'helpers.ts', 'info');
            // If the file does not exist, create it with the new data
            await fsp.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf-8');
            log(`File "${filePath}" created successfully with initial data.`, 'addToJSON', 'helpers.ts', 'info');
            return; // Exit after creating the file
        }

        log(`Reading file: ${filePath}`, 'addToJSON', 'helpers.ts', 'debug');
        // Check if the file is a valid JSON file
        if (path.extname(filePath) !== '.json') {
            log(`File "${filePath}" is not a JSON file.`, 'addToJSON', 'helpers.ts', 'error');
            throw new Error(`File "${filePath}" is not a JSON file.`);
        }
        // 1. Reading the contents of the file
        const fileContent = await fsp.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // If no level is specified, add data to the root object
        if (!level) {
            log(`No level specified. Adding data to the root object of the JSON file.`, 'addToJSON', 'helpers.ts', 'debug');
            // Check if the root is an object
            Object.assign(jsonData, newData);
        } else {
            // Split the level into keys to access the nested object
            const keys = level.split('.');
            let currentLevel = jsonData;
            let i = 0;

            // Traverse the nested levels
            while (i < keys.length - 1) {
                const key = keys[i];
                if (currentLevel && typeof currentLevel === 'object' && key in currentLevel) {
                    currentLevel = currentLevel[key];
                    log(`Traversing to "${i}" level "${key}" in JSON file.`, 'addToJSON', 'helpers.ts', 'debug');
                    i++;
                } else {
                    log(`Level "${level}" does not exist in the file.`, 'addToJSON', 'helpers.ts', 'error');
                    throw new Error(`Level "${level}" does not exist in the file.`);
                }
            }

            // Add new data at the specified level
            const lastKey = keys[keys.length - 1];
            if (currentLevel && typeof currentLevel === 'object') {
                if (Array.isArray(currentLevel[lastKey])) {
                    // If the specified level is an array, append the new element to the end
                    currentLevel[lastKey].push(newData);
                    log(`Appending data to array at level "${currentLevel}".`, 'addToJSON', 'helpers.ts', 'debug');
                } else if (typeof currentLevel[lastKey] === 'object' || currentLevel[lastKey] === undefined) {
                    // If the specified level is an object or does not exist, merge with new data
                    currentLevel[lastKey] = { ...currentLevel[lastKey], ...newData };
                    log(`Merging data with existing object at level "${currentLevel}".`, 'addToJSON', 'helpers.ts', 'debug');
                } else {
                    log(`Key "${lastKey}" at level "${level}" is neither an object nor an array.`, 'addToJSON', 'helpers.ts', 'error');
                    throw new Error(`Key "${lastKey}" at level "${level}" is neither an object nor an array.`);
                }
            } else {
                log(`Level "${level}" does not exist or is not an object.`, 'addToJSON', 'helpers.ts', 'error');
                throw new Error(`Level "${level}" does not exist or is not an object.`);
            }
        }

        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        log(`Data successfully added to JSON file at level "${level}".`, 'addToJSON', 'helpers.ts', 'info');
    } catch (error: any) {
        log(`Error adding data to JSON file: ${error.message}`, 'addToJSON', 'helpers.ts', 'error');
        throw new Error(`Failed to add data to JSON file: ${error.message}`);
    }
}

/**
 * Appends an object of any type T to a JSON file containing an array of T.
 * If the file does not exist, it will be created and initialized with [data].
 * @param filePath - Path to the JSON file
 * @param data - Object of type T to append
 * @returns The updated array of objects of type T
 * @throws Error if reading, parsing, or writing fails, or if JSON content is not an array
 */
export async function appendToJson<T>(filePath: string, data: T): Promise<T[]> {
    try {
        // Read file content
        let fileContent: string;
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            // If file does not exist, create it with the initial data
            const initialArray = [data];
            await fsp.writeFile(filePath, JSON.stringify(initialArray, null, 2), 'utf-8');
            log(`File "${filePath}" did not exist. Created new file with initial data.`, 'appendToJson', 'helpers.ts', 'info');
            return initialArray; // Return the newly created array
        }
        // If file exists, read its content
        log(`Reading file: ${filePath}`, 'appendToJson', 'helpers.ts', 'debug');
        try {
            fileContent = await fsp.readFile(filePath, 'utf-8');
            log(`File "${filePath}" read successfully.`, 'appendToJson', 'helpers.ts', 'debug');
        } catch (readErr: any) {
            log(`Error reading file "${filePath}": ${readErr.message}`, 'appendToJson', 'helpers.ts', 'error');
            // Handle the case where the file does not exist
            // If file does not exist, initialize a new array
            if (readErr.code === 'ENOENT') {
                const initialArray = [data];
                await fsp.writeFile(filePath, JSON.stringify(initialArray, null, 2), 'utf-8');
                log(`File "${filePath}" did not exist. Created new file with initial data.`, 'appendToJson', 'helpers.ts', 'info');
                return initialArray;
            }
            throw new Error(`Failed to read file: ${readErr.message}`);
        }
        log(`File "${filePath}" read successfully.`, 'appendToJson', 'helpers.ts', 'debug');
        // Parse JSON
        let json: unknown;
        try {
            json = JSON.parse(fileContent);
            log(`File "${filePath}" parsed successfully.`, 'appendToJson', 'helpers.ts', 'debug');
        } catch (parseErr: any) {
            log(`Error parsing JSON in file "${filePath}": ${parseErr.message}`, 'appendToJson', 'helpers.ts', 'error');
            // Handle the case where the file is not valid JSON
            throw new Error(`Invalid JSON in file: ${parseErr.message}`);
        }

        // Ensure the JSON is an array
        if (!Array.isArray(json)) {
            log(`JSON content in file "${filePath}" is not an array.`, 'appendToJson', 'helpers.ts', 'error');
            throw new Error('JSON content is not an array');
        }

        // Append the new data
        const updatedArray = [...json, data];
        log(`Appending data to JSON array in file "${filePath}".`, 'appendToJson', 'helpers.ts', 'debug');
        // Write back to file
        try {
            await fsp.writeFile(filePath, JSON.stringify(updatedArray, null, 2), 'utf-8');
            log(`Data successfully appended to file "${filePath}".`, 'appendToJson', 'helpers.ts', 'info');
        } catch (writeErr: any) {
            log(`Error writing file "${filePath}": ${writeErr.message}`, 'appendToJson', 'helpers.ts', 'error');
            throw new Error(`Failed to write file: ${writeErr.message}`);
        }
        log(`Returning updated array of type T with ${updatedArray.length} items.`, 'appendToJson', 'helpers.ts', 'debug');
        // Return the updated array
        return updatedArray;
    } catch (err: any) {
        // Propagate errors
        log(`Error in appendToJson: ${err.message}`, 'appendToJson', 'helpers.ts', 'error');
        throw err;
    }
}

/**
* Converts any object of type T to a formatted JSON string.
* @param data - Object to convert to JSON string
* @param spacing - Number of spaces for indentation (default is 2)
* @returns A JSON string representation of the object
* @throws Error if serialization fails
*/
export function jsonToString<T>(data: T, spacing: number = 2): string {
    try {
        // Check if data is null or undefined
        if (data === null || data === undefined) {
            log('Data is null or undefined, returning empty JSON string.', 'jsonToString', 'helpers.ts', 'warn');
            return JSON.stringify({});
        }
        // Check if data is a valid object
        if (typeof data !== 'object' || Array.isArray(data)) {
            log(`Data is not a valid object: ${data}`, 'jsonToString', 'helpers.ts', 'error');
            throw new Error('Data must be a valid object to convert to JSON string.');
        }
        // Convert the object to a JSON string with specified spacing
        log(`Converting data: ${JSON.stringify(data)} to JSON string with spacing: ${spacing}`, 'jsonToString', 'helpers.ts', 'debug');
        return JSON.stringify(data, null, spacing);
    } catch (err: any) {
        log(`Error converting data to JSON string: ${err.message}`, 'jsonToString', 'helpers.ts', 'error');
        throw new Error(`Failed to convert data to JSON string: ${err.message}`);
    }
}
  

/**
 * Extracts files with specified extensions from a project directory.
 * @param projectPath - The root path of the project.
 * @param extensions - An array of file extensions to include (e.g., ['.ts', '.json']).
 * @returns An array of objects containing the path and content of each extracted file.
 */
export function extractFilesFromProject(projectPath: string, extensions: string[]): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    // Ensure the project path is valid
    if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
        log(`Invalid project path: ${projectPath}`, 'extractFilesFromProject', 'helpers.ts', 'error');
        throw new Error(`Invalid project path: ${projectPath}`);
    }
    log(`Starting to extract files from project: ${projectPath}`, 'extractFilesFromProject', 'helpers.ts', 'info');
    scanAllowedFiles(projectPath, async (filePath: string) => {
        const fileExtension = path.extname(filePath);
        if (extensions.includes(fileExtension)) {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            files.push({ path: filePath, content });
            log(`Extracted file: ${filePath}; Content length: ${content.length}`, 'extractFilesFromProject', 'helpers.ts', 'debug');
        }
    });
    log(`Finished extracting files from project: ${projectPath}`, 'extractFilesFromProject', 'helpers.ts', 'info');
    return files;
}

/**
 * Extracts class names from TypeScript code using a regular expression.
 * @param TypeScriptCode - The TypeScript code to search within.
 * @param regexPattern - The regular expression pattern to use for extraction.
 * @returns An array of extracted class names.
 */
export function extractByRegex(TypeScriptCode: string, regexPattern: RegExp): string[] {
    
    // Ensure the regex pattern is a valid RegExp object
    const classRegex = new RegExp(regexPattern);
    const classes: string[] = [];
    let classMatch;

    try{
        // Use exec to find all matches in the TypeScript code
        if (typeof TypeScriptCode !== 'string') {
            log(`Provided TypeScript code is not a string: ${TypeScriptCode}`, 'extractByRegex', 'helpers.ts', 'error');
        }
        // Validate the regex pattern
        if (!classRegex || !(classRegex instanceof RegExp)) {
            log(`Invalid regex pattern provided: ${regexPattern}`, 'extractByRegex', 'helpers.ts', 'error');
            return classes; // Return empty array if regex is invalid
        }

        if (TypeScriptCode.length > 0) {
            while ((classMatch = classRegex.exec(TypeScriptCode)) !== null) {
                classes.push(classMatch[1]);
            }
        }
        if (classes.length === 0) {
            log(`No classes found in the provided TypeScript code using pattern: ${regexPattern}`, 'extractByRegex', 'helpers.ts', 'info');
        } else {
            log(`Extracted ${classes.length} classes from TypeScript code using pattern: ${regexPattern}`, 'extractByRegex', 'helpers.ts', 'info');
        }
    } catch (error: any) {
        // Log the error if regex execution fails
        if (error instanceof SyntaxError) {
            log(`Syntax error in regex pattern: ${regexPattern}. Error: ${error.message}`, 'extractByRegex', 'helpers.ts', 'error');
        } else {
            log(`Unexpected error in extractByRegex: ${error.message}`, 'extractByRegex', 'helpers.ts', 'error');
        }
        return classes; // Return empty array if an error occurs
    }
    log(`Returning ${classes.length} extracted classes.`, 'extractByRegex', 'helpers.ts', 'debug');
    return classes;
}
/**
 * Reads a directory and extracts files with specified extensions.
 * @param directoryPath - The path to the directory to read.
 * @param extensions - An array of file extensions to include (e.g., ['.ts', '.json']).
 * @param files - An array to store the extracted files.
 */
export function readDirectory(
    directoryPath: string, 
    extensions: string[], 
    files: { path: string; content: string }[]
) {
    try{
        // Ensure the directory path is valid
        if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
            log(`Invalid directory path: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'error');
            return; // Exit the function if the path is invalid
        }
        // Read the contents of the directory
        const items = fs.readdirSync(directoryPath);
        // Ensure the directory exists
        if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
            log(`Invalid directory path: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'error');
            return;
        }
        log(`Reading directory: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'info');
        // Iterate through each item in the directory
        if (items.length === 0) {
            log(`No items found in directory: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'info');
            return; // If no items, exit the function
        }

        log(`Found ${items.length} items in directory: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'debug');
        for (const item of items) {
            const itemPath = path.join(directoryPath, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                readDirectory(itemPath, extensions, files);
                log(`Recursively reading directory: ${itemPath}`, 'readDirectory', 'helpers.ts', 'debug');
            } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
                const content = fs.readFileSync(itemPath, 'utf-8');
                files.push({ path: itemPath, content });
                log(`Extracted file: ${itemPath}; Content length: ${content.length}`, 'readDirectory', 'helpers.ts', 'debug');
            }
        }
        log(`Finished reading directory: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'info');
        if (files.length === 0) {
            log(`No files with specified extensions found in directory: ${directoryPath}`, 'readDirectory', 'helpers.ts', 'info');
        }
    } catch (error: any) {
        log(`Error reading directory: ${error.message}`, 'readDirectory', 'helpers.ts', 'error');
        return; // Exit the function if an error occurs
    }
}

/**
 * Scans a project directory for files and processes them.
 * @param projectPath - The root path of the project.
 * @param processFile - A function to process each file found.
 * @returns A promise that resolves when the scanning is complete.
 */
export async function scanAllowedFiles(
    projectPath: string, 
    processFile: (filePath: string) => Promise<void>
): Promise<void> {
    try {
        const gitignorePath = path.join(projectPath, '.gitignore');
        let ignorePatterns: ReturnType<typeof ignore> | null = null;

        try {
            const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf-8');
            ignorePatterns = ignore().add(gitignoreContent.split('\n').filter((line: string) => line.trim() !== '' && !line.startsWith('#')));
        } catch (error: any) {
            ignorePatterns = null; // No ignore patterns, process all files
            if (error.code === 'ENOENT') {
                log(`.gitignore file not found in directory: ${projectPath}. All files will be processed.`, 'scanAllowedFiles', 'helpers.ts', 'warn');
            } else {
                log(`Error reading .gitignore file: ${error.message}`, 'scanAllowedFiles', 'helpers.ts', 'error');
                return;
            }
        }

        // Check if the project path is valid
        if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
            log(`Invalid project path: ${projectPath}`, 'scanAllowedFiles', 'helpers.ts', 'error');
            throw new Error(`Invalid project path: ${projectPath}`);
        }
        log(`Starting to scan project directory: ${projectPath}`, 'scanAllowedFiles', 'helpers.ts', 'info');
        async function traverseDirectory(currentPath: string) {
            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            if (!entries || entries.length === 0) {
                log(`No entries found in directory: ${currentPath}`, 'scanAllowedFiles', 'helpers.ts', 'info');
                return; // Exit if no entries found
            }
            log(`Scanning directory: ${currentPath}`, 'scanAllowedFiles', 'helpers.ts', 'debug');
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (ignorePatterns && ignorePatterns.ignores(path.relative(projectPath, fullPath))) {
                    log(`Ignoring file or directory: ${fullPath}`, 'scanAllowedFiles', 'helpers.ts', 'debug');
                    continue; // Skip ignored files and directories
                }

                if (entry.isDirectory()) {
                    await traverseDirectory(fullPath);
                    log(`Found directory: ${entry.name} in directory: ${currentPath}`, 'scanAllowedFiles', 'helpers.ts', 'debug');
                } else if (entry.isFile()) {
                    await processFile(fullPath);
                    log(`Found file: ${entry.name} in directory: ${currentPath}`, 'scanAllowedFiles', 'helpers.ts', 'debug');
                }
            }
        }

        await traverseDirectory(projectPath);
        log(`Finished scanning project directory: ${projectPath}`, 'scanAllowedFiles', 'helpers.ts', 'info');
    } catch (error: any) {
        log(`Error scanning project: ${error.message}`, 'scanAllowedFiles', 'helpers.ts', 'error');
    }
}

/**
 * Recursively walks through a directory and collects files with specified extensions.
 * @param dir - The directory to walk through.
 * @param filesFound - A set to store found file names.
 * @param extensions - A set of allowed file extensions.
 */
export async function walk(
    dir: string, 
    filesFound: Set<string>, 
    extensions: Set<string>
): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    if (!entries || entries.length === 0) {
        log(`No entries found in directory: ${dir}`, 'walk', 'helpers.ts', 'info');
        return; // Exit if no entries found
    }
    log(`Walking through directory: ${dir}`, 'walk', 'helpers.ts', 'debug');
    // Iterate through directory entries
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, filesFound, extensions);
            log(`Found directory: ${entry.name} in directory: ${dir}`, 'walk', 'helpers.ts', 'debug');
        } else if (entry.isFile()) {
            extensions.add(path.extname(entry.name));
            filesFound.add(entry.name.toLowerCase());
            log(`Found file: ${entry.name} in directory: ${dir}`, 'walk', 'helpers.ts', 'debug');
        }
    }
}

/**
 * Gets the path to the first workspace folder.
 * @returns The path to the first workspace folder, or undefined if no workspace is open.
 */
export function getWorkspaceFolder(withoutlog: boolean = false): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        if (withoutlog) {
            console.warn('[getWorkspaceFolder, helpers.ts, warn] No workspace folders found.'); // Log to console if withoutlog is true
        } else{
            log('No workspace folders found.', 'getWorkspaceFolder', 'helpers.ts', 'warn');
        }
        return undefined; // No workspace folders available
    }
    if (withoutlog) {
        console.log(`Found workspace folder: ${folders[0].uri.fsPath}`); // Log to console if withoutlog is true
    }else{
        log(`Found workspace folder: ${folders[0].uri.fsPath}`, 'getWorkspaceFolder', 'helpers.ts', 'info');
    }
    return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}


export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function hashString(str: string): string {
    if (typeof str !== 'string' || str.trim() === '') {
        log('Invalid string provided for hashing. It must be a non-empty string.', 'hashString', 'helpers.ts', 'error');
        throw new Error('Invalid string provided for hashing. It must be a non-empty string.');
    }
    // Create a hash of the string using SHA-256
    const hash = require('crypto').createHash('sha256');
    hash.update(str);
    const hashedString = hash.digest('hex');
    log(`Hashed string: ${hashedString} for input: ${str}`, 'hashString', 'helpers.ts', 'debug');

    return hashedString;
}   

export function hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof filePath !== 'string' || filePath.trim() === '') {
            log('Invalid file path provided for hashing. It must be a non-empty string.', 'hashFile', 'helpers.ts', 'error');
            return reject(new Error('Invalid file path provided for hashing. It must be a non-empty string.'));
        }
        const hash = require('crypto').createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data: Buffer) => {
            hash.update(data);
        });
        stream.on('end', () => {
            const hashedFile = hash.digest('hex');
            log(`Hashed file: ${hashedFile} for path: ${filePath}`, 'hashFile', 'helpers.ts', 'debug');
            resolve(hashedFile);
        });
        stream.on('error', (err: NodeJS.ErrnoException) => {
            log(`Error reading file for hashing: ${err.message}`, 'hashFile', 'helpers.ts', 'error');
            reject(err);
        });
    });
}

export function emptyVariable(variable: any): boolean {
    return (
        variable === null ||
        variable === undefined ||
        (typeof variable === 'object' && Object.keys(variable).length === 0) ||
        (typeof variable === 'string' && variable.trim() === '')
    );
}

export function notEmptyVariable(variable: any): boolean {
    return !emptyVariable(variable);
}

/**
 * Writes a log message to a file with the current date.
 *
 * @param message Message to log.
 * @param functionName Name of the function that generated the log (default is 'log').
 * @param fileName Name of the file where the log is generated (default is 'extension.ts').
 * @param level Log level (default is 'info'). Can be 'info', 'error', 'warn', or 'debug'.
 * @returns void
 */
export function log(
    message: string,
    functionName: string = 'log',
    fileName: string = 'extension.ts',
    level: 'info' | 'error' | 'warn' | 'debug' = 'info'
): void {

    const config = vscode.workspace.getConfiguration();
    if (!config.get('logging')) {
        return;
    }
    // Ensure the log directory exists
    if (typeof message !== 'string' || message.trim() === '') {
        console.error('Invalid log message provided. It must be a non-empty string.');
        return; // Exit if the message is invalid
    }
    // Show a notification in VS Code
    vscode.window.showInformationMessage(message);

    if (typeof functionName !== 'string' || functionName.trim() === '') {
        console.error('Invalid function name provided. It must be a non-empty string.');
        return; // Exit if the function name is invalid
    }
    if (typeof fileName !== 'string' || fileName.trim() === '') {
        console.error('Invalid file name provided. It must be a non-empty string.');
        return; // Exit if the file name is invalid
    }
    // Get the configuration for logging
    if (typeof level !== 'string' || !['info', 'error', 'warn', 'debug'].includes(level)) {
        console.error('Invalid log level provided. It must be one of: info, error, warn, debug.');
        return; // Exit if the log level is invalid
    }
   
    // Check if logging is enabled for this file and function
    // Example config structure:
    // "logging": {"logDirectory":"", logfiles:[{fileName: "extension.ts", functionsName:['*'], enabled: true, level: "info"}]},

    const logEnabled = config.get('logging')?.enabled || true;
    if (!logEnabled) {
        return; // Exit if logging is disabled
    }
    /*
    "logging.logLevel": {
        "type": "string",
        "default": "info",
        "enum": ["error", "warn", "info", "debug", "all"],
        "description": "Set the log level for the extension. This controls the verbosity of the logs written to the log files."
    }
    */
    const logLevel = config.get('logging')?.logLevel || 'info';
    if (logLevel !== 'all' && logLevel !== level) {
        return; // Exit if the log level does not match
    }

    // Get the log directory from the configuration or use a default value
    let logDirectory = config.get('logging')?.logDirectory || '{$workspaceFolder}/.logs';
    if (typeof logDirectory !== 'string' || logDirectory.trim() === '') {
        console.error('Invalid log directory provided. It must be a non-empty string.');
        return; // Exit if the log directory is invalid
    }
    // Check if the log directory starts with a placeholder for the workspace folder
    if (logDirectory.startsWith('{$workspaceFolder}')) {
        // Replace the placeholder with the actual workspace folder path
        const workspaceFolder = getWorkspaceFolder(true);
        if (!workspaceFolder) {
            console.error('No workspace folder found. Cannot resolve log directory.');
            return; // Exit if no workspace folder is available
        }
        logDirectory = logDirectory.replace('{$workspaceFolder}', workspaceFolder);
    }
    // Ensure the log directory exists
    if (!fs.existsSync(logDirectory)) {
        // Create the log directory if it does not exist
        try {
            fs.mkdirSync(logDirectory, { recursive: true });
            console.log(`Log directory created: ${logDirectory}`);
        } catch (err) {
            console.error(`Failed to create log directory: ${logDirectory}`, err);
            return; // Exit if unable to create the log directory
        }
    }
    
    // 1. Get the current date for a file name
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months start at 0
    const day = String(now.getDate()).padStart(2, '0');
    const logName = `${year}-${month}-${day}.log`;

    // 2. Form the full path to the log file
    const logFilePath = path.join(logDirectory, logName);

    // 3. Format the current time for logging
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `[${hours}:${minutes}:${seconds}]`;

    // 4. Form the complete log entry
    const logEntry = `${formattedTime} {${level} - ${fileName} : ${functionName}} ${message}\n`;

    // 5. Check if the log directory exists and create it if it doesn't
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }

    // 6. Append the message to the end of the file (or create the file if it doesn't exist)
    fs.appendFile(logFilePath, logEntry, (err: any) => {
        if (err) {
            console.error(`Error writing to log file: ${logFilePath}:`, err);
        }
    });
    console.log(logEntry.trim()); // Also log to console for immediate feedback
}


