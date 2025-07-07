/**
 * @description This module handles interactions with a Large Language Model (LLM) API.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-11
 */

import * as vscode from 'vscode';
import * as commands from './commands';

import { detectProject, DetectionResult } from './languages/language-definition';
import { processPrompts } from './collection-prompts';
import * as git from './github';
import * as LLMService from './llm-servers';

import * as types from './types';
import * as aiproject from './aiproject/core';
import * as helpers from './helpers';

const fs = require('fs');
const path = require('path');


export async function sendToLLM(
        pathEnxtension: string,
        systemMessage: string,
        userMessage: string, 
        model: string = "deepseek-coder",
        llmApiUrl: string = "http://localhost:11434/api/chat" // Default LLM API URL
    ): Promise<string> {

    // Validate inputs
    if (typeof systemMessage !== 'string' || typeof userMessage !== 'string' || !systemMessage || !userMessage) {
        helpers.log("System message and user message must be strings.", "sendToLLM", "LLMService.ts", "error");
        throw new Error("System message and user message must be strings.");
    }
    if (typeof model !== 'string' || !model) {
        helpers.log("Model must be a non-empty string.", "sendToLLM", "LLMService.ts", "error");
        throw new Error("Model must be a non-empty string.");
    }
    if (typeof llmApiUrl !== 'string' || !llmApiUrl) {
        helpers.log("LLM API URL must be a non-empty string.", "sendToLLM", "LLMService.ts", "error");
        throw new Error("LLM API URL must be a non-empty string.");
    }
    // Ensure the LLM API URL is valid
    try {
        new URL(llmApiUrl);
    } catch (error) {
        helpers.log(`Invalid LLM API URL '${llmApiUrl}' format.`, "sendToLLM", "LLMService.ts", "error");
        throw new Error("Invalid LLM API URL format.");
    }
    
    //const messages = [
    //    { role: "system", content: systemMessage },
    //    { role: "user", content: userMessage },
    //];

    //helpers.log(`Sending request to LLM API at ${llmApiUrl} with model ${model}`, "sendToLLM", "LLMService.ts", "info");
    //// Create a directory for prompts if it doesn't exist
    //let nowDate = helpers.formatDate(Date.now(), "DD-MM-YYYY");
    ////let nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    //let filePathPromtsAndResults = path.join(pathToData, 'llm-response', model + '-' + nowDate + '.json');
    //helpers.log(`File path for prompts and results: ${filePathPromtsAndResults}`, "sendToLLM", "LLMService.ts", "info");
    //helpers.addToJSON(filePathPromtsAndResults, messages, "0");

    try {
      //const messages: Message[] = [
      //  { role: 'system', content: systemMessage },
      //  { role: 'user', content: userMessage },
      //];
      //const response = await askPerplexity(messages, model)
      model = "gemini-1.5-flash"; // Default to a valid model if not provided
      // You need to get the configuration from VSCode, not from 'process'
      const vscodeConfig = vscode.workspace.getConfiguration();
      const apiKey = vscodeConfig.get<string>('llm.apiKey', ''); // Get API key from configuration
      let response = ""; // Initialize response variable
      if (apiKey) {
        response = await getGeminiResponse(apiKey, userMessage, systemMessage, model);  
      } else if (llmApiUrl) {
        // If no API key is provided, use the LLM API URL
        //const messages = [
        //  { role: 'system', content: systemMessage },
        //  { role: 'user', content: userMessage },
        //];
        //response = await askPerplexity(messages, model);
        response = await queryOllama([{ role: 'user', content: userMessage }], model);
      }

      

      if (response) {
        helpers.log(`Received response from LLM API: ${response}`, "sendToLLM", "LLMService.ts", "info");
        // Since askPerplexity returns a string, just log and return it
        helpers.log(`LLM API response: success`, "sendToLLM", "LLMService.ts", "info");
        return response;
      }
      return ""; // Return empty string if the response is not ok

    } catch (error) {
        helpers.log(`Error sending request to LLM: ${error}`, "sendToLLM", "LLMService.ts", "error");
        throw error;
    }
}

/**
 * Executes a prompt with the given replacement data, configuration, and agent.
 * @param replacementData - The data to replace in the prompt.
 * @param config - The workspace configuration.
 * @param agent - The agent to use for the prompt.
 * @returns The result of the prompt execution or null if it failed.
 */
export async function ExecPromt<T>(
  pathEnxtension: string,
  pathToData:string,
  replacementData: { [key: string]: string[] },
  config: vscode.WorkspaceConfiguration,
  agent: string
): Promise<T | string | ""> {

  // language interface
  let languageInterface = config.get<string>('interface.language', 'en');

  // forming promt from parts from promts folder
  let TypeData: T | "" = "";
  try {
    // create prompts
    await processPrompts(pathEnxtension, pathToData, replacementData, languageInterface)
    helpers.log('Prompts processed successfully.', 'ExecPromt', 'extension.ts', 'info');

    // read agent promt
    const filePath = path.join(pathToData, 'prompts', agent + ".json");
    if (!fs.existsSync(filePath)) {
      helpers.log(`Prompt file for agent "${agent}" not found at ${filePath}`, 'ExecPromt', 'extension.ts', 'error');
      return "";
    }
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    if (!fileContent) {
      helpers.log(`Prompt file for agent "${agent}" is empty.`, 'ExecPromt', 'extension.ts', 'error');
      return "";
    }
    let prompt = getMessagesForLanguage(fileContent, languageInterface);
    if (!prompt) {
      helpers.log('Invalid agent type provided.', 'ExecPromt', 'extension.ts', 'error');
      return "";
    }
    // send prompt to LLM
    let strResult = await LLMService.sendToLLM(
      pathEnxtension,
      prompt.systemMessage,
      prompt.userMessage,
      config.get<string>('llm.model', 'llama2'),
      config.get<string>('llm.endpoint', 'http://localhost:11434/api/chat')
    ).catch((error) => {
      helpers.log('Error sending prompt to LLM: ' + error, 'ExecPromt', 'extension.ts', 'error');
      return "";
    });
    // read response from LLM
    if (strResult !== null) {
      if (strResult.startsWith('```json') || strResult.startsWith('`\`\`\`json')) {
        strResult = helpers.clearJsonString(strResult);
        // Parse the JSON string
        try {
          TypeData = JSON.parse(strResult) as T;
          if (TypeData) {
            return TypeData;
          } else {
            helpers.log('Response from analyst is empty or invalid.', 'ExecPromt', 'extension.ts', 'error');
          }
        } catch (jsonError) {
          helpers.log('Error parsing JSON response: ' + jsonError, 'ExecPromt', 'extension.ts', 'error');
          return "";
        }
      } else if (typeof strResult !== 'string') {
        TypeData = await helpers.readJsonString<T | "">(strResult);
        if (TypeData) {
          return TypeData;
        } else {
          helpers.log('Response from analyst is empty or invalid.', 'ExecPromt', 'extension.ts', 'error');
        }
        return TypeData;
      } else if (typeof strResult === 'string') {
        return strResult;
      }
    }

  } catch (error) {
    helpers.log('Error processing prompts: ' + error, 'ExecPromt', 'extension.ts', 'error');
    return "";
  }

  return TypeData;
}

/**
 * Retrieves system and user messages for a given language from a JSON string.
 * @param jsonData - The JSON string containing messages.
 * @param lang - The language code (e.g., 'en', 'ru', 'fr').
 * @returns An object containing systemMessage and userMessage, or null if not found.
 */
function getMessagesForLanguage(
  jsonData: string,
  lang: string // e.g., 'en', 'ru', 'fr'
): { systemMessage: string; userMessage: string } | null {
  const data = JSON.parse(jsonData) as { [key: string]: string };

  // Let's transform the first letter of lang to uppercase, and leave the rest as is.
  // For example, 'en' -> 'En', 'ru' -> 'Ru', 'fr' -> 'Fr'
  const keySuffix = lang.charAt(0).toUpperCase() + lang.slice(1);

  const systemKey = `systemMessage${keySuffix}`;
  const userKey = `userMessage${keySuffix}`;

  // Check if such keys exist in the data object
  if (systemKey in data && userKey in data) {
    return {
      systemMessage: data[systemKey],
      userMessage: data[userKey]
    };
  } else {
    console.error(`Keys for language '${lang}' (expected '${systemKey}', '${userKey}') not found in object.`);
    return null;
  }
}

/**
 * Reads active server configurations from a specified directory and returns their names.
 * @module LLMService
 */
interface ServerConfig {
  active: boolean;
  name: string;
  // Potentially other fields
}

/**
 * Reads all JSON files in the specified directory and returns the names of active servers.
 * @param directoryPath The path to the directory containing server configuration files.
 * @returns An array of objects containing the file name and server name for each active server.
 * @throws Will throw an error if the directory cannot be read or a file cannot be parsed.
*/
export async function getActiveServerNames(directoryPath: string): Promise<{ fileName: string, serverName: string }[]> {
  const activeServers: { fileName: string, serverName: string }[] = [];

  try {
    const files = await fs.promises.readdir(directoryPath);

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(directoryPath, file);
        try {
          const fileContent = await fs.promises.readFile(filePath, { encoding: 'utf8' });
          const config: ServerConfig = JSON.parse(fileContent);

          if (config 
            && typeof config.active === 'boolean' 
            && config.active === true 
            && typeof config.name === 'string'
          ) {
            activeServers.push({ fileName: file, serverName: config.name });
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
      console.log(`  File: ${server.fileName}, Name: ${server.serverName}`);
    }
  })
  .catch(error => {
    console.error('Failed to get active server names:', error);
  });
*/

// ---------------------------------------------------------------------------------------
// api: https://www.perplexity.ai/
const API_URL = 'https://api.perplexity.ai/chat/completions';
const API_KEY = vscode.workspace.getConfiguration().get<string>('llm.apiKey', ''); // Get API key from VSCode config

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    }
  }>;
}

/**
 * Sends a message to the Perplexity API and returns the response.
 * @param messages The messages to send to the API.
 * @param model The model to use for the API request.
 * @returns The API response.
 */
async function askPerplexity(messages: Message[], model = 'sonar-small-chat') {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from the model';
}

// ---------------------------------------------------------------------------------------
// gemini: https://developers.generativeai.google/api/rest/v1beta2/chat/completions


// geminiService.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentResult } from '@google/generative-ai';
import { config } from 'process';

/**
 * Interacts with the Google Gemini API to generate content.
 *
 * @param apiKey Your Google Cloud API key with access to the Gemini API.
 * @param userMessage The user's message to send to the model.
 * @param systemInstruction (Optional) An instruction for the model's behavior (equivalent to a system message).
 * @param modelName (Optional) The name of the Gemini model to use. Defaults to 'gemini-1.5-flash'.
 * Note: 'gemini-2.0-flash' is not a valid public model name.
 * Use 'gemini-1.5-flash' or 'gemini-pro' for general use.
 * @returns A Promise that resolves to the API response, or rejects with an error.
 */
export async function getGeminiResponse(
  apiKey: string,
  userMessage: string,
  systemInstruction?: string,
  modelName: string = 'gemini-1.5-flash' // Default to a valid and efficient model

): Promise<string> {
  // Check if a valid modelName is provided if it's not the default
  if (!['gemini-1.5-flash', 'gemini-pro'].includes(modelName) && !modelName.startsWith('models/')) {
    console.warn(`Warning: Model '${modelName}' might not be a valid or publicly available Gemini model. Using 'gemini-1.5-flash' instead.`);
    modelName = 'gemini-1.5-flash';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const generationConfig = {
    temperature: 0.7, // Adjust for creativity (0.0 - 1.0)
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };
  // 
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  try {
    const requestBody: any = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig,
      safetySettings,
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const result = await model.generateContent(requestBody);
    // Extract the text from the Gemini API response structure
    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      //result?.contents?.[0]?.parts?.[0]?.text ||
      'No response from model';
    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
async function queryOllama(messages: ChatMessage[], model: string = 'llama3'): Promise<string> {
  try {

    const vscodeConfig = vscode.workspace.getConfiguration();
    const endpointServer = vscodeConfig.get<string>('llm.endpointServer', '');

    const response = await fetch(endpointServer, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false, // false = get full response at once
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.message || !data.message.content) {
      throw new Error('Invalid response format');
    }

    return data.message.content;
  } catch (err: any) {
    console.error('Ollama API error:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------------------
