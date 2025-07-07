/**
 * @description This module defines TypeScript interfaces for managing tasks, architectures, and commands in an AI project.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-06-10
 */

import * as vscode from 'vscode';
import * as helpers from './helpers';
const path = require('path');

/**
 * Generates the HTML content for the webview panel.
 * @param currentPath The current working directory path.
 * @param context The extension context.
 * @param panel The webview panel.
 * @param webview The webview instance.
 * @param extensionUri The URI of the extension.
 * @returns The HTML content as a string.
 */
export function getWebviewContent(
    currentPath:string, 
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    webview: vscode.Webview, 
    extensionUri: vscode.Uri
): string {
    // Set the HTML content for the webview
    // Replace placeholders in the HTML with actual URIs
    const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.mjs'))
    );
    helpers.log('4. Script URI created: ' + scriptUri.toString());
    const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'media', 'styles.css'))
    );
    helpers.log('5. Style URI created: ' + styleUri.toString());

    const nonce = helpers.getNonce();
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      img-src ${webview.cspSource} https: data:;
      style-src ${webview.cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}' ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet" nonce="${nonce}">
  <script nonce="${nonce}" type="module" src="https://unpkg.com/@vscode/webview-ui-toolkit@1.4.0/dist/toolkit.min.js"></script>
  <title>AgentAI</title>
</head>
<body>
  <vscode-panels>
    <vscode-panel-tab id="tab-agentai">Agent AI</vscode-panel-tab>
    <vscode-panel-tab id="tab-llm">LLM Settings</vscode-panel-tab>
    <vscode-panel-tab id="tab-mcp">MCP-Server Settings</vscode-panel-tab>
    <vscode-panel-tab id="tab-help">Help</vscode-panel-tab>

    <vscode-panel-view id="view-agentai">
      <div id="roles-settings">
        <label for="folderPath">Work folder:</label>
        <input type="text" id="folderPath" value="${currentPath}" style="width: 400px;" readonly />
        <vscode-button id="selectFolderBtn">Select another...</vscode-button>

        <h2>Prompt</h2>
        <div class="role-setting">
          <textarea id="prompt-input" rows="4" placeholder="Enter your prompt..."></textarea>
        </div>
        <h3>Role Settings</h3>
        <div class="role-setting">
          <vscode-checkbox id="architect-checkbox" checked="checked">Architect</vscode-checkbox>
          <vscode-dropdown id="architect-llm">
            <vscode-option>LLM 1</vscode-option>
          </vscode-dropdown>
          <vscode-button appearance="icon" title="Information about Architect">i</vscode-button>
        </div>
        <div class="role-setting">
          <vscode-checkbox id="analyst-checkbox" checked="checked">Analyst</vscode-checkbox>
          <vscode-dropdown id="analyst-llm">
            <vscode-option>LLM 1</vscode-option>
          </vscode-dropdown>
          <vscode-button appearance="icon" title="Analyst breaks your prompt into subtasks and hands it over to the Developer">i</vscode-button>
        </div>
        <div class="role-setting">
          <vscode-checkbox id="developer-checkbox" checked="checked">Developer</vscode-checkbox>
          <vscode-dropdown id="developer-llm">
            <vscode-option>LLM 1</vscode-option>
          </vscode-dropdown>
          <vscode-dropdown id="developer-mcp">
            <vscode-option>MCP 1</vscode-option>
          </vscode-dropdown>
          <vscode-button appearance="icon" title="Information about Developer">i</vscode-button>
        </div>
        <div class="role-setting">
          <vscode-checkbox id="tester-checkbox" checked="checked">Tester</vscode-checkbox>
          <vscode-dropdown id="tester-llm">
            <vscode-option>LLM 1</vscode-option>
          </vscode-dropdown>
          <vscode-dropdown id="tester-mcp">
            <vscode-option>MCP 1</vscode-option>
          </vscode-dropdown>
          <vscode-button appearance="icon" title="Information about Tester">i</vscode-button>
        </div>
        <div class="role-setting">
          <vscode-button id="launch-button">Launch</vscode-button>
        </div>
      </div>
    </vscode-panel-view>

    <vscode-panel-view id="view-llm">
    <div id="roles-settings">
      <h2 class="role-setting">LLM Settings</h2>
      <vscode-dropdown id="llm-selector" class="role-setting">
        <vscode-option>LLM 1</vscode-option>
      </vscode-dropdown>
      <textarea id="llm-settings" class="role-setting" rows="10" placeholder="LLM settings in JSON format..."></textarea>
      <vscode-button id="save-llm" class="role-setting">saveLLMSettings</vscode-button>
      <span id="error-llm-message" class="role-setting"></span>
    </div>
    </vscode-panel-view>
    

    <vscode-panel-view id="view-mcp">
      <div id="roles-settings">
        <h2 class="role-setting">MCP-Server Settings</h2>
        <vscode-dropdown  id="mcp-selector" class="role-setting">
          <vscode-option>MCP 1</vscode-option>
        </vscode-dropdown>
        <textarea id="mcp-settings" class="role-setting" rows="10" placeholder="MCP settings in JSON format..."></textarea>
        <vscode-button id="save-mcp" class="role-setting">saveMCPSettings</vscode-button>
        <span id="error-mcp-message" class="role-setting"></span>
      </div>
    </vscode-panel-view>

    <vscode-panel-view id="view-help">
    <div id="roles-settings">
      <h2 class="role-setting">Help</h2>
      <p class="role-setting">Author: GlebBrain</p>
      <div class="role-setting">
        <vscode-button onclick="openLink('https://github.com/glebbrain')">GitHub</vscode-button>
        <vscode-button onclick="openLink('https://x.com/glebbrain')">X</vscode-button>
        <vscode-button onclick="openLink('https://discord.gg/glebbrain')">Discord</vscode-button>
      </div>  
    </div>
    </vscode-panel-view>
  </vscode-panels>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
    `;
}
