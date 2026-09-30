using System.Collections.Generic;
using UnityEngine;

namespace TrafficRush
{
    /// <summary>
    /// Ndërton makina nga forma primitive (kuti + cilindra), që prototipi të punojë pa modele 3D.
    /// Më vonë mjafton të zëvendësohet me prefab-e reale.
    /// </summary>
    public static class CarFactory
    {
        static readonly Color Glass = new Color(0.15f, 0.2f, 0.28f);
        static readonly Color Tire = new Color(0.08f, 0.08f, 0.08f);

        // Një material i përbashkët për çdo ngjyrë, që Unity t'i bashkojë draw call-et.
        static readonly Dictionary<Color, Material> materials = new Dictionary<Color, Material>();

        public static GameObject Build(string name, Color color, Transform parent = null)
        {
            var root = new GameObject(name);
            if (parent != null) root.transform.SetParent(parent, false);

            Part(PrimitiveType.Cube, root.transform, "Body", new Vector3(0f, 0.55f, 0f), new Vector3(1.8f, 0.6f, 4f), color);
            Part(PrimitiveType.Cube, root.transform, "Cabin", new Vector3(0f, 1.1f, -0.3f), new Vector3(1.55f, 0.5f, 2f), Glass);

            float wx = 0.92f, wz = 1.3f;
            Wheel(root.transform, new Vector3(-wx, 0.35f, wz));
            Wheel(root.transform, new Vector3(wx, 0.35f, wz));
            Wheel(root.transform, new Vector3(-wx, 0.35f, -wz));
            Wheel(root.transform, new Vector3(wx, 0.35f, -wz));

            // Një collider i vetëm për të gjithë makinën.
            var box = root.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.7f, 0f);
            box.size = new Vector3(1.7f, 1.3f, 3.9f);
            return root;
        }

        static void Wheel(Transform parent, Vector3 pos)
        {
            var w = Part(PrimitiveType.Cylinder, parent, "Wheel", pos, new Vector3(0.7f, 0.15f, 0.7f), Tire);
            w.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        }

        public static GameObject Part(PrimitiveType type, Transform parent, string name, Vector3 pos, Vector3 scale, Color color)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            Object.DestroyImmediate(go.GetComponent<Collider>());
            var renderer = go.GetComponent<Renderer>();
            if (!materials.TryGetValue(color, out var mat) || mat == null)
            {
                mat = new Material(renderer.sharedMaterial) { color = color };
                materials[color] = mat;
            }
            renderer.sharedMaterial = mat;
            return go;
        }
    }
}
