using UnityEditor;
using UnityEngine;
using System.Collections.Generic;
using UnityEngine.SceneManagement;
using System.IO;
using System.Linq;
using UnityEditor.SearchService;
using NUnit.Framework;
using Newtonsoft.Json;
public class ToolsExtensionWindow : EditorWindow
{
    private Vector2 jsonScrollPos;

    private string sceneJson = "";  
    private enum Tab { Server, Settings, Help }
    private Tab currentTab = Tab.Server;

    // Server tab state
    private bool isServerRunning = false;
    private string serverStatus => isServerRunning ? "Server online" : "Server offline";
    private Color statusColor => isServerRunning ? Color.green : Color.red;
    private string configText = "# Default Configuration\nport: 8090";
    private int port = 8090;

    // Settings tab data
    [System.Serializable]
    public class SettingItem { public string name; public string description; public string value; }
    private List<SettingItem> settings = new List<SettingItem>() {
        new SettingItem { name = "MaxConnections", description = "Maximum simultaneous connections.", value = "10" },
        new SettingItem { name = "Timeout", description = "Connection timeout (sec).", value = "30" }
    };

    // Help tab info
    private string authorInfo = "Author: GlebBrain\nEmail: glebrain@gmail.com";
    private Vector2 scrollPos;

    [MenuItem("Tools/Custom Tools Window")]
    public static void ShowWindow()
    {
        var window = GetWindow<ToolsExtensionWindow>("Tools Extension");
        window.minSize = new Vector2(400, 300);
    }

    private void OnGUI()
    {
        DrawToolbar();
        EditorGUILayout.Space();
        scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
        switch (currentTab)
        {
            case Tab.Server: DrawServerTab(); break;
            case Tab.Settings: DrawSettingsTab(); break;
            case Tab.Help: DrawHelpTab(); break;
        }
        EditorGUILayout.EndScrollView();
    }

    private void DrawToolbar()
    {
        var names = System.Enum.GetNames(typeof(Tab));
        currentTab = (Tab)GUILayout.Toolbar((int)currentTab, names);
    }

    private void DrawServerTab()
    {
        GUILayout.Label("Server Control", EditorStyles.boldLabel);

        EditorGUILayout.BeginHorizontal();
        if (GUILayout.Button("Start Server", GUILayout.Width(100))) { StartServer(); }
        if (GUILayout.Button("Stop Server", GUILayout.Width(100))) { StopServer(); }
        EditorGUILayout.EndHorizontal();

        EditorGUILayout.Space();
        EditorGUILayout.BeginHorizontal();
        GUILayout.Label("Status:", GUILayout.Width(50));
        var prev = GUI.color;
        GUI.color = statusColor;
        GUILayout.Label(serverStatus);
        GUI.color = prev;
        EditorGUILayout.EndHorizontal();

        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Port:", GUILayout.Width(50));
        port = EditorGUILayout.IntField(port);

        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Configuration:");
        configText = EditorGUILayout.TextArea(configText, GUILayout.Height(100));

        EditorGUILayout.Space();
        EditorGUILayout.BeginHorizontal();
        if (GUILayout.Button("Configure Cursor IDE")) { configText = "# Config Cursor IDE\nhost: localhost\nport: " + port; }
        if (GUILayout.Button("Configure Claude Desktop")) { configText = "# Config Claude Desktop\nhost: 127.0.0.1\nport: " + port; }
        EditorGUILayout.EndHorizontal();

        // --- 2. Button and Json Field ---
        if (GUILayout.Button("Get objects from scene"))
        {
            sceneJson = MCPServer.BuildSceneHierarchyJson();
            Debug.Log(">> BuildSceneHierarchyJson() called");
        }
        EditorGUILayout.BeginHorizontal();
        // 2. Buttons for copying JSON to clipboard
        if (GUILayout.Button("Copy pretty JSON to Clipboard"))
        {
            // Write to the system clipboard
            UnityEditor.EditorGUIUtility.systemCopyBuffer = sceneJson;
            Debug.Log("Scene JSON copied to clipboard!");
        }
        
        if (GUILayout.Button("Copy JSON to Clipboard"))
        {
            // Write to the system clipboard

            /*
            sceneJson = sceneJson
               .Replace("\"children\": []", "")
               .Replace("\"tag\": \"Untagged\",", "");
            */
            var obj = JsonConvert.DeserializeObject(sceneJson);
            // serialize back without indents (Formatting.None)
            string textJson = JsonConvert.SerializeObject(obj, Formatting.None);
            textJson = textJson
                .Replace(",\"children\":[]", "")
                .Replace(",\"tag\":\"Untagged\"", "");

            UnityEditor.EditorGUIUtility.systemCopyBuffer = textJson;
            Debug.Log("Scene JSON copied to clipboard!");
        }
        EditorGUILayout.EndHorizontal();


        EditorGUILayout.LabelField("Scene JSON:", EditorStyles.boldLabel);
        // In the OnGUI() method or wherever you want to draw:
        EditorGUILayout.BeginVertical(GUI.skin.box);
        // large text block with scrolling
        // 3. Scrollable text field
        jsonScrollPos = EditorGUILayout.BeginScrollView(
            jsonScrollPos,
            GUILayout.Height(200)
        );
        sceneJson = EditorGUILayout.TextArea(
            sceneJson,
            GUILayout.ExpandHeight(true)
        );
        EditorGUILayout.EndScrollView();
        EditorGUILayout.EndVertical();
        EditorGUILayout.Space();
    }

    private void DrawSettingsTab()
    {
        GUILayout.Label("Settings", EditorStyles.boldLabel);
        foreach (var item in settings)
        {
            EditorGUILayout.BeginVertical("box");
            EditorGUILayout.LabelField(item.name, EditorStyles.boldLabel);
            EditorGUILayout.LabelField(item.description, EditorStyles.wordWrappedLabel);
            item.value = EditorGUILayout.TextField("Value", item.value);
            EditorGUILayout.EndVertical();
            EditorGUILayout.Space();
        }
    }

    private void DrawHelpTab()
    {
        GUILayout.Label("Help & Info", EditorStyles.boldLabel);
        EditorGUILayout.LabelField(authorInfo, EditorStyles.wordWrappedLabel);
        EditorGUILayout.Space();
        EditorGUILayout.BeginHorizontal();
        if (GUILayout.Button("GitHub")) { Application.OpenURL("https://github.com/glebbrain/aiagent"); }
        if (GUILayout.Button("X (Twitter)")) { Application.OpenURL("https://x.com/glebbrain"); }
        EditorGUILayout.EndHorizontal();
    }

    private void StartServer() {
        isServerRunning = MCPServer.RunServer();
    }
    private void StopServer() {
        MCPServer.StopServer();
        isServerRunning = false;
    }
}
