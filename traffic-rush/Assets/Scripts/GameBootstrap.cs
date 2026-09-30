using UnityEngine;

namespace TrafficRush
{
    /// <summary>Krijon GameManager-in automatikisht kur hapet çdo skenë, pa pasur nevojë për prefab-e.</summary>
    public static class GameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Init()
        {
            if (Object.FindAnyObjectByType<GameManager>() == null)
                new GameObject("GameManager").AddComponent<GameManager>();
        }
    }
}
