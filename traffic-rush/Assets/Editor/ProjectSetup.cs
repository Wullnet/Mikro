using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace TrafficRush.EditorTools
{
    /// <summary>
    /// Herën e parë që hapet projekti: krijon skenën Game, e shton te Build Settings
    /// dhe vendos cilësimet bazë për Android/iOS (emri, bundle ID, orientimi portrait).
    /// Mund të ekzekutohet edhe me dorë nga menuja "Traffic Rush → Setup Project".
    /// </summary>
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        const string ScenePath = "Assets/Scenes/Game.unity";
        const string BundleId = "com.wullnet.trafficrush";

        static ProjectSetup()
        {
            EditorApplication.delayCall += () =>
            {
                if (!File.Exists(ScenePath)) Run();
            };
        }

        [MenuItem("Traffic Rush/Setup Project")]
        public static void Run()
        {
            Directory.CreateDirectory("Assets/Scenes");

            if (!File.Exists(ScenePath))
            {
                // Kamera + drita; pjesa tjetër ndërtohet nga GameManager në runtime.
                var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, ScenePath);
                AssetDatabase.Refresh();
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            PlayerSettings.companyName = "Wullnet";
            PlayerSettings.productName = "Traffic Rush";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, BundleId);
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, BundleId);
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;

            // Google Play kërkon ARM64 dhe IL2CPP.
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

            EditorSceneManager.OpenScene(ScenePath);
            Debug.Log("Traffic Rush: projekti u konfigurua. Shtyp Play për të luajtur.");
        }
    }
}
