/**
 * @description This module provides functions to create and manage an AI project structure,
 * including creating necessary folders, updating project information,
 * and managing tasks and commands.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-26
 */

const fs = require('fs');
const path = require('path');
const helpers = require('../helpers');
const { format } = require('date-fns'); // 
import { TasksData, CommandsData } from '../types'; // Assuming types are defined in a separate file

// Copy templates from data to workspace/.aiproject

import * as pathManager from '../PathManager';


export async function prepareAIProject(context: pathManager.PathManager): Promise<void> {
  const aiProjectPath = context.getAIProjectPath();
  if (!aiProjectPath) {
    throw new Error('AI project path is not defined. Please open a workspace.');
  }

  // Create the AI project directory if it doesn't exist
  if (!fs.existsSync(aiProjectPath)) {
    fs.mkdirSync(aiProjectPath, { recursive: true });
  }

  // Copy templates from extension data to AI project directory
  const templatesDir = context.getPathInExtension('templates');
  if (fs.existsSync(templatesDir)) {
    await helpers.copyDirectory(templatesDir, path.join(aiProjectPath,'data'));
  } else {
    throw new Error(`Templates directory does not exist: ${templatesDir}`);
  }
}


let projectDir = '.aiproject';
let tasksFolder = '.aiproject/tasks';
let tasksFolderCurrentDate = '.aiproject/tasks/nowdate';
let commandsFolder = '.aiproject/commands';
let commandsFolderCurrentDate = '.aiproject/commands/nowdate';

/**
 * Creates the necessary folder structure for the AI project.
 * @param projectPath - Path to the project directory
 * @returns {Promise<void>} - A promise that resolves when the project structure is created
 */
export async function createAgents(
  projectPath: string
) {
    // Function to create the necessary folder structure for the AI project
    helpers.log('Project path: ' + projectPath, 'createAgents', 'aiproject.ts', 'info');
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    // Ensure the project directory exists
    projectDir = path.join(projectPath, '.aiproject');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    helpers.log('Project directory created: ' + projectDir, 'createAgents', 'aiproject.ts', 'debug');

    // Create tasks and commands folders with current date subfolders
    tasksFolder = path.join(projectDir, 'tasks');
    if (!fs.existsSync(tasksFolder)) {
      fs.mkdirSync(tasksFolder, { recursive: true });
    }
    helpers.log('Tasks folder created: ' + tasksFolder, 'createAgents', 'aiproject.ts', 'debug');

    // Create a subfolder for the current date in the tasks folder
    tasksFolderCurrentDate = path.join(tasksFolder, currentDate);
    if (!fs.existsSync(tasksFolderCurrentDate)) {
      fs.mkdirSync(tasksFolderCurrentDate, { recursive: true });
    }
    helpers.log('Tasks folder for current date created: ' + tasksFolderCurrentDate, 'createAgents', 'aiproject.ts', 'debug');

    // Create commands folder with current date subfolder
    commandsFolder = path.join(projectDir, 'commands');
    if (!fs.existsSync(commandsFolder)) {
        fs.mkdirSync(commandsFolder, { recursive: true });
    }
    helpers.log('Commands folder created: ' + commandsFolder, 'createAgents', 'aiproject.ts', 'debug');

    // Create a subfolder for the current date in the commands folder
    commandsFolderCurrentDate = path.join(commandsFolder, currentDate);
    if (!fs.existsSync(commandsFolderCurrentDate)) {
      fs.mkdirSync(commandsFolderCurrentDate, { recursive: true });
    }
    helpers.log('Commands folder for current date created: ' + commandsFolderCurrentDate, 'createAgents', 'aiproject.ts', 'debug');
}


/**
 * Function to update project information in the .aiproject/info.json file
 * @param projectPath - The path to the project directory
 * @param info - The JSON object containing project information
 * @param tasksData - The tasks data to be saved
 * @param commandsData - The commands data to be saved
 * @return {Promise<void>} - A promise that resolves when the info is updated
 */
export async function updateInfo(
  projectPath: string,
  info: JSON,
  tasksData: TasksData,
  commandsData: CommandsData
) {
  // Function to update project information in the .aiproject/info.json file
  try {
    const fs = require('fs');
    const path = require('path');
    const projectDir = path.join(projectPath, '.aiproject');
    const infoFilePath = path.join(projectDir, 'info.json');
    fs.writeFileSync(infoFilePath, JSON.stringify(info, null, 2));
    helpers.log('Project info updated successfully, file: ' + infoFilePath, 'updateInfo', 'aiproject.ts', 'debug');
  } catch (error) {
    helpers.log('Error updating project info: ' + error, 'updateInfo', 'aiproject.ts', 'error');
    throw error; // Re-throw the error to be handled by the caller
  }
}
/**
 * Function to update tasks data and commands data in the current date folder
 * @param tasksData - The tasks data to be saved
 * @param commandsData - The commands data to be saved
 * @return {Promise<void>} - A promise that resolves when the data is saved
 */
export async function updateTask(
  tasksData: TasksData,
  commandsData: CommandsData | null = null
) {
  try {
    const taskWithCommands = {
      task: tasksData,
      commands: commandsData
    };

    fs.writeFileSync(tasksFolderCurrentDate, JSON.stringify(taskWithCommands, null, 2));
    helpers.log('Task with commands updated successfully, file: ' + tasksFolderCurrentDate, 'updateTask', 'aiproject.ts', 'debug');
  } catch (error) {
    helpers.log('Error updating task with commands:'+error, 'updateTask', 'aiproject.ts', 'error');
    throw error; // Re-throw the error to be handled by the caller
  } 
  helpers.log('Task updated successfully', 'updateTask', 'aiproject.ts', 'info'); 
}
