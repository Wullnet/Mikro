# Traffic Rush — store listing (English)

> Every field is inside a ```text``` block. Limits are checked with `python3 store/check_limits.py`.
> Paste **only** the block contents into App Store Connect / Play Console.

**Trademarks:** don't use car brand names (Golf, Benz, Audi, BMW, Porsche) in store text, screenshots with logos
or the icon — Apple guideline 5.2.1 and Google Play's IP/metadata policy can lead to rejection or a takedown
request. The text below says "legendary cars" without brands.

**Language:** English (U.S.) is the **primary** localization on the App Store (Albanian is not an App Store
Connect language). On Google Play, use English (en-US) as default and add Albanian (sq) from `listing-sq.md`.

---

## App name (≤30, iOS + Play)
```text
Traffic Rush: Highway Racer
```

## Subtitle (≤30, iOS only)
```text
Dodge traffic, collect coins
```

## Short description (≤80, Play only)
```text
Dodge traffic on the Tirana–Durrës highway, grab coins, unlock legendary cars!
```

## Keywords (≤100, iOS only, comma-separated, no spaces; name/subtitle words are indexed already)
```text
car,racing,driving,road,endless,runner,arcade,speed,drive,lane,albania,tirana,durres,kosovo,makina
```

## Category
- **App Store:** Primary *Games* → subcategory **Racing**; secondary *Games → Casual* (optional).
- **Google Play:** App type *Game* → Category **Racing**. Tags: *Arcade racing*, *Casual*, *Endless runner*, *Offline*.

## Full description (≤4000, iOS + Play)
```text
Rush hour on the Tirana–Durrës highway — and your foot is on the gas! 🚗💨

Traffic Rush is a fast, one-thumb arcade racer: your car drives itself, you swipe left or right to change lanes, dodge traffic and collect coins. The further you go, the faster you drive and the heavier the traffic gets. How far can you make it?

🛣️ 3-LANE HIGHWAY
• Simple one-finger controls — swipe left/right
• Every lane has its own speed: the left lane is for the brave
• Difficulty ramps up smoothly — easy to start, hard to put down

🪙 COINS & BONUSES
• Grab coins in the free lane
• Squeeze past cars for a NEAR-MISS bonus
• Daily missions with fresh rewards every day

🏁 GARAGE: 5 LEGENDARY CARS
Start with the iconic Balkan hatchback and save up for the classics every Albanian knows — from the boxy '80s German sedan to the dream sports car. Every car is faster and handles better than the last.

🗺️ MAPS
• Tirana–Durrës — the classic
• Llogara Pass — mountain curves and sea views
• Prishtina by Night — city lights

⏱️ MADE FOR SHORT BREAKS
A run lasts 1–3 minutes: perfect on the bus, in a queue or on a coffee break. Portrait, one hand, works offline.

💡 FAIR TO PLAY
Traffic Rush is free. After a crash you can continue once by watching a rewarded ad — only if you want to. Optional in-app purchases: coin packs and "Remove Ads".

Your progress is stored only on your phone. No account, no sign-up.

Hop in and show everyone who rules the highway! 🏆
```

## What's new — v0.1.0 (≤4000 iOS, ≤500 Play)
```text
The first release of Traffic Rush! 🎉
• The Tirana–Durrës highway with 3 lanes and traffic
• 5 cars to unlock in the garage
• Coins, daily missions and near-miss bonus
• Llogara Pass and Prishtina by Night maps
Tell us what you think — every review helps us make the game better!
```

## In-app purchase display names (≤30) — App Store Connect / Play Console
| Product ID | Name | Description (≤45 iOS) |
|---|---|---|
| `com.wullnet.trafficrush.coins_small` | 1,000 Coins | A handful of coins for your next car. |
| `com.wullnet.trafficrush.coins_medium` | 3,000 Coins | A solid stack of coins. |
| `com.wullnet.trafficrush.coins_large` | 10,000 Coins | Unlock the garage faster. |
| `com.wullnet.trafficrush.noads` | Remove Ads | No more ads between runs. |

(“Remove Ads” removes interstitial ads; the optional rewarded “Continue” ad stays available because the player chooses it.)

## URLs
- **Privacy Policy:** `https://wullnet.github.io/Mikro/traffic-rush/store/privacy-policy.html`
- **Support URL (required on iOS):** same page, or any page showing `CONTACT_EMAIL`.
- **Marketing URL (optional):** `https://wullnet.github.io/Mikro/`

## App Review notes (App Store Connect → App Review Information)
```text
Traffic Rush is a single-player offline arcade game. No login is required.
Controls: swipe left/right to change lanes. After a crash, "Continue" shows an optional rewarded ad (AdMob).
In-app purchases: 3 consumable coin packs and 1 non-consumable "Remove Ads" (restorable via the "Restore purchases" button in the shop/garage).
All game progress is stored locally on the device; we do not operate any servers.
```

---

## Age rating
The questionnaire answers (IARC for Google Play and Apple's age-rating questionnaire) are in
[`listing-sq.md`](listing-sq.md#vlerësimi-i-moshës--iarc-google-play) — they are identical for every language.
Summary: no violence against people, no gambling, no loot boxes, no user-generated content or chat;
**contains ads** and **in-app purchases**. Expected: **PEGI 3 / ESRB Everyone / Apple 4+**
(optionally override Apple to 13+). Play target audience: **13+ only** (to stay outside the Families policy).
