using UnityEngine;

namespace TrafficRush
{
    public enum GameState { Menu, Garage, Missions, Shop, Playing, Paused, GameOver }

    /// <summary>
    /// Truri i lojës: ndërton skenën nga kodi, menaxhon gjendjet (menu, lojë, game over) dhe kamerën.
    /// Krijohet automatikisht nga <see cref="GameBootstrap"/>, kështu skena mund të jetë bosh.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public GameState State { get; private set; } = GameState.Menu;
        public PlayerCar Player { get; private set; }
        public int RunCoins { get; private set; }
        public int Bonus { get; private set; }        // pikët nga near-miss
        public int NearMisses { get; private set; }
        public float LastNearMissTime { get; private set; } = -10f;
        public int Distance => Player != null ? Mathf.Max(0, Mathf.FloorToInt(Player.Distance)) : 0;
        public int Score => Distance + Bonus;
        public bool ContinueUsed { get; private set; }
        public bool NewBest { get; private set; }
        public string UnlockedTheme { get; private set; } // harta e hapur në këtë lojë (për game over)

        // Makina që po shikohet në garazh (mund të jetë ende e mbyllur).
        public int GarageIndex { get; private set; }
        // Harta që po shikohet në menu (mund të jetë ende e mbyllur).
        public int ThemeIndex { get; private set; }

        Camera cam;
        Light sun;
        RoadSpawner road;
        TrafficSpawner traffic;
        float orbitAngle;
        int appliedTheme = -1;
        int musicOn = -1;
        int runCoinsTotal, reportedNear; // për misionet: monedhat e gjithë lojës (edhe pas "Vazhdo")

        static AudioManager Audio => AudioManager.Instance;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;

            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            AudioManager.Ensure();
            AdsService.Initialize();
            IAPService.Initialize();

            SetupEnvironment();

            var playerGo = new GameObject("Player");
            Player = playerGo.AddComponent<PlayerCar>();
            Player.SetModel(CarCatalog.Cars[SaveSystem.SelectedCar]);
            Player.ResetTo(Vector3.zero);
            Player.CoinCollected += OnCoin;
            Player.Crashed += OnCrashed;

            ThemeIndex = Themes.Selected;
            road = new GameObject("Road").AddComponent<RoadSpawner>();
            road.Init(Player.transform, Themes.All[ThemeIndex]);
            appliedTheme = ThemeIndex;
            Themes.Apply(Themes.All[ThemeIndex], cam, sun);

            traffic = new GameObject("Traffic").AddComponent<TrafficSpawner>();
            traffic.Init(Player);
            traffic.NearMiss += OnNearMiss;
            traffic.ResetTraffic();

            gameObject.AddComponent<UIManager>();
            GoToMenu();
        }

        void SetupEnvironment()
        {
            cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
                cam = camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
            }
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.fieldOfView = 62f;
            cam.farClipPlane = 250f;

            sun = FindAnyObjectByType<Light>();
            if (sun == null)
            {
                sun = new GameObject("Sun").AddComponent<Light>();
                sun.type = LightType.Directional;
                sun.shadows = LightShadows.Soft;
                sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            }
        }

        void ApplyTheme(int index)
        {
            if (index == appliedTheme) return;
            appliedTheme = index;
            Themes.Apply(Themes.All[index], cam, sun);
            road.Build(Themes.All[index]);
        }

        // ---------- Gjendjet ----------

        public void GoToMenu()
        {
            Time.timeScale = 1f;
            State = GameState.Menu;
            GarageIndex = SaveSystem.SelectedCar;
            ThemeIndex = Themes.Selected;
            ApplyTheme(ThemeIndex);
            Player.SetModel(CarCatalog.Cars[SaveSystem.SelectedCar]);
            Player.ResetTo(Vector3.zero);
            road.ResetRoad();
            traffic.Spawning = false;
            traffic.ResetTraffic();
        }

        public void OpenGarage()
        {
            State = GameState.Garage;
            GarageIndex = SaveSystem.SelectedCar;
        }

        public void BrowseGarage(int dir)
        {
            int n = CarCatalog.Cars.Length;
            GarageIndex = (GarageIndex + dir + n) % n;
            Player.SetModel(CarCatalog.Cars[GarageIndex]);
        }

        /// <summary>Zgjedh makinën në garazh, ose e blen nëse ka monedha. Kthen false nëse s'mjaftojnë.</summary>
        public bool SelectOrBuy()
        {
            if (!SaveSystem.TryBuy(GarageIndex)) return false;
            SaveSystem.SelectedCar = GarageIndex;
            return true;
        }

        public void CloseGarage()
        {
            GoToMenu();
        }

        /// <summary>Shfleton hartat në menu; harta e hapur zgjidhet menjëherë, e mbyllura vetëm shfaqet.</summary>
        public void BrowseTheme(int dir)
        {
            int n = Themes.All.Length;
            ThemeIndex = (ThemeIndex + dir + n) % n;
            if (Themes.IsUnlocked(ThemeIndex)) Themes.Selected = ThemeIndex;
            ApplyTheme(ThemeIndex);
        }

        public void OpenMissions() { State = GameState.Missions; }
        public void OpenShop() { State = GameState.Shop; }
        public void BackToMenu() { State = GameState.Menu; }

        public void StartRun()
        {
            GoToMenu();
            RunCoins = 0;
            runCoinsTotal = 0;
            Bonus = 0;
            NearMisses = 0;
            reportedNear = 0;
            LastNearMissTime = -10f;
            ContinueUsed = false;
            NewBest = false;
            UnlockedTheme = null;
            State = GameState.Playing;
            traffic.Spawning = true;
            Player.StartDriving();
        }

        public void SetPaused(bool paused)
        {
            if (paused && State == GameState.Playing) { State = GameState.Paused; Time.timeScale = 0f; }
            else if (!paused && State == GameState.Paused) { State = GameState.Playing; Time.timeScale = 1f; }
        }

        void OnCoin()
        {
            RunCoins++;
            runCoinsTotal++;
            if (Audio != null) Audio.PlayCoin();
        }

        void OnNearMiss()
        {
            if (State != GameState.Playing) return;
            NearMisses++;
            Bonus += GameConfig.NearMissBonus;
            LastNearMissTime = Time.time;
            if (Audio != null) Audio.PlayNearMiss();
        }

        void OnCrashed()
        {
            State = GameState.GameOver;
            Time.timeScale = 0f;
            if (Audio != null) Audio.PlayCrash();

            SaveSystem.Coins += RunCoins;
            int unlockedBefore = Themes.UnlockedCount();
            if (Score > SaveSystem.Best) { SaveSystem.Best = Score; NewBest = true; }
            for (int i = unlockedBefore; i < Themes.UnlockedCount(); i++) UnlockedTheme = Themes.All[i].Name;

            Missions.ReportRun(Distance, runCoinsTotal, NearMisses, RunCoins, NearMisses - reportedNear, !ContinueUsed);
            reportedNear = NearMisses;

            AdsService.OnGameOver();
        }

        /// <summary>"Vazhdo" pas një reklame me shpërblim — lejohet një herë për lojë.</summary>
        public void ContinueWithAd()
        {
            if (ContinueUsed || State != GameState.GameOver) return;
            AdsService.ShowRewarded(rewarded =>
            {
                // Reklama mund të mbyllet më vonë; lojtari mund të ketë ikur ndërkohë nga game over.
                if (!rewarded || ContinueUsed || State != GameState.GameOver) return;
                ContinueUsed = true;
                // Monedhat e lojës u ruajtën në crash; numëruesi rifillon që të mos dyfishohen.
                RunCoins = 0;
                traffic.ClearAround(Player.transform.position.z, 20f, 40f);
                State = GameState.Playing;
                Time.timeScale = 1f;
                Player.Revive();
            });
        }

        void OnApplicationPause(bool pause)
        {
            if (pause) SetPaused(true);
        }

        // ---------- Zëri ----------

        void Update()
        {
            var a = Audio;
            if (a == null || Player == null) return;
            bool driving = State == GameState.Playing && Player.Driving;
            a.SetEngine(driving, Player.TopSpeed > 0f ? Player.Speed / Player.TopSpeed : 0f);

            // Muzika vetëm në ekranet e menusë; thirret vetëm kur ndryshon.
            int music = State == GameState.Menu || State == GameState.Garage || State == GameState.Missions || State == GameState.Shop ? 1 : 0;
            if (music != musicOn)
            {
                musicOn = music;
                a.SetMusic(music == 1);
            }
        }

        // ---------- Kamera ----------

        void LateUpdate()
        {
            if (Player == null) return;
            Vector3 p = Player.transform.position;

            if (State == GameState.Menu || State == GameState.Garage || State == GameState.Missions || State == GameState.Shop)
            {
                // Rrotullim i ngadaltë rreth makinës në menu.
                orbitAngle += 20f * Time.unscaledDeltaTime;
                var rot = Quaternion.Euler(18f, orbitAngle, 0f);
                cam.transform.position = p + Vector3.up * 0.6f + rot * new Vector3(0f, 0f, -8f);
                cam.transform.LookAt(p + Vector3.up * 0.8f);
            }
            else
            {
                // Kamera pas makinës; ndjek korsinë vetëm pjesërisht që të mos tundet shumë.
                var target = new Vector3(p.x * 0.6f, p.y + 5.5f, p.z - 8.5f);
                cam.transform.position = target;
                cam.transform.LookAt(new Vector3(p.x * 0.6f, p.y + 1f, p.z + 10f));
            }
        }
    }
}
