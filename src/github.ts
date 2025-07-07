/**
 * @description This modele provides a CLI interface for committing and pushing changes to a Git repository.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-11
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);
const helpers = require('./helpers');

/**
 * Options for the commitAndPushCLI function.
 * @property {string} repoPath - Path to the Git repository.
 * @property {string} commitMessage - Commit message.
 * @property {string} [remoteName='origin'] - Name of the remote repository (default 'origin').
 * @property {string} [branchName='main'] - Name of the branch (default 'main').
 * @typedef {Object} Options
 */
interface Options {
    repoPath: string;
    commitMessage: string;
    remoteName?: string;
    branchName?: string;
}

/**
 * Executes a command in the specified folder and logs the output.
 */
async function runCommand(cmd: string, cwd: string): Promise<void> {
    try {
        const { stdout, stderr } = await execAsync(cmd, { cwd });
        if (stdout) console.log(stdout.trim());
        if (stderr) console.error(stderr.trim());
    } catch (error: any) {
        console.error(`Error executing command «${cmd}» in ${cwd}:`, error.message);
        throw error;
    }
}

/**
 * This function checks if the specified directory is a Git repository,
 * initializes it if not, stages all changes, commits them with the provided message,
 * and pushes the changes to the specified remote repository and branch.
 * @param {Options} options - Options for the commit and push operation.
 * @returns {Promise<void>} Resolves when the operation is complete.
 
 */
export async function commitAndPushCLI(options: Options): Promise<void> {
    // Destructuring options with default values
    const {
        repoPath,
        commitMessage,
        remoteName = 'origin',
        branchName = 'main',
    } = options;

    const fullPath = path.resolve(repoPath);
    helpers.log(`Working directory: ${fullPath}`, 'commitAndPushCLI', 'git-cli.ts', 'info');
    // Git repository not found. Initializing...
    try {
        await runCommand('git rev-parse --is-inside-work-tree', fullPath);
        helpers.log('Git repository found.', 'commitAndPushCLI', 'git-cli.ts', 'info');
    } catch (error: any) {
        // If the error is that the repository does not exist, initialize it
        if (error.code === 'ENOENT' || error.message.includes('not a git repository')) {
            helpers.log('Git repository not found. Initializing...', 'resetHard', 'git-cli.ts', 'info');
            await runCommand('git init', fullPath);
        } else {
            helpers.log(`Error checking Git repository: ${error.message}`, 'resetHard', 'git-cli.ts', 'error');
            throw error;
        }
    }

    // Adding remote if URL is specified via option
    // (can be refined if necessary)

    // Timeout: pulling changes before commit
    helpers.log(`Pulling changes from ${remoteName}/${branchName}...`, 'commitAndPushCLI', 'git-cli.ts', 'info');
    await runCommand(`git pull ${remoteName} ${branchName} --rebase`, fullPath);

    // Staging all changes
    helpers.log(`Staging changes...`, 'commitAndPushCLI', 'git-cli.ts', 'info');
    await runCommand('git add .', fullPath);

    // Creating commit
    helpers.log(`Creating commit: "${commitMessage}"`, 'commitAndPushCLI', 'git-cli.ts', 'info');
    await runCommand(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, fullPath);

    // Pushing changes
    helpers.log(`Pushing changes to ${remoteName}/${branchName}...`, 'commitAndPushCLI', 'git-cli.ts', 'info');
    await runCommand(`git push ${remoteName} ${branchName}`, fullPath);

    helpers.log('Operation completed successfully.', 'commitAndPushCLI', 'git-cli.ts', 'info');
}

/**
 * Resets the working directory to the last commit.
 * @param repoPath Path to the Git repository.
 * @returns {Promise<void>} Resolves when the reset operation is complete.
 */
export async function resetHard(repoPath: string): Promise<void> {
    // Check if the repoPath is provided
    if (!repoPath) {
        console.error('Repository path is required.');
        throw new Error('Repository path is required.');
    }
    const fullPath = path.resolve(repoPath);
    helpers.log(`Working directory: ${fullPath}`, 'resetHard', 'git-cli.ts', 'info');

    // Initializing if .git is not found
    try {
        await runCommand('git rev-parse --is-inside-work-tree', fullPath);
        helpers.log('Git repository found.', 'resetHard', 'git-cli.ts', 'info');
    } catch (error: any) {
        // If the error is that the repository does not exist, initialize it
        if (error.code === 'ENOENT' || error.message.includes('not a git repository')) {
            helpers.log('Git repository not found. Initializing...', 'resetHard', 'git-cli.ts', 'info');
            await runCommand('git init', fullPath);
        } else {
            helpers.log(`Error checking Git repository: ${error.message}`, 'resetHard', 'git-cli.ts', 'error');
            throw error;
        }
    }

    // Reset to the last commit
    helpers.log('Resetting changes to the last commit...', 'resetHard', 'git-cli.ts', 'info');
    await runCommand('git reset --hard HEAD', fullPath);

    helpers.log('Operation completed successfully.', 'resetHard', 'git-cli.ts', 'info');
}
