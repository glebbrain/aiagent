/**
 * @description Core functionality for the AgentAI extension, including project detection and task management.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-06-02
 */

import * as vscode from 'vscode';
import * as commands from './commands';

import { detectProject, DetectionResult } from './languages/language-definition';
import * as git from './github';
import * as llmServers from './llm-servers';
import * as mcpServers from './mcp-servers';
import * as helpers from './helpers';

import * as types from './types';
import * as aiproject from './aiproject/core';

import * as modelAiProject from './database/aiproject-model';
import * as path from 'path'; 
import * as fs from 'fs'; 
import { exec } from 'child_process';

// TODO Translate to EN and check again according to the algorithm whether the list of tasks is the same
// 5.1. For each task, launch the Developer to compose a prompt:
// 5.1.1. Compose a prompt from the Developer to the AI ​​+/-
// 5.1.1.1. task from the analyst with clarifications on development +/-
// 5.1.1.2. compose a prompt for the task +/-
// 5.1.1.3. substitute a list of files, methods, classes and libraries +/-
// 5.1.2. Send the prompt for execution --
// 5.1.3. Get the result:
// 5.1.3.1. Update/Add files +
// 5.1.3.2. Update/Add/Delete methods +
// 5.1.3.3. Execute MCP commands +/-
// 5.2. Run the Tester for each task
// 5.2.1. Execute "start" and "get-log" via MCP commands
// 5.2.2. Get the execution result from the log
// 5.2.3. If there is an Error or Exception, copy this line and, with the developer's prompt, send the error to the analyst for solution
// 5.2.4. Execute point 5
// 5.2.5. Repeat 5.2.1 if the error has disappeared, write the solution to json, otherwise repeat from 5.2.3., repeat up to 10 times, after 10 - consider the error unsolvable
// 5.2.6. Display the result in the GUI
// 5.2.7. move on to the next task
// 5.2.8. If successful - commit and push changes to github
//commitAndPushCLI({ repoPath, commitMessage, remoteName, branchName })
// .catch(() => process.exit(1));

//  project, llmEndpoint, mcpEndpoint, projectPath, gitRepoPath, gitRemoteName, gitBranchName
export async function getUserPromptSendExecution(
    pathEnxtension: string,
    pathToData:string,
    userPrompt: string,
    projectPath: string,
    gitRepoPath: string,
    gitRemoteName: string,
    gitBranchName: string,
    config: vscode.WorkspaceConfiguration

): Promise<string> {

    let projectId = 0;
    let userPromptId = modelAiProject.addUserPrompt(userPrompt);
    let architectId = 0;
    let analystId = 0;

    // 4. Compile promts/*.json
    // task for analyst, input: "prompt from user" and project info, output: "list of tasks in JSON"
    let tasksData: types.TasksData | null = null;
    // project definition
    let debug = config.get<boolean>('debug') || false;
    let project: DetectionResult = {
        info: {  },
        languages: [],
        frameworks: [],
        cms: [],
        files: [],
        methods: [],
        classes: [],
        imports: [],
        filesWithMethods: [],
        packageManager: undefined
    }
    if (debug) {
        

        project={
            info: {
                languages: ["C#"],
                frameworks: ["Unity"]
            },
            languages: ["C#"],
            frameworks: ["Unity"],
            cms: [],
            // its in foler Unity project Assets\Scripts
            files: [
                "Player.cs", "Bonus.cs", "BonusWeapon.cs", "EnemySpawner.cs", "EnemyAI.cs", "Bullet.cs", "Gun.cs", "PlayerMovement.cs", "Enemy.cs", "EnemyDamage.cs", "PlayerVisualEffects.cs", "PlayerHealth.cs"
            ],
            methods: [
                "Start","Update","SwitchBonus"
            ],
            classes: ["MonoBehaviour", "Player", "Bonus", "BonusWeapon", "EnemySpawner", "EnemyAI", "Bullet", "Gun", "PlayerMovement", "Enemy", "EnemyDamage", "PlayerVisualEffects", "PlayerHealth"],
            imports: ["UnityEngine"],
            filesWithMethods: [ 
                "Player:Start","Player:Update","Bonus:Start","Bonus:Update","Bonus:SwitchBonus","BonusWeapon:Start","BonusWeapon:Update"
            ],
            packageManager: undefined
        }
    } else {
        // scanned project
        project = await detectProject(projectPath);
    }

    if (project && project.info) {
        projectId = modelAiProject.addProject(
            "", // mcp_servers_ids, provide actual value if available
            JSON.stringify(project.languages || []),
            JSON.stringify(project.frameworks || []),
            JSON.stringify(project.cms || []),
            JSON.stringify(project.files || []),
            JSON.stringify(project.methods || []),
            JSON.stringify(project.classes || []),
            JSON.stringify(project.imports || []),
            JSON.stringify(project.filesWithMethods || []),
            project.packageManager ? String(project.packageManager) : ""
        );
        if (projectId === null) {
            helpers.log('Failed to save project to database', "getUserPromptSendExecution", "core.ts", "error");
        }
    }

    helpers.log('Project recognized: ' + project.info, "getUserPromptSendExecution", "core.ts", "info");
    let replacementDataArchitect: { [key: string]: string[] } = {};
    
    // if exists project
    if (project.files.length > 0) {
        replacementDataArchitect = {
            "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
            "{~FilesWithMethods~}": project.filesWithMethods,
            "{~UserRequest~}": [userPrompt]
        };
    } else {
        replacementDataArchitect = {
            "{~UserRequest~}": [userPrompt]
        };
    }

    let promtFromArchitect = "";
    let pathToArchitectResult = path.join(pathToData, 'result-from-ai', 'architect.txt');
    if(debug && fs.existsSync(pathToArchitectResult)) {
        let architectResult = await fs.promises.readFile(pathToArchitectResult, 'utf-8');
        if(architectResult) {
            promtFromArchitect = architectResult;
        }
    } else {

        promtFromArchitect = await llmServers.ExecPromt<string>(
            pathEnxtension,
            pathToData,
            replacementDataArchitect,
            config, 
            "architect"
        );

        if (promtFromArchitect !== null || promtFromArchitect !== undefined){
            if (debug) {
                // Save the architect's result to a file
                await fs.promises.writeFile(pathToArchitectResult, promtFromArchitect, 'utf-8');          
            } else {
                architectId = modelAiProject.addArchitectPrompt(
                    projectId,
                    userPromptId,
                    promtFromArchitect
                );
            }
        }
    }
    let replacementDataAnalyst: { [key: string]: string[] } = {};
    if (promtFromArchitect !== null) {
        replacementDataAnalyst = {
            "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
            "{~FilesWithMethods~}": project.filesWithMethods,
            "{~UserRequest~}": ["I need an Json array of tasks with storypoints, and code and modify file to do for this project. " + userPrompt],
            "{~ArchitectPrompt~}": [promtFromArchitect]
        };
    } else {
        // If we have not received a prompt from the architect, we send only userPrompt
        replacementDataAnalyst = {
            "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
            "{~FilesWithMethods~}": project.filesWithMethods,
            "{~UserRequest~}": [userPrompt]
        };
    }

    let tasksDataResult : string = "";
    let pathToAnalystResult = path.join(pathToData, 'result-from-ai', 'analyst.txt');
    let fileContent = "";
    if (debug && fs.existsSync(pathToAnalystResult)) {
        try {
            // remove extra characters from the file and parse into types.TasksData
            fileContent = await fs.promises.readFile(pathToAnalystResult, 'utf-8');
            fileContent = helpers.clearJsonString(fileContent);
            tasksData = await helpers.readJsonString<types.TasksData | null>(fileContent); // remove control characters
        } catch (error) {
            helpers.log('Error reading or parsing analyst result file: ' + error, "getUserPromptSendExecution", "core.ts", "error");
        }
    } else {

        // The analyst receives a project developed by the architect and a prompt from the user
        let analystResult = await llmServers.ExecPromt<types.TasksData>(
            pathEnxtension,
            pathToData,
            replacementDataAnalyst,
            config,
            "analyst"
        );

        Promise.all([analystResult]);
       
        if (typeof analystResult !== 'string') {
            tasksDataResult = JSON.stringify(analystResult);
        }

        if (helpers.notEmptyVariable(tasksDataResult)) {
            if (debug) {
                helpers.log('22. Tasks data received from analyst: ' + JSON.stringify(tasksDataResult));
                fs.promises.writeFile(pathToArchitectResult, promtFromArchitect, 'utf-8');
            } else {
                // We save the analyst's result to the database
                let tasksJson = JSON.stringify(tasksDataResult);
                if (tasksJson === null || tasksJson === undefined) {
                    tasksJson = JSON.stringify([]);
                }
                analystId = modelAiProject.addAnalyst(
                    projectId,
                    userPromptId,
                    promtFromArchitect,
                    tasksJson
                );
            }
        }
    }
    try
    {
        if (typeof tasksDataResult !== 'string' || tasksDataResult === undefined) {
            // Try to parse tasksDataResult if it's a stringified JSON
            try {
                tasksData = JSON.parse(tasksDataResult) as types.TasksData;
            } catch (e) {
                helpers.log('Error parsing tasksDataResult: ' + e, "getUserPromptSendExecution", "core.ts", "error");
                tasksData = null;
            }
        } else if (tasksDataResult !== null 
            && typeof tasksDataResult === 'object' 
            && 'tasks' in tasksDataResult 
            && Array.isArray((tasksDataResult as types.TasksData).tasks)) {
            // Check that tasks Data Result is an object and contains an array of tasks
            tasksData = tasksDataResult as types.TasksData;
        }
        //helpers.log('22. Tasks data received from analyst: ' + JSON.stringify(tasksData));
    } catch (error) {
        helpers.log('22. Error processing response from LLM: ' + error, "getUserPromptSendExecution", "core.ts", "error");
        return "Execution failed due to an error.";
    }

    helpers.log('25. Tasks data after analyst: ' + JSON.stringify(tasksData));
    // 5.1. If there are tasks, then launch the developer to create a promt
    // processing tasks from an analyst
    if (tasksData !== null && tasksData.tasks && tasksData.tasks.length > 0) {
        helpers.log('26. Tasks data is valid, processing tasks...');
        // each task changes the project, so it needs to be rescanned
        project = await detectProject(projectPath);

        // check if there are tasks where storyPoints is huge, then you need to split it into tasks again
        for (const task of tasksData.tasks) {
            if (task.storyPoints > 21) {
                // Разбить на подзадачи
                let replacementData: { [key: string]: string[] } = {};
                if (project.filesWithMethods.length === 0) {
                    // if not exists project
                    replacementData = {
                        "{~UserRequest~}": ["Break it down into subtasks: " + task.name + " " + task.description],
                    };
                } else {
                    // if exists project
                    replacementData = {
                        "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
                        "{~FilesWithMethods~}": project.filesWithMethods,
                        "{~UserRequest~}": ["Break it down into subtasks: " + task.name + " " + task.description],
                    };
                }
                let newTasks = await llmServers.ExecPromt<types.TasksData>(
                    pathEnxtension,
                    pathToData,
                    replacementData,
                    config, "analyst"
                );
                if (newTasks !== null && typeof newTasks !== 'string' && newTasks.tasks) {
                    tasksData.tasks.push(...newTasks.tasks);
                }
            }
        }
        helpers.log('27. Tasks data after breaking down: ' + JSON.stringify(tasksData));
        for (const task of tasksData.tasks) {
            // 4. For each task, launch the Developer to create a prompt:
            let commandsData = null;
            helpers.log('28. Processing task: ' + JSON.stringify(task));
            try {
                let projectInfo = helpers.jsonToString(project.info);
                let taskName = task.name || "No name";
                let taskDescription = task.description || "No description";
                let taskPriority = task.priority !== undefined ? task.priority.toString() : "No priority";
                let layers = task.architecture.layers && task.architecture.layers.length > 0 ? task.architecture.layers.join(", ") : "No layers";
                let recommendedPattern = task.architecture.recommended_pattern || "No recommended pattern";
                let taskStoryPoints = task.storyPoints !== undefined ? task.storyPoints.toString() : "No story points";
                let filesWithMethods = project.filesWithMethods.length > 0 ? project.filesWithMethods : ["No files with methods"];

                let availableMCPCommands;
                if (debug) {
                    availableMCPCommands = `[{
            "action": "start",
            "description": "start Unity",
            "parameters": {}
        },
        {
            "action": "stop",
            "description": "stop Unity",
            "parameters": {}
        },
        {
            "action": "get-status",
            "description": "get Unity status",
            "parameters": {}
        },
        {
            "action": "get-log",
            "description": "get Unity log",
            "parameters": {}
        },
        {
            "action": "get-mcp-commands",
            "description": "get MCP commands",
            "parameters": {}
        },
        {
            "action":"get-all-gameobjects",
            "description": "get all game objects",
            "parameters": {}
        },
        {
            "action": "gameobject-find",
            "description": "find game object",
            "parameters": {
                "name": "",
                "scene": "",
                "position": [0, 0, 0],
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
                "tag": "",
                "layer": "",
                "material": "",
                "texture": "",
                "color": "",
                "lightType": "",
                "lightRange": "",
                "lightIntensity": "",
                "animation": "",
                "prefab": "",
                "background": "",
                "skybox": "",
                "path": "",
                "obj": ""
            }
        },
        {
            "action": "gameobject-create",
            "description": "create game object",
            "parameters": {
                "name": "",
                "scene": "",
                "position": [0, 0, 0],
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
                "tag": "",
                "layer": "",
                "material": "",
                "texture": "",
                "color": "",
                "lightType": "",
                "lightRange": "",
                "lightIntensity": "",
                "animation": "",
                "prefab": "",
                "background": "",
                "skybox": "",
                "path": "",
                "obj": ""
            }
        },
        {
            "action": "gameobject-update",
            "description": "update game object",
            "parameters": {
                "name": "",
                "scene": "",
                "position": [0, 0, 0],
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
                "tag": "",
                "layer": "",
                "material": "",
                "texture": "",
                "color": "",
                "lightType": "",
                "lightRange": "",
                "lightIntensity": "",
                "animation": "",
                "prefab": "",
                "background": "",
                "skybox": "",
                "path": "",
                "obj": ""
            }
        },
        {
            "action": "gameobject-destroy",
            "description": "destroy game object",
            "parameters": {
                "name": "",
                "scene": "",
                "position": [0, 0, 0],
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
                "tag": "",
                "layer": "",
                "material": "",
                "texture": "",
                "color": "",
                "lightType": "",
                "lightRange": "",
                "lightIntensity": "",
                "animation": "",
                "prefab": "",
                "background": "",
                "skybox": "",
                "path": "",
                "obj": ""
            }
                    }]`;
                }
                else {
                    
                    availableMCPCommands = await mcpServers.getMCPCommandsToString(pathToData);
                    helpers.log('28.1 Available MCP commands: ' + availableMCPCommands, "getUserPromptSendExecution", "core.ts", "info");
                }

                let taskJson = {
                    "{~ProjectInfo~}": [projectInfo],
                    "{~TaskName~}": [taskName],
                    "{~TaskDescription~}": [taskDescription],
                    "{~TaskPriority~}": [taskPriority],
                    "{~Layers~}": [layers],
                    "{~RecommendedPattern~}": [recommendedPattern],
                    "{~TaskStoryPoints~}": [taskStoryPoints],
                    "{~FilesWithMethods~}": filesWithMethods,
                    "{~AvailableMCPcommands~}": [availableMCPCommands]
                };

                if (debug) {
                    commandsData = {
                        fileCommands: [],
                        methodCommands: [],
                        mcpCommands: [
                            {
                                action: "status",
                                parameters: {}
                            }
                        ]
                    };
                } else {
                    commandsData = await llmServers.ExecPromt<types.CommandsData>(
                        pathEnxtension,
                        pathToData,
                        taskJson,
                        config, "developer"
                    ).catch((error) => {
                        helpers.log('28.1 Error sending prompt for LLM: ' + error, "getUserPromptSendExecution", "core.ts", "error");
                        return null;
                    });
                }
                let developerPromptsId = modelAiProject.addDeveloperPrompt(
                    projectId,
                    userPromptId,
                    architectId,
                    analystId,
                    JSON.stringify(taskJson),
                    (commandsData && typeof commandsData !== 'string') ? JSON.stringify(commandsData.fileCommands || []) : JSON.stringify([]),
                    (commandsData && typeof commandsData !== 'string') ? JSON.stringify(commandsData.methodCommands || []) : JSON.stringify([]),
                    (commandsData && typeof commandsData !== 'string') ? JSON.stringify(commandsData.mcpCommands || []) : JSON.stringify([])
                );
                helpers.log('28.1 Developer prompt added to database with ID: ' + developerPromptsId, "getUserPromptSendExecution", "core.ts", "info");
            } catch (error) {
                helpers.log('28.1 Error processing task: ' + error, "getUserPromptSendExecution", "core.ts", "error");
            }

            if (typeof commandsData !== 'string') {
                aiproject.updateTask(tasksData, commandsData);
            }

            if (commandsData === null) {
                helpers.log('28.1 Commands data is empty from developer', "getUserPromptSendExecution", "core.ts", "error");
                continue; // skip this task if there are no commands
            }

            if (commandsData !== null) {
                // Execute file, methods, MCP commands
                const mcpEndpoint = config.get<string>('mcp.endpointServer') || 'http://localhost:8090/';
                helpers.log('29. Commands data processed: fileCommands, methodCommands, mcpCommands handled.', "getUserPromptSendExecution", "core.ts", "info");
                if (typeof commandsData !== 'string') {
                    helpers.log('29.1 Handling file commands: ' + JSON.stringify(commandsData.fileCommands));
                    commands.handleFileCommands(commandsData.fileCommands || [], projectPath);
                    helpers.log('29.2 Handling method commands: ' + JSON.stringify(commandsData.methodCommands));
                    commands.handleMethodCommands(commandsData.methodCommands || [], projectPath);
                    helpers.log('29.3 Handling MCP commands: ' + JSON.stringify(commandsData.mcpCommands));
                    commands.handleMcpCommands(commandsData.mcpCommands || [], mcpEndpoint);
                }

                // start testing the project
                let existsError = true; // we assume by default that there is an error
                let attempts = 10; // attempt counter
                helpers.log('30. Starting tester commands handling.', "getUserPromptSendExecution", "core.ts", "info");
                while (existsError) {
                    // 5.2.1. Execute "start" and "get-log" via MCP commands
                    commands.handleMcpCommands([{ action: "start", parameters: {} }], mcpEndpoint);
                    helpers.log('31. MCP command "start" executed, mcpEndpoint ' + mcpEndpoint, "getUserPromptSendExecution", "core.ts", "info");
                    // 5.2.2. Get the execution result from the log
                    let logResult = await commands.handleMcpCommands([{ action: "get-log", parameters: {} }], mcpEndpoint);
                    helpers.log('32. MCP command "get-log" executed, logResult: ' + logResult, "getUserPromptSendExecution", "core.ts", "info");
                    if (logResult) {
                        // 5.2.3. If there are Error or Exception - copy this line and with the prompt from the developer send the error for resolution to the analyst
                        let errorLines = logResult.split('\n').filter(line => line.includes('Error') || line.includes('Exception'));
                        if (errorLines.length > 0) {
                            helpers.log('33. Errors found in log: ' + errorLines.join('\n'), "getUserPromptSendExecution", "core.ts", "error");
                            
                            const errorMessage = errorLines.join('\n');
                            // 5.2.4. Scan the project again to get the latest state
                            project = await detectProject(projectPath);
                            // 5.2.5. Send the error for resolution to the analyst
                            let taskData1 = await llmServers.ExecPromt<types.TasksData>(
                                pathEnxtension,
                                pathToData,
                                {
                                    "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
                                    "{~filesWithMethods~}": project.filesWithMethods,
                                    "{~UserRequest~}": ["Correct the error: " + errorMessage + ", by task: " + task.name + " " + task.description],
                                },
                                config, "analyst"
                            ).catch((error) => {
                                helpers.log('33.1 Error sending prompt for LLM: ' + error, "getUserPromptSendExecution", "core.ts", "error");
                            });

                            if (
                                taskData1 !== null &&
                                taskData1 !== undefined &&
                                typeof taskData1 !== 'string' &&
                                typeof taskData1 === 'object' &&
                                'tasks' in taskData1 &&
                                Array.isArray((taskData1 as types.TasksData).tasks) &&
                                (taskData1 as types.TasksData).tasks.length > 0
                            ) {
                                helpers.log('34. Task data received from analyst for error handling: ' + JSON.stringify(taskData1), "getUserPromptSendExecution", "core.ts", "info");
                                for (const task1 of (taskData1 as types.TasksData).tasks) {
                                    // 5.2.5. Repeat 5.2.1 if the error is gone, write the solution to json otherwise repeat with 5.2.3., repeat up to 10 times, after 10 - consider the error unsolvable
                                    helpers.log('35. Processing task from analyst for error handling: ' + JSON.stringify(task1), "getUserPromptSendExecution", "core.ts", "info");
                                    // 5.2.6. Output the result in GUI
                                    task1.description = task1.description + " " + errorMessage;
                                    project = await detectProject(projectPath);
                                    helpers.log('36. Project re-detected after error handling: ' + JSON.stringify(project), "getUserPromptSendExecution", "core.ts", "info");
                                    let commandsData1 = await llmServers.ExecPromt<types.CommandsData>(
                                        pathEnxtension,
                                        pathToData,
                                        {
                                            "{~ProjectInfo~}": [helpers.jsonToString(project.info)],
                                            "{~TaskName~}": [task1.name],
                                            "{~TaskDescription~}": [task1.description],
                                            "{~TaskPriority~}": [task1.priority.toString()],
                                            "{~Layers~}": [task1.architecture.layers.join(", ")],
                                            "{~RecommendedPattern~}": [task1.architecture.recommended_pattern],
                                            "{~TaskStoryPoints~}": [task1.storyPoints.toString()],
                                            "{~FilesWithMethods~}": project.filesWithMethods,
                                            "{~AvailableMCPcommands~}": [await mcpServers.getMCPCommandsToString(pathToData)]
                                        },
                                        config, "developer"
                                    ).catch((error) => {
                                        helpers.log('36.1 Error sending prompt for LLM: ' + error, "getUserPromptSendExecution", "core.ts", "error");
                                    });
                                    helpers.log('37. Commands data received from developer for error handling: ' + JSON.stringify(commandsData1), "getUserPromptSendExecution", "core.ts", "info");
                                    // if commandsData1 is not null and is an object execute commands
                                    if (commandsData1 !== null && typeof commandsData1 !== 'string' && commandsData1) {
                                        commands.handleFileCommands(commandsData1.fileCommands || [], projectPath);
                                        commands.handleMethodCommands(commandsData1.methodCommands || [], projectPath);
                                        commands.handleMcpCommands(commandsData1.mcpCommands || [], mcpEndpoint);
                                    }
                                }
                            }
                            // 5.2.5. Repeat 5.2.1 if the error has disappeared, write the solution to json, otherwise repeat from 5.2.3., repeat up to 10 times, after 10 - consider the error unsolvable
                            helpers.log('38. Error handling completed, checking attempts: ' + attempts, "getUserPromptSendExecution", "core.ts", "info");
                            if (attempts <= 0) {
                                if (gitRepoPath !== null && gitRepoPath !== '') {
                                    await git.resetHard(gitRepoPath);
                                    helpers.log('39. Error not resolved after 10 attempts, changes reverted in git.', "getUserPromptSendExecution", "core.ts", "error");
                                }
                                existsError = false;
                                break;
                            }
                            attempts--;
                        } else {
                            if (gitRepoPath !== null && gitRepoPath !== '') {
                                // 5.2.6. Output the result to the GUI
                                helpers.log('40. No errors found in log, proceeding to next task.', "getUserPromptSendExecution", "core.ts", "info");

                                // 5.2.8. If successful, commit and push the changes to github
                                git.commitAndPushCLI({
                                    repoPath: gitRepoPath,
                                    commitMessage: task.name,
                                    remoteName: gitRemoteName,
                                    branchName: gitBranchName
                                }).catch((error) => {
                                    helpers.log('40.1 Error sending prompt for LLM: ' + error, "getUserPromptSendExecution", "core.ts", "error");
                                });
                                helpers.log('41. Task completed successfully, changes committed and pushed to GitHub.', "getUserPromptSendExecution", "core.ts", "info");
                            }
                            existsError = false;
                        } // end: if (errorLines.length > 0) 
                    } // end: if (logResult) {
                } // end: while (existsError) {
            } // end: if (commandsData !== null) {
            // each task changes the project, so it needs to be scanned again
            project = await detectProject(projectPath);
        } // end: for (const task of tasksData.tasks) {
    } // end: if (taskData !== null && taskData && taskData.tasks && taskData.tasks.length > 0) {
    else {
        helpers.log('26. No tasks data received from analyst, skipping task processing.', "getUserPromptSendExecution", "core.ts", "info");
    }
    return "Execution completed successfully.";
}