/**
 * @description This module defines TypeScript interfaces for managing tasks, architectures, and commands in an AI project.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-26
 */

/**
 * Represents the architecture of a task in the AI project.
 * This interface defines the structure of the architecture object,
 * which includes layers and a recommended pattern.
 * @interface Architecture
 * @property {string[]} layers - An array of strings representing the layers of the architecture.
 * @property {string} recommended_pattern - A string representing the recommended architectural pattern.
 * @example
 * const architecture: Architecture = {
 *   layers: ["Presentation", "Business", "Data"],
 *   recommended_pattern: "CQRS"
 * };
 */
export interface Architecture {
  layers: string[];
  recommended_pattern: string;
}

/**
 * Represents a task in the AI project.
 * This interface defines the structure of a task,
 * including its number, name, dependency, description,
 * architecture, priority, and story points.
 * @interface Task
 * @property {number} number - The unique identifier for the task.
 * @property {string} name - The name of the task.
 * @property {string} dependency - The task that this task depends on.
 * @property {string} description - A brief description of the task.
 * @property {Architecture} architecture - The architecture of the task, represented by the Architecture interface.
 * @property {2 | 1 | 0} priority - The priority of the task, limited to values 2, 1, or 0.
 * @property {number} storyPoints - The number of story points assigned to the task.
 * @example
 * const task: Task = {
 *   number: 1,
 *   name: "Task 1",
 *   dependency: "Task 2",
 *   description: "Description for Task 1",
 *   architecture: {
 *     layers: ["Presentation", "Business", "Data"],
 *     recommended_pattern: "CQRS"
 *   },
 *   priority: 2,
 *   storyPoints: 5
 * };
 */
export interface Task {
  number: number;
  name: string;
  dependency: string;
  description: string;
  architecture: Architecture;
  priority: 2 | 1 | 0; // Priority can only be 2, 1, or 0
  storyPoints: number;
}

/**
 * Represents the structure of the tasks data that can be sent to the AI.
 * This structure includes an array of tasks, each with its own properties.
 * @interface TasksData
 * @property {Task[]} tasks - An array of tasks, each represented by the Task interface.
 * @example
 * const tasksData: TasksData = {
 * tasks: [
 *   {
 *     number: 1,
 *     name: "Task 1",
 *     dependency: "Task 2",
 *     description: "Description for Task 1",
 *     architecture: {
 *       layers: ["Presentation", "Business", "Data"],
 *       recommended_pattern: "CQRS"
 *     },
 *     priority: 2,
 *     storyPoints: 5
 *   }
 * ]
 */
export interface TasksData {
  tasks: Task[];
}

/**
 * Represents a command for creating or updating files in the project directory.
 * This interface defines the structure of commands that can be sent to the AI for file operations.
 * @interface FileCommand
 * @property {string} action - The action to be performed, such as "create" or "update".
 * @property {string} path - The path to the file to be created or updated.
 * @property {string} content - The content to be written to the file.
 * @example
 * const fileCommand: FileCommand = {
 *   action: "create",
 *   path: "/path/to/file.txt",
 *   content: "Hello, world!"
 * };
 */
export interface FileCommand {
  action: "create" | "update";
  path: string;
  content: string;
}

/**
 * Represents a command for managing methods in C# classes.
 * This interface defines the structure of commands that can be sent to the AI for adding, updating, or deleting methods in a class.
 * @interface MethodCommand
 * @property {string} action - The action to be performed, such as "add", "update", or "delete".
 * @property {string} file - The path to the file where the class is defined.
 * @property {string} className - The name of the class where the method will be added, updated, or deleted.
 * @property {string} methodSignature - The signature of the method to be added, updated, or deleted.
 * @property {string} [methodBody] - The body of the method to be added or updated. This field is optional.
 * @example
 * const methodCommand: MethodCommand = {
 *   action: "add",
 *   file: "/path/to/MyClass.cs",
 *   className: "MyClass",
 *   methodSignature: "public void MyMethod()",
 *   methodBody: "Console.WriteLine(\"Hello, world!\");"
 * };
 */
export interface MethodCommand {
  action: "add" | "update" | "delete";
  file: string;
  className: string;
  methodSignature: string;
  methodBody?: string; 
}

/**
 * Represents a command for managing game objects in the MCP (Multi-Command Processor).
 * This interface defines the structure of commands that can be sent to the MCP for various actions.
 * @interface McpCommand
 * @property {string} action - The action to be performed, such as "gameobject-find", "gameobject-create", etc.
 * @property {Record<string, any>} parameters - An object containing parameters for the command.
 * @example
 * const mcpCommand: McpCommand = {
 *  action: "gameobject-create",
 *  parameters: {
 *    name: "NewGameObject",
 *    position: { x: 0, y: 0, z: 0 }
 *  }
 * };
 */
export interface McpCommand {
  action: string; // "gameobject-find" | "gameobject-create" | "gameobject-update" | "gameobject-destroy"
  //action: "gameobject-find" | "gameobject-create" | "gameobject-update" | "gameobject-destroy" | "start" | "stop" | "get-log" | "get-mcp-commands";
  parameters: Record<string, any>;
}

/**
 * Represents the structure of the commands data that can be sent to the AI.
 * This structure includes arrays of file commands, method commands, and MCP commands.
 * @interface CommandsData
 * @property {FileCommand[]} [fileCommands] - An optional array of file commands.
 * @property {MethodCommand[]} [methodCommands] - An optional array of method commands.
 * @property {McpCommand[]} [mcpCommands] - An optional array of MCP commands.
 * @example
 * const commandsData: CommandsData = {
 * fileCommands: [
 *   { action: "create", path: "/path/to/file.txt", content: "Hello, world!" }
 * * ],
 * methodCommands: [
 *   { action: "add", file: "/path/to/MyClass.cs", className: "MyClass", methodSignature: "public void MyMethod()", methodBody: "Console.WriteLine(\"Hello, world!\");" }
 * ],
 * mcpCommands: [
 *   { action: "gameobject-create", parameters: { name: "NewGameObject", position: { x: 0, y: 0, z: 0 } } }
 * ]
 * }
 */
export interface CommandsData {
  fileCommands?: FileCommand[];
  methodCommands?: MethodCommand[];
  mcpCommands?: McpCommand[];
}


export interface LLMSettings {
  content: string;
}
export interface MCPSettings {
  content: string;
}

/*
{
    "active": true,
    "name": "MCP Server for Unity 6000",
    "url": "http://localhost:5000/mcp-unity-server-6000",
    "description": "MCP Server for Unity 6000 with actions: start, stop, get-log, get-mcp-commands, gameobject-find, gameobject-create, gameobject-update, gameobject-destroy",
    "type": "mcp-server",
    "version": "0.0.1",
    "auth": {
        "login": "",
        "password": "",
        "token": ""
    },
    "timeout": 300,
    "actions": [
        {
            "action": "set-connection",
            "description": "set MCP server connection",
            "parameters": {
                "workspaceFolder": "${workspaceFolder}",
                "logLevel": "all",
                "logFile": "${workspaceFolder}/.logs/mcp-server-unity-6000.log"
            }
        },
        {
            "action": "start",
            "description": "start Unity",
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
        }
    ]
}
*/
export interface ServerConfig {
  fileName?: string; // Optional, if you want to include the file name
  active: boolean;
  name: string;
  url?: string;
  description?: string;
  type?: string;
  version?: string;
  auth?: {
    login?: string;
    password?: string;
    token?: string;
  };
  timeout?: number;
  actions?: {
    action: string;
    description?: string;
    parameters: { [key: string]: any };
  }[];
}