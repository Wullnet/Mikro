using System;

namespace TrafficRush
{
    /// <summary>
    /// Vend-mbajtës për reklamat me shpërblim. Tani për tani shpërblen menjëherë.
    /// Në fazën e monetizimit, këtu lidhet Google Mobile Ads (AdMob) SDK:
    /// ngarko RewardedAd, shfaqe, dhe thirr onDone(true) vetëm kur përdoruesi e sheh deri në fund.
    /// </summary>
    public static class AdsService
    {
        public static void ShowRewarded(Action<bool> onDone)
        {
            onDone?.Invoke(true);
        }
    }
}
