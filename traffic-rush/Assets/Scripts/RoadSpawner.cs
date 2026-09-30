using UnityEngine;

namespace TrafficRush
{
    /// <summary>
    /// Rrugë pa fund: një numër i vogël segmentesh riciklohen përpara lojtarit (object pooling).
    /// Pamja e segmenteve varet nga harta (<see cref="Theme"/>); kur ndryshon harta, rindërtohen.
    /// </summary>
    public class RoadSpawner : MonoBehaviour
    {
        static readonly Color Trunk = new Color(0.4f, 0.26f, 0.13f);
        static readonly Color Leaves = new Color(0.15f, 0.45f, 0.18f);
        static readonly Color Pine = new Color(0.08f, 0.3f, 0.14f);
        static readonly Color Rock = new Color(0.45f, 0.43f, 0.4f);
        static readonly Color RockDark = new Color(0.36f, 0.34f, 0.32f);
        static readonly Color Rail = new Color(0.75f, 0.76f, 0.78f);
        static readonly Color Pole = new Color(0.25f, 0.26f, 0.28f);
        static readonly Color Lamp = new Color(1f, 0.85f, 0.35f);
        static readonly Color LampPool = new Color(0.32f, 0.28f, 0.17f);
        static readonly Color Building = new Color(0.1f, 0.11f, 0.15f);
        static readonly Color Window = new Color(1f, 0.8f, 0.45f);

        Transform target;
        Transform[] segments;
        Theme theme;

        public void Init(Transform follow, Theme startTheme)
        {
            target = follow;
            Build(startTheme);
        }

        /// <summary>Fshin segmentet dhe i ndërton nga e para me pamjen e hartës së re.</summary>
        public void Build(Theme newTheme)
        {
            theme = newTheme;
            if (segments != null)
                foreach (var seg in segments) if (seg != null) Destroy(seg.gameObject);
            segments = new Transform[GameConfig.SegmentCount];
            for (int i = 0; i < segments.Length; i++) segments[i] = BuildSegment(i);
            ResetRoad();
        }

        public void ResetRoad()
        {
            float z0 = target.position.z - GameConfig.SegmentLength;
            for (int i = 0; i < segments.Length; i++)
                segments[i].position = new Vector3(0f, 0f, z0 + i * GameConfig.SegmentLength);
        }

        void Update()
        {
            if (target == null || segments == null) return;
            float total = GameConfig.SegmentCount * GameConfig.SegmentLength;
            foreach (var seg in segments)
            {
                // Segmenti që mbetet prapa kalon në fund të rrugës.
                if (seg.position.z + GameConfig.SegmentLength < target.position.z - GameConfig.SegmentLength)
                    seg.position += Vector3.forward * total;
            }
        }

        Transform BuildSegment(int index)
        {
            float len = GameConfig.SegmentLength;
            float half = GameConfig.RoadWidth / 2;
            var seg = new GameObject("Segment " + index).transform;
            seg.SetParent(transform, false);

            // Pivot-i i segmentit është në fillim të tij; pjesët vendosen në mes (len / 2).
            CarFactory.Part(PrimitiveType.Cube, seg, "Asphalt", new Vector3(0f, -0.05f, len / 2), new Vector3(GameConfig.RoadWidth, 0.1f, len), theme.Asphalt);
            CarFactory.Part(PrimitiveType.Cube, seg, "Grass L", new Vector3(-half - 20f, -0.1f, len / 2), new Vector3(40f, 0.1f, len), theme.Grass);
            CarFactory.Part(PrimitiveType.Cube, seg, "Grass R", new Vector3(half + 20f, -0.1f, len / 2), new Vector3(40f, 0.1f, len), theme.Grass);

            // Vijat anësore
            float edge = half - 0.25f;
            CarFactory.Part(PrimitiveType.Cube, seg, "Edge L", new Vector3(-edge, 0.01f, len / 2), new Vector3(0.15f, 0.02f, len), theme.Line);
            CarFactory.Part(PrimitiveType.Cube, seg, "Edge R", new Vector3(edge, 0.01f, len / 2), new Vector3(0.15f, 0.02f, len), theme.Line);

            // Vijat e ndërprera mes korsive
            var lanes = GameConfig.Lanes;
            for (int l = 0; l < lanes.Length - 1; l++)
            {
                float x = (lanes[l] + lanes[l + 1]) / 2;
                for (float z = 1.5f; z < len; z += 6f)
                    CarFactory.Part(PrimitiveType.Cube, seg, "Dash", new Vector3(x, 0.01f, z), new Vector3(0.15f, 0.02f, 3f), theme.Line);
            }

            switch (theme.Decor)
            {
                case Decor.Mountain: Mountain(seg, index, len, half); break;
                case Decor.City: City(seg, len, half); break;
                default: Trees(seg, len, half); break;
            }
            return seg;
        }

        // Tiranë–Durrës: pemë të rrumbullakëta, me pozicione të rastësishme për çdo segment.
        static void Trees(Transform seg, float len, float half)
        {
            for (int t = 0; t < 4; t++)
            {
                float side = t % 2 == 0 ? -1f : 1f;
                float x = side * Random.Range(half + 3f, half + 16f);
                float z = Random.Range(0f, len);
                CarFactory.Part(PrimitiveType.Cylinder, seg, "Trunk", new Vector3(x, 1f, z), new Vector3(0.4f, 1f, 0.4f), Trunk);
                CarFactory.Part(PrimitiveType.Sphere, seg, "Leaves", new Vector3(x, 2.8f, z), Vector3.one * 2.4f, Leaves);
            }
        }

        // Llogara: shkëmbinj majtas (muri i malit "lëviz" nga segmenti në segment, si kthesa),
        // guardrail djathtas dhe pisha në të dy anët.
        static void Mountain(Transform seg, int index, float len, float half)
        {
            float wave = Mathf.Sin(index * 0.9f) * 2.5f;
            for (int r = 0; r < 4; r++)
            {
                float z = (r + Random.Range(0.1f, 0.9f)) * len / 4;
                float h = Random.Range(4f, 10f);
                float x = -(half + 5f + wave + Random.Range(0f, 2f));
                var rock = CarFactory.Part(PrimitiveType.Cube, seg, "Rock", new Vector3(x, h / 2 - 0.5f, z),
                    new Vector3(Random.Range(4f, 7f), h, Random.Range(6f, 9f)), r % 2 == 0 ? Rock : RockDark);
                rock.transform.localRotation = Quaternion.Euler(0f, Random.Range(-25f, 25f), Random.Range(-6f, 6f));
            }

            CarFactory.Part(PrimitiveType.Cube, seg, "Rail", new Vector3(half + 0.6f, 0.6f, len / 2), new Vector3(0.1f, 0.3f, len), Rail);
            for (float z = 1f; z < len; z += 5f)
                CarFactory.Part(PrimitiveType.Cube, seg, "Post", new Vector3(half + 0.65f, 0.35f, z), new Vector3(0.12f, 0.7f, 0.12f), Pole);

            for (int t = 0; t < 4; t++)
            {
                float x = t < 1 ? -(half + 2f + wave * 0.3f) : Random.Range(half + 3f, half + 18f);
                PineTree(seg, new Vector3(x, 0f, Random.Range(0f, len)), Random.Range(0.8f, 1.3f));
            }
            if (Random.value < 0.6f)
                CarFactory.Part(PrimitiveType.Sphere, seg, "Boulder", new Vector3(Random.Range(half + 4f, half + 14f), 0.3f, Random.Range(0f, len)),
                    new Vector3(2f, 1.3f, 1.8f), RockDark);
        }

        static void PineTree(Transform seg, Vector3 pos, float s)
        {
            CarFactory.Part(PrimitiveType.Cylinder, seg, "Trunk", pos + new Vector3(0f, 0.6f * s, 0f), new Vector3(0.3f, 0.6f, 0.3f) * s, Trunk);
            // Tre kuti të rrotulluara, gjithnjë më të vogla, japin formën e pishës.
            for (int k = 0; k < 3; k++)
            {
                float w = (2.2f - k * 0.6f) * s;
                var layer = CarFactory.Part(PrimitiveType.Cube, seg, "Pine", pos + new Vector3(0f, (1.7f + k * 1.1f) * s, 0f), new Vector3(w, 1.2f * s, w), Pine);
                layer.transform.localRotation = Quaternion.Euler(0f, 45f * k, 0f);
            }
        }

        // Prishtinë natën: shtylla ndriçimi me llamba të verdha dhe ndërtesa me dritare të ndezura.
        static void City(Transform seg, float len, float half)
        {
            for (int s = 0; s < 2; s++)
            {
                float side = s == 0 ? -1f : 1f;
                float z = s == 0 ? 2f : len / 2 + 2f;
                float px = side * (half + 0.7f);
                CarFactory.Part(PrimitiveType.Cylinder, seg, "Pole", new Vector3(px, 2.6f, z), new Vector3(0.18f, 2.6f, 0.18f), Pole);
                CarFactory.Part(PrimitiveType.Cube, seg, "Arm", new Vector3(px - side * 0.8f, 5.15f, z), new Vector3(1.7f, 0.1f, 0.15f), Pole);
                CarFactory.Part(PrimitiveType.Sphere, seg, "Lamp", new Vector3(px - side * 1.55f, 5f, z), Vector3.one * 0.55f, Lamp, true);
                // Njollë drite në asfalt poshtë llambës.
                CarFactory.Part(PrimitiveType.Cylinder, seg, "Light pool", new Vector3(px - side * 2.4f, 0.005f, z), new Vector3(4.5f, 0.005f, 4.5f), LampPool, true);
            }

            for (int b = 0; b < 2; b++)
            {
                float side = b == 0 ? -1f : 1f;
                float h = Random.Range(7f, 18f);
                float x = side * Random.Range(half + 10f, half + 16f);
                float z = Random.Range(6f, len - 6f);
                CarFactory.Part(PrimitiveType.Cube, seg, "Building", new Vector3(x, h / 2, z), new Vector3(8f, h, 10f), Building);
                float face = x - side * 4.02f; // ana nga rruga
                for (int w = 0; w < 4; w++)
                {
                    if (Random.value < 0.35f) continue;
                    CarFactory.Part(PrimitiveType.Cube, seg, "Window", new Vector3(face, Random.Range(2f, h - 1.5f), z + Random.Range(-3.5f, 3.5f)),
                        new Vector3(0.05f, 1f, 1.4f), Window, true);
                }
            }
        }
    }
}
