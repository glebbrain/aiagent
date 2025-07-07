/**
 * @description This module defines TypeScript interfaces for managing tasks, architectures, and commands in an AI project.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-06-18
 */
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as helpers from './helpers';

export class PathManager {
    private extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    // Extension paths
    // Returns the root folder of the extension
    public getExtensionRoot(): string {
        return this.extensionContext.extensionPath;
    }

    /** Get absolute path inside extension folder */
    public getPathInExtension(...relative: string[]): string {
        return path.join(this.getExtensionRoot(), ...relative);
    }

    // Workspace paths

    /** Returns the root folder of the open project (workspace), or undefined */
    public getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }
    /** Get absolute path inside project (if project is open) */
    public getPathInWorkspace(...relative: string[]): string {
        const root = this.getWorkspaceRoot();
        return root ? path.join(root, ...relative) : path.join(this.getExtensionRoot(), ...relative);
    }

    // AI Project paths
    public getAIProjectPath(): string | undefined {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {

            return undefined;
        }
        // We assume the AI project is located in the "AIProject" folder inside the workspace root
        return path.join(workspaceRoot, '.aiproject');
    }

    /** Get absolute path inside AI project */
    public getPathInAIProject(...relative: string[]): string{
        const aiProjectPath = this.getAIProjectPath();
        if (aiProjectPath !== undefined) {
            if (!fs.existsSync(aiProjectPath)){
            fs.mkdirSync(aiProjectPath);
            }
            return path.join(aiProjectPath, ...relative);    
        }
        return '';
    }
}
/*
Examples:
const pathManager = new PathManager(context);
const extRoot = pathManager.getExtensionRoot();
const workspaceRoot = pathManager.getWorkspaceRoot();
const extConfigPath = pathManager.getPathInExtension('config', 'settings.json');
const projectFilePath = pathManager.getPathInWorkspace('src', 'index.ts');
*/