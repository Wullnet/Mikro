using UnityEngine;

namespace TrafficRush
{
    /// <summary>Ruajtja lokale e progresit (monedha, rekordi, makinat e zhbllokuara).</summary>
    public static class SaveSystem
    {
        const string CoinsKey = "tr_coins";
        const string BestKey = "tr_best";
        const string UnlockedKey = "tr_unlocked";
        const string SelectedKey = "tr_selected";

        public static int Coins
        {
            get => PlayerPrefs.GetInt(CoinsKey, 0);
            set { PlayerPrefs.SetInt(CoinsKey, Mathf.Max(0, value)); PlayerPrefs.Save(); }
        }

        public static int Best
        {
            get => PlayerPrefs.GetInt(BestKey, 0);
            set { PlayerPrefs.SetInt(BestKey, value); PlayerPrefs.Save(); }
        }

        public static int SelectedCar
        {
            get => Mathf.Clamp(PlayerPrefs.GetInt(SelectedKey, 0), 0, CarCatalog.Cars.Length - 1);
            set { PlayerPrefs.SetInt(SelectedKey, value); PlayerPrefs.Save(); }
        }

        // Makina e parë është gjithmonë e hapur (bit 0).
        public static bool IsUnlocked(int index) => ((PlayerPrefs.GetInt(UnlockedKey, 1) | 1) & (1 << index)) != 0;

        public static void Unlock(int index)
        {
            PlayerPrefs.SetInt(UnlockedKey, PlayerPrefs.GetInt(UnlockedKey, 1) | 1 | (1 << index));
            PlayerPrefs.Save();
        }

        /// <summary>Provon ta blejë makinën; kthen true nëse u ble.</summary>
        public static bool TryBuy(int index)
        {
            if (IsUnlocked(index)) return true;
            int price = CarCatalog.Cars[index].Price;
            if (Coins < price) return false;
            Coins -= price;
            Unlock(index);
            return true;
        }
    }
}
