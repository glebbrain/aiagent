/**
 * @description This module provides functions to backup, restore, and clean up files in a file system.
 * It also includes a function to handle file commands such as creating or updating files with backup and rollback capabilities.
 * The module uses Node.js file system operations and is designed to ensure data integrity during file operations.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-07-04
 */
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as helpers from './helpers';

export async function backupFile(filePath: string): Promise<string> {
    const backupPath = filePath + '.bak';
    if (fs.existsSync(filePath)) {
        await fsPromises.copyFile(filePath, backupPath);
    }
    return backupPath;
}

export async function restoreFile(backupPath: string, originalPath: string) {
    if (fs.existsSync(backupPath)) {
        await fsPromises.copyFile(backupPath, originalPath);
        await fsPromises.unlink(backupPath);
    }
}

export async function cleanupBackup(backupPath: string) {
    if (fs.existsSync(backupPath)) {
        await fsPromises.unlink(backupPath);
    }
}


// Define the FileCommand type if not imported from elsewhere
type FileCommand = {
    path: string;
    content: string;
    action: 'create' | 'update';
};

export async function handleFileCommands(commands: FileCommand[], rootDir: string) {
    const backups: { original: string, backup: string }[] = [];
    try {
        for (const cmd of commands) {
            if (!cmd.path || !cmd.content) continue;
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
        }
        // Cleanup backups after successful operations
        for (const b of backups) {
            await cleanupBackup(b.backup);
        }
    } catch (err) {
        // Rollback all changes
        for (const b of backups) {
            await restoreFile(b.backup, b.original);
        }
        helpers.log(`[file] TRANSACTION ROLLBACK: ${err}`, 'handleFileCommands', 'commands.ts', 'error');
        throw err;
    }
  }