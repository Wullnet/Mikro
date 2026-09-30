using System;
using UnityEngine;
#if ADMOB_ENABLED
using GoogleMobileAds.Api;
#endif

namespace TrafficRush
{
    /// <summary>
    /// Reklamat: me shpërblim ("Vazhdo") dhe interstitial pas çdo game over-i të 3-të.
    /// Pa simbolin ADMOB_ENABLED: reklama me shpërblim jep shpërblim menjëherë, interstitial-et s'bëjnë asgjë.
    /// Me ADMOB_ENABLED: përdor Google Mobile Ads (AdMob) v9+. Shih MONETIZATION.md.
    /// </summary>
    public static class AdsService
    {
        const int InterstitialEvery = 3;

        static bool initialized;
        static int gameOvers;

        public static void Initialize()
        {
            if (initialized) return;
            initialized = true;
#if ADMOB_ENABLED
            // Callback-et e AdMob-it vijnë ndonjëherë në thread tjetër; kështu vijnë në main thread.
            MobileAds.RaiseAdEventsOnUnityMainThread = true;
            MobileAds.Initialize(_ =>
            {
                LoadRewarded();
                LoadInterstitial();
            });
#endif
        }

        /// <summary>onDone(true) = lojtari e fitoi shpërblimin. Thirret saktësisht një herë, në main thread.</summary>
        public static void ShowRewarded(Action<bool> onDone)
        {
            Initialize();
#if ADMOB_ENABLED
            if (rewarded == null || !rewarded.CanShowAd())
            {
                LoadRewarded();
                onDone?.Invoke(false);
                return;
            }

            var ad = rewarded;
            rewarded = null;
            bool earned = false, done = false;
            Action<bool> finish = ok =>
            {
                if (done) return;
                done = true;
                ad.Destroy();
                LoadRewarded(); // parangarko tjetrën
                onDone?.Invoke(ok);
            };
            ad.OnAdFullScreenContentClosed += () => finish(earned);
            ad.OnAdFullScreenContentFailed += _ => finish(false);
            ad.Show(_ => earned = true);
#else
            onDone?.Invoke(true);
#endif
        }

        /// <summary>Thirret në çdo game over; shfaq interstitial çdo herë të 3-të (asnjëherë me NoAds).</summary>
        public static void OnGameOver()
        {
            Initialize();
            gameOvers++;
            if (SaveSystem.NoAds || gameOvers % InterstitialEvery != 0) return;
#if ADMOB_ENABLED
            if (interstitial == null || !interstitial.CanShowAd())
            {
                LoadInterstitial();
                return;
            }
            var ad = interstitial;
            interstitial = null;
            bool done = false;
            Action finish = () =>
            {
                if (done) return;
                done = true;
                ad.Destroy();
                LoadInterstitial();
            };
            ad.OnAdFullScreenContentClosed += finish;
            ad.OnAdFullScreenContentFailed += _ => finish();
            ad.Show();
#endif
        }

#if ADMOB_ENABLED
        // ID-të zyrtare TEST të Google-it. ZËVENDËSO me ID-të reale para publikimit
        // (dhe App ID-të te Assets → Google Mobile Ads → Settings).
#if UNITY_ANDROID
        const string RewardedId = "ca-app-pub-3940256099942544/5224354917";
        const string InterstitialId = "ca-app-pub-3940256099942544/1033173712";
#elif UNITY_IOS
        const string RewardedId = "ca-app-pub-3940256099942544/1712485313";
        const string InterstitialId = "ca-app-pub-3940256099942544/4411468910";
#else
        const string RewardedId = "unused";
        const string InterstitialId = "unused";
#endif

        static RewardedAd rewarded;
        static InterstitialAd interstitial;
        static bool loadingRewarded, loadingInterstitial;

        static void LoadRewarded()
        {
            if (loadingRewarded || rewarded != null) return;
            loadingRewarded = true;
            RewardedAd.Load(RewardedId, new AdRequest(), (ad, error) =>
            {
                loadingRewarded = false;
                if (error != null || ad == null) { Debug.LogWarning("Rewarded s'u ngarkua: " + error?.GetMessage()); return; }
                rewarded = ad;
            });
        }

        static void LoadInterstitial()
        {
            if (SaveSystem.NoAds || loadingInterstitial || interstitial != null) return;
            loadingInterstitial = true;
            InterstitialAd.Load(InterstitialId, new AdRequest(), (ad, error) =>
            {
                loadingInterstitial = false;
                if (error != null || ad == null) { Debug.LogWarning("Interstitial s'u ngarkua: " + error?.GetMessage()); return; }
                interstitial = ad;
            });
        }
#endif
    }
}
