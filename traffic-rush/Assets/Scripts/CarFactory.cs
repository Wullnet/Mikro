using System.Collections.Generic;
using UnityEngine;

namespace TrafficRush
{
    public enum CarBody { Sedan, Van, Truck }

    /// <summary>
    /// Ndërton makina nga forma primitive (kuti + cilindra), që prototipi të punojë pa modele 3D.
    /// Më vonë mjafton të zëvendësohet me prefab-e reale.
    /// </summary>
    public static class CarFactory
    {
        static readonly Color Glass = new Color(0.15f, 0.2f, 0.28f);
        static readonly Color Tire = new Color(0.08f, 0.08f, 0.08f);
        static readonly Color Chassis = new Color(0.12f, 0.12f, 0.13f);
        static readonly Color Cargo = new Color(0.85f, 0.85f, 0.82f);
        public static readonly Color HeadLight = new Color(1f, 0.95f, 0.75f);
        public static readonly Color TailLight = new Color(0.95f, 0.08f, 0.05f);

        // Një material i përbashkët për çdo ngjyrë, që Unity t'i bashkojë draw call-et.
        static readonly Dictionary<Color, Material> materials = new Dictionary<Color, Material>();
        static readonly Dictionary<Color, Material> glowMaterials = new Dictionary<Color, Material>();

        /// <summary>Makina shikon nga +Z. Collider-i (BoxCollider në rrënjë) përputhet me madhësinë e trupit.</summary>
        public static GameObject Build(string name, Color color, Transform parent = null, CarBody body = CarBody.Sedan, bool spoiler = false)
        {
            var root = new GameObject(name);
            if (parent != null) root.transform.SetParent(parent, false);
            var t = root.transform;
            var box = root.AddComponent<BoxCollider>();

            switch (body)
            {
                case CarBody.Van:
                    Part(PrimitiveType.Cube, t, "Body", new Vector3(0f, 1.05f, 0f), new Vector3(1.9f, 1.5f, 4.8f), color);
                    Part(PrimitiveType.Cube, t, "Windshield", new Vector3(0f, 1.45f, 2.41f), new Vector3(1.7f, 0.55f, 0.04f), Glass);
                    Part(PrimitiveType.Cube, t, "Side L", new Vector3(-0.96f, 1.45f, 1.3f), new Vector3(0.04f, 0.5f, 1.4f), Glass);
                    Part(PrimitiveType.Cube, t, "Side R", new Vector3(0.96f, 1.45f, 1.3f), new Vector3(0.04f, 0.5f, 1.4f), Glass);
                    Wheels(t, 0.95f, 1.6f, -1.6f);
                    Lights(t, 0.6f, 0.7f, 2.42f, -2.42f, 0.85f);
                    box.center = new Vector3(0f, 1f, 0f);
                    box.size = new Vector3(1.9f, 1.9f, 4.8f);
                    break;

                case CarBody.Truck:
                    Part(PrimitiveType.Cube, t, "Chassis", new Vector3(0f, 0.45f, 0f), new Vector3(1.6f, 0.25f, 6.4f), Chassis);
                    Part(PrimitiveType.Cube, t, "Cab", new Vector3(0f, 1.15f, 2.4f), new Vector3(1.9f, 1.5f, 1.8f), color);
                    Part(PrimitiveType.Cube, t, "Windshield", new Vector3(0f, 1.5f, 3.31f), new Vector3(1.7f, 0.6f, 0.04f), Glass);
                    Part(PrimitiveType.Cube, t, "Cargo", new Vector3(0f, 1.6f, -0.9f), new Vector3(2.1f, 2.2f, 4.6f), Cargo);
                    Wheels(t, 0.95f, 2.4f, -1.4f);
                    Wheel(t, new Vector3(-0.95f, 0.35f, -2.5f));
                    Wheel(t, new Vector3(0.95f, 0.35f, -2.5f));
                    Lights(t, 0.65f, 0.75f, 3.31f, -3.21f, 0.7f);
                    box.center = new Vector3(0f, 1.35f, 0.05f);
                    box.size = new Vector3(2.1f, 2.7f, 6.5f);
                    break;

                default:
                    Part(PrimitiveType.Cube, t, "Body", new Vector3(0f, 0.55f, 0f), new Vector3(1.8f, 0.6f, 4f), color);
                    Part(PrimitiveType.Cube, t, "Cabin", new Vector3(0f, 1.1f, -0.3f), new Vector3(1.55f, 0.5f, 2f), Glass);
                    Wheels(t, 0.92f, 1.3f, -1.3f);
                    Lights(t, 0.55f, 0.62f, 2.01f, -2.01f, 0.65f);
                    if (spoiler)
                    {
                        Part(PrimitiveType.Cube, t, "Spoiler L", new Vector3(-0.55f, 0.95f, -1.75f), new Vector3(0.08f, 0.3f, 0.12f), Chassis);
                        Part(PrimitiveType.Cube, t, "Spoiler R", new Vector3(0.55f, 0.95f, -1.75f), new Vector3(0.08f, 0.3f, 0.12f), Chassis);
                        Part(PrimitiveType.Cube, t, "Spoiler", new Vector3(0f, 1.12f, -1.8f), new Vector3(1.7f, 0.06f, 0.4f), color);
                    }
                    box.center = new Vector3(0f, 0.7f, 0f);
                    box.size = new Vector3(1.7f, 1.3f, 3.9f);
                    break;
            }
            return root;
        }

        static void Wheels(Transform parent, float wx, float front, float back)
        {
            Wheel(parent, new Vector3(-wx, 0.35f, front));
            Wheel(parent, new Vector3(wx, 0.35f, front));
            Wheel(parent, new Vector3(-wx, 0.35f, back));
            Wheel(parent, new Vector3(wx, 0.35f, back));
        }

        // Dritat e para (të bardha) dhe të pasme (të kuqe), me material që ndriçon edhe natën.
        static void Lights(Transform parent, float x, float y, float front, float back, float backY)
        {
            var size = new Vector3(0.4f, 0.16f, 0.06f);
            Part(PrimitiveType.Cube, parent, "Head L", new Vector3(-x, y, front), size, HeadLight, true);
            Part(PrimitiveType.Cube, parent, "Head R", new Vector3(x, y, front), size, HeadLight, true);
            Part(PrimitiveType.Cube, parent, "Tail L", new Vector3(-x, backY, back), size, TailLight, true);
            Part(PrimitiveType.Cube, parent, "Tail R", new Vector3(x, backY, back), size, TailLight, true);
        }

        static void Wheel(Transform parent, Vector3 pos)
        {
            var w = Part(PrimitiveType.Cylinder, parent, "Wheel", pos, new Vector3(0.7f, 0.15f, 0.7f), Tire);
            w.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        }

        /// <summary>glow = pa ndriçim (duket sikur lëshon dritë), për fenerë dhe llamba.</summary>
        public static GameObject Part(PrimitiveType type, Transform parent, string name, Vector3 pos, Vector3 scale, Color color, bool glow = false)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            Object.DestroyImmediate(go.GetComponent<Collider>());
            var renderer = go.GetComponent<Renderer>();
            var cache = glow ? glowMaterials : materials;
            if (!cache.TryGetValue(color, out var mat) || mat == null)
            {
                mat = glow ? GlowMaterial(renderer.sharedMaterial, color) : new Material(renderer.sharedMaterial) { color = color };
                cache[color] = mat;
            }
            renderer.sharedMaterial = mat;
            if (glow) renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return go;
        }

        static Material GlowMaterial(Material baseMat, Color color)
        {
            // "Sprites/Default" është unlit dhe gjithmonë i përfshirë në build (Always Included Shaders).
            var shader = Shader.Find("Sprites/Default");
            if (shader != null) return new Material(shader) { color = color };
            var mat = new Material(baseMat) { color = color };
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", color);
            return mat;
        }
    }
}
