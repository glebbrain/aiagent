/**
 * @description This module defines TypeScript interfaces for managing tasks, architectures, and commands in an AI project.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-31
 */

import * as fs from 'fs';
import * as path from 'path';
import * as helpers from './helpers';

import * as modelAiProject from './database/aiproject-model';
import {ServerConfig} from './types';


export async function getActiveServerNames(directoryPath: string): Promise<ServerConfig[]> {
  const activeServers: ServerConfig[] = [];

  try {
    const files = await fs.promises.readdir(directoryPath);

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(directoryPath, file);
        try {
          const fileContent = await fs.promises.readFile(filePath, { encoding: 'utf8' });
          const config: ServerConfig = JSON.parse(fileContent);

          if (config.active && Array.isArray(config.actions)) {
            config.fileName = file; // Include the file name in the config
            activeServers.push(config);
          }

        } catch (jsonError) {
          console.warn(`Error parsing or processing JSON file ${file}:`, jsonError);
          // Continue to the next file even if one fails
        }
      }
    }
  } catch (dirError) {
    console.error(`Error reading directory ${directoryPath}:`, dirError);
  }

  return activeServers;
}
/*
// Example usage:
const serversDirectory = 'data/mcp/servers'; // Adjust this path as needed

getActiveServerNames(serversDirectory)
  .then(servers => {
    console.log('Active Servers:');
    for (const server of servers) {
      console.log(`  File: ${server.fileName}, Name: ${server.name}`);
    }
  })
  .catch(error => {
    console.error('Failed to get active server names:', error);
  });
*/

export function getMCPCommands(pathToData: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      let mcpPath = path.join(pathToData, 'mcp-servers');
      let mcpServersData: { action: string; parametersName: string[] }[] = [];
      const servers = await getActiveServerNames(mcpPath);
      if (servers.length > 0){
        for (const server of servers) {
          let serverId = modelAiProject.addMCPServer(server);

          helpers.log('Active Servers:' + server.name, 'getMCPCommands', 'mcp-servers.ts', 'info');
          // Example: collect actions and their parameter names
          if (Array.isArray(server.actions)) {
            for (const actionObj of server.actions) {
              mcpServersData.push({
                action: actionObj.action,
                parametersName: Object.keys(actionObj.parameters || {})
              });
              // Optionally, you can also log the action and its parameters
              helpers.log(`Action: ${actionObj.action}, Parameters: ${Object.keys(actionObj.parameters || {}).join(', ')}`, 'getMCPCommands', 'mcp-servers.ts', 'debug');
              modelAiProject.addMCPAction(serverId, actionObj.action, actionObj.parameters);
            }
          }
        }
        resolve(mcpServersData);
      }
    } catch (error) {
      helpers.log('Failed to get active server names:' + error, 'getMCPCommands', 'mcp-servers.ts', 'error');
      reject(error);
    }
  });
}

export function getMCPCommandsToString(pathToData: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const mcpCommands = await getMCPCommands(pathToData);
      let result = '';
      if (!Array.isArray(mcpCommands) || mcpCommands.length === 0) {
        resolve('No MCP commands found.');
        return;
      }
      // let command: { action: string; parametersName: string[]; };
      for (const command of mcpCommands) {
        result += `Action: ${command.action}, Parameters: ${command.parametersName.join(', ')}\n`;
      }
      resolve(result);
    } catch (error) {
      helpers.log('Failed to get MCP commands as string:' + error, 'getMCPCommandsToString', 'mcp-servers.ts', 'error');
      reject(error);
    }
  });
}