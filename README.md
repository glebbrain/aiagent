# AI Agent
A tool for integrating LLM (AI) with project management automation, code generation and external systems (MCP) to speed up development and prototyping.

## Status
⚠️ The project is under development. Errors and incomplete functionality are possible.

## Installation

1. Clone the repository:
```sh
git clone https://github.com/glebbrain/aiagent.git
```
2. Install dependencies:
```sh
npm install
```
---

## Quick Start

1. Open the project in VS Code.
2. Open package.json section "configuration":
   2.1. interface.language: "en" or "ru"
   2.2. debug: true - for develop
   2.3. project.path: path to the project that will be developed by the AI Agent
   2.4. llm.endpoint: ollama: http://localhost:11434/api/chat or gemini with llm.apiKey
   2.5. mcp.endpointServer(for example: unity-6000): http://localhost:8090/
4. Build:
```sh
npm run compile
```
4. Run the extension (F9)
5. F1 -> AgentAI: Open Panel -> Enter
6. Enter a prompt in the field
7. Click Launch

Settings Unity MCP-Sever:
1. Start Unity 6000
2. Create or open project
3. Copy folder from "" to ""
4. Start MCP-Server
---

## Roadmap
- [x] How the extension works: user enter prompt -> architect -> analyst -> developer -> (create/update files, update methods and execute commands in MCP-Server)
- [X] Basic orchestration of tasks by specialists: architect -> analyst -> developer
- [x] Editing prompts for specialists
- [x] Basic integration with LLM (Gemini)
- [x] MCP-Server for test: Unity 6000
- [x] Generating and using file/method/MCP commands
- [ ] Transactionality and rollback of changes on errors
- [ ] Integration with another LLM (Perplexity, OpenAI, etc.)
- [ ] Integration with another MCP-Servers
- [ ] Add/change specialists
- [ ] Interactive dialog with the user (AI clarifies details)
- [ ] Visualization of changes (diff before/after)
- [ ] API to internal functions
- [ ] Interaction with any external API 
- [ ] Adding tests to the core functionality
- [ ] Extensible architecture for plugins
- [ ] Integration with CI/CD and automated tests
- [ ] AI code review and explanations of changes
- [ ] Improved security and command validation
- [ ] Documentation and usage examples  

## Bug report
https://github.com/glebbrain/aiagent/issues/new?template=bug_report.md

## Feature request
https://github.com/glebbrain/aiagent/issues/new?template=feature_request.md

## License
MIT License
