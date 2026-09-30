using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace TrafficRush.EditorTools
{
    /// <summary>
    /// Build-e për publikim (lokalisht nga menuja ose në CI me game-ci/unity-builder):
    ///   Unity -batchmode -quit -projectPath traffic-rush -buildTarget Android
    ///         -executeMethod TrafficRush.EditorTools.BuildScript.BuildAndroid
    ///
    /// Android: AAB, IL2CPP, ARM64 → Builds/Android/TrafficRush.aab
    ///   Nënshkrimi lexohet nga env TR_KEYSTORE_PATH, TR_KEYSTORE_PASS, TR_KEY_ALIAS, TR_KEY_PASS
    ///   (ose nga argumentet e game-ci: -androidKeystoreName, -androidKeystorePass, -androidKeyaliasName, -androidKeyaliasPass).
    /// iOS: projekt Xcode → Builds/iOS
    /// Versioni: -androidVersionCode N (game-ci) ose env TR_BUILD_NUMBER; -buildVersion x.y.z ose env TR_VERSION.
    /// </summary>
    public static class BuildScript
    {
        const string AndroidOutput = "Builds/Android/TrafficRush.aab";
        const string IOSOutput = "Builds/iOS";
        const string IconPath = "Assets/Art/Icon/icon-1024.png";
        const string AdaptiveForegroundPath = "Assets/Art/Icon/icon-foreground-432.png";
        const string AdaptiveBackgroundPath = "Assets/Art/Icon/icon-background-432.png";
        const string GameScenePath = "Assets/Scenes/Game.unity";

        // ---------------------------------------------------------------- menu

        [MenuItem("Traffic Rush/Build/Android (AAB)")]
        public static void BuildAndroidMenu() => BuildAndroid();

        [MenuItem("Traffic Rush/Build/iOS (Xcode)")]
        public static void BuildIOSMenu() => BuildIOS();

        [MenuItem("Traffic Rush/Build/Apply App Icons")]
        public static void ApplyIconsMenu() => ApplyIcons();

        // ------------------------------------------------------------- targets

        public static void BuildAndroid()
        {
            try
            {
                PrepareCommon();

                PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
                PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
                EditorUserBuildSettings.buildAppBundle = true;

                int code = BuildNumber();
                if (code > 0) PlayerSettings.Android.bundleVersionCode = code;

                ConfigureAndroidSigning();

                Build(new BuildPlayerOptions
                {
                    scenes = Scenes(),
                    locationPathName = AndroidOutput,
                    target = BuildTarget.Android,
                    targetGroup = BuildTargetGroup.Android,
                    options = BuildOptions.None,
                });
            }
            catch (Exception e)
            {
                Fail("Android build: " + e);
            }
        }

        public static void BuildIOS()
        {
            try
            {
                PrepareCommon();

                PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
                int code = BuildNumber();
                if (code > 0) PlayerSettings.iOS.buildNumber = code.ToString();

                Build(new BuildPlayerOptions
                {
                    scenes = Scenes(),
                    locationPathName = IOSOutput,
                    target = BuildTarget.iOS,
                    targetGroup = BuildTargetGroup.iOS,
                    options = BuildOptions.None,
                });
            }
            catch (Exception e)
            {
                Fail("iOS build: " + e);
            }
        }

        // ------------------------------------------------------------- helpers

        static void PrepareCommon()
        {
            // Në CI projekti hapet "i pastër": krijo skenën + cilësimet bazë nëse mungojnë.
            if (!File.Exists(GameScenePath) || !EditorBuildSettings.scenes.Any(s => s.enabled))
                ProjectSetup.Run();

            string version = Arg("-buildVersion") ?? Environment.GetEnvironmentVariable("TR_VERSION");
            if (!string.IsNullOrEmpty(version) && Regex.IsMatch(version, @"^\d+(\.\d+){0,3}$"))
                PlayerSettings.bundleVersion = version;

            ApplyIcons();
            AssetDatabase.SaveAssets();
        }

        static string[] Scenes()
        {
            string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            if (scenes.Length == 0) throw new InvalidOperationException("Asnjë skenë në Build Settings.");
            return scenes;
        }

        static void Build(BuildPlayerOptions options)
        {
            string dir = Path.GetDirectoryName(options.locationPathName);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            Debug.Log($"Traffic Rush: building {options.target} v{PlayerSettings.bundleVersion} → {options.locationPathName}");
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"Traffic Rush: build OK ({summary.totalSize / (1024 * 1024)} MB, {summary.totalTime}) → {summary.outputPath}");
                return;
            }
            Fail($"build {options.target} dështoi: {summary.result}, {summary.totalErrors} gabime.");
        }

        static void ConfigureAndroidSigning()
        {
            string path = Env("TR_KEYSTORE_PATH") ?? Arg("-androidKeystoreName");
            string storePass = Env("TR_KEYSTORE_PASS") ?? Arg("-androidKeystorePass");
            string alias = Env("TR_KEY_ALIAS") ?? Arg("-androidKeyaliasName");
            string keyPass = Env("TR_KEY_PASS") ?? Arg("-androidKeyaliasPass") ?? storePass;

            if (string.IsNullOrEmpty(path) || !File.Exists(path))
            {
                PlayerSettings.Android.useCustomKeystore = false;
                Debug.LogWarning("Traffic Rush: keystore mungon (TR_KEYSTORE_PATH) — AAB nënshkruhet me çelësin debug " +
                                 "dhe NUK mund të ngarkohet në Google Play.");
                return;
            }

            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = Path.GetFullPath(path);
            PlayerSettings.Android.keystorePass = storePass;
            PlayerSettings.Android.keyaliasName = alias;
            PlayerSettings.Android.keyaliasPass = keyPass;
            Debug.Log($"Traffic Rush: nënshkrim me keystore '{Path.GetFileName(path)}', alias '{alias}'.");
        }

        /// <summary>Vendos ikonën default (të gjitha platformat) + ikonën adaptive të Android nëse moduli është i instaluar.</summary>
        public static void ApplyIcons()
        {
            Texture2D icon = LoadIcon(IconPath, false);
            if (icon == null)
            {
                Debug.LogWarning("Traffic Rush: " + IconPath + " nuk u gjet — ikona nuk u ndryshua.");
                return;
            }
            PlayerSettings.SetIcons(NamedBuildTarget.Unknown, new[] { icon }, IconKind.Any);

            Texture2D fg = LoadIcon(AdaptiveForegroundPath, true);
            Texture2D bg = LoadIcon(AdaptiveBackgroundPath, false);
            if (fg == null || bg == null) return;

            // Llojet e ikonave të Android vijnë nga moduli Android; pa të lista është bosh.
            // Ikona adaptive është i vetmi lloj me 2 shtresa (0 = background, 1 = foreground).
            try
            {
                foreach (PlatformIconKind kind in PlayerSettings.GetSupportedIconKinds(NamedBuildTarget.Android))
                {
                    PlatformIcon[] icons = PlayerSettings.GetPlatformIcons(NamedBuildTarget.Android, kind);
                    if (icons.Length == 0 || icons[0].maxLayerCount < 2) continue;
                    foreach (PlatformIcon i in icons) i.SetTextures(bg, fg);
                    PlayerSettings.SetPlatformIcons(NamedBuildTarget.Android, kind, icons);
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning("Traffic Rush: ikona adaptive nuk u vendos: " + e.Message);
            }
        }

        static Texture2D LoadIcon(string path, bool hasAlpha)
        {
            if (!File.Exists(path)) return null;
            AssetDatabase.ImportAsset(path);
            if (AssetImporter.GetAtPath(path) is TextureImporter importer)
            {
                bool dirty = importer.mipmapEnabled || importer.npotScale != TextureImporterNPOTScale.None ||
                             importer.textureCompression != TextureImporterCompression.Uncompressed ||
                             importer.alphaIsTransparency != hasAlpha;
                if (dirty)
                {
                    importer.textureType = TextureImporterType.Default;
                    importer.mipmapEnabled = false;
                    importer.npotScale = TextureImporterNPOTScale.None;
                    importer.textureCompression = TextureImporterCompression.Uncompressed;
                    importer.alphaIsTransparency = hasAlpha;
                    importer.SaveAndReimport();
                }
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        static int BuildNumber()
        {
            string s = Env("TR_BUILD_NUMBER") ?? Arg("-androidVersionCode");
            return int.TryParse(s, out int n) ? n : 0;
        }

        static string Env(string name)
        {
            string v = Environment.GetEnvironmentVariable(name);
            return string.IsNullOrEmpty(v) ? null : v;
        }

        /// <summary>Vlera pas "-name" në argumentet e komandës, ose null.</summary>
        static string Arg(string name)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == name && !string.IsNullOrEmpty(args[i + 1]) && !args[i + 1].StartsWith("-"))
                    return args[i + 1];
            return null;
        }

        static void Fail(string message)
        {
            Debug.LogError("Traffic Rush: " + message);
            if (Application.isBatchMode) EditorApplication.Exit(1);
        }
    }
}
