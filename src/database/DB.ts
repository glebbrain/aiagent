/**
 * @description  A simple SQLite database module for a VSCode extension.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-06-24
 */
// npm install better-sqlite3
import Database from 'sqlite3';
import type { Database as BetterSqlite3Database } from 'sqlite3';
import * as path from 'path';
import * as vscode from 'vscode';

export const tableNames = [
  'user_prompts',
  'projects',
  'architect_prompts',
  'analyst_prompts',
  'developer_prompts',
  'mcp_servers',
  'mcp_actions'
] as const;
export type TableName = typeof tableNames[number];



export type UserPrompt = {
  id: number;
  prompt: string;
  date_input: string;
  prompt_hash: string;
};

export type Project = {
  id: number;
  project_name: string;
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
};

export type ArchitectPrompt = {
  id: number;
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  response_prompt?: string;
  date_create: string;
  date_update?: string;
};

export type AnalystPrompt = {
  id: number;
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  architect_id: number; // Foreign key to architect
  response_prompt?: string;
  tasks_json: string;
  date_create: string;
  date_update?: string;
};

export type DeveloperPrompt = {
  id: number;
  project_id: number; // Foreign key to projects
  user_prompt_id: number; // Foreign key to user_prompts
  architect_id: number; // Foreign key to architect
  analyst_id?: number; // Foreign key to analyst
  response_prompt?: string;
  task_json?: string;
  fileCommands?: string;
  methodCommands?: string;
  mcpCommands?: string;
  date_create: string;
  date_update?: string;
};

export type McpServer = {
  id: number;
  name: string;
  ip_address: string;
  status: string;
  date_create: string;
  date_update?: string;
};



export type McpAction = {
  id: number;
  name: string;
  description: string;
  date_create: string;
  date_update?: string;
};

export class DB {

  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database.Database(dbPath);
    this.createTableIfNotExists();
  }

  // Create tables if not exists
  private createTableIfNotExists() {
    this.createTableUserPrompts();
    this.createTableProjects();
    this.createTableArchitect();
    this.createTableAnalyst();
    this.createTableDeveloper();
    this.createTableMcpServers();
    this.createTableMcpActions();
  }
  /**
   * Creates the user_prompts table if it does not exist.
   */
  private createTableUserPrompts() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT NOT NULL,
        date_input TEXT NOT NULL,
        prompt_hash TEXT NOT NULL
      );
    `).run();
  }
  /**
   * Creates the projects table if it does not exist.
   */
  private createTableProjects() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        mcp_servers_ids TEXT,        -- JSON массив или строка с ID
        languages TEXT,              -- JSON или строка
        frameworks TEXT,
        cms TEXT,
        files TEXT,
        methods TEXT,
        classes TEXT,
        imports TEXT,
        filesWithMethods TEXT,
        packageManager TEXT,
        date_create TEXT NOT NULL,
        date_update TEXT
      );
    `).run();
  }
  /**
   * Creates the architect_prompts table if it does not exist.
   */
  private createTableArchitect() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS architect_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_prompt_id INTEGER NOT NULL,
        response_prompt TEXT,
        date_create TEXT NOT NULL,
        date_update TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(user_prompt_id) REFERENCES user_prompts(id)
      );
    `).run();
  }
  /**
   * Creates the analyst_prompts table if it does not exist.
   */ 
  private createTableAnalyst() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS analyst_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_prompt_id INTEGER NOT NULL,
        architect_prompt_id INTEGER NOT NULL, -- Foreign key to architect
        response_prompt TEXT,
        tasks_json TEXT,
        date_create TEXT NOT NULL,
        date_update TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(user_prompt_id) REFERENCES user_prompts(id),
        FOREIGN KEY(architect_prompt_id) REFERENCES architect_prompts(id)
      );
    `).run();
  }

  /**
   * Creates the developer_prompts table if it does not exist.
   */
  private createTableDeveloper() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS developer_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_prompt_id INTEGER NOT NULL,
        architect_prompt_id INTEGER NOT NULL,
        analyst_prompt_id INTEGER NOT NULL,
        task_json TEXT,
        fileCommands TEXT,
        methodCommands TEXT,
        mcpCommands TEXT,
        date_create TEXT NOT NULL,
        date_update TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(user_prompt_id) REFERENCES user_prompts(id),
        FOREIGN KEY(architect_prompt_id) REFERENCES architect_prompts(id),
        FOREIGN KEY(analyst_prompt_id) REFERENCES analyst_prompts(id)
      );
    `).run();
  }

/*
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
*/

  /**
   * Creates the mcp_servers table if it does not exist.
   */
  private createTableMcpServers() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        active INTEGER NOT NULL,      -- 0 или 1
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        type TEXT,
        version TEXT,
        auth_login TEXT,
        auth_password TEXT,
        auth_token TEXT,
        timeout INTEGER,
        date_create TEXT NOT NULL,
        date_update TEXT
      );
    `).run();
  }

  /**
   * Creates the mcp_actions table if it does not exist.
   */
  private createTableMcpActions() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS mcp_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcp_server_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parameters TEXT,       -- JSON or string with parameters
        FOREIGN KEY(mcp_server_id) REFERENCES mcp_servers(id)
      );
    `).run();
  }

  /**
   * Inserts a new record into the specified table.
   * This method assumes that the table has an 'id' column that is auto-incremented.
   * If the table does not have an 'id' column, you should use a different method to insert data.
   * @param table Table name to insert data into
   * @param data Record containing the data to insert
   */
  public insert(table: TableName, data: Record<string, any>) {
    const keys = Object.keys(data).join(", ");
    const placeholders = Object.keys(data).map(() => "?").join(", ");
    this.db.prepare(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`).run(...Object.values(data));
  }

  // INSERT if not exists
  // This method assumes that the table has a unique constraint on the fields you want to check
  public insertIfNotExists(table: TableName, data: Record<string, any>) : boolean {
    // check if the record exists based on unique fields
    // Assuming 'data' contains the fields to check for existence
    const checkExists = Object.keys(data).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(data);
    const exists = this.db.prepare(`SELECT 1 FROM ${table} WHERE ${checkExists}`).get(...values);
    if (!exists) {
      this.insert(table, data);
    }
    return !exists;
  }

  /**
   * Inserts a record into the specified table if it does not already exist based on unique fields.
   * @param data Record containing the data to insert
   * @param skipfields Array of field names to skip when checking for existence
   * @returns The ID of the inserted or existing record, or -1 if the insertion failed
   */
  public insertIfNotExistsReturningId(table: TableName, data: Record<string, any>, skipfields: string[]): number {
    // check if the record exists based on unique fields
    const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => !skipfields.includes(key)));
    if (Object.keys(filteredData).length === 0) {
      return -1; // No fields to insert
    }
    const checkExists = Object.keys(filteredData).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(filteredData);
    const exists = this.db.prepare(`SELECT id FROM ${table} WHERE ${checkExists}`).get(...values) as { id?: number } | undefined;
    if (exists && exists.id !== undefined) {
      return exists.id;
    }
    const stmt = this.db.prepare(`INSERT INTO ${table} (${Object.keys(data).join(", ")}) VALUES (${Object.keys(data).map(() => "?").join(", ")})`);
    const execResult = stmt.run(...Object.values(data));

    let lastInsertRowid = this.getIdByRow(table, data);

    if (lastInsertRowid === undefined || lastInsertRowid === null) {
      return -1; // Insertion failed or no ID returned
    }
    return lastInsertRowid
  }

  /**
   * Retrieves all records from the specified table.
   * @param table Table name to retrieve all records from
   * @description Retrieves all records from the specified table.
   * @returns An array of all records in the table.
   */
  public getAll(table: TableName) {
    return this.db.prepare(`SELECT * FROM ${table}`).all();
  }

  /**
   * Retrieves the ID of a record in the specified table based on the provided row data.
   * @param table Table name to search for the record
   * @param row Record containing the data to match
   * @description This method constructs a WHERE clause based on the keys and values of the provided
   * row object, and retrieves the ID of the matching record.
   * If no matching record is found, it returns null.
   */
  public getIdByRow(table: TableName, row: Record<string, any>) {
    const whereClause = Object.keys(row).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(row);
    const stmt = this.db.prepare(`SELECT id FROM ${table} WHERE ${whereClause}`);
    const result = stmt.get(...values) as { id?: number } | undefined;
    return result && result.id !== undefined ? result.id : null;
  }

  public getById(table: TableName, id: number) {
    return this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  }
  public getByField(table: TableName, field: string, value: string | number | boolean) {
    return this.db.prepare(`SELECT * FROM ${table} WHERE ${field} = ?`).all(value);
  }
  public getByFields(table: TableName, conditions: Record<string, any>) {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(conditions);
    return this.db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`).all(...values);
  }
  public getByFieldsOne(table: TableName, conditions: Record<string, any>) {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(conditions);
    return this.db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`).get(...values);
  }
  public getByFieldsLike(table: TableName, conditions: Record<string, any>) {
    const whereClause = Object.keys(conditions).map(key => `${key} LIKE ?`).join(" AND ");
    const values = Object.values(conditions).map(value => `%${value}%`);
    return this.db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`).all(...values);
  }

  // UPDATE
  public update(table: TableName, id: number, data: Record<string, any>) {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(", ");
    this.db.prepare(`UPDATE ${table} SET ${updates} WHERE id = ?`).run(...Object.values(data), id);
  }

  // DELETE
  public delete(table: TableName, id: number) {
    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }

}