using UnityEngine;

namespace TrafficRush
{
    /// <summary>
    /// UI e prototipit me IMGUI (OnGUI): s'kërkon Canvas apo prefab-e. Gjithçka vizatohet
    /// në një ekran virtual 720 px të gjerë dhe shkallëzohet për çdo telefon.
    /// Në fazën e art-it mund të zëvendësohet me uGUI / UI Toolkit.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        const float RefWidth = 720f, RefHeight = 1280f;

        GUIStyle title, label, button, panel, hudBig, hudSmall, coinStyle, statStyle, shadow;
        Texture2D panelTex, buttonTex, buttonPressedTex, barBgTex, barFillTex;
        float scale, W, H, safeTop, safeBottom;
        string toast;
        float toastUntil;

        GameManager Game => GameManager.Instance;

        void OnGUI()
        {
            if (Game == null) return;
            EnsureStyles();

            scale = Mathf.Min(Screen.width / RefWidth, Screen.height / RefHeight);
            W = Screen.width / scale;
            H = Screen.height / scale;
            Rect safe = Screen.safeArea;
            safeTop = (Screen.height - safe.yMax) / scale;
            safeBottom = safe.yMin / scale;
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(scale, scale, 1f));

            switch (Game.State)
            {
                case GameState.Menu: DrawMenu(); break;
                case GameState.Garage: DrawGarage(); break;
                case GameState.Playing: DrawHud(); break;
                case GameState.Paused: DrawHud(); DrawPause(); break;
                case GameState.GameOver: DrawGameOver(); break;
            }

            if (toast != null && Time.unscaledTime < toastUntil)
                Text(new Rect(40, H - safeBottom - 520, W - 80, 60), toast, label);
        }

        // ---------- Ekranet ----------

        void DrawMenu()
        {
            DrawCoins();
            Text(new Rect(0, safeTop + 160, W, 110), "TRAFFIC RUSH", title);
            Text(new Rect(0, safeTop + 270, W, 50), "Autostrada Tiranë – Durrës", label);
            Text(new Rect(0, safeTop + 330, W, 50), "Rekordi: " + SaveSystem.Best + " m", label);

            float y = H - safeBottom - 360;
            if (Button(y, "LUAJ")) Game.StartRun();
            if (Button(y + 130, "GARAZHI")) Game.OpenGarage();
        }

        void DrawGarage()
        {
            DrawCoins();
            int i = Game.GarageIndex;
            CarDef car = CarCatalog.Cars[i];
            bool unlocked = SaveSystem.IsUnlocked(i);
            bool selected = i == SaveSystem.SelectedCar;

            Text(new Rect(0, safeTop + 130, W, 60), "GARAZHI  " + (i + 1) + "/" + CarCatalog.Cars.Length, label);
            Text(new Rect(0, safeTop + 190, W, 100), car.Name, title);

            float barY = H - safeBottom - 620;
            Stat(barY, "Shpejtësia maks.", Mathf.RoundToInt(car.TopSpeed * 3.6f) + " km/h", car.TopSpeed / 52f);
            Stat(barY + 80, "Manovrimi", "", car.Handling / 16f);

            float mid = H * 0.5f - 60;
            if (GUI.Button(new Rect(20, mid, 110, 120), "<", button)) Game.BrowseGarage(-1);
            if (GUI.Button(new Rect(W - 130, mid, 110, 120), ">", button)) Game.BrowseGarage(1);

            float y = H - safeBottom - 360;
            string action = selected ? "E ZGJEDHUR" : unlocked ? "ZGJIDH" : "BLEJ  " + car.Price;
            GUI.enabled = !selected;
            if (Button(y, action) && !Game.SelectOrBuy())
                Toast("S'ke monedha të mjaftueshme");
            GUI.enabled = true;
            if (Button(y + 130, "KTHEHU")) Game.CloseGarage();
        }

        void DrawHud()
        {
            var p = Game.Player;
            Text(new Rect(30, safeTop + 30, 400, 70), Game.Score + " m", hudBig);
            Text(new Rect(30, safeTop + 100, 400, 50), Mathf.RoundToInt(p.Speed * 3.6f) + " km/h", hudSmall);
            Text(new Rect(W - 330, safeTop + 30, 180, 70), "● " + Game.RunCoins, coinStyle);

            if (Game.State == GameState.Playing &&
                GUI.Button(new Rect(W - 130, safeTop + 25, 100, 90), "II", button))
                Game.SetPaused(true);

            if (p.Distance < 60f)
                Text(new Rect(0, H * 0.62f, W, 60), "Rrëshqit majtas / djathtas", label);
        }

        void DrawPause()
        {
            GUI.Box(new Rect(60, H * 0.3f, W - 120, 440), GUIContent.none, panel);
            Text(new Rect(0, H * 0.3f + 40, W, 90), "PAUZË", title);
            if (Button(H * 0.3f + 170, "VAZHDO")) Game.SetPaused(false);
            if (Button(H * 0.3f + 300, "MENUJA")) Game.GoToMenu();
        }

        void DrawGameOver()
        {
            float top = H * 0.18f;
            GUI.Box(new Rect(60, top, W - 120, 860), GUIContent.none, panel);
            Text(new Rect(0, top + 40, W, 90), "U PËRPLASE!", title);
            Text(new Rect(0, top + 150, W, 60), "Distanca: " + Game.Score + " m", label);
            Text(new Rect(0, top + 210, W, 60),
                Game.NewBest ? "Rekord i ri!" : "Rekordi: " + SaveSystem.Best + " m", label);
            Text(new Rect(0, top + 270, W, 60), "+" + Game.RunCoins + " monedha", label);

            float y = top + 390;
            if (!Game.ContinueUsed)
            {
                if (Button(y, "VAZHDO (reklamë)")) Game.ContinueWithAd();
                y += 130;
            }
            if (Button(y, "RILUAJ")) Game.StartRun();
            if (Button(y + 130, "MENUJA")) Game.GoToMenu();
        }

        // ---------- Ndihmës ----------

        void DrawCoins()
        {
            Text(new Rect(W - 330, safeTop + 30, 300, 70), "● " + SaveSystem.Coins, coinStyle);
        }

        bool Button(float y, string text)
        {
            return GUI.Button(new Rect((W - 480) / 2, y, 480, 110), text, button);
        }

        void Stat(float y, string name, string value, float fill)
        {
            float x = (W - 480) / 2;
            Text(new Rect(x, y, 480, 40), name + (value.Length > 0 ? "  " + value : ""), statStyle);
            GUI.DrawTexture(new Rect(x, y + 42, 480, 18), barBgTex);
            GUI.DrawTexture(new Rect(x, y + 42, 480 * Mathf.Clamp01(fill), 18), barFillTex);
        }

        void Toast(string message)
        {
            toast = message;
            toastUntil = Time.unscaledTime + 2f;
        }

        /// <summary>Tekst me hije të lehtë, që lexohet mbi qiell dhe rrugë.</summary>
        void Text(Rect r, string text, GUIStyle style)
        {
            shadow.font = style.font;
            shadow.fontSize = style.fontSize;
            shadow.fontStyle = style.fontStyle;
            shadow.alignment = style.alignment;
            GUI.Label(new Rect(r.x + 3, r.y + 3, r.width, r.height), text, shadow);
            GUI.Label(r, text, style);
        }

        void EnsureStyles()
        {
            if (title != null) return;

            panelTex = Solid(new Color(0.05f, 0.07f, 0.12f, 0.85f));
            buttonTex = Solid(new Color(0.95f, 0.3f, 0.15f));
            buttonPressedTex = Solid(new Color(0.75f, 0.2f, 0.1f));
            barBgTex = Solid(new Color(1f, 1f, 1f, 0.25f));
            barFillTex = Solid(new Color(1f, 0.8f, 0.1f));

            title = new GUIStyle(GUI.skin.label)
            {
                fontSize = 84, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.white },
            };
            label = new GUIStyle(title) { fontSize = 36, fontStyle = FontStyle.Normal };
            hudBig = new GUIStyle(title) { fontSize = 56, alignment = TextAnchor.MiddleLeft };
            hudSmall = new GUIStyle(label) { fontSize = 32, alignment = TextAnchor.MiddleLeft };
            coinStyle = new GUIStyle(title) { fontSize = 48, alignment = TextAnchor.MiddleRight };
            statStyle = new GUIStyle(label) { fontSize = 28, alignment = TextAnchor.MiddleLeft };
            shadow = new GUIStyle(label) { normal = { textColor = new Color(0f, 0f, 0f, 0.55f) } };

            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 44, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter,
                normal = { background = buttonTex, textColor = Color.white },
                hover = { background = buttonTex, textColor = Color.white },
                active = { background = buttonPressedTex, textColor = Color.white },
                focused = { background = buttonTex, textColor = Color.white },
            };
            panel = new GUIStyle(GUI.skin.box) { normal = { background = panelTex } };
        }

        static Texture2D Solid(Color c)
        {
            var t = new Texture2D(1, 1);
            t.SetPixel(0, 0, c);
            t.Apply();
            return t;
        }
    }
}
