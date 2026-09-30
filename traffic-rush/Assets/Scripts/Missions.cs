using System;
using UnityEngine;

namespace TrafficRush
{
    public enum MissionType { CoinsInRun, NearMissInRun, DistanceInRun, PlayRuns, CoinsToday, NearMissToday }

    public struct Mission
    {
        public MissionType Type;
        public int Target, Reward;
        public string Text;

        public Mission(MissionType type, int target, int reward, string text)
        {
            Type = type; Target = target; Reward = reward; Text = text;
        }
    }

    /// <summary>
    /// Misionet ditore: 3 në ditë, të zgjedhura nga data (të njëjtat për të gjithë atë ditë).
    /// Progresi ruhet në PlayerPrefs bashkë me datën; ditën tjetër rifillon.
    /// </summary>
    public static class Missions
    {
        public const int Count = 3;

        static readonly Mission[] Pool =
        {
            new Mission(MissionType.CoinsInRun, 30, 100, "Mblidh 30 monedha në një lojë"),
            new Mission(MissionType.CoinsInRun, 60, 200, "Mblidh 60 monedha në një lojë"),
            new Mission(MissionType.NearMissInRun, 5, 150, "Bëj 5 near-miss në një lojë"),
            new Mission(MissionType.NearMissToday, 15, 150, "Bëj 15 near-miss sot"),
            new Mission(MissionType.DistanceInRun, 1000, 100, "Arri 1000 m"),
            new Mission(MissionType.DistanceInRun, 2000, 200, "Arri 2000 m"),
            new Mission(MissionType.PlayRuns, 3, 80, "Luaj 3 lojëra"),
            new Mission(MissionType.PlayRuns, 6, 150, "Luaj 6 lojëra"),
            new Mission(MissionType.CoinsToday, 100, 150, "Mblidh 100 monedha sot"),
        };

        const string DateKey = "tr_m_date";
        static readonly string[] ProgressKeys = { "tr_m_p0", "tr_m_p1", "tr_m_p2" };
        static readonly string[] ClaimedKeys = { "tr_m_c0", "tr_m_c1", "tr_m_c2" };

        static readonly Mission[] today = new Mission[Count];
        static int todayDate;

        static int DateNow()
        {
            var d = DateTime.Now;
            return d.Year * 10000 + d.Month * 100 + d.Day;
        }

        /// <summary>Misionet e sotme; në ndryshim date zgjidhen të rejat dhe progresi fshihet.</summary>
        public static Mission[] Today
        {
            get
            {
                int date = DateNow();
                if (date == todayDate) return today;
                todayDate = date;
                Pick(date);
                if (PlayerPrefs.GetInt(DateKey, 0) != date)
                {
                    PlayerPrefs.SetInt(DateKey, date);
                    for (int i = 0; i < Count; i++)
                    {
                        PlayerPrefs.SetInt(ProgressKeys[i], 0);
                        PlayerPrefs.SetInt(ClaimedKeys[i], 0);
                    }
                    PlayerPrefs.Save();
                }
                return today;
            }
        }

        // Përzierje deterministe nga data; merren 3 misione me lloje të ndryshme.
        static void Pick(int date)
        {
            var rng = new System.Random(date);
            var order = new int[Pool.Length];
            for (int i = 0; i < order.Length; i++) order[i] = i;
            for (int i = order.Length - 1; i > 0; i--)
            {
                int j = rng.Next(i + 1);
                int t = order[i]; order[i] = order[j]; order[j] = t;
            }
            int n = 0;
            foreach (int idx in order)
            {
                bool dup = false;
                for (int k = 0; k < n; k++) dup |= today[k].Type == Pool[idx].Type;
                if (dup) continue;
                today[n++] = Pool[idx];
                if (n == Count) break;
            }
        }

        public static int Progress(int i)
        {
            var list = Today; // kontrollon edhe ndryshimin e datës
            return Mathf.Min(PlayerPrefs.GetInt(ProgressKeys[i], 0), list[i].Target);
        }

        public static bool IsDone(int i) => Progress(i) >= Today[i].Target;

        public static bool IsClaimed(int i)
        {
            var list = Today;
            return PlayerPrefs.GetInt(ClaimedKeys[i], 0) == 1;
        }
        public static bool CanClaim(int i) => IsDone(i) && !IsClaimed(i);

        public static int ClaimableCount()
        {
            int n = 0;
            for (int i = 0; i < Count; i++) if (CanClaim(i)) n++;
            return n;
        }

        /// <summary>Jep shpërblimin e misionit; kthen false nëse s'është kryer ose u mor.</summary>
        public static bool Claim(int i)
        {
            if (!CanClaim(i)) return false;
            PlayerPrefs.SetInt(ClaimedKeys[i], 1);
            SaveSystem.Coins += Today[i].Reward; // SaveSystem thërret PlayerPrefs.Save()
            return true;
        }

        /// <summary>
        /// Thirret në çdo përplasje. Vlerat "run*" janë totalet e lojës (idempotente),
        /// "*Delta" janë shtesat që nga raporti i kaluar; newRun = përplasja e parë e kësaj loje.
        /// </summary>
        public static void ReportRun(int distance, int runCoins, int runNearMisses, int coinsDelta, int nearDelta, bool newRun)
        {
            var list = Today;
            for (int i = 0; i < Count; i++)
            {
                int p = PlayerPrefs.GetInt(ProgressKeys[i], 0);
                switch (list[i].Type)
                {
                    case MissionType.CoinsInRun: p = Mathf.Max(p, runCoins); break;
                    case MissionType.NearMissInRun: p = Mathf.Max(p, runNearMisses); break;
                    case MissionType.DistanceInRun: p = Mathf.Max(p, distance); break;
                    case MissionType.PlayRuns: if (newRun) p++; break;
                    case MissionType.CoinsToday: p += coinsDelta; break;
                    case MissionType.NearMissToday: p += nearDelta; break;
                }
                PlayerPrefs.SetInt(ProgressKeys[i], p);
            }
            PlayerPrefs.Save();
        }
    }
}
