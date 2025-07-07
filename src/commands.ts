/**
 * @description This module handles file operations, method modifications, and MCP commands based on AI-generated responses.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-04-21
 */

import * as fs from'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
// Importing axios for HTTP requests in handleMcpCommands
import * as axios from 'axios';
import * as helpers from './helpers';
import { backupFile, restoreFile, cleanupBackup } from './backup-files';

/**
 * Represents a command to create or update a file in the project directory.
 * The action can be either 'create' or 'update'.
 */
interface FileCommand {
  action: 'create' | 'update';
  path: string;
  content: string;
}

/**
 * Represents a command to create or update a file in the project directory.
 * The action can be either 'create' or 'update'.
 */
interface MethodCommand {
  action: 'add' | 'update' | 'delete';
  className: string;
  methodSignature: string;
  methodBody?: string;
}

/**
 * Represents a command to be executed by the MCP (Multi-Command Processor).
 * The action can be one of the predefined commands like 'gameobject-find', 'gameobject-create', etc.
 */
interface McpCommand {
  action: string; // 'gameobject-find' | 'gameobject-create' | 'gameobject-change' | 'gameobject-delete' | 'start' | 'stop' | 'get-log' | 'get-mcp-commands'
  parameters: Record<string, any>;
}

/**
 * Represents the structure of the AI response containing commands to execute.
 */
interface AIResponse {
  fileCommands: FileCommand[];
  methodCommands: MethodCommand[];
  mcpCommands: McpCommand[];
}

/**
 * Handles file commands by creating or updating files in the specified directory.
 * @param commands Array of file commands to execute.
 * @param rootDir The root directory of the project.
 */
export async function handleFileCommands(commands: FileCommand[], rootDir: string) {
  if (!fs.existsSync(rootDir)) {
    helpers.log(`Root directory does not exist: ${rootDir}`, 'handleFileCommands', 'commands.ts', 'error');
    return;
  }

  const backups: { original: string, backup: string }[] = [];

  // Ensure the root directory is an absolute path
  rootDir = path.resolve(rootDir);
  for (const cmd of commands) {
    try {
      if (!cmd.path || !cmd.content) {
        helpers.log(`[file] ERROR ${cmd.action} ${cmd.path}: Missing path or content`, 'handleFileCommands', 'commands.ts', 'error');
        continue;
      }
      const filePath = path.join(rootDir, cmd.path);

      // Backup before change
      const backupPath = await backupFile(filePath);
      backups.push({ original: filePath, backup: backupPath });

      if (cmd.action === 'create') {
        await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
        await fsPromises.writeFile(filePath, cmd.content, 'utf-8');
      } else if (cmd.action === 'update') {
        await fsPromises.writeFile(filePath, cmd.content, 'utf-8');
      }
      helpers.log(`[file] ${cmd.action}: ${filePath}`, 'handleFileCommands', 'commands.ts', 'info');
      helpers.log(`Content: ${cmd.content}`, 'handleFileCommands', 'commands.ts', 'debug');
    } catch (err) {
      helpers.log(`[file] ERROR ${cmd.action} ${cmd.path}: ${err}`, 'handleFileCommands', 'commands.ts', 'error');
      // Rollback all changes
      for (const b of backups) {
          await restoreFile(b.backup, b.original);
      }
      helpers.log(`[file] TRANSACTION ROLLBACK: ${err}`, 'handleFileCommands', 'commands.ts', 'error');
    }
  }

  // If everything is successful, delete the backup
  for (const b of backups) {
    await cleanupBackup(b.backup);
  }

}

/**
 * Handles method commands by modifying class files in the specified directory.
 * @param commands Array of method commands to execute.
 * @param rootDir The root directory of the project.
 */
export async function handleMethodCommands(commands: MethodCommand[], rootDir: string) {
  const backups: { original: string, backup: string }[] = [];
  for (const cmd of commands) {
    
    if (!cmd.className || !cmd.methodSignature) {
      helpers.log(`[method] ERROR ${cmd.action} ${cmd.className}: Missing class name or method signature`, 'handleMethodCommands', 'commands.ts', 'error');
      continue;
    }
    
    const classFiles = findFilesByClassName(rootDir, cmd.className);
    if (classFiles.length === 0) continue;
    for (const file of classFiles) {
      try {
        const backupPath = await backupFile(file);
        backups.push({ original: file, backup: backupPath });

        let content = await fsPromises.readFile(file, 'utf-8');
        switch (cmd.action) {
          case 'add':
            content = addMethodToClass(content, cmd.className, cmd.methodSignature, cmd.methodBody || '');
            break;
          case 'update':
            content = updateMethod(content, cmd.methodSignature, cmd.methodBody || '');
            break;
          case 'delete':
            content = deleteMethod(content, cmd.methodSignature);
            break;
        }
        await fsPromises.writeFile(file, content, 'utf-8');

        helpers.log(`[method] ${cmd.action}: ${cmd.methodSignature} in ${file}`, 'handleMethodCommands', 'commands.ts', 'info');
        
      } catch (error) {
        // Rollback all changes
        for (const b of backups) {
          await restoreFile(b.backup, b.original);
        }
        const errorMsg = error instanceof Error ? error.message : String(error);
        helpers.log(`[method] ERROR ${cmd.action} ${cmd.className}: ${errorMsg}`, 'handleMethodCommands', 'commands.ts', 'error');
        continue;
      }
    }
    // Cleanup backups after successful operations
    for (const b of backups) {
      await cleanupBackup(b.backup);
    }
  }
}

/**
 * Checks if a class has a method with the given signature.
 * @param content The content of the class file.
 * @param className The name of the class to check.
 * @param signature The signature of the method to check for.
 * @returns True if the method exists, false otherwise.
 */
function classHasMethod(content: string, className: string, signature: string): boolean {
  // Find the class body
  const classRegex = new RegExp(`class\\s+${escapeRegex(className)}\\s*{([\\s\\S]*?)}`, 'm');
  const match = content.match(classRegex);
  if (!match) return false;
  // Check for method existence by signature within the class body
  const classBody = match[1];
  const methodRegex = new RegExp(`${escapeRegex(signature)}\\s*{`, 'm');
  return methodRegex.test(classBody);
}

/**
 * Finds all C# class files in a directory by class name.
 * @param dir The directory to search in.
 * @param className The name of the class to find.
 * @returns An array of file paths that contain the specified class.
 */
function findFilesByClassName(dir: string, className: string): string[] {
  if (!fs.existsSync(dir)) {
    helpers.log(`Directory does not exist: ${dir}`, 'findFilesByClassName', 'commands.ts', 'error');
    return [];
  }
  
  const result: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    helpers.log(`Error reading directory ${dir}: ${error}`, 'findFilesByClassName', 'commands.ts', 'error');
    return [];
  }

  if (entries.length === 0) {
    helpers.log(`No entries found in directory: ${dir}`, 'findFilesByClassName', 'commands.ts', 'info');
    return [];
  }
  // Iterate through directory entries
  for (const entry of entries) {
    try {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...findFilesByClassName(fullPath, className));
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes(`class ${className}`)) {
          result.push(fullPath);
        }
      }
      helpers.log(`Searching for class ${className} in ${fullPath}`, 'findFilesByClassName', 'commands.ts', 'debug');
    } catch (error) {
      helpers.log(`Error processing entry ${entry.name} in ${dir}: ${error}`, 'findFilesByClassName', 'commands.ts', 'error');
    }
  }

  return result;
}

/**
 * Adds a new method to a class in the given content.
 * @param content The content of the class file.
 * @param className The name of the class to add the method to.
 * @param signature The signature of the method to add.
 * @param body The body of the method to add.
 * @returns The updated content with the new method added.
 */
function addMethodToClass(content: string, className: string, signature: string, body: string): string {
  
  if (!className || !signature || !body || body.trim().length === 0) {
    helpers.log(`[method] ERROR addMethodToClass: Missing class name or method signature`, 'addMethodToClass', 'commands.ts', 'error');
    return content;
  }
  
  const classRegex = new RegExp(`(class\\s+${escapeRegex(className)}\\s*{)([\\s\\S]*?)(\\n})`, 'm');
  const match = content.match(classRegex);
  if (!match) return content;

  if (classHasMethod(content, className, signature)) {
    // The method already exists - compare body
    const currentBody = extractMethodBody(content, signature);
    if (currentBody && body.trim() !== currentBody && body.trim().length > currentBody.length) {
      // Update body if new one is longer and different
      return updateMethod(content, signature, `{${body}}`);
    }
    // Do not update if body is not different or shorter
    return content;
  }

  // Insert the method before the closing brace of the class
  const before = match[1] + match[2];
  const after = match[3];
  const methodText = `\n    ${signature} ${body}\n`;
  return content.replace(classRegex, `${before}${methodText}${after}`);
}

function extractMethodBody(content: string, signature: string): string | null {
  const methodRegex = new RegExp(`${escapeRegex(signature)}\\s*{([\\s\\S]*?)}\\s*`, 'm');
  const match = content.match(methodRegex);
  return match ? match[1].trim() : null;
}
/**
 * Updates a method in a class with a new body.
 * @param content The content of the class file.
 * @param signature The signature of the method to update.
 * @param newBody The new body of the method.
 * @returns The updated content with the method modified.
 */
function updateMethod(content: string, signature: string, newBody: string): string {
  const signatureRegex = new RegExp(`${escapeRegex(signature)}\\s*{[\\s\\S]*?}`, 'm');
  return content.replace(signatureRegex, `${signature} ${newBody}`);
}

/**
 * Deletes a method from a class.
 * @param content The content of the class file.
 * @param signature The signature of the method to delete.
 * @returns The updated content with the method removed.
 */
function deleteMethod(content: string, signature: string): string {
  const methodRegex = new RegExp(`${escapeRegex(signature)}\\s*{[\\s\\S]*?}\\s*`, 'm');
  return content.replace(methodRegex, '');
}

/**
 * Escapes special characters in a string to make it safe for use in a regular expression.
 * @param str - The string to escape for use in a regular expression.
 * @returns The escaped string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Handles MCP commands by sending requests to the specified MCP endpoint.
 * @param {McpCommand[]} commands - Array of MCP commands to execute.
 * @param {string} mcpEndpoint - The endpoint URL for the MCP service.
 * @return {Promise<string>} - A promise that resolves to the result of the MCP commands.
 */
export async function handleMcpCommands(commands: McpCommand[], mcpEndpoint: string): Promise<string> {
  let result = '';
  for (const cmd of commands) {
    try {
      let response = await axios.post(mcpEndpoint, {
        action: cmd.action,
        parameters: cmd.parameters
      });
      if (response.status !== 200) {
        helpers.log(`[mcp] Command failed: ${cmd.action} with status ${response.status}, 
          response data: ${response.data}, 
          response headers: ${response.headers}`, 'handleMcpCommands', 'commands.ts', 'error');
          continue;
      }

      if (helpers.notEmptyVariable(response.data)) {
        const responseDataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        if (responseDataStr.includes('Error:')) {
          helpers.log(`[mcp] Command failed: ${cmd.action} with error: ${responseDataStr}`, 'handleMcpCommands', 'commands.ts', 'error');
          continue;
        }
        result += responseDataStr;
      }
      helpers.log(`[mcp] ${cmd.action} ->`+ response.data, 'handleMcpCommands', 'commands.ts', 'debug');

    } catch (err) {
      helpers.log(`[mcp] ERROR ${cmd.action}:`+ err, 'handleMcpCommands', 'commands.ts', 'error');
    }
  }
  return result;
}