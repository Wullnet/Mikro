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
        static readonly string NearMissText = "NEAR MISS! +" + GameConfig.NearMissBonus;

        GUIStyle title, label, small, highlight, button, buttonSmall, buttonOff, panel, badge, card, popup,
            hudBig, hudSmall, coinStyle, statStyle, shadow;
        Texture2D panelTex, buttonTex, buttonPressedTex, buttonOffTex, barBgTex, barFillTex, badgeTex, slashTex;
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
                case GameState.Missions: DrawMissions(); break;
                case GameState.Shop: DrawShop(); break;
                case GameState.Playing: DrawHud(); break;
                case GameState.Paused: DrawHud(); DrawPause(); break;
                case GameState.GameOver: DrawGameOver(); break;
            }

            if (toast != null && Time.unscaledTime < toastUntil)
            {
                var r = new Rect(60, H - safeBottom - 520, W - 120, 70);
                GUI.Box(r, GUIContent.none, panel);
                Text(r, toast, label);
            }
        }

        // ---------- Ekranet ----------

        void DrawMenu()
        {
            DrawCoins();
            DrawMute();
            Text(new Rect(0, safeTop + 130, W, 110), "TRAFFIC RUSH", title);

            // Zgjedhja e hartës: < emri >
            int t = Game.ThemeIndex;
            bool unlocked = Themes.IsUnlocked(t);
            float ty = safeTop + 250;
            if (Btn(new Rect(40, ty, 100, 90), "<", button)) Game.BrowseTheme(-1);
            if (Btn(new Rect(W - 140, ty, 100, 90), ">", button)) Game.BrowseTheme(1);
            Text(new Rect(150, ty, W - 300, 55), Themes.All[t].Name, label);
            Text(new Rect(150, ty + 52, W - 300, 40),
                unlocked ? "Harta " + (t + 1) + "/" + Themes.All.Length : "Hapet me rekord " + Themes.All[t].UnlockAt + " m", small);
            Text(new Rect(0, safeTop + 360, W, 50), "Rekordi: " + SaveSystem.Best + " m", label);

            // Butonat poshtë: LUAJ, GARAZHI, pastaj MISIONET | DYQANI krah njëri-tjetrit.
            float y = H - safeBottom - 390;
            GUI.enabled = unlocked;
            if (Button(y, unlocked ? "LUAJ" : "E MBYLLUR")) Game.StartRun();
            GUI.enabled = true;
            if (Button(y + 125, "GARAZHI")) Game.OpenGarage();

            float x = (W - 480) / 2;
            var missions = new Rect(x, y + 250, 235, 110);
            if (Btn(missions, "MISIONET", buttonSmall)) Game.OpenMissions();
            if (Btn(new Rect(x + 245, y + 250, 235, 110), "DYQANI", buttonSmall)) Game.OpenShop();
            int claim = Missions.ClaimableCount();
            if (claim > 0) GUI.Label(new Rect(missions.xMax - 40, missions.y - 16, 52, 52), claim.ToString(), badge);
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
            if (Btn(new Rect(20, mid, 110, 120), "<", button)) Game.BrowseGarage(-1);
            if (Btn(new Rect(W - 130, mid, 110, 120), ">", button)) Game.BrowseGarage(1);

            float y = H - safeBottom - 360;
            string action = selected ? "E ZGJEDHUR" : unlocked ? "ZGJIDH" : "BLEJ  " + car.Price;
            GUI.enabled = !selected;
            if (Button(y, action) && !Game.SelectOrBuy())
                Toast("S'ke monedha të mjaftueshme");
            GUI.enabled = true;
            if (Button(y + 130, "KTHEHU")) Game.CloseGarage();
        }

        void DrawMissions()
        {
            DrawCoins();
            Text(new Rect(0, safeTop + 120, W, 100), "MISIONET", title);
            Text(new Rect(0, safeTop + 215, W, 45), "Misione të reja çdo ditë", small);

            var list = Missions.Today;
            float x = (W - 620) / 2;
            for (int i = 0; i < Missions.Count; i++)
            {
                float y = safeTop + 280 + i * 210;
                var m = list[i];
                int p = Missions.Progress(i);
                GUI.Box(new Rect(x, y, 620, 190), GUIContent.none, panel);
                Text(new Rect(x + 24, y + 14, 572, 56), m.Text, card);
                GUI.DrawTexture(new Rect(x + 24, y + 90, 360, 18), barBgTex);
                GUI.DrawTexture(new Rect(x + 24, y + 90, 360 * Mathf.Clamp01(p / (float)m.Target), 18), barFillTex);
                Text(new Rect(x + 24, y + 116, 360, 50), p + " / " + m.Target, statStyle);

                var r = new Rect(x + 620 - 214, y + 80, 190, 90);
                if (Missions.IsClaimed(i))
                    Text(r, "✓ U MOR", small);
                else
                {
                    GUI.enabled = Missions.IsDone(i);
                    if (Btn(r, "MERR +" + m.Reward, buttonSmall) && Missions.Claim(i))
                        Toast("+" + m.Reward + " monedha!");
                    GUI.enabled = true;
                }
            }

            if (Button(H - safeBottom - 150, "KTHEHU")) Game.BackToMenu();
        }

        void DrawShop()
        {
            DrawCoins();
            Text(new Rect(0, safeTop + 120, W, 100), "DYQANI", title);

            float y = safeTop + 260;
            for (int i = 0; i < IAPService.CoinPackIds.Length; i++, y += 125)
            {
                string id = IAPService.CoinPackIds[i];
                if (Button(y, "+" + IAPService.CoinPackAmounts[i] + " ●    " + IAPService.PriceOf(id), buttonSmall))
                    IAPService.Buy(id, ok => Toast(ok ? "Faleminderit! Monedhat u shtuan." : "Blerja nuk u krye"));
            }
            if (!SaveSystem.NoAds)
            {
                if (Button(y, "HIQ REKLAMAT    " + IAPService.PriceOf(IAPService.NoAdsId), buttonSmall))
                    IAPService.Buy(IAPService.NoAdsId, ok => Toast(ok ? "Reklamat u hoqën!" : "Blerja nuk u krye"));
                y += 125;
            }
            if (Button(y, "RIKTHE BLERJET", buttonSmall))
                IAPService.RestorePurchases(ok => Toast(ok ? "Blerjet u rikthyen" : "Rikthimi dështoi"));

            if (Button(H - safeBottom - 150, "KTHEHU")) Game.BackToMenu();
        }

        void DrawHud()
        {
            var p = Game.Player;
            Text(new Rect(30, safeTop + 30, 400, 70), Game.Score + " m", hudBig);
            Text(new Rect(30, safeTop + 100, 400, 50), Mathf.RoundToInt(p.Speed * 3.6f) + " km/h", hudSmall);
            Text(new Rect(W - 330, safeTop + 30, 180, 70), "● " + Game.RunCoins, coinStyle);

            if (Game.State == GameState.Playing &&
                Btn(new Rect(W - 130, safeTop + 25, 100, 90), "II", button))
                Game.SetPaused(true);

            // Near-miss: shfaqet 1 s dhe zbehet.
            float since = Time.time - Game.LastNearMissTime;
            if (since >= 0f && since < 1f)
            {
                GUI.color = new Color(1f, 1f, 1f, 1f - since * since);
                Text(new Rect(0, H * 0.3f - since * 40f, W, 80), NearMissText, popup);
                GUI.color = Color.white;
            }

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
            Text(new Rect(0, top + 135, W, 50), "Rezultati: " + Game.Score + " m", label);
            Text(new Rect(0, top + 185, W, 50), Game.Distance + " m rrugë  •  " + Game.NearMisses + " near-miss", small);
            Text(new Rect(0, top + 235, W, 50),
                Game.NewBest ? "Rekord i ri!" : "Rekordi: " + SaveSystem.Best + " m", label);
            Text(new Rect(0, top + 285, W, 50), "+" + Game.RunCoins + " monedha", label);
            if (Game.UnlockedTheme != null)
                Text(new Rect(0, top + 335, W, 50), "Hartë e re: " + Game.UnlockedTheme + "!", highlight);

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

        // Ikonë zëri në cep; kur është i heshtur, një vijë e kuqe e pjerrët sipër.
        void DrawMute()
        {
            var audio = AudioManager.Instance;
            if (audio == null) return;
            var r = new Rect(30, safeTop + 25, 100, 90);
            bool muted = audio.Muted;
            if (GUI.Button(r, "♪", muted ? buttonOff : button))
            {
                audio.Muted = !muted;
                if (muted) audio.PlayClick();
            }
            if (muted)
            {
                var m = GUI.matrix;
                // Pivot-i jepet në pikselë ekrani, sepse GUI.matrix është i shkallëzuar.
                GUIUtility.RotateAroundPivot(-40f, r.center * scale);
                GUI.DrawTexture(new Rect(r.center.x - 40, r.center.y - 4, 80, 8), slashTex);
                GUI.matrix = m;
            }
        }

        bool Btn(Rect r, string text, GUIStyle style)
        {
            if (!GUI.Button(r, text, style)) return false;
            if (AudioManager.Instance != null) AudioManager.Instance.PlayClick();
            return true;
        }

        bool Button(float y, string text) => Button(y, text, button);

        bool Button(float y, string text, GUIStyle style)
        {
            return Btn(new Rect((W - 480) / 2, y, 480, 110), text, style);
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
            shadow.wordWrap = style.wordWrap;
            GUI.Label(new Rect(r.x + 3, r.y + 3, r.width, r.height), text, shadow);
            GUI.Label(r, text, style);
        }

        void EnsureStyles()
        {
            if (title != null) return;

            panelTex = Solid(new Color(0.05f, 0.07f, 0.12f, 0.85f));
            buttonTex = Solid(new Color(0.95f, 0.3f, 0.15f));
            buttonPressedTex = Solid(new Color(0.75f, 0.2f, 0.1f));
            buttonOffTex = Solid(new Color(0.35f, 0.37f, 0.42f));
            barBgTex = Solid(new Color(1f, 1f, 1f, 0.25f));
            barFillTex = Solid(new Color(1f, 0.8f, 0.1f));
            badgeTex = Solid(new Color(1f, 0.8f, 0.1f));
            slashTex = Solid(new Color(0.95f, 0.2f, 0.15f));

            title = new GUIStyle(GUI.skin.label)
            {
                fontSize = 84, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.white },
            };
            label = new GUIStyle(title) { fontSize = 36, fontStyle = FontStyle.Normal };
            small = new GUIStyle(label) { fontSize = 28 };
            highlight = new GUIStyle(label) { normal = { textColor = new Color(1f, 0.85f, 0.2f) } };
            card = new GUIStyle(label) { fontSize = 32, alignment = TextAnchor.MiddleLeft };
            popup = new GUIStyle(title) { fontSize = 60, normal = { textColor = new Color(1f, 0.85f, 0.2f) } };
            hudBig = new GUIStyle(title) { fontSize = 56, alignment = TextAnchor.MiddleLeft };
            hudSmall = new GUIStyle(label) { fontSize = 32, alignment = TextAnchor.MiddleLeft };
            coinStyle = new GUIStyle(title) { fontSize = 48, alignment = TextAnchor.MiddleRight };
            statStyle = new GUIStyle(label) { fontSize = 28, alignment = TextAnchor.MiddleLeft };
            shadow = new GUIStyle(label) { normal = { textColor = new Color(0f, 0f, 0f, 0.55f) } };
            badge = new GUIStyle(title)
            {
                fontSize = 30, normal = { background = badgeTex, textColor = new Color(0.1f, 0.1f, 0.1f) },
            };

            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 44, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter,
                normal = { background = buttonTex, textColor = Color.white },
                hover = { background = buttonTex, textColor = Color.white },
                active = { background = buttonPressedTex, textColor = Color.white },
                focused = { background = buttonTex, textColor = Color.white },
            };
            buttonSmall = new GUIStyle(button) { fontSize = 34 };
            buttonOff = new GUIStyle(button)
            {
                normal = { background = buttonOffTex, textColor = Color.white },
                hover = { background = buttonOffTex, textColor = Color.white },
                focused = { background = buttonOffTex, textColor = Color.white },
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
