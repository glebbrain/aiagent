using Newtonsoft.Json;

using PlasticPipe.Server;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using Unity.Android.Gradle;

using UnityEditor;
using UnityEditor.Compilation;
using UnityEditor.PackageManager;

using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

using static PlasticPipe.PlasticProtocol.Messages.NegotiationCommand;

// LogReader class for reading Unity log files
public static class LogReader
{
    private static readonly string filePath = Path.Combine(Application.persistentDataPath, "logs.txt");
    // Reflection: Accessing private method GetEntryInternal
    private static readonly MethodInfo _getCountMethod = typeof(EditorWindow).Assembly
            .GetType("UnityEditor.LogEntries")
            ?.GetMethod("GetCount", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);


    public static void DumpErrors()
    {

        if (_getCountMethod == null)
        {
            UnityEngine.Debug.LogError("Unable to access LogEntries.GetCount method.");
            return;
        }

        int count = (int)_getCountMethod.Invoke(null, null);
        UnityEngine.Debug.Log($"Log count: {count}");
        if (count == 0)
        {
            UnityEngine.Debug.Log("No logs found.");
            return;
        }
        for (int i = 0; i < count; i++)
        {
            // (int index, out string condition, out string stackTrace, out LogType type)
            object[] args = { i, null, null, null };
            _getCountMethod.Invoke(null, args);

            string condition = args[1] as string;
            string stackTrace = args[2] as string;
            LogType type = (LogType)args[3];

            if (type == LogType.Error || type == LogType.Exception)
            {
                File.AppendAllText(filePath, $"[#{i}] {condition}\n{stackTrace}\n\n");  // :contentReference[oaicite:7]{index=7}
            }
            else if (type == LogType.Warning)
            {
                File.AppendAllText(filePath, $"[#{i}] {condition}");
            }
        }
    }
}
/** 
 * CompilationWatcher class to monitor Unity compilation events
 * and dump errors to a log file.
 */
public static class CompilationWatcher
{
    // Static constructor to register the compilation finished event
    public static void StartWatching()
    {
        CompilationPipeline.compilationFinished += OnCompilationFinished;  // :contentReference[oaicite:3]{index=3}
    }

    // Event handler for compilation finished
    // This method is called when the compilation process is finished
    private static void OnCompilationFinished(object context)
    {
        CompilationPipeline.compilationFinished -= OnCompilationFinished;  // :contentReference[oaicite:4]{index=4}
        LogReader.DumpErrors();
        EditorApplication.ExitPlaymode();  // :contentReference[oaicite:5]{index=5}
    }
}
[InitializeOnLoad]
public static class MCPServer
{
    // logging
    public static string logLevel = "all"; // default log level
    public static string logFile = Path.Combine(Path.GetTempPath(), $"mcp-server-unity-{DateTime.Now:yyyyMMdd}.log"); // default log file

    private static void PlayModeWatcher()
    {
        // Monitor changes in Play Mode
        EditorApplication.playModeStateChanged += OnPlayModeStateChanged;  // :contentReference[oaicite:0]{index=0}
    }

    private static void OnPlayModeStateChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.EnteredPlayMode)
        {
            // Start watching for compilation events when entering Play Mode
            CompilationWatcher.StartWatching();
        }
    }

    private static readonly string filePath = Path.Combine(Application.persistentDataPath, "logs.txt");

    private static HttpListener listener;
    private static HttpListenerResponse response;
    private static Thread listenerThread;
    private static bool isRunning = false;
    public static int port = 8090; // Default port

    public class Parameters
    {
       
        public string name { get; set; }
        public string scene { get; set; }
        public float[] position { get; set; }
        public float[] rotation { get; set; }
        public float[] scale { get; set; }
        public string tag { get; set; }
        public string layer { get; set; }
        public string material { get; set; }
        public string texture { get; set; }
        public string color { get; set; }
        public string lightType { get; set; }
        public float lightRange { get; set; }
        public float lightIntensity { get; set; }
        public string animation { get; set; }
        public string prefab { get; set; }
        public string background { get; set; }
        public string skybox { get; set; }
        public string path { get; set; }
        public string obj { get; set; }
    }

    public class MCPCommand
    {
        public string action { get; set; }
        public string description { get; set; }
        public Parameters parameters { get; set; }
        public int countparameters
        {
            get
            {
                if (parameters == null) return 0;
                int count = 0;
                if (parameters.name != null) count++;
                if (parameters.scene != null) count++;
                if (parameters.position != null) count++;
                if (parameters.rotation != null) count++;
                if (parameters.scale != null) count++;
                if (parameters.tag != null) count++;
                if (parameters.layer != null) count++;
                if (parameters.material != null) count++;
                if (parameters.texture != null) count++;
                if (parameters.color != null) count++;
                if (parameters.lightType != null) count++;
                if (parameters.lightRange > 0) count++;
                if (parameters.lightIntensity > 0) count++;
                if (parameters.animation != null) count++;
                if (parameters.prefab != null) count++;
                if (parameters.background != null) count++;
                if (parameters.skybox != null) count++;
                if (parameters.path != null) count++;
                return count;
            }
        }
    }
    /// <summary>
    /// Static constructor to initialize the MCP server.
    /// </summary>
    public static bool RunServer()
    {
        bool running = StartServer();
        EditorApplication.quitting += StopServer;
        return running;
    }
    /// <summary>
    /// Starts the MCP server if it is not already running.
    /// </summary>
    private static bool StartServer()
    {
        if (isRunning) return true;

        _ = KillProcessOnPort(port);

        listener = new HttpListener();
        listener.Prefixes.Add($"http://localhost:{port}/");

        //listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        isRunning = true;

        listenerThread = new Thread(ListenForClients);
        listenerThread.IsBackground = true;
        listenerThread.Start();

        UnityEngine.Debug.Log($"MCP Server started on port {port}");
        return isRunning;
    }
    /// <summary>
    /// Stops the MCP server and cleans up resources.
    /// </summary>
    public static void StopServer()
    {
        isRunning = false;
        listener?.Stop();
        listenerThread?.Abort();
        UnityEngine.Debug.Log("MCP Server stopped.");
    }
    /// <summary>
    /// Listens for incoming TCP connections and processes commands.
    /// </summary>
    private static async void ListenForClients()
    {
        while (isRunning)
        {
            // Wait for an incoming HTTP request
            HttpListenerContext context = await listener.GetContextAsync();

            // Get the request and response objects
            HttpListenerRequest request = context.Request;
            response = context.Response;
            string command = "";
            bool cmdWithParameters = false;
            if (request.HttpMethod == "POST")
            {
                using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
                // {"action":"start","parameters":{}}
                string json = await reader.ReadToEndAsync();
                if (string.IsNullOrEmpty(json))
                {
                    UnityEngine.Debug.LogError("Received empty command.");
                    continue;
                }
                if (json.Contains('{'))
                {
                    var cmd = JsonConvert.DeserializeObject<MCPCommand>(json);
                    command = cmd.action;
                    if (cmd.countparameters > 0)
                    {
                        cmdWithParameters = true;
                    }
                }
                Console.WriteLine("POST-Command: " + command);
            }

            UnityEngine.Debug.Log($"MCP Command received: {command}");
            // List of all methods available for MCP commands:
            if (command != "")
            {
                if(command == "set-connection")
                {
                    continue;
                }

                if (command == "get-mcp-commands")
                {
                    //var methods = typeof(MCPServer).GetMethods();
                    List<string> methodNames = GetAllMethods();
                    string result = JsonConvert.SerializeObject(methodNames);
                    SendResponse(response, command, result);
                }
                else if (command == "get-log")
                {
                    if (File.Exists(filePath))
                    {
                        string allLogs = File.ReadAllText(filePath);
                        SendResponse(response, command, allLogs);
                    }
                }
                else if (command == "start")
                {
                    EditorApplication.EnterPlaymode();       
                }
                else if (command == "stop")
                {
                    EditorApplication.ExitPlaymode();
                    if (!EditorApplication.isPlaying)
                    {
                        SendResponse(response, command, "Successful");
                    }
                    else
                    {
                        SendResponse(response, command, "Not successful");
                    }
                    
                }
                else if (command == "status")
                {
                    //EditorApplication.is
                    string status = "Stopped";
                    try
                    {
                        if (EditorApplication.isPlaying)
                        {
                            status = "Playing";
                        }
                        else if (EditorApplication.isCompiling)
                        {
                            status = "Compiling";
                        }
                        else if (EditorApplication.isUpdating)
                        {
                            status = "Updating";
                        }
                        else if (EditorApplication.isFocused)
                        {
                            status = "Focused";
                        }
                        else if (EditorApplication.isPlayingOrWillChangePlaymode)
                        {
                            status = "PlayingOrWillChangePlaymode";
                        }
                        else if (EditorApplication.isRemoteConnected)
                        {
                            status = "RemoteConnected";
                        }
                        else if (EditorApplication.isTemporaryProject)
                        {
                            status = "TemporaryProject";
                        }
                        else if (EditorApplication.isCreateFromTemplate)
                        {
                            status = "CreateFromTemplate";
                        }
                        else if (EditorApplication.isPaused)
                        {
                            status = "Paused";
                        }
                        SendResponse(response, "status", status);
                    }
                    catch (Exception ex)
                    {
                        SendResponse(response, "error", "Error: " + ex.Message + "; Source: " + ex.Source);
                    }
                }
                else if (command == "start-getlog-stop")
                {
                    PlayModeWatcher();
                    if (File.Exists(filePath))
                    {
                        string allLogs = File.ReadAllText(filePath);
                        SendResponse(response, command, allLogs);
                        File.Delete(filePath);
                        Thread.Sleep(1000);
                    }
                }
                else if (command == "get-objects-in-scenes")
                {
                    string result = BuildSceneHierarchyJson();
                    var obj = JsonConvert.DeserializeObject(result);
                    // Remove empty children and untagged objects
                    string textJson = JsonConvert.SerializeObject(obj, Formatting.None);
                    textJson = textJson
                        .Replace(",\"children\":[]", "")
                        .Replace(",\"tag\":\"Untagged\"", "");

                    SendResponse(response, command, textJson);
                }
                else if (cmdWithParameters)
                {
                    string result = HandleCommand(command);
                    SendResponse(response, command, result);
                }
            }
        }
    }
    /// <summary>
    /// Sends a response to the client
    /// </summary>
    /// <param name="client"></param>
    /// <param name="actionName"></param>
    /// <param name="response"></param>
    private static async void SendResponse(HttpListenerResponse httpResponse, string actionName, string response)
    {
        if (httpResponse == null || string.IsNullOrEmpty(response))
        {
            UnityEngine.Debug.LogError("Client or response is null.");
            return;
        }
        
        if (string.IsNullOrEmpty(actionName))
        {
            UnityEngine.Debug.LogError("Action name is null or empty.");
            return;
        }

        if (actionName.Trim() != "" && response.Trim() != "")
        {
            Dictionary<string, object> responseData = new Dictionary<string, object>
            {
                { "action", actionName },
                { "response", response }
            };
            string responseString = JsonConvert.SerializeObject(responseData);
            byte[] buffer = Encoding.UTF8.GetBytes(responseString);
            httpResponse.ContentLength64 = buffer.Length;

            // Send the response to the client
            using var output = httpResponse.OutputStream;
            await output.WriteAsync(buffer, 0, buffer.Length);
        }   
    }

    /// <summary>
    /// Returns a list of all methods available in MCPServer.
    /// </summary>
    /// <returns></returns>
    private static List<string> GetAllMethods()
    {
        // TODO: Implement method discovery and return as JSON
        return new List<string>() {
            "set-connection",
            "start",
            "stop",
            "get-status",
            "get-log",
            "get-mcp-commands",
            "get-all-gameobjects",
            "gameobject-find",
            "gameobject-create",
            "gameobject-update",
            "gameobject-destroy",
            
        };
    }

    private class MCPStatus
    {
        public string action { get; set; }
        public string description { get; set; }
        public string status { get; set; }
        public string logLevel { get; set; }
        public string logFile { get; set; }
        public string workspaceFolder { get; set; }
       
    }
    private static string getStatus()
    {
        // Get the current status of the server
        var status = new MCPStatus
        {
            action = "status",
            description = "Server status",
            status = EditorApplication.isPlaying ? "Playing" : "Stopped",
            logLevel = logLevel,
            logFile = logFile,
            workspaceFolder = workspaceFolder

        };
        return JsonConvert.SerializeObject(status);
    }

    private static string workspaceFolder = Application.dataPath.Replace("/Assets", "");
    /// <summary>
    /// Handles incoming commands and returns the appropriate response.
    /// </summary>
    /// <param name="command"></param>
    //[Obsolete]
    private static string HandleCommand(string json)
    {
        
        string result = "";
        MCPCommand resultJson = null;

        var cmd = JsonConvert.DeserializeObject<MCPCommand>(json);

        if (cmd != null && cmd.action != null && Enum.TryParse(cmd.parameters.obj, out PrimitiveType pt))
        {
            GameObject go = null;
            /*
                "action": "set-connection",
                "description": "set MCP server connection",
                "parameters": {
                    "logLevel": "all",
                    "logFile": ".logs/mcp-server-unity-6000.log"
                }
            */
            if (cmd.action == "set-connection")
            {
                logLevel = cmd.parameters.name ?? "all"; // Set log level
                logFile = cmd.parameters.scene ?? Path.Combine(Path.GetTempPath(), $"mcp-server-unity-6000-{DateTime.Now:yyyyMMdd}.log"); // Set log file
                // Update connection settings
                return getStatus();
            }
            if (cmd.action == "get-status")
            {
                // Get the current status of the server
                return getStatus();
            }
            if (cmd.action == "gameobject-find")
            {
                go = FindGO(cmd);
                if (go != null)
                {
                    resultJson = new MCPCommand
                    {
                        action = "found",
                        description = "GameObject found",
                        parameters = new Parameters
                        {
                            name = go.name,
                            position = new float[] { go.transform.position.x, go.transform.position.y, go.transform.position.z },
                            rotation = new float[] { go.transform.rotation.eulerAngles.x, go.transform.rotation.eulerAngles.y, go.transform.rotation.eulerAngles.z },
                            scale = new float[] { go.transform.localScale.x, go.transform.localScale.y, go.transform.localScale.z },
                            tag = go.tag,
                            layer = LayerMask.LayerToName(go.layer),
                            material = go.GetComponent<Renderer>()?.material.name,
                            texture = go.GetComponent<RawImage>()?.texture.name,
                            color = ColorUtility.ToHtmlStringRGBA(go.GetComponent<Renderer>().material.color),
                            lightType = go.GetComponent<Light>()?.type.ToString(),
                            lightRange = go.GetComponent<Light>()?.range ?? 0,
                            lightIntensity = go.GetComponent<Light>()?.intensity ?? 0,
                            animation = go.GetComponent<Animation>()?.clip?.name,
                            prefab = PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(go),
                            background = go.GetComponent<RawImage>()?.texture.name
                        }
                    };

                    return JsonConvert.SerializeObject(resultJson);
                }
                else
                {
                    UnityEngine.Debug.LogError($"GameObject with name: '{cmd.parameters.name}' not found.");
                }
            }
            if(cmd.action == "get-all-gameobjects")
            {
                return BuildSceneHierarchyJson();
            }


            if (cmd.action == "gameobject-create")
            {
                go = GameObject.CreatePrimitive(pt);
            }
            else if (cmd.action == "gameobject-update" || cmd.action == "gameobject-destroy")
            {
                go = FindGO(cmd);
            }

            if (go == null)
            {
                UnityEngine.Debug.LogError($"GameObject with name: '{cmd.parameters.name}' not found.");
                return result;
            }

            if (cmd.action == "gameobject-destroy")
            {
                GameObject.DestroyImmediate(go);
                UnityEngine.Debug.LogError($"GameObject {go.name} deleted.");
                return result;
            }

            

            // created or changed object
            if (cmd.parameters.position != null && cmd.parameters.position.Length == 3)
            {
                go.transform.position = new Vector3(cmd.parameters.position[0], cmd.parameters.position[1], cmd.parameters.position[2]);
            }
            if (cmd.parameters.rotation != null && cmd.parameters.rotation.Length == 3)
            {
                go.transform.rotation = Quaternion.Euler(cmd.parameters.rotation[0], cmd.parameters.rotation[1], cmd.parameters.rotation[2]);
            }
            if(cmd.parameters.scale != null && cmd.parameters.scale.Length == 3)
            {
                go.transform.localScale = new Vector3(cmd.parameters.scale[0], cmd.parameters.scale[1], cmd.parameters.scale[2]);
            }
            if (cmd.parameters.animation != null)
            {
                var clip = new AnimationClip { name = cmd.parameters.animation, legacy = true };
                var curve = AnimationCurve.Linear(0, 0, 5, 360);
                clip.SetCurve("", typeof(Transform), "localEulerAngles.y", curve);
                var anim = go.GetComponent<Animation>() ?? go.AddComponent<Animation>();
                anim.AddClip(clip, clip.name);
                anim.Play(clip.name);
            }
            if (cmd.parameters.material != null)
            {
                var mat = AssetDatabase.LoadAssetAtPath<Material>($"Assets/Materials/{cmd.parameters.material}.mat");
                if (mat != null)
                {
                    go.GetComponent<Renderer>().material = mat;
                }
                else
                {
                    UnityEngine.Debug.LogError($"Material {cmd.parameters.material} not found.");
                }
            }
            if (cmd.parameters.texture != null)
            {
                var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(cmd.parameters.texture);
                if (tex != null)
                {
                    var rawImage = go.GetComponent<RawImage>();
                    if (rawImage != null)
                    {
                        rawImage.texture = tex;
                    }
                    else
                    {
                        UnityEngine.Debug.LogError($"RawImage component not found on {go.name}.");
                    }
                }
                else
                {
                    UnityEngine.Debug.LogError($"Texture {cmd.parameters.texture} not found.");
                }
            }
            if (cmd.parameters.color != null)
            {
                var color = ColorUtility.TryParseHtmlString(cmd.parameters.color, out var parsedColor);
                if (color)
                {
                    go.GetComponent<Renderer>().material.color = parsedColor;
                }
                else
                {
                    UnityEngine.Debug.LogError($"Color {cmd.parameters.color} not found.");
                }
            }
            if (cmd.parameters.lightType != null)
            {
                var lightGO = new GameObject("Point Light");
                var lightComp = lightGO.AddComponent<Light>();
                if (Enum.TryParse(cmd.parameters.lightType, out LightType lightType))
                {
                    lightComp.type = lightType;
                }
                else
                {
                    UnityEngine.Debug.LogError($"Light type {cmd.parameters.lightType} not found.");
                }
                lightComp.range = cmd.parameters.lightRange;
                lightComp.intensity = cmd.parameters.lightIntensity;
            }
            if (cmd.parameters.skybox != null)
            {
                var mat = AssetDatabase.LoadAssetAtPath<Material>($"Assets/Materials/{cmd.parameters.skybox}.mat");
                if (mat != null)
                {
                    RenderSettings.skybox = mat;
                    DynamicGI.UpdateEnvironment();
                }
                else
                {
                    UnityEngine.Debug.LogError($"Skybox material: '{cmd.parameters.skybox}' not found.");
                }
            }
            if (cmd.parameters.background != null)
            {
                var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(cmd.parameters.background);
                if (tex != null)
                {
                    var canvas = UnityEngine.Object.FindFirstObjectByType<Canvas>()
                                    ?? new GameObject("Canvas", typeof(Canvas)).GetComponent<Canvas>();
                    var bgGO = new GameObject("Background", typeof(RawImage));
                    bgGO.transform.SetParent(canvas.transform, false);
                    var ri = bgGO.GetComponent<RawImage>();
                    ri.texture = tex;
                    ri.rectTransform.anchorMin = Vector2.zero;
                    ri.rectTransform.anchorMax = Vector2.one;
                    ri.rectTransform.offsetMin = ri.rectTransform.offsetMax = Vector2.zero;
                }
                else
                {
                    UnityEngine.Debug.LogError($"Background texture {cmd.parameters.background} not found.");
                }
            }
            if (cmd.parameters.prefab != null)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(cmd.parameters.prefab);
                if (prefab != null)
                {
                    PrefabUtility.InstantiatePrefab(prefab);
                }
                else
                {
                    UnityEngine.Debug.LogError($"Prefab {cmd.parameters.prefab} not found.");
                }
            }
            if (cmd.parameters.scene != null)
            {
                var scene = UnityEditor.SceneManagement.EditorSceneManager.GetSceneByName(cmd.parameters.scene);
                if (scene.IsValid())
                {
                    UnityEditor.SceneManagement.EditorSceneManager.OpenScene(scene.path);
                }
                else
                {
                    UnityEngine.Debug.LogError($"Scene {cmd.parameters.scene} not found.");
                }
            }
            if (cmd.parameters.tag != null)
            {
                go.tag = cmd.parameters.tag;
            }
            if (cmd.parameters.layer != null)
            {
                go.layer = LayerMask.NameToLayer(cmd.parameters.layer);
            }
            if (cmd.parameters.name != null)
            {
                go.name = cmd.parameters.name;
            }
            if (cmd.parameters.path != null)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(cmd.parameters.path);
                if (prefab != null)
                {
                    PrefabUtility.InstantiatePrefab(prefab);
                }
                else
                {
                    UnityEngine.Debug.LogError($"Prefab at path {cmd.parameters.path} not found.");
                }
            }
        }

        return result;
    }
    /// <summary>
    /// Finds a GameObject by name, path, tag, or layer.
    /// </summary>
    /// <param name="cmd"></param>
    /// <returns></returns>
    private static GameObject FindGO(MCPCommand cmd)
    {
        GameObject go = null;
        if (cmd.parameters.scene != null && cmd.parameters.scene.Trim() != "")
        {
            var scene = UnityEditor.SceneManagement.EditorSceneManager.GetSceneByName(cmd.parameters.scene);
            if (scene.IsValid())
            {
                go = GameObject.Find(cmd.parameters.name);
            }
            else
            {
                UnityEngine.Debug.LogError($"Scene {cmd.parameters.scene} not found.");
            }
        }
        else if (cmd.parameters.name != null && cmd.parameters.name.Trim() != "")
        {
            go = GameObject.Find(cmd.parameters.name);
        }
        else if (cmd.parameters.path != null && cmd.parameters.path.Trim() != "")
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(cmd.parameters.path);
            if (prefab != null)
            {
                go = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            }
            else
            {
                UnityEngine.Debug.LogError($"Prefab at path {cmd.parameters.path} not found.");
            }
        }
        else if (cmd.parameters.tag != null && cmd.parameters.tag.Trim() != "")
        {
            go = GameObject.FindGameObjectWithTag(cmd.parameters.tag);
        }
        else if (cmd.parameters.layer != null && cmd.parameters.layer.Trim() != "")
        {
            go = GameObject.Find(cmd.parameters.layer);
        }
        else
        {
            UnityEngine.Debug.LogError("No name or path provided for the object.");
        }

        return go;
    }


    [System.Serializable]
    public class SceneObject
    {
        public string name;
        public string tag;
        public List<SceneObject> children = new List<SceneObject>();
    }

    [System.Serializable]
    public class SceneData
    {
        public string sceneName;
        public List<SceneObject> objects;
    }

    [System.Serializable]
    public class ScenesWrapper
    {
        public List<SceneData> scenes;
    }
    public static string BuildSceneHierarchyJson()
    {
        var allScenesData = new List<SceneData>();

        // Get the list of all loaded scenes
        if (Application.isPlaying)
        {
            int sceneCount = UnityEngine.SceneManagement.SceneManager.sceneCount;
            //UnityEngine.Debug.Log(">> Application.isPlaying, sceneCount: " + sceneCount);
            for (int i = 0; i < sceneCount; i++)
            {
                var scene = UnityEngine.SceneManagement.SceneManager.GetSceneAt(i);
                var roots = scene.GetRootGameObjects();
                var list = new List<SceneObject>();
                foreach (var go in roots)
                    list.Add(BuildRecursive(go));

                allScenesData.Add(new SceneData
                {
                    sceneName = scene.name,
                    objects = list
                });
            }
        }
        else
        {

            // Get the list of all enabled scenes in Build Settings
            var scenePaths = UnityEditor.EditorBuildSettings.scenes
                                .Where(s => s.enabled)
                                .Select(s => s.path);

            //UnityEngine.Debug.Log(">> Application.isPlaying==false, sceneCount: " + scenePaths.Count().ToString());

            foreach (var path in scenePaths)
            {
                // Replace the following line:  
                // UnityEngine.SceneManagement.Scene scene = null;  

                // With this corrected line:  
                UnityEngine.SceneManagement.Scene scene = default;
                // If the scene is already loaded, use it
                if (UnityEditor.SceneManagement.EditorSceneManager.GetSceneByPath(path).isLoaded)
                    scene = UnityEditor.SceneManagement.EditorSceneManager.GetSceneByPath(path);
                else
                    scene = UnityEditor.SceneManagement.EditorSceneManager.OpenScene(
                                path,
                                UnityEditor.SceneManagement.OpenSceneMode.Additive);

                if (scene != default)
                {
                    //UnityEngine.Debug.Log(">> scene: " + scene.name.ToString());

                    var roots = scene.GetRootGameObjects();
                    //UnityEngine.Debug.Log(">> roots count: " + roots.Length);

                    var list = new List<SceneObject>();
                    foreach (var go in roots)
                    {
                        list.Add(BuildRecursive(go));
                    }
                    //UnityEngine.Debug.Log(">> list count: " + list.Count);
                    allScenesData.Add(new SceneData
                    {
                        sceneName = System.IO.Path.GetFileNameWithoutExtension(path),
                        objects = list
                    });
                    // If more than 1 scene is loaded, close the additive scene
                    if (SceneManager.loadedSceneCount > 1)
                    {
                        UnityEditor.SceneManagement.EditorSceneManager.CloseScene(scene, true);
                    }
                }
                else
                {
                    UnityEngine.Debug.LogError($"Scene at path {path} could not be loaded.");
                }
            }
        }
        // Get the list of all loaded scenes
        var wrapper = new { scenes = allScenesData };
        //UnityEngine.Debug.Log(">> wrapper: " + wrapper);
        var json = Newtonsoft.Json.JsonConvert.SerializeObject(
            wrapper,
            Newtonsoft.Json.Formatting.Indented,
            new Newtonsoft.Json.JsonSerializerSettings
            {
                NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore
            }
        );
        return json;
    }
    /// <summary>
    /// Builds a recursive hierarchy of SceneObjects from a GameObject.
    /// </summary>
    /// <param name="go"></param>
    /// <returns></returns>
    private static SceneObject BuildRecursive(GameObject go)
    {
        var node = new SceneObject { name = go.name, tag = go.tag };
        foreach (Transform child in go.transform)
        {
            if (child != null && child.childCount > 0)
            {
                node.children.Add(BuildRecursive(child.gameObject));
            }
        }
        return node;
    }

    public static async Task KillProcessOnPort(int port)
    {
        Console.WriteLine($"Attempting to find and kill process on port {port}...");
        string command = $"netstat -ano | findstr :{port}";

        ProcessStartInfo psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c {command}",
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            using (Process process = Process.Start(psi))
            {
                if (process == null)
                {
                    Console.WriteLine("Failed to start netstat process.");
                    return;
                }

                string output = await Task.Run(() => process.StandardOutput.ReadToEnd()); // Replace WaitForExitAsync with Task-based workaround
                process.WaitForExit(); // Use synchronous WaitForExit instead

                if (string.IsNullOrWhiteSpace(output))
                {
                    Console.WriteLine($"No process found listening on port {port}.");
                    return;
                }

                // Extract PID from netstat output
                Match match = Regex.Match(output, @".*\s+(\d+)\s*$");
                if (match.Success)
                {
                    int pid = int.Parse(match.Groups[1].Value);
                    Console.WriteLine($"Found process with PID {pid} listening on port {port}.");
                    KillProcess(pid);
                }
                else
                {
                    Console.WriteLine($"Could not parse netstat output for port {port}. Output:\n{output}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred while trying to find process on port {port}: {ex.Message}");
        }
    }


    // Kills a process by its PID.
    private static void KillProcess(int pid)
    {
        try
        {
            Process processToKill = Process.GetProcessById(pid);
            if (processToKill != null && !processToKill.HasExited)
            {
                Console.WriteLine($"Killing process {processToKill.ProcessName} (PID: {pid})...");
                processToKill.Kill();
                Console.WriteLine($"Process {pid} killed successfully.");
            }
            else
            {
                Console.WriteLine($"Process with PID {pid} not found or already exited.");
            }
        }
        catch (ArgumentException)
        {
            Console.WriteLine($"No process with PID {pid} found.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred while trying to kill process {pid}: {ex.Message}");
        }
    }
}
