/**
 * @description This module processes prompt files in a specified directory, replacing placeholders with corresponding values from a provided object. 
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-07
 */

import * as fs from 'fs'
import * as path from 'path';
import * as helpers from './helpers';

/**
 * Replaces placeholders in the text with corresponding values
 * @param text text to process
 * @param replacements key-value pairs where key is a placeholder and value is an array of strings to replace the placeholder with
 * @returns string with placeholders replaced by the corresponding values
 */
function replaceProjectFilesPlaceholders(
    text: string,
    replacements: { [key: string]: string[] }
): string {
    let updatedText = text;
    try {
        // Check if replacements is an object and not empty
        if (!replacements || typeof replacements !== 'object' || Object.keys(replacements).length === 0) {
            helpers.log('No replacements provided or replacements is not an object.', 'replaceProjectFilesPlaceholders', 'collection-promts.ts', 'warn');
            return updatedText; // Return original text if no replacements
        }
        // Iterate over each placeholder in the replacements object
        // helpers.log('Starting to replace placeholders in text.', 'replaceProjectFilesPlaceholders', 'collection-promts.ts', 'info');
        helpers.log('Replacements object: ' + JSON.stringify(replacements), 'replaceProjectFilesPlaceholders', 'collection-promts.ts', 'debug');
        for (const placeholder in replacements) {
            // Check if the placeholder exists in the replacements object
            if (Object.prototype.hasOwnProperty.call(replacements, placeholder)) {
                // If the placeholder is found, replace it with the corresponding value
                // Join the array of strings into a single string with '|' as a separator
                const fileList = replacements[placeholder];
                const quotedFiles = fileList.map(file => `"${file}"`);
                const replacementString = `"${quotedFiles.join(',')}"`;
                // Escape special characters in the placeholder for use in a regular expression
                // Create a regular expression to match the placeholder globally
                const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedPlaceholder, 'g');
                updatedText = updatedText.replace(regex, replacementString);
            }
        }
        helpers.log(`Result after replacements: ${updatedText}`, 'replaceProjectFilesPlaceholders', 'collection-promts.ts', 'debug');
    } catch (error) {
        helpers.log(`Error occurred while replacing placeholders: ${error}`, 'replaceProjectFilesPlaceholders', 'collection-promts.ts', 'error');
    }
    return updatedText;
}

/**
 * Processes prompt files in the specified directory, replacing placeholders and updating JSON files.
 * @param replacements Object containing placeholders and their replacement values.
 * @param language Language code to filter files (default is 'ru').
 * @returns Promise<void>
 */
export async function processPrompts(
    pathEnxtension: string,
    pathToData: string,
    replacements: { [key: string]: string[] }, 
    language: string = 'en',
):Promise<boolean> {
    if (!replacements || typeof replacements !== 'object') {
        helpers.log('Invalid replacements object provided. It should be an object with key-value pairs.', 'processPrompts', 'collection-prompts.ts', 'error');
        return false;
    }
    // Ensure the language is a string and not empty
    if (typeof language !== 'string' || language.trim() === '') {
        helpers.log('Invalid language code provided. It should be a non-empty string.', 'processPrompts', 'collection-prompts.ts', 'error');
        return false;
    }

    helpers.log('dirname: ' + pathToData, 'processPrompts', 'collection-prompts.ts', 'debug');
    // Define the directory where the prompt parts are located
    const promptsPartsDir = path.join(pathToData, 'prompts', 'parts');

    try {
        // Check if the directory exists
        //let folders: string[] = [
        //    "F:\\VisualProjects\\UnifiedLLMMCPInterface\\unified-llm-mcp-interface\\data\\prompts\\parts\\analyst\\",
        //    "F:\\VisualProjects\\UnifiedLLMMCPInterface\\unified-llm-mcp-interface\\data\\prompts\\parts\\architect\\",
        //    "F:\\VisualProjects\\UnifiedLLMMCPInterface\\unified-llm-mcp-interface\\data\\prompts\\parts\\developer\\"
        //];
        let foldersPrompts: string[] =  fs.readdirSync(promptsPartsDir);
        
        if (foldersPrompts !== undefined && Array.isArray(foldersPrompts)) {
            helpers.log(`Found folders in ${promptsPartsDir}: ${foldersPrompts.join(', ')}`, 'processPrompts', 'collection-promts.ts', 'debug');
            // Filter out only directories
            for (const folder of foldersPrompts) {
                // Construct the full path to the folder
                const folderPath = path.join(promptsPartsDir, folder);
                const stats = fs.statSync(folderPath);
                
                // Check if the path is a directory
                if (stats.isDirectory()) {
                    // Initialize an object to hold the TXT files and their contents
                    const txtFiles: { [key: string]: string } = {};
                    const files = fs.readdirSync(folderPath);
                    // Filter for .txt files that match the language and do not include '-example'
                    for (const file of files) {
                        if (file.toLowerCase().endsWith('.txt') 
                            && file.toLowerCase().includes(language) 
                            && !file.toLowerCase().includes('example')) 
                        {
                            const filePath = path.join(folderPath, file);
                            try {
                                // Read the file content
                                let text = fs.readFileSync(filePath, 'utf-8');
                                // Replace placeholders in the text
                                if(text.includes('{~') && text.includes('~}')) {
                                    // Replace placeholders in the text using the replacements object
                                    text = replaceProjectFilesPlaceholders(text, replacements);
                                    // Remove lines with delimited substrings
                                    text = removeLinesWithDelimitedSubstring(text, ['{~', '~}']);
                                    // Replace line breaks and escape double quotes
                                    // Convert line breaks to \r\n and escape double quotes
                                    text = text.replace(/\r/g, ' ');
                                    text = text.replace(/\n/g, ' ');
                                    text = text.replace(/\t/g, ' ');
                                    text = text.replace(/""/g, '"');
                                    text = text.replace(/\s{2,}/g, ' ');
                                    text = text.replace(/[\[\]{}]/g, '');
                                    
                                    text = text.replace('   ', ' ');
                                    text = text.replace('  ', ' ');
                                    text = text.replace('"""', '"');
                                    text = text.replace('""', '"');
                                    text = text.replace('\'\'\'', '\'');
                                    text = text.replace('\'\'', '\'');
                                }
                                if (text.trim() !== '') {
                                    // Add the processed text to the txtFiles object
                                    const fileNameWithoutExt = path.parse(file).name;
                                    txtFiles[fileNameWithoutExt] = text;
                                }
                            } catch (error) {
                                helpers.log(`Error reading file ${filePath}: ` + error, 'readFile', 'collection-promts.ts', 'error');
                            }
                        }
                    }
                    
                    if (Object.keys(txtFiles).length > 0) {
                        // If there are valid TXT files, create or update the JSON file
                        const jsonFilePath = path.join(pathToData, 'prompts', `${folder}.json`);
                        try {
                            // Read existing JSON data if it exists
                            let jsonData: { [key: string]: string } = {};
                            try {
                                const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
                                jsonData = JSON.parse(jsonContent);
                            } catch (readError) {
                                // If the JSON file does not exist, we will create it
                                if (readError instanceof Error && (readError as NodeJS.ErrnoException).code !== 'ENOENT') {
                                    helpers.log(`Error reading JSON file ${jsonFilePath}: ` + readError, 'readFile', 'collection-prompts.ts', 'error');
                                    continue; // Skip to the next folder if reading fails
                                }
                            }
                            // Update JSON data with TXT files
                            for (const key in txtFiles) {
                                if (Object.prototype.hasOwnProperty.call(txtFiles, key)) {
                                    jsonData[key] = txtFiles[key];
                                }
                            }
                            // Write updated JSON data to file
                            fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
                            helpers.log(`Data from TXT files in folder ${folder} successfully added/updated in ${folder}.json`, 'processPrompts', 'collection-prompts.ts', 'info');

                        } catch (error) {
                            helpers.log(`Error occurred while writing to JSON file ${jsonFilePath}: ` + error, 'writeFile', 'collection-prompts.ts', 'error');
                        }
                    }
                }
            }
        }
    } catch (error) {
        helpers.log('Error occurred while processing folders: ' + error, 'processFolders', 'collection-promts.ts', 'error');
        return false; // Return false if an error occurs
    }
    return true; // Return true if processing is successful
}

/**
 * Removes lines from the text that contain a substring delimited by specified start and end strings.
 * @param text The input text to process.
 * @param delimiters An array containing the start and end delimiters.
 * @returns The processed text with specified lines removed.
 */
function removeLinesWithDelimitedSubstring(
    text: string,
    delimiters: [string, string]
): string {
    if (Array.isArray(delimiters) && delimiters.length === 2) {
        const [start, end] = delimiters;
        helpers.log(`Before text: ${text}`, 'removeLinesWithDelimitedSubstring', 'collection-promts.ts', 'debug');
        // Escape special characters in the delimiters to use them in a regular expression
        if (!start || !end) {
            helpers.log('Both start and end delimiters must be provided. Delimiters: ' + delimiters);
        }
        // Function to escape special characters in a string for use in a regular expression
        const escapeRegExp = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const startEscaped = escapeRegExp(start);
        const endEscaped = escapeRegExp(end);
        const regex = new RegExp(`${startEscaped}.*?${endEscaped}`);
        // Split the text into lines, filter out lines that match the regex, and join them back
        helpers.log(`After text: ${text}`, 'removeLinesWithDelimitedSubstring', 'collection-promts.ts', 'debug');
        return text
            .split('\n')
            .filter(line => !regex.test(line))
            .join('\n');
    }
    return text; // If delimiters are not valid, return the original text
}
