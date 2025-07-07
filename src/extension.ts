/**
 * @description This module is the main entry point for the AgentAI extension, providing integration with the VSCode API and managing the extension lifecycle.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-04-21
 */

import * as vscode from 'vscode';
import { detectProject, DetectionResult } from './languages/language-definition';
import * as helpers from './helpers';
import * as aiproject from './aiproject/core';
import * as mcpServers from './mcp-servers';
import * as llmServers from './llm-servers';
import * as core from './core';
import * as types from './types';
import * as htmlGenerator from './html-generator';
import * as PathManager from './PathManager';
import * as path from 'path';
import * as fs from 'fs'; 


export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();
  var projectPath = config.get<string>('project.path', '');
  // 1. Get the path to the project
  if (projectPath === "" || projectPath === undefined
    || projectPath === "${projectPath}" || projectPath === "${workspaceFolder}") {

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      projectPath = workspaceFolders[0].uri.fsPath;
    } else {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    config.update('project.path', projectPath, vscode.ConfigurationTarget.Global)
    helpers.log('17.1. Project path updated in config: ' + projectPath, 'activate', 'extension.ts', 'debug');
  }


  const pathManager = new PathManager.PathManager(context);
  // 2. Prepare AI project
  // This will copy templates from extension data to workspace/.aiproject
  aiproject.prepareAIProject(pathManager);
  helpers.log('0. AgentAI extension is activating...');
 
  // creating aiproject folder structure, maybe make them empty in templates?
  aiproject.createAgents(helpers.getWorkspaceFolder() ?? '');

  helpers.log('1. AgentAI extension is now active!');
  // User interface start
  context.subscriptions.push(
    vscode.commands.registerCommand('agentai.openPanel', async () => {
      // Create a new webview panel
      helpers.log('1.1. Opening AgentAI webview panel...');
      const panel = vscode.window.createWebviewPanel(
        'agentaiPanel',
        'AgentAI',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );
      helpers.log('2. Webview panel created.');

      // Get LLM and MCP settings from configuration
      let gitRepoPath = config.get<string>('github.repoPath', '');

      let gitRemoteName = config.get<string>('github.remoteName', 'origin');
      let gitBranchName = config.get<string>('github.branchName', 'main');
      helpers.log('3. Data obtained from config.');

      // Project path obtained from configuration
      let getProjectPath = vscode.commands.registerCommand('myextension.getProjectPath', () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          if (projectPath === "") {
            projectPath = workspaceFolders[0].uri.fsPath;
          }
          helpers.log('4. Project path obtained from config: ' + projectPath);
        } else {
          helpers.log('5. No workspace folder is open.', 'activate', 'extension.ts', 'error');
        }
      });

      // Check if projectPath is empty
      const files = fs.readdirSync(projectPath);
      if (files.length === 0) {
        helpers.log('5. Project folder is empty.', 'activate', 'extension.ts', 'info');
        return;
      }
      helpers.log('20. Project folder is not empty, files found: ' + files.length);
      context.subscriptions.push(getProjectPath);

      helpers.log('42. Registering command to send prompt.');

      panel.webview.html = htmlGenerator.getWebviewContent(projectPath, context, panel, panel.webview, context.extensionUri);

      // Load MCP and LLM data from JSON files
      const mcpPath = pathManager.getPathInAIProject('data', 'mcp-servers');
      // const mcpData = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      let mcpServersData: { name: string; fileName: string }[] = [];
      mcpServers.getActiveServerNames(mcpPath)
        .then(servers => {
          helpers.log('Active Servers:','activate', 'extension.ts', 'info');
          for (const server of servers) {
            mcpServersData.push({ name: server.name ?? '', fileName: server.fileName ?? '' });
            // Log each active server
            helpers.log(`File: ${server.fileName}, Name: ${server.name}`, 'activate', 'extension.ts', 'info');
          }
        });
      
      helpers.log('8. MCP data loaded from: ' + mcpPath);

      // Send data to webview
      const llmPath = pathManager.getPathInAIProject('data', 'llm-servers');
      //const llmData = JSON.parse(fs.readFileSync(llmPath, 'utf8'));
      let llmServersData: { name: string; fileName: string }[] = [];
      llmServers.getActiveServerNames(llmPath)
        .then(servers => {
          helpers.log('Active Servers:','activate', 'extension.ts', 'info');
          for (const server of servers) {
            llmServersData.push({ name: server.serverName, fileName: server.fileName });
            // Log each active server
            helpers.log(`File: ${server.fileName}, Name: ${server.serverName}`, 'activate', 'extension.ts', 'info');
          }
        })
        .catch(error => {
          helpers.log('Failed to get active server names:' + error, 'activate', 'extension.ts', 'error');
        });

      helpers.log('9. LLM data loaded from: ' + llmPath);

      // Send data to webview
      panel.webview.postMessage({ command: 'loadLLMOptions', llmOptions: llmServersData });
      panel.webview.postMessage({ command: 'loadMCPOptions', mcpOptions: mcpServersData });
      helpers.log('10. Data sent to webview.');
      
      const llmJsonPath = pathManager.getPathInAIProject('data', 'llm-servers', 'ollama.json');
      const llmJsonText = fs.readFileSync(llmJsonPath, 'utf-8');

      const mcpJsonPath = pathManager.getPathInAIProject('data', 'mcp-servers', 'mcp-server-unity-6000.json');
      const mcpJsonText = fs.readFileSync(mcpJsonPath, 'utf-8');

      panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'ready') {
          panel.webview.postMessage({
            command: 'setLLMJson',
            content: llmJsonText
          });
          panel.webview.postMessage({
            command: 'setMCPJson',
            content: mcpJsonText
          });
        }
      });

      // Handle messages from the webview
      helpers.log('11. Setting up message listener for webview.');
      panel.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case 'launch':
              if (message!==undefined && message.data !== undefined){
                if (message.data.llm == "LLM 1"){
                  let llmPath = pathManager.getPathInAIProject('data', 'llm-servers', 'ollama.json');
                  // read JSON from file
                  let llmJsonStr = fs.readFileSync(llmPath, 'utf-8');
                  let llmJson = JSON.parse(llmJsonStr);
                  if (llmJson !== undefined && llmJson !== null && llmJson.active) {
                    config.update('llm.endpoint', llmJson.url, vscode.ConfigurationTarget.Global);
                  }
                }
                if (message.data.llm == "MCP 1") {
                  let mcpPath = pathManager.getPathInAIProject('data', 'mcp-servers', 'mcp-server-unity-6000.json');
                  // read JSON from file
                  let mcpJsonStr = fs.readFileSync(mcpPath, 'utf-8');
                  let mcpJson = JSON.parse(mcpJsonStr);
                  if (mcpJson !== undefined && mcpJson !== null && mcpJson.active) {
                    config.update('mcp.endpoint', mcpJson.url, vscode.ConfigurationTarget.Global);
                  }
                }
              }

              helpers.log('11.1. Launch command received with data: ' + JSON.stringify(message.data, null, 2));
              let result = core.getUserPromptSendExecution(
                context.extensionPath,
                pathManager.getPathInAIProject('data'),
                message.data.prompt,
                projectPath,
                gitRepoPath,
                gitRemoteName,
                gitBranchName,
                config
              );
              
              if (result!== undefined) {
                helpers.log('11.2. Result of getUserPromptSendExecution: ' + JSON.stringify(result, null, 2));
              }
              break;

            case 'saveLLMSettings':

              // Save LLM settings to file
              const llmServerName = config.get<string>('llm.endpointJsonName', 'ollama');
              helpers.log('12. Saving LLM settings.');
              fs.writeFileSync(
                pathManager.getPathInAIProject('data', 'llm-servers', llmServerName + '.json'),
                JSON.stringify(message.text, null, 2)
              );
              helpers.log('12.1. LLM settings saved: ' + JSON.stringify(message.text, null, 2));
              break;
              
            case 'saveMCPSettings':

              // Save MCP settings to file
              const mcpServerName = config.get<string>('mcp.endpointJsonName', 'mcp-server-unity-6000');
              helpers.log('13. Saving MCP settings.');
              fs.writeFileSync(
                pathManager.getPathInAIProject('data', 'mcp-servers', mcpServerName + '.json'),
                JSON.stringify(message.text, null, 2)
              );
              helpers.log('13.1. MCP settings saved: ' + JSON.stringify(message.text, null, 2));
              break;

            case 'addLLM':
              // Add new LLM to file
              helpers.log('14. Adding new LLM settings.');
              //const llmPath = pathManager.getPathInAIProject('data', 'llm-settings.json');
              //const llmData = JSON.parse(fs.readFileSync(llmPath, 'utf8'));
              //llmData.push({ name: message.name, config: JSON.parse(message.config) });
              //fs.writeFileSync(llmPath, JSON.stringify(llmData, null, 2));
              //helpers.log('14.1. llmPath: ' + llmPath + ' \r\n llmData: ' + JSON.stringify(llmData, null, 2));
              break;

            case 'addMCP':
              // Add new MCP to file
              helpers.log('15. Adding new MCP settings.');
              //const mcpPath = pathManager.getPathInAIProject('data', 'mcp-servers.json');
              //const mcpData = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
              //mcpData.push({ name: message.name, config: JSON.parse(message.config) });
              //fs.writeFileSync(mcpPath, JSON.stringify(mcpData, null, 2));
              //helpers.log('15.1. mcpPath: ' + mcpPath + ' \r\n mcpData: ' + JSON.stringify(mcpData, null, 2));
              break;

            case 'selectFolder':
              // Open folder selection dialog
              helpers.log('16. Opening folder selection dialog.');
              const uri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Выбрать папку'
              });

              if (uri && uri.length > 0) {
                panel.webview.postMessage({ command: 'updateFolderPath', path: uri[0].fsPath });
                helpers.log('16.1. Folder selected: ' + uri[0].fsPath);
              }
              break;
          }
        },
        undefined,
        context.subscriptions
      );
      
    })

    
  ); // User interface end

  const mainui = vscode.commands.registerCommand('extension.openSettingsUI', () => {
      const panel = vscode.window.createWebviewPanel(
        'settings',
        'Extension Settings',
        vscode.ViewColumn.One,
        {
          enableScripts: true
        }
      );

      const configPath = path.join(context.extensionPath, 'config.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const htmlPath = path.join(context.extensionPath, 'media', 'settings-ui.html');
      const html = fs.readFileSync(htmlPath, 'utf8');

      panel.webview.html = html;
      // Send config to webview
      panel.webview.onDidReceiveMessage(
        message => {
          if (message.command === 'saveConfig') {
            fs.writeFileSync(configPath, JSON.stringify(message.data, null, 2));
          }
        },
        undefined,
        context.subscriptions
      );

      // Initial post
      panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'requestConfig') {
          panel.webview.postMessage({ command: 'loadConfig', data: configData });
        }
      });

      // First init
      setTimeout(() => {
        panel.webview.postMessage({ command: 'loadConfig', data: configData });
      }, 500);
    });

 
  context.subscriptions.push(mainui);
}

export function deactivate() {}

