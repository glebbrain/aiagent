const vscode = acquireVsCodeApi();

(function () {

window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
      case 'loadLLMOptions':
          const architectLlmSelect = document.getElementById('architect-llm');
          message.llmOptions.forEach(llm => {
              const option = document.createElement('option');
              option.value = llm.name;
              option.textContent = llm.name;
              architectLlmSelect.appendChild(option);
          });
          break;
      case 'loadMCPOptions':
          const architectMcpSelect = document.getElementById('architect-mcp');
          message.mcpOptions.forEach(mcp => {
              const option = document.createElement('option');
              option.value = mcp.name;
              option.textContent = mcp.name;
              architectMcpSelect.appendChild(option);
          });
          break;
      }
  });


//const vscode = acquireVsCodeApi();
window.addEventListener('message', event => {
  const llmOptions = event.data.llmOptions;
  const architectLlm = document.getElementById('architect-llm');

  if (llmOptions && Array.isArray(llmOptions)) {
    if (architectLlm) {
      llmOptions.forEach(llm => {
        const option = document.createElement('vscode-option');
        option.textContent = llm.name;
        architectLlm.appendChild(option);
      });
    }
  }
});


document.getElementById('selectFolderBtn').addEventListener('click', () => {
    vscode.postMessage({ command: 'selectFolder' });
});

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'updateFolderPath') {
        document.getElementById('folderPath').value = message.path;
    }
});


// 📤 Сразу при загрузке отправим "готов"
window.addEventListener('DOMContentLoaded', () => {
  vscode.postMessage({ command: 'ready' });
});

// 📥 При получении JSON — вставим в textarea
window.addEventListener('message', event => {
  const message = event.data;
  if (message.command === 'setLLMJson') {
    document.getElementById('llm-settings').innerText = message.content;
  }
  if (message.command === 'setMCPJson') {
    document.getElementById('mcp-settings').innerText = message.content;
  }
});

//
document.getElementById('save-llm').addEventListener('click', () => {
  execVSCodeCommand('llm-settings', 'saveLLMSettings', 'JSON');
});
document.getElementById('save-mcp').addEventListener('click', () => {
  execVSCodeCommand('mcp-settings', 'saveMCPSettings', 'JSON');
});

document.getElementById('launch-button').addEventListener('click', () => {
  const prompt = document.getElementById('prompt-input').value;
  if (!prompt) {
    vscode.postMessage({ command: 'showError', message: 'Please enter a prompt.' });
    return;
  }
  
  const selectedLLM = document.getElementById('llm-selector').value;
  const selectedMCP = document.getElementById('mcp-selector').value;

  if (!selectedLLM || !selectedMCP) {
    vscode.postMessage({ command: 'showError', message: 'Please select both LLM and MCP.' });
    return;
  }
  
  vscode.postMessage({
    command: 'launch',
    data: {
      llm: selectedLLM,
      mcp: selectedMCP,
      prompt: prompt
    }
  });
});


})();


// Function to execute a command with the given id and command name
function execVSCodeCommand(id, command, typeData="text") {
  
  if (!document.getElementById(id)) {
    console.error(`Element with id ${id} not found`);
    return;
  }
  let text = "";
  if(document.getElementById(id).value === undefined) {
    text = document.getElementById(id).innerText;
  } else if(document.getElementById(id).value !== undefined) {
    text = document.getElementById(id).value;
  } else {
    console.error(`Element with id ${id} has no value or innerText`);
    return;
  }

  let errorMessageId = "";
  if(id.includes("llm")) {
    errorMessageId = 'error-llm-message';
  } else if(id.includes("mcp")) {
    errorMessageId = 'error-mcp-message';
  }

  if (typeData === "JSON") {
    try {
      text = JSON.parse(text);
      document.getElementById(errorMessageId).innerText = "";

      vscode.postMessage({
        command: command,
        text: text
      });
      
    } catch (e) {
      text = `Error parsing JSON: ${e.message}`;
      document.getElementById(errorMessageId).innerText = text;
      
      return;
    }
  }
  
 
}
