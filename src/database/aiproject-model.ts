/**
 * @description Save project info in SQLite database.
 * This module provides functions to add user prompts, projects, architect prompts, analyst prompts, developer prompts, and MCP commands.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-06-24
 */
import * as DB from './DB';
import { UserPrompt } from './DB';
import * as helpers from '../helpers';
import { ServerConfig } from '../types';
/*
   DB.tableNames[0]:
       0 - 'user_prompts',
       1 - 'projects',
       2 - 'architect',
       3 - 'analyst',
       4 - 'developer',
       5 - 'mcp_servers',
       6 - 'mcp_actions'
   */

const db = new DB.DB('database.db');

export function addUserPrompt(prompt: string): number {
   
    let dateInput: string =  new Date().toISOString();
    let promptHash: string = helpers.hashString(prompt);

    const user_prompts_id: number | null = db.insertIfNotExistsReturningId(DB.tableNames[0], {
        prompt: prompt,
        date_input: dateInput,
        prompt_hash: promptHash
    }, ["date_input"]);

    if (user_prompts_id === null) {
        helpers.log(`Failed to insert user prompt: ${prompt} with hash: ${promptHash}`,"addUserPrompt", "aiproject-db.ts","error");
        return 0;
    }
    return user_prompts_id;
}

export function getUserPrompts(): DB.UserPrompt[] {
    const userPrompts = db.getAll(DB.tableNames[0]);
    if (!userPrompts) {
        helpers.log("No user prompts found", "getUserPrompts", "aiproject-db.ts", "info");
        return [];
    }
    return userPrompts as unknown as DB.UserPrompt[];
}

export function getUserPromptByHash(promptHash: string): DB.UserPrompt | null {
    const userPromptResult = db.getByField(DB.tableNames[0], "prompt_hash", promptHash);
    const userPromptArray = userPromptResult as unknown as DB.UserPrompt[];
    if (!userPromptArray || userPromptArray.length === 0) {
        helpers.log(`No user prompt found with hash: ${promptHash}`, "getUserPromptByHash", "aiproject-db.ts", "info");
        return null;
    }
    return userPromptArray[0] as DB.UserPrompt;
}

/**
 * Adds a new project to the database.
 * @param mcp_servers_ids McP server IDs as a JSON string or comma-separated string
 * @param languages Programming languages as a JSON string or comma-separated string
 * @param frameworks Frameworks as a JSON string or comma-separated string
 * @param cms Content management systems as a JSON string or comma-separated string
 * @param files Project files as a JSON string or comma-separated string
 * @param methods Class methods as a JSON string or comma-separated string
 * @param classes Class names as a JSON string or comma-separated string
 * @param imports Import statements as a JSON string or comma-separated string
 * @param filesWithMethods Files with methods as a JSON string or comma-separated string
 * @param packageManager Package manager as a JSON string or comma-separated string
 * @returns Project ID or 0 if failed
 */
export function addProject(
    mcp_servers_ids: string, 
    languages: string,
    frameworks: string,
    cms: string,
    files: string,
    methods: string,
    classes: string,
    imports: string,
    filesWithMethods: string,
    packageManager: string
): number {
   
    let dateInput: string = new Date().toISOString();
    let projectName: string = `${languages}-${frameworks}-${cms}`;
    /*
    id: number;
    mcp_servers_ids: string; // JSON array or string with IDs
    languages: string; // JSON or string
    frameworks: string;
    cms: string;
    files: string;
    methods: string;
    classes: string;
    imports: string;
    filesWithMethods: string;
    packageManager: string;
    date_create: string;
    date_update?: string;
    */

    const projectId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[1], {
        mcp_servers_ids: mcp_servers_ids,
        project_name: projectName,
        languages: languages,
        frameworks: frameworks,
        cms: cms,
        files: files,
        methods: methods,
        classes: classes,
        imports: imports,
        filesWithMethods: filesWithMethods,
        packageManager: packageManager,
        date_create: dateInput,
        date_update: dateInput
    }, ["date_create", "date_update"]);

    if (projectId === null) {
        helpers.log(`Failed to insert project: ${projectName}`, "addProject", "aiproject-db.ts", "error");
        return 0;
    }
    return projectId;
}
/*
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  request_prompt?: string;
  response_prompt?: string;
  date_create: string;
  date_update?: string;
*/

/**
 * Adds a new architect prompt to the database.
 * @param projectId Project ID
 * @param userPromptId User prompt ID
 * @param responsePrompt Response prompt
 * @returns Architect prompt ID or 0 if failed
 */
export function addArchitectPrompt(projectId: number, userPromptId: number, responsePrompt: string): number {
  
    let dateInput: string = new Date().toISOString();
 
    const architectId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[2], {
        project_id: projectId,
        user_prompt_id: userPromptId,
        response_prompt: responsePrompt,
        date_create: dateInput,
        date_update: dateInput
    }, ["date_create", "date_update"]);

    if (architectId === null) {
        helpers.log(`Failed to insert architect for project ID: ${projectId}`, "addArchitect", "aiproject-db.ts", "error");
        return 0;
    }
    return architectId;
}
/*
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  architect_id: number; // Foreign key to architect
  request_prompt?: string;
  response_prompt?: string;
  tasks_json: string;
  date_create: string;
  date_update?: string;
*/

/**
 * Adds a new analyst prompt to the database.
 * @param projectId Project ID
 * @param userPromptId User prompt ID
 * @param requestPrompt Request prompt
 * @param responsePrompt Response prompt
 * @param tasksJson Tasks in JSON format (default is an empty array)
 * @returns Analyst prompt ID or 0 if failed
 */
export function addAnalystPrompt(
    projectId: number, 
    userPromptId: number, 
    requestPrompt: string, 
    responsePrompt: string,
    tasksJson: string = JSON.stringify([])
): number {
 
    let dateInput: string = new Date().toISOString();
    let analystHash: string = helpers.hashString(requestPrompt);

    const analystId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[3], {
        project_id: projectId,
        user_prompt_id: userPromptId,
        request_prompt: requestPrompt,
        response_prompt: responsePrompt,
        date_create: dateInput,
        date_update: dateInput,
        tasks_json: tasksJson
    }, ["date_create", "date_update"]);

    if (analystId === null) {
        helpers.log(`Failed to insert analyst for project ID: ${projectId} with hash: ${analystHash}`, "addAnalyst", "aiproject-db.ts", "error");
        return 0;
    }
    return analystId;
}

/*
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  architect_id: number; // Foreign key to architect
  analyst_id?: number; // Foreign key to analyst
  request_prompt?: string;
  response_prompt?: string;
  task_json?: string;
  fileCommands?: string;
  methodCommands?: string;
  mcpCommands?: string;
  date_create: string;
  date_update?: string;
*/

/**
 * Adds a new developer prompt to the database.
 * @param projectId Project ID
 * @param userPromptId User prompt ID
 * @param architectId Architect ID (can be null)
 * @param analystId Analyst ID (can be null)
 * @param taskJson Tasks in JSON format (default is an empty array)
 * @param fileCommands File commands in JSON format (default is an empty array)
 * @param methodCommands Method commands in JSON format (default is an empty array)
 * @param mcpCommands MCP commands in JSON format (default is an empty array)
 * @returns Developer prompt ID or 0 if failed
 */
export function addDeveloperPrompt(
    projectId: number, 
    userPromptId: number, 
    architectId: number | null,
    analystId: number | null,
    taskJson: string = JSON.stringify([]),
    fileCommands: string = JSON.stringify([]),
    methodCommands: string = JSON.stringify([]),
    mcpCommands: string = JSON.stringify([])
): number {

    let dateInput: string = new Date().toISOString();

    const developerId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[4], {
        project_id: projectId,
        user_prompt_id: userPromptId,
        architect_prompt_id: architectId,
        analyst_prompt_id: analystId,
        task_json: taskJson,
        fileCommands: fileCommands,
        methodCommands: methodCommands,
        mcpCommands: mcpCommands,
        date_create: dateInput,
        date_update: dateInput
    }, ["date_create", "date_update"]);

    if (developerId === null) {
        helpers.log(`Failed to insert developer for project ID: ${projectId}`, "addDeveloper", "aiproject-db.ts", "error");
        return 0;
    }
    return developerId;
}

/*
name: string;
  ip_address: string;
  status: string;
  date_create: string;
  date_update?: string;
*/

/**
 * Adds a new MCP server to the database.
 * @param server MCP server configuration
 * @returns MCP server ID or 0 if failed
 */
export function addMCPServer(server: ServerConfig): number {

    let dateInput: string = new Date().toISOString();
    let serverHash: string = helpers.hashString(server.name);

    const mcpServerId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[5], {
        name: server.name,
        description: server.description,
        actions: JSON.stringify(server.actions),
        date_create: dateInput,
        date_update: dateInput,
    }, ["date_create", "date_update"]);

    if (mcpServerId === null) {
        helpers.log(`Failed to insert MCP server: ${server.name} with hash: ${serverHash}`, "addMCPServer", "aiproject-db.ts", "error");
        return 0;
    }
    return mcpServerId;
}
/*
 id: number;
  name: string;
  description: string;
  date_create: string;
  date_update?: string;
*/
/**
 * Adds a new MCP action to the database.
 * @param serverId MCP server ID
 * @param actionName Action name
 * @param parameters Action parameters as an object
 * @returns MCP action ID or 0 if failed
 */
export function addMCPAction(serverId: number, actionName: string, parameters: any): number {

    let dateInput: string = new Date().toISOString();
    let actionHash: string = helpers.hashString(actionName);

    const mcpActionId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[6], {
        server_id: serverId,
        action_name: actionName,
        parameters: JSON.stringify(parameters),
        date_create: dateInput,
        date_update: dateInput
    }, ["date_create", "date_update"]);

    if (mcpActionId === null) {
        helpers.log(`Failed to insert MCP action for server ID: ${serverId} with hash: ${actionHash}`, "addMCPAction", "aiproject-db.ts", "error");
        return 0;
    }
    return mcpActionId;
}

/**
 * Adds a new analyst to the database.
 * @param projectId Project ID
 * @param userPromptId User prompt ID
 * @param promptFromArchitect Prompt from architect
 * @param tasksJson Tasks in JSON format (default is an empty array)
 * @returns Analyst ID or 0 if failed
 */
export function addAnalyst(projectId: number, userPromptId: number, promptFromArchitect: string, tasksJson: string): number {

    let dateInput: string = new Date().toISOString();

    const analystId: number | null = db.insertIfNotExistsReturningId(DB.tableNames[3], {
        project_id: projectId,
        user_prompt_id: userPromptId,
        prompt_from_architect: promptFromArchitect,
        tasks_json: tasksJson,
        date_create: dateInput,
        date_update: dateInput
    }, ["date_create", "date_update"]);

    if (analystId === null) {
        helpers.log(`Failed to insert analyst for project ID: ${projectId}`, "addAnalyst", "aiproject-db.ts", "error");
        return 0;
    }
    return analystId;
}
