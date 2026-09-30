using UnityEngine;

namespace TrafficRush
{
    /// <summary>
    /// Rrugë pa fund: një numër i vogël segmentesh riciklohen përpara lojtarit (object pooling).
    /// </summary>
    public class RoadSpawner : MonoBehaviour
    {
        static readonly Color Asphalt = new Color(0.22f, 0.22f, 0.24f);
        static readonly Color Grass = new Color(0.32f, 0.6f, 0.25f);
        static readonly Color Line = new Color(0.95f, 0.95f, 0.9f);
        static readonly Color Trunk = new Color(0.4f, 0.26f, 0.13f);
        static readonly Color Leaves = new Color(0.15f, 0.45f, 0.18f);

        Transform target;
        Transform[] segments;

        public void Init(Transform follow)
        {
            target = follow;
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
            if (target == null) return;
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
            var seg = new GameObject("Segment " + index).transform;
            seg.SetParent(transform, false);

            // Pivot-i i segmentit është në fillim të tij; pjesët vendosen në mes (len / 2).
            CarFactory.Part(PrimitiveType.Cube, seg, "Asphalt", new Vector3(0f, -0.05f, len / 2), new Vector3(GameConfig.RoadWidth, 0.1f, len), Asphalt);
            CarFactory.Part(PrimitiveType.Cube, seg, "Grass L", new Vector3(-GameConfig.RoadWidth / 2 - 20f, -0.1f, len / 2), new Vector3(40f, 0.1f, len), Grass);
            CarFactory.Part(PrimitiveType.Cube, seg, "Grass R", new Vector3(GameConfig.RoadWidth / 2 + 20f, -0.1f, len / 2), new Vector3(40f, 0.1f, len), Grass);

            // Vijat anësore
            float edge = GameConfig.RoadWidth / 2 - 0.25f;
            CarFactory.Part(PrimitiveType.Cube, seg, "Edge L", new Vector3(-edge, 0.01f, len / 2), new Vector3(0.15f, 0.02f, len), Line);
            CarFactory.Part(PrimitiveType.Cube, seg, "Edge R", new Vector3(edge, 0.01f, len / 2), new Vector3(0.15f, 0.02f, len), Line);

            // Vijat e ndërprera mes korsive
            var lanes = GameConfig.Lanes;
            for (int l = 0; l < lanes.Length - 1; l++)
            {
                float x = (lanes[l] + lanes[l + 1]) / 2;
                for (float z = 1.5f; z < len; z += 6f)
                    CarFactory.Part(PrimitiveType.Cube, seg, "Dash", new Vector3(x, 0.01f, z), new Vector3(0.15f, 0.02f, 3f), Line);
            }

            // Pemë anash rrugës, me pozicione të rastësishme për çdo segment
            for (int t = 0; t < 4; t++)
            {
                float side = t % 2 == 0 ? -1f : 1f;
                float x = side * Random.Range(GameConfig.RoadWidth / 2 + 3f, GameConfig.RoadWidth / 2 + 16f);
                float z = Random.Range(0f, len);
                CarFactory.Part(PrimitiveType.Cylinder, seg, "Trunk", new Vector3(x, 1f, z), new Vector3(0.4f, 1f, 0.4f), Trunk);
                CarFactory.Part(PrimitiveType.Sphere, seg, "Leaves", new Vector3(x, 2.8f, z), Vector3.one * 2.4f, Leaves);
            }
            return seg;
        }
    }
}
