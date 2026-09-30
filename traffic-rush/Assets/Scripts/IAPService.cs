using System;
using UnityEngine;
#if UNITY_IAP_ENABLED
using UnityEngine.Purchasing;
using UnityEngine.Purchasing.Extension;
#endif

namespace TrafficRush
{
    /// <summary>
    /// Blerjet brenda lojës: paketat e monedhave (consumable) dhe "Pa reklama" (non-consumable).
    /// Pa simbolin UNITY_IAP_ENABLED: në Editor blerjet dalin të suksesshme menjëherë, në pajisje dështojnë.
    /// Me UNITY_IAP_ENABLED: përdor Unity IAP (com.unity.purchasing 4.x). Shih MONETIZATION.md.
    /// Shpërblimet (monedhat / NoAds) i jep vetë ky shërbim.
    /// </summary>
    public static class IAPService
    {
        public const string NoAdsId = "com.wullnet.trafficrush.noads";
        const string NoAdsFallbackPrice = "2,99 €";

        public static readonly string[] CoinPackIds =
        {
            "com.wullnet.trafficrush.coins_small",
            "com.wullnet.trafficrush.coins_medium",
            "com.wullnet.trafficrush.coins_large",
        };
        public static readonly int[] CoinPackAmounts = { 1000, 3000, 10000 };
        public static readonly string[] CoinPackFallbackPrices = { "0,99 €", "2,99 €", "7,99 €" };

        static bool initialized;

        public static void Initialize()
        {
            if (initialized) return;
            initialized = true;
#if UNITY_IAP_ENABLED
            var builder = ConfigurationBuilder.Instance(StandardPurchasingModule.Instance());
            builder.AddProduct(NoAdsId, ProductType.NonConsumable);
            foreach (var id in CoinPackIds) builder.AddProduct(id, ProductType.Consumable);
            UnityPurchasing.Initialize(listener, builder);
#endif
        }

        /// <summary>Çmimi i lokalizuar nga dyqani nëse dihet, përndryshe çmimi rezervë.</summary>
        public static string PriceOf(string productId)
        {
#if UNITY_IAP_ENABLED
            var p = listener.Controller?.products.WithID(productId);
            if (p != null && p.availableToPurchase && !string.IsNullOrEmpty(p.metadata.localizedPriceString))
                return p.metadata.localizedPriceString;
#endif
            if (productId == NoAdsId) return NoAdsFallbackPrice;
            int i = Array.IndexOf(CoinPackIds, productId);
            return i >= 0 ? CoinPackFallbackPrices[i] : "";
        }

        /// <summary>Blen produktin dhe jep shpërblimin; onDone(true) nëse blerja u krye.</summary>
        public static void Buy(string productId, Action<bool> onDone)
        {
            Initialize();
            if (productId != NoAdsId && Array.IndexOf(CoinPackIds, productId) < 0)
            {
                Debug.LogWarning("IAP: produkt i panjohur " + productId);
                onDone?.Invoke(false);
                return;
            }
#if UNITY_IAP_ENABLED
            var controller = listener.Controller;
            var product = controller?.products.WithID(productId);
            if (product == null || !product.availableToPurchase || listener.Pending != null)
            {
                Debug.LogWarning("IAP: dyqani s'është gati ose ka një blerje në pritje.");
                onDone?.Invoke(false);
                return;
            }
            listener.Pending = onDone;
            listener.PendingId = productId;
            controller.InitiatePurchase(product);
#else
            if (Application.isEditor)
            {
                Grant(productId);
                onDone?.Invoke(true);
            }
            else
            {
                Debug.LogWarning("IAP: Unity IAP s'është aktivizuar (UNITY_IAP_ENABLED). Blerja dështoi.");
                onDone?.Invoke(false);
            }
#endif
        }

        /// <summary>Rikthen blerjet (vetëm iOS e kërkon); në platformat e tjera onDone(true).</summary>
        public static void RestorePurchases(Action<bool> onDone)
        {
            Initialize();
#if UNITY_IAP_ENABLED && UNITY_IOS
            if (listener.Extensions == null) { onDone?.Invoke(false); return; }
            // ProcessPurchase thirret për çdo blerje të rikthyer, kështu NoAds jepet atje.
            listener.Extensions.GetExtension<IAppleExtensions>().RestoreTransactions((ok, _) => onDone?.Invoke(ok));
#else
            onDone?.Invoke(true);
#endif
        }

        static void Grant(string productId)
        {
            if (productId == NoAdsId) { SaveSystem.NoAds = true; return; }
            int i = Array.IndexOf(CoinPackIds, productId);
            if (i >= 0) SaveSystem.Coins += CoinPackAmounts[i];
        }

#if UNITY_IAP_ENABLED
        static readonly StoreListener listener = new StoreListener();

        // Unity IAP kërkon një instancë që implementon ndërfaqen; callback-et vijnë në main thread.
        class StoreListener : IDetailedStoreListener
        {
            public IStoreController Controller;
            public IExtensionProvider Extensions;
            public Action<bool> Pending;
            public string PendingId;

            public void OnInitialized(IStoreController controller, IExtensionProvider extensions)
            {
                Controller = controller;
                Extensions = extensions;
                // Siguri shtesë: nëse NoAds është blerë por PlayerPrefs u fshi.
                var noAds = controller.products.WithID(NoAdsId);
                if (noAds != null && noAds.hasReceipt) SaveSystem.NoAds = true;
            }

            public void OnInitializeFailed(InitializationFailureReason error) => OnInitializeFailed(error, null);

            public void OnInitializeFailed(InitializationFailureReason error, string message)
            {
                Debug.LogWarning("IAP: inicializimi dështoi: " + error + " " + message);
                initialized = false; // lejo provë tjetër më vonë
            }

            public PurchaseProcessingResult ProcessPurchase(PurchaseEventArgs args)
            {
                // Thirret edhe për blerje të papërfunduara/të rikthyera pa Buy() — jepi gjithsesi.
                string id = args.purchasedProduct.definition.id;
                Grant(id);
                Finish(id, true);
                return PurchaseProcessingResult.Complete;
            }

            public void OnPurchaseFailed(Product product, PurchaseFailureReason reason)
            {
                Debug.LogWarning("IAP: blerja dështoi: " + product?.definition.id + " " + reason);
                Finish(product?.definition.id, false);
            }

            public void OnPurchaseFailed(Product product, PurchaseFailureDescription description)
            {
                Debug.LogWarning("IAP: blerja dështoi: " + product?.definition.id + " " + description?.reason + " " + description?.message);
                Finish(product?.definition.id, false);
            }

            void Finish(string id, bool ok)
            {
                if (Pending == null || id != PendingId) return;
                var cb = Pending;
                Pending = null;
                PendingId = null;
                cb(ok);
            }
        }
#endif
    }
}
