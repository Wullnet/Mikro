using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace TrafficRush
{
    /// <summary>
    /// Krijon rreshta trafiku dhe vija monedhash përpara lojtarit. Loja vështirësohet me distancën:
    /// rreshtat afrohen dhe shpeshtohen rreshtat me dy makina.
    /// </summary>
    public class TrafficSpawner : MonoBehaviour
    {
        static readonly Color[] TrafficColors =
        {
            new Color(0.2f, 0.5f, 0.85f), new Color(0.9f, 0.9f, 0.9f), new Color(0.3f, 0.3f, 0.3f),
            new Color(0.85f, 0.45f, 0.1f), new Color(0.2f, 0.6f, 0.35f), new Color(0.55f, 0.15f, 0.5f),
        };
        static readonly Color CoinColor = new Color(1f, 0.8f, 0.1f);

        PlayerCar player;
        readonly List<TrafficCar> cars = new List<TrafficCar>();
        readonly List<GameObject> coins = new List<GameObject>();
        float[] laneSpeeds;
        float nextRowZ;
        int lastFreeLane = 1;

        public bool Spawning { get; set; }

        /// <summary>Lojtari kaloi shumë afër një makine pa u përplasur.</summary>
        public event Action NearMiss;

        public void Init(PlayerCar target)
        {
            player = target;
        }

        public void ResetTraffic()
        {
            foreach (var c in cars) c.gameObject.SetActive(false);
            foreach (var c in coins) c.SetActive(false);

            // Çdo korsi ka shpejtësinë e vet, që makinat në të njëjtën korsi të mos përplasen me njëra-tjetrën.
            int n = GameConfig.Lanes.Length;
            laneSpeeds = new float[n];
            for (int i = 0; i < n; i++)
                laneSpeeds[i] = Mathf.Lerp(GameConfig.TrafficMaxSpeed, GameConfig.TrafficMinSpeed, i / (float)(n - 1));

            nextRowZ = player.transform.position.z + 60f;
            lastFreeLane = 1;
        }

        /// <summary>Heq makinat afër lojtarit (përdoret pas "Vazhdo").</summary>
        public void ClearAround(float z, float behind, float ahead)
        {
            foreach (var c in cars)
            {
                if (!c.gameObject.activeSelf) continue;
                float cz = c.transform.position.z;
                if (cz > z - behind && cz < z + ahead) c.gameObject.SetActive(false);
            }
        }

        void Update()
        {
            if (player == null) return;
            float pz = player.transform.position.z;

            if (Spawning)
            {
                while (nextRowZ < pz + GameConfig.SpawnAhead)
                {
                    float difficulty = Mathf.Clamp01(player.Distance / 3000f);
                    float gap = Mathf.Lerp(GameConfig.StartRowGap, GameConfig.MinRowGap, difficulty) * Random.Range(0.85f, 1.25f);
                    SpawnRow(nextRowZ, gap);
                    nextRowZ += gap;
                }
            }

            // Riciklo çfarë ka mbetur prapa.
            float limit = pz - GameConfig.DespawnBehind;
            bool check = player.Driving && player.Box != null;
            foreach (var c in cars)
            {
                if (!c.gameObject.activeSelf) continue;
                if (check && !c.Passed) CheckNearMiss(c, pz);
                if (c.transform.position.z < limit) c.gameObject.SetActive(false);
            }
            foreach (var c in coins)
                if (c.activeSelf && c.transform.position.z < limit) c.SetActive(false);
        }

        // Ndërsa lojtari është krah makinës (dhe sapo ka ndërruar korsi) mbahet hapësira anësore më e vogël;
        // kur makina mbetet krejt prapa, nëse hapësira ishte e vogël → near-miss.
        void CheckNearMiss(TrafficCar c, float pz)
        {
            var b = c.Box;
            var pb = player.Box;
            Vector3 cp = c.transform.position;
            float reach = b.size.z / 2 + pb.size.z / 2;
            float dz = cp.z + b.center.z - pz;
            if (dz >= reach) return;
            if (dz > -reach)
            {
                float gap = Mathf.Abs(cp.x - player.transform.position.x) - (b.size.x / 2 + pb.size.x / 2);
                bool dodging = Time.time - player.LastLaneChangeTime < GameConfig.NearMissWindow;
                if (dodging && gap < c.MinGap) c.MinGap = gap;
                return;
            }
            c.Passed = true;
            if (c.MinGap < GameConfig.NearMissGap) NearMiss?.Invoke();
        }

        void SpawnRow(float z, float gapToNext)
        {
            int n = GameConfig.Lanes.Length;
            float difficulty = Mathf.Clamp01(player.Distance / 3000f);
            bool twoCars = Random.value < Mathf.Lerp(0.15f, 0.55f, difficulty);

            // Korsia e lirë ndryshon maksimumi një korsi nga rreshti i kaluar, që të ketë gjithmonë rrugëdalje.
            int freeLane = Mathf.Clamp(lastFreeLane + Random.Range(-1, 2), 0, n - 1);
            lastFreeLane = freeLane;

            if (twoCars)
            {
                for (int l = 0; l < n; l++)
                    if (l != freeLane) SpawnCar(l, z);
            }
            else
            {
                int blocked = Random.Range(0, n - 1);
                if (blocked >= freeLane) blocked++;
                SpawnCar(blocked, z);
            }

            // Monedhat shkojnë në korsinë e lirë, mes këtij rreshti dhe tjetrit (makina 4 m, kamioni 6.5 m).
            int coinCount = Mathf.Min(GameConfig.CoinsPerLine, Mathf.FloorToInt((gapToNext - 7.5f) / GameConfig.CoinSpacing) + 1);
            if (coinCount > 0 && Random.value < 0.45f) SpawnCoinLine(freeLane, z + 3f, coinCount);
        }

        void SpawnCar(int lane, float z)
        {
            TrafficCar car = null;
            foreach (var c in cars)
                if (!c.gameObject.activeSelf) { car = c; break; }

            if (car == null)
            {
                var color = TrafficColors[Random.Range(0, TrafficColors.Length)];
                // Pak larmi: disa furgona dhe kamionë (collider-i ndjek madhësinë).
                float r = Random.value;
                var body = r < 0.08f ? CarBody.Truck : r < 0.22f ? CarBody.Van : CarBody.Sedan;
                var go = CarFactory.Build("Traffic", color, transform, body);
                car = go.AddComponent<TrafficCar>();
                cars.Add(car);
            }
            car.Place(new Vector3(GameConfig.Lanes[lane], 0f, z), laneSpeeds[lane]);
        }

        void SpawnCoinLine(int lane, float startZ, int count)
        {
            for (int i = 0; i < count; i++)
            {
                GameObject coin = null;
                foreach (var c in coins)
                    if (!c.activeSelf) { coin = c; break; }

                if (coin == null)
                {
                    coin = CarFactory.Part(PrimitiveType.Cylinder, transform, "Coin", Vector3.zero, new Vector3(0.8f, 0.08f, 0.8f), CoinColor);
                    var col = coin.AddComponent<SphereCollider>();
                    col.isTrigger = true;
                    col.radius = 0.6f;
                    coin.AddComponent<Coin>();
                    coins.Add(coin);
                }
                coin.transform.SetPositionAndRotation(
                    new Vector3(GameConfig.Lanes[lane], 1f, startZ + i * GameConfig.CoinSpacing),
                    Quaternion.Euler(90f, 0f, 0f));
                // Monedhat lëvizin me shpejtësinë e korsisë, kështu ruajnë vendin mes makinave.
                coin.GetComponent<Coin>().Speed = laneSpeeds[lane];
                coin.SetActive(true);
            }
        }
    }
}
