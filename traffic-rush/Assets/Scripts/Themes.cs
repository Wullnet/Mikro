using UnityEngine;

namespace TrafficRush
{
    public enum Decor { Trees, Mountain, City }

    /// <summary>Një hartë: ngjyrat e qiellit/rrugës, drita dhe dekori anash rrugës.</summary>
    public class Theme
    {
        public string Name;
        public int UnlockAt;          // rekordi (m) që e hap hartën
        public Color Sky, Ambient, SunColor;
        public float SunIntensity, FogStart, FogEnd;
        public Color Asphalt, Grass, Line;
        public Decor Decor;
    }

    /// <summary>Hartat e lojës dhe zgjedhja e ruajtur (PlayerPrefs).</summary>
    public static class Themes
    {
        const string SelectedKey = "tr_theme";

        public static readonly Theme[] All =
        {
            new Theme
            {
                Name = "Tiranë – Durrës", UnlockAt = 0, Decor = Decor.Trees,
                Sky = new Color(0.55f, 0.78f, 0.95f), Ambient = new Color(0.6f, 0.62f, 0.65f),
                SunColor = new Color(1f, 0.96f, 0.88f), SunIntensity = 1.1f, FogStart = 70f, FogEnd = 170f,
                Asphalt = new Color(0.22f, 0.22f, 0.24f), Grass = new Color(0.32f, 0.6f, 0.25f), Line = new Color(0.95f, 0.95f, 0.9f),
            },
            new Theme
            {
                Name = "Llogara", UnlockAt = 1500, Decor = Decor.Mountain,
                Sky = new Color(0.62f, 0.74f, 0.82f), Ambient = new Color(0.5f, 0.54f, 0.56f),
                SunColor = new Color(1f, 0.92f, 0.8f), SunIntensity = 1f, FogStart = 50f, FogEnd = 150f,
                Asphalt = new Color(0.2f, 0.2f, 0.21f), Grass = new Color(0.18f, 0.38f, 0.16f), Line = new Color(0.95f, 0.9f, 0.6f),
            },
            new Theme
            {
                Name = "Prishtinë natën", UnlockAt = 3000, Decor = Decor.City,
                Sky = new Color(0.03f, 0.05f, 0.12f), Ambient = new Color(0.2f, 0.22f, 0.32f),
                SunColor = new Color(0.55f, 0.65f, 1f), SunIntensity = 0.25f, FogStart = 35f, FogEnd = 140f,
                Asphalt = new Color(0.13f, 0.13f, 0.16f), Grass = new Color(0.08f, 0.12f, 0.1f), Line = new Color(0.8f, 0.8f, 0.75f),
            },
        };

        public static bool IsUnlocked(int index) => SaveSystem.Best >= All[index].UnlockAt;

        /// <summary>Harta e zgjedhur; nëse s'është më e hapur (p.sh. u fshinë të dhënat), kthehet te e para.</summary>
        public static int Selected
        {
            get
            {
                int i = Mathf.Clamp(PlayerPrefs.GetInt(SelectedKey, 0), 0, All.Length - 1);
                return IsUnlocked(i) ? i : 0;
            }
            set { PlayerPrefs.SetInt(SelectedKey, value); PlayerPrefs.Save(); }
        }

        public static int UnlockedCount()
        {
            int n = 0;
            for (int i = 0; i < All.Length; i++) if (IsUnlocked(i)) n++;
            return n;
        }

        /// <summary>Vendos qiellin, mjegullën dhe dritën për hartën.</summary>
        public static void Apply(Theme t, Camera cam, Light sun)
        {
            if (cam != null) cam.backgroundColor = t.Sky;
            RenderSettings.fog = true;
            RenderSettings.fogColor = t.Sky;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = t.FogStart;
            RenderSettings.fogEndDistance = t.FogEnd;
            // Flat: përndryshe skybox-i i skenës ndriçon edhe natën.
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = t.Ambient;
            if (sun != null)
            {
                sun.color = t.SunColor;
                sun.intensity = t.SunIntensity;
            }
        }
    }
}
