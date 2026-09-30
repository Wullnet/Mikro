using UnityEngine;

namespace TrafficRush
{
    public enum GameState { Menu, Garage, Playing, Paused, GameOver }

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
        public int Score => Player != null ? Mathf.Max(0, Mathf.FloorToInt(Player.Distance)) : 0;
        public bool ContinueUsed { get; private set; }
        public bool NewBest { get; private set; }

        // Makina që po shikohet në garazh (mund të jetë ende e mbyllur).
        public int GarageIndex { get; private set; }

        Camera cam;
        RoadSpawner road;
        TrafficSpawner traffic;
        float orbitAngle;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;

            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            SetupEnvironment();

            var playerGo = new GameObject("Player");
            Player = playerGo.AddComponent<PlayerCar>();
            Player.SetModel(CarCatalog.Cars[SaveSystem.SelectedCar]);
            Player.ResetTo(Vector3.zero);
            Player.CoinCollected += () => RunCoins++;
            Player.Crashed += OnCrashed;

            road = new GameObject("Road").AddComponent<RoadSpawner>();
            road.Init(Player.transform);

            traffic = new GameObject("Traffic").AddComponent<TrafficSpawner>();
            traffic.Init(Player);
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
            var sky = new Color(0.55f, 0.78f, 0.95f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = sky;
            cam.fieldOfView = 62f;
            cam.farClipPlane = 250f;

            RenderSettings.fog = true;
            RenderSettings.fogColor = sky;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 70f;
            RenderSettings.fogEndDistance = 170f;
            RenderSettings.ambientLight = new Color(0.6f, 0.62f, 0.65f);

            if (FindAnyObjectByType<Light>() == null)
            {
                var light = new GameObject("Sun").AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.1f;
                light.shadows = LightShadows.Soft;
                light.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            }
        }

        // ---------- Gjendjet ----------

        public void GoToMenu()
        {
            Time.timeScale = 1f;
            State = GameState.Menu;
            GarageIndex = SaveSystem.SelectedCar;
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

        public void StartRun()
        {
            GoToMenu();
            RunCoins = 0;
            ContinueUsed = false;
            NewBest = false;
            State = GameState.Playing;
            traffic.Spawning = true;
            Player.StartDriving();
        }

        public void SetPaused(bool paused)
        {
            if (paused && State == GameState.Playing) { State = GameState.Paused; Time.timeScale = 0f; }
            else if (!paused && State == GameState.Paused) { State = GameState.Playing; Time.timeScale = 1f; }
        }

        void OnCrashed()
        {
            State = GameState.GameOver;
            Time.timeScale = 0f;
            SaveSystem.Coins += RunCoins;
            if (Score > SaveSystem.Best) { SaveSystem.Best = Score; NewBest = true; }
        }

        /// <summary>"Vazhdo" pas një reklame me shpërblim — lejohet një herë për lojë.</summary>
        public void ContinueWithAd()
        {
            if (ContinueUsed || State != GameState.GameOver) return;
            AdsService.ShowRewarded(rewarded =>
            {
                if (!rewarded) return;
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

        // ---------- Kamera ----------

        void LateUpdate()
        {
            if (Player == null) return;
            Vector3 p = Player.transform.position;

            if (State == GameState.Menu || State == GameState.Garage)
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
