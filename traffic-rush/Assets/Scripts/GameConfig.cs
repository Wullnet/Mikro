using UnityEngine;

namespace TrafficRush
{
    /// <summary>Konstantet e lojës në një vend, që balanca të ndryshohet lehtë.</summary>
    public static class GameConfig
    {
        // Rruga
        public static readonly float[] Lanes = { -2.6f, 0f, 2.6f };
        public const float RoadWidth = 9f;
        public const float SegmentLength = 30f;
        public const int SegmentCount = 8;

        // Shpejtësia e lojtarit (m/s)
        public const float StartSpeed = 18f;
        public const float Acceleration = 0.35f; // sa shpejt rritet shpejtësia me kohën

        // Trafiku
        public const float TrafficMinSpeed = 8f;
        public const float TrafficMaxSpeed = 14f;
        public const float SpawnAhead = 110f;
        public const float DespawnBehind = 15f;
        public const float StartRowGap = 26f; // distanca mes rreshtave të trafikut në fillim
        public const float MinRowGap = 13f;   // distanca minimale kur loja vështirësohet

        // Monedhat
        public const int CoinsPerLine = 5;
        public const float CoinSpacing = 2.5f;
    }

    [System.Serializable]
    public struct CarDef
    {
        public string Name;
        public int Price;
        public Color Color;
        public float TopSpeed;    // m/s
        public float Handling;    // sa shpejt ndërron korsi

        public CarDef(string name, int price, Color color, float topSpeed, float handling)
        {
            Name = name; Price = price; Color = color; TopSpeed = topSpeed; Handling = handling;
        }
    }

    public static class CarCatalog
    {
        public static readonly CarDef[] Cars =
        {
            new CarDef("Golf Dyshi",   0,    new Color(0.85f, 0.15f, 0.15f), 32f, 10f),
            new CarDef("Benz 190",     250,  new Color(0.95f, 0.95f, 0.95f), 36f, 11f),
            new CarDef("Audi A4",      600,  new Color(0.15f, 0.25f, 0.8f),  40f, 12.5f),
            new CarDef("BMW M3",       1200, new Color(0.1f, 0.1f, 0.1f),    45f, 14f),
            new CarDef("Porsche 911",  2500, new Color(1f, 0.75f, 0.05f),    52f, 16f),
        };
    }
}
