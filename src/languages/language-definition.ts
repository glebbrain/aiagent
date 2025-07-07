/**
 * @description This module provides an abstract class BaseCodeParser that defines methods for parsing code files
 * and extracting method information, class names, and import statements.
 * @author Gleb Karpov (https://github.com/glebbrain)
 * @license MIT
 * @version 0.0.1
 * @date 2025-05-03
 */
const helpers = require('../helpers');

const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const TypeScriptExtractProjectInfo = require('./code-parser/typescript');
const JavaScriptExtractProjectInfo = require('./code-parser/javascript');
const CSharpExtractProjectInfo = require('./code-parser/csharp');
const PythonExtractProjectInfo = require('./code-parser/python');
const PHPExtractProjectInfo = require('./code-parser/php');
const JavaExtractProjectInfo = require('./code-parser/java');
const RubyExtractProjectInfo = require('./code-parser/ruby');
const GoExtractProjectInfo = require('./code-parser/go');
const RustExtractProjectInfo = require('./code-parser/rust');
const CppExtractProjectInfo = require('./code-parser/cpp');

const CExtractProjectInfo = require('./code-parser/c');
const SwiftExtractProjectInfo = require('./code-parser/swift');
const MojoExtractProjectInfo = require('./code-parser/mojo');

/**
 * Represents the result of a project detection scan.
 * Contains information about detected languages, frameworks, CMS, files, methods, classes, imports, and package manager.
 * @interface DetectionResult
 * @property {Object} info - An object containing various detected information.
 * @property {string[]} languages - An array of detected programming languages.
 * @property {string[]} frameworks - An array of detected frameworks.
 * @property {string[]} cms - An array of detected content management systems (CMS).
 * @property {string[]} files - An array of file names found in the project.
 * @property {string[]} methods - An array of method names found in the project.
 * @property {string[]} classes - An array of class names found in the project.
 * @property {string[]} imports - An array of import statements found in the project.
 * @property {string[]} filesWithMethods - An array of file names that contain methods.
 * @property {string | undefined} packageManager - The detected package manager, if any.
 * @example
 * const result: DetectionResult = {
 *   info: {
 *     "languages": languages,
 *     "frameworks": frameworks,
 *     "cms": cms,
 *     "packageManager": packageManager
 *   },
 *   languages: ["TypeScript", "JavaScript"],
 *   frameworks: ["React", "Node.js"],
 *   cms: ["WordPress"],
 *   files: ["index.ts", "app.js"],
 *   methods: ["getUser", "setUser"],
 *   classes: ["User", "Admin"],
 *   imports: ["import { User } from './user';"]
 * };
 */
export interface DetectionResult {
  info: { [key: string]: string[] };
  languages: string[];
  frameworks: string[];
  cms: string[];
  files: string[];
  methods: string[];
  classes: string[];
  imports: string[];
  filesWithMethods: string[];
  packageManager: string | undefined;
}

/**
 * A mapping of programming languages to their file extensions.
 * Used to detect the programming languages used in a project based on file extensions.
 * @constant
 * @type {Record<string, string[]>}
 * @example
 * const EXT_LANG_MAP = {
 *   'JavaScript': ['.js', '.jsx'],
 *   'TypeScript': ['.ts', '.tsx'],
 *   'Python': ['.py'],
 *   // ...
 * };
 */
const EXT_LANG_MAP: Record<string, string[]> = {
  'JavaScript': ['.js', '.jsx'],
  'TypeScript': ['.ts', '.tsx'],
  'Python': ['.py'],
  'PHP': ['.php'],
  'C#': ['.cs'],
  'Java': ['.java'],
  'Ruby': ['.rb'],
  'Go': ['.go'],
  'Rust': ['.rs'],
  'C++': ['.cpp'],
  'C': ['.c', '.h'],
  'Swift': ['.swift'],
  'Dart': ['.dart'],
  'Scala': ['.scala'],
  'Perl': ['.pl'],
  'Haskell': ['.hs', '.lhs'],
  'Shell': ['.sh'],
  'Assembly': ['.asm'],
  'Visual Basic': ['.vb'],
  'Lua': ['.lua'],
  'Groovy': ['.groovy'],
  'COBOL': ['.cob'],
  'Fortran': ['.f90'],
  'Ada': ['.ada'],
  'Lisp': ['.lisp']
};

/**
 * A mapping of programming languages to their associated frameworks.
 * Used to detect the frameworks used in a project based on the programming language.
 * @constant
 * @type {Record<string, string[]>}
 * @example
 * const FRAMEWORK_KEYWORDS = {
 *   'JavaScript': ['React', 'Vue.js', 'Angular'],
 *   'Python': ['Django', 'Flask'],
 *   // ...
 * };
 */
const FRAMEWORK_KEYWORDS: Record<string, string[]> = {
  'JavaScript':['React', 'Vue.js', 'Angular', 'Express'],
  'TypeScript': ['React', 'Vue.js', 'Angular', 'Express'],
  'Python': ['Django', 'Flask', 'FastAPI'],
  'PHP': ['Laravel', 'Symfony'],
  'Ruby': ['Ruby on Rails'],
  'Java': ['Spring Boot'],
  'C#': ['ASP.NET', 'Entity Framework'],
  'Go': ['Gin', 'Echo'],
  'Rust': ['Rocket', 'Actix'],
  'C++': ['Qt', 'Boost'],
  'C': ['GTK', 'Qt'],
  'Swift': ['SwiftUI', 'Cocoa'],
  'Dart': ['Flutter'],
  'Scala': ['Akka', 'Play'],
  'Perl': ['Dancer', 'Mojolicious'],
  'Haskell': ['Yesod', 'Snap'],
  'Shell': ['Bash', 'Zsh'],
  'Assembly': ['NASM', 'MASM'],
  'Visual Basic': ['ASP.NET', 'Windows Forms'],
  'Lua': ['LÖVE', 'Corona SDK'],
  'Groovy': ['Grails', 'Spock'],
  'COBOL': ['CICS', 'DB2'],
  'Fortran': ['OpenMP', 'MPI'],
  'Ada': ['GNAT', 'Ravenscar'],
  'Lisp': ['Common Lisp', 'Emacs Lisp']
};

/**
 * A mapping of content management systems (CMS) to their associated keywords.
 * Used to detect the CMS used in a project based on specific files and keywords.
 * @constant
 * @type {Record<string, string[]>}
 * @example
 * const CMS_KEYWORDS = {
 *   'WordPress': ['wp-config.php', 'functions.php'],
 *   'Joomla': ['configuration.php'],
 *   // ...
 * };
 */
const CMS_KEYWORDS: Record<string, string[]> = {
  'PHP':['WordPress', 'Joomla', 'Drupal']
};

/**
 * Scans the project directory for programming languages, frameworks, and other relevant information.
 * @param rootPath - The root path of the project to scan for languages, frameworks, and other information.
 * @returns A promise that resolves to a DetectionResult object containing the detected information.
 */
export async function detectProject(rootPath: string): Promise<DetectionResult> {
  try {
    const extensions = new Set<string>();
    const filesFound = new Set<string>();

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          extensions.add(path.extname(entry.name));
          filesFound.add(entry.name.toLowerCase());
        }
      }
    }
    // Start walking the directory from the root path
    if (fs.existsSync(rootPath)) {
      await walk(rootPath);
      // If the rootPath exists, we can proceed with the detection
    } else {
      // If the rootPath does not exist, we can return an empty logResult
      return {
        info: {},
        languages: [],
        frameworks: [],
        cms: [],
        files: [],
        methods: [],
        classes: [],
        imports: [],
        filesWithMethods: [],
        packageManager: undefined
      };
    }

    // language detection
    const languages: string[] = [];
    for (const ext of extensions) {
      for (const language in EXT_LANG_MAP) {
        if (EXT_LANG_MAP.hasOwnProperty(language) && EXT_LANG_MAP[language]?.includes(ext)) {
          languages.push(language);
          break;
        }
      }
    }

    // scan project for files, methods, classes and imports
    let { files, methods, classes, imports, filesWithMethods }= { files: [], methods: [], classes: [], imports: [], filesWithMethods: [] };
    if (languages.includes('TypeScript') && filesFound.has('tsconfig.json')) {
      ({ files, methods, classes, imports, filesWithMethods } = await TypeScriptExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('C#') /*&& filesFound.has('csproj')*/) {
      ({ files, methods, classes, imports, filesWithMethods } = await CSharpExtractProjectInfo.extractProjectInfo(rootPath));
    }else if (languages.includes('JavaScript') && filesFound.has('jsconfig.json')) {
      ( { files, methods, classes, imports, filesWithMethods } = await JavaScriptExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('PHP') && filesFound.has('composer.json')) {
      ( { files, methods, classes, imports, filesWithMethods } = await PHPExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('Java') && filesFound.has('pom.xml')) {
      ( { files, methods, classes, imports, filesWithMethods } = await JavaExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('Ruby') && filesFound.has('Gemfile')) {
      ( { files, methods, classes, imports, filesWithMethods } = await RubyExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('Go') && filesFound.has('go.mod')) {
      ( { files, methods, classes, imports, filesWithMethods } = await GoExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('Rust') && filesFound.has('Cargo.toml')) {
      ( { files, methods, classes, imports, filesWithMethods } = await RustExtractProjectInfo.extractProjectInfo(rootPath) );
    }else if (languages.includes('C++') && filesFound.has('CMakeLists.txt')) {
      ( { files, methods, classes, imports, filesWithMethods } = await CppExtractProjectInfo.extractProjectInfo(rootPath) );
    } else if (languages.includes('C') && filesFound.has('Makefile')) {
      ( { files, methods, classes, imports, filesWithMethods } = await CExtractProjectInfo.extractProjectInfo(rootPath) );
    } else if (languages.includes('Swift') && filesFound.has('Package.swift')) {
      ( { files, methods, classes, imports, filesWithMethods } = await SwiftExtractProjectInfo.extractProjectInfo(rootPath) );
    } else if (languages.includes('Mojo') && filesFound.has('mojo.json')) {
      ( { files, methods, classes, imports, filesWithMethods } = await MojoExtractProjectInfo.extractProjectInfo(rootPath) );
    } else if (languages.includes('Python') && filesFound.has('requirements.txt')) {
      ({ files, methods, classes, imports, filesWithMethods } = await PythonExtractProjectInfo.extractProjectInfo(rootPath));
    }
    else {
      // If no specific language parser is found, we can return empty arrays
      ( { files, methods, classes, imports, filesWithMethods } = { files: [], methods: [], classes: [], imports: [], filesWithMethods: [] } );
    }

    helpers.log(`Project detected with languages: ${languages.join(', ')}, files: ${files.length}, methods: ${methods.length}, classes: ${classes.length}, imports: ${imports.length}`);

    let packageManager = detectPackageManager(rootPath);
    let cms = await detectCms(rootPath, filesFound);
    
    const frameworks: string[] = [];
    frameworks.push(...await detectFramework(rootPath));

    let info = {
      languages: languages,
      frameworks: frameworks,
      cms: cms,
      packageManager: packageManager ? [packageManager] : []
    };
    helpers.log(`Detected info: ${JSON.stringify(info)}`);
    /*
    let info = "Project written in " + languages.join(", ") + ", " +
      "Uses " + frameworks.join(", ") + ", " +
      "CMS: " + cms.join(", ") + ", " +
      "Package manager: " + packageManager + ".";
    */
    //let infoText = helpers.jsonToString(info);
    return {
      info: info,
      languages: Array.from(new Set(languages)),
      frameworks: Array.from(new Set(frameworks)),
      cms: Array.from(new Set(cms)),
      files: Array.from(new Set(files)),
      methods: Array.from(new Set(methods)),
      classes: Array.from(new Set(classes)),
      imports: Array.from(new Set(imports)),
      filesWithMethods: Array.from(new Set(filesWithMethods)),
      packageManager: packageManager
    };
  } catch (error) {
    if (!error) {
      helpers.error(`Project path does not exist: ${rootPath}`, 'detectProject', 'language-definition.ts', 'error');
    } else if (error instanceof Error && error.message !== undefined) {
      helpers.error(`Error during project detection: ${error.message}`, 'detectProject', 'language-definition.ts', 'error');
    }
    return {
      info: {},
      languages: [],
      frameworks: [],
      cms: [],
      files: [],
      methods: [],
      classes: [],
      imports: [],
      filesWithMethods: [],
      packageManager: undefined
    };
  }

}

/**
 * Detects the package manager used in the project based on specific files.
 * @param projectPath - The path to the project directory.
 * @returns The name of the detected package manager or undefined if not found.
 */
function detectPackageManager(projectPath: string): string | undefined {
  const files = fs.readdirSync(projectPath);
  for (const file of files) {
    if (file === 'project.assets.json') {
      return 'dotnet';
    } else if (file === 'packages.config') {
      return 'nuget';
    } else if (file === 'pom.xml') {
      return 'maven';
    } else if (file === 'project.json' || file === 'project.lock.json') {
      return 'npm';
    } else if (file === 'build.gradle' || file === 'gradle.properties') {
      return 'gradle';
    } else if (file === 'Gemfile') {
      return 'bundler';
    } else if (file === 'requirements.txt') {
      return 'pip';
    } else if (file === 'composer.json') {
      return 'composer';
    } else if (file === 'Cargo.toml') {
      return 'cargo';
    } else if (file === 'go.mod') {
      return 'go';
    } else if (file === 'setup.py') {
      return 'setuptools';
    }
  }
  return undefined;
}

/**
 * Reads the content of a file asynchronously.
 * @param filePath - The path to the file to read.
 * @returns A promise that resolves to the content of the file as a string, or an empty string if the file does not exist or an error occurs.
 */
async function readFileContent(filePath: string): Promise<string> {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
      if (!error) {
        helpers.error(`Project path does not exist: ${filePath}`,'readFileContent', 'language-definition.ts', 'error');
      } else if (error instanceof Error && error.message !== undefined) {
        helpers.error(`Error during project detection: ${error.message}`, 'readFileContent', 'language-definition.ts', 'error');
      }
      return '';
    }
}

/**
 * Detects frameworks by scanning a specific file for keywords.
 * @param rootPath - The root path of the project
 * @param file - The file to scan for framework keywords
 * @param dict - A dictionary of framework keywords
 * @returns An array of detected framework names
 */
async function detectByDict(rootPath: string, file: string, dict: Record<string, string[]>): Promise<string[]> {
  const frameworks: string[] = [];
  const compPath = path.join(rootPath, file);
  if (fs.existsSync(compPath)) {
    try {
      const comp = JSON.parse(await fs.promises.readFile(compPath, 'utf-8'));
      const deps = { ...comp.require, ...comp['require-dev'] };
      for (const key of Object.keys(deps)) {
        const lower = key.toLowerCase();
        const value = deps[key];
        for (const fw in dict) {
          if (dict.hasOwnProperty(fw) && value.includes(fw)) {
            frameworks.push(fw);
            break;
          }
        }
      }
    } catch (error){
      if (!error) {
        helpers.error(`Project path does not exist: ${rootPath}`, 'detectByDict', 'language-definition.ts', 'error');
      } else if (error instanceof Error && error.message !== undefined) {
        helpers.error(`Error during project detection: ${error.message}`, 'detectByDict', 'language-definition.ts', 'error');
      }
     }
  } 
  return frameworks;
}

/**
 * Detects content management systems (CMS) by scanning the project directory and checking for specific files and keywords.
 * @param rootPath - The root path of the project
 * @param filesFound - A set of files found in the project
 * @returns An array of detected CMS names
 */
async function detectCms(rootPath: string, filesFound: Set<string>): Promise<string[]> {
  const cms: string[] = [];
  const extensions = new Set<string>();

  try {
    await helpers.walk(rootPath, filesFound, extensions);

    const compPath = path.join(rootPath, 'composer.json');
    if (fs.existsSync(compPath)) {
      try {
        const comp = JSON.parse(await fs.promises.readFile(compPath, 'utf-8'));
        const deps = { ...comp.require, ...comp['require-dev'] };
        for (const key of Object.keys(deps)) {
          const lower = key.toLowerCase();
          const value = deps[key];
          for (const m in CMS_KEYWORDS) {
            if (CMS_KEYWORDS.hasOwnProperty(m) && value.includes(m)) {
              cms.push(m);
              break;
            }
          }
        }
      } catch (error) {
        if (!error) {
          helpers.error(`Project path does not exist: ${rootPath}`, 'detectCms', 'language-definition.ts', 'error');
        } else if (error instanceof Error && error.message !== undefined) {
          helpers.error(`Error during project detection: ${error.message}`, 'detectCms', 'language-definition.ts', 'error');
        }
      }
    }

    for (const f of filesFound) {
      if (CMS_KEYWORDS[f.replace(/\..*$/, '')]) cms.push(...CMS_KEYWORDS[f.replace(/\..*$/, '')]);
      if (f === 'wp-config.php') cms.push('WordPress');
      if (f === 'configuration.php') cms.push('Joomla');
      if (f === 'settings.php') cms.push('Drupal');
      if (f === 'index.php') cms.push('Magento');
      if (f === 'config.php') cms.push('PrestaShop');
      if (f === 'config.inc.php') cms.push('phpBB');
      if (f === 'settings.py') cms.push('Django');
      if (extensions.has('.php')){
        if (f === 'config/database.php') cms.push('Laravel');
        if (f === 'config/app.php') cms.push('Symfony');
        if (f === 'config.php') cms.push('CodeIgniter'); 
        if (f === 'config/routes.php') cms.push('CakePHP'); // files contains extends: AppController
      }
    }

    cms.push(...await detectByDict(rootPath, 'composer.json', CMS_KEYWORDS));
    cms.push(...await detectByDict(rootPath, 'package.json', CMS_KEYWORDS));
  } catch (error) {
    if (!error) {
      helpers.error(`Project path does not exist: ${rootPath}`, 'detectCms', 'language-definition.ts', 'error');
    } else if (error instanceof Error && error.message !== undefined) {
      helpers.error(`Error during project detection: ${error.message}`, 'detectCms', 'language-definition.ts', 'error');
    }
  }
  return cms;
}

/**
 * Detects frameworks used in the project by scanning for specific files and keywords.
 * @param rootPath - The root path of the project
 * @returns An array of detected framework names
 */
async function detectFramework(rootPath: string): Promise<string[]> {

  const frameworks: string[] = [];
  const filesFound: Set<string> = new Set<string>();
  const extensions: Set<string> = new Set<string>();

  try {
    await helpers.walk(rootPath, filesFound, extensions);

    for (const f of filesFound) {
      if (f === 'artisan') frameworks.push('Laravel');
      if (f === 'manage.py') frameworks.push('Django');
      if (f === 'bin/console') frameworks.push('Symfony');
      if (f === 'rails') frameworks.push('Ruby on Rails');
    }

    const files = await fs.promises.readdir(rootPath);

    if (files.includes('artisan')) {
      frameworks.push('Laravel');
    }
    if (files.includes('manage.py')) {
      frameworks.push('Django');
    }
    if (files.includes('rails')) {
      frameworks.push('Ruby on Rails');
    }
    if (files.includes('console')) {
      frameworks.push('Symfony');
    }
    if (files.includes('angular.json')) {
      frameworks.push('Angular');
    }
    if (files.includes('vue.config.js') || files.includes('vite.config.js') || files.includes('index.html') && files.some((f: string) => f.endsWith('.vue'))) {
      frameworks.push('Vue.js');
    }
    if (files.includes('package.json') && (await readFileContent(path.join(rootPath, 'package.json'))).includes('"react"')) {
      frameworks.push('React');
    }
    if (files.includes('manage.py')) {
      frameworks.push('Django');
    }
    if (files.includes('app.py') || files.includes('requirements.txt') && (await readFileContent(path.join(rootPath, 'requirements.txt'))).includes('flask')) {
      frameworks.push('Flask');
    }
    if (files.includes('main.py') && (await readFileContent(path.join(rootPath, 'main.py'))).includes('from fastapi')) {
      frameworks.push('FastAPI');
    }
    if (files.includes('artisan')) {
      frameworks.push('Laravel');
    }
    if (files.includes('composer.json') && (await readFileContent(path.join(rootPath, 'composer.json'))).includes('"symfony/framework-bundle"')) {
      frameworks.push('Symfony');
    }
    if (files.includes('Gemfile') && (await readFileContent(path.join(rootPath, 'Gemfile'))).includes('rails')) {
      frameworks.push('Ruby on Rails');
    }
    if (files.includes('pom.xml') && (await readFileContent(path.join(rootPath, 'pom.xml'))).includes('org.springframework.boot')) {
      frameworks.push('Spring Boot');
    }
    if (files.some((f: string) => f.endsWith('.csproj')) && files.includes('Startup.cs')) {
      frameworks.push('ASP.NET');
    }
    if (files.includes('Cargo.toml') && (await readFileContent(path.join(rootPath, 'Cargo.toml'))).includes('rocket =')) {
      frameworks.push('Rocket');
    }
    if (files.includes('Cargo.toml') && (await readFileContent(path.join(rootPath, 'Cargo.toml'))).includes('actix-web =')) {
      frameworks.push('Actix');
    }
    if (files.some((f: string) => f.endsWith('.pro'))) {
      frameworks.push('Qt');
    }
    if (files.some((f: string) => f.endsWith('.cpp') || f.endsWith('.h'))) {
      frameworks.push('Boost');
    }
    if (files.some((f: string) => f.endsWith('.go') && f.includes('main.go'))) {
      frameworks.push('Gin');
    }
    if (files.some((f: string) => f.endsWith('.js'))) {
      frameworks.push('Node.js');
    } 

    frameworks.push(...await detectByDict(rootPath, 'composer.json', FRAMEWORK_KEYWORDS));
    frameworks.push(...await detectByDict(rootPath, 'package.json', FRAMEWORK_KEYWORDS));

    // Check .csproj files for .NET frameworks
    const csprojFiles = Array.from(filesFound).filter(f => f.endsWith('.csproj'));
    for (const file of csprojFiles) {
      const xml = await fs.promises.readFile(path.join(rootPath, file), 'utf-8');
      const result = await parseStringPromise(xml);
      const sdk = result.Project.$.Sdk;
      if (sdk) frameworks.push(sdk);
    }
  } catch (error) {
    if (!error) {
      helpers.error(`Project path does not exist: ${rootPath}`, 'detectCms', 'language-definition.ts', 'error');
    } else if (error instanceof Error && error.message !== undefined) {
      helpers.error(`Error during project detection: ${error.message}`, 'detectCms', 'language-definition.ts', 'error');
    }
  }
  return frameworks;
}

export default detectProject;
export { EXT_LANG_MAP, FRAMEWORK_KEYWORDS, CMS_KEYWORDS };
