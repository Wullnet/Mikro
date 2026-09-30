# Traffic Rush — Data safety (Google Play) & App Privacy (Apple)

Përgjigjet më poshtë përputhen me [`privacy-policy.html`](privacy-policy.html) dhe me gjendjen aktuale të kodit:
progresi ruhet vetëm lokalisht (PlayerPrefs), **Google AdMob** për reklama, **Unity IAP** për blerje, **pa** analytics,
**pa** llogari, **pa** server tonin.

> ⚠️ Nëse shtohet Firebase Analytics / Crashlytics (faza 4 e roadmap-it), App Tracking Transparency ose ndonjë SDK
> tjetër, përditëso **të dyja** formularët dhe politikën e privatësisë **para** se të dërgosh build-in.
> Kontrollo edhe udhëzimet zyrtare të SDK-ve (ndryshojnë herë pas here):
> - AdMob / Play: <https://developers.google.com/admob/android/privacy/play-data-disclosure>
> - AdMob / Apple: <https://developers.google.com/admob/ios/privacy/data-disclosure>
> - Unity IAP / Unity Gaming Services: <https://docs.unity.com/ugs/en-us/manual/overview/manual/google-play-data-safety>

---

## 1. Google Play — Data safety
Play Console → *Policy → App content → Data safety*.

### Pyetjet e përgjithshme
| Pyetja | Përgjigja |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (nga AdMob SDK) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (AdMob dhe Play Billing përdorin HTTPS) |
| Which of the following methods of account creation does your app support? | **My app does not allow users to create an account** |
| Do you provide a way for users to request that their data is deleted? | **No** — nuk ka llogari dhe s'ruajmë asgjë në server; të dhënat lokale fshihen me çinstalim. (Opsionale: *Yes* me URL-në e privacy policy + `CONTACT_EMAIL`.) |
| Has your app been independently validated against a global security standard (MASA)? | **No** |
| Is your app designed for children / Families policy? | **No** (target audience 13+) |

### Llojet e të dhënave
| Kategoria → lloji | Collected | Shared | Ephemeral? | Required / optional | Qëllimet (purposes) |
|---|---|---|---|---|---|
| **Location → Approximate location** (nga IP, AdMob) | Yes | Yes | No | Required | Advertising or marketing, Analytics, Fraud prevention, security & compliance |
| **App activity → App interactions** (shfaqje/klikime reklamash, AdMob) | Yes | Yes | No | Required | Advertising or marketing, Analytics, Fraud prevention, security & compliance |
| **App info and performance → Crash logs** (AdMob) | Yes | Yes | No | Required | Analytics, Fraud prevention, security & compliance |
| **App info and performance → Diagnostics** (AdMob) | Yes | Yes | No | Required | Analytics, Fraud prevention, security & compliance |
| **Device or other IDs** (Advertising ID / App set ID, AdMob) | Yes | Yes | No | Required | Advertising or marketing, Analytics, Fraud prevention, security & compliance |
| **Financial info → Purchase history** (Unity IAP, konfirmimi i blerjes) | Yes | No | No | Optional (vetëm kur blen) | App functionality |

Të gjitha llojet e tjera (Personal info, Health, Messages, Photos/Videos, Audio, Files, Calendar, Contacts, Web
browsing, Precise location, Payment info) → **Not collected**.

**Shënime**
- Të dhënat në PlayerPrefs **nuk** deklarohen: sipas Google, të dhënat që nuk dalin nga pajisja nuk konsiderohen "collected".
- Të dhënat e pagesës (karta etj.) i përpunon Google Play Billing — nuk i deklaron ti.
- "Shared": transferimi te Google për reklama deklarohet si *shared* (qasje konservative, siç sugjeron Google për AdMob).
- **Advertising ID declaration** (Play Console → App content → Advertising ID): **Yes, my app uses advertising ID** →
  qëllimet: *Advertising or marketing*, *Analytics*, *Fraud prevention, security, and compliance*.
  Manifesti duhet të ketë `com.google.android.gms.permission.AD_ID` (plugin-i i AdMob e shton vetë).
- **Ads** (App content → Ads): **Yes, my app contains ads**.

---

## 2. Apple — App Privacy ("nutrition label")
App Store Connect → aplikacioni → *App Privacy* → *Get Started*.

**Do you or your third-party partners collect data from this app?** → **Yes**

### Llojet e të dhënave (zgjidh vetëm këto)
| Data type | Qëllimet (purposes) | Linked to the user? | Used for tracking? |
|---|---|---|---|
| **Identifiers → Device ID** (AdMob: IDFV; IDFA vetëm me leje ATT) | Third-Party Advertising, Analytics | No | **No** tani (pa ATT) — **Yes** nëse shtohet ATT/IDFA |
| **Usage Data → Product Interaction** (AdMob) | Third-Party Advertising, Analytics | No | No |
| **Usage Data → Advertising Data** (AdMob) | Third-Party Advertising, Analytics | No | No (Yes me ATT/IDFA) |
| **Diagnostics → Crash Data** (AdMob) | Analytics | No | No |
| **Diagnostics → Performance Data** (AdMob) | Analytics | No | No |
| **Diagnostics → Other Diagnostic Data** (AdMob) | Analytics | No | No |
| **Location → Coarse Location** (nga IP, AdMob) | Third-Party Advertising, Analytics | No | No |
| **Purchases → Purchase History** (Unity IAP) | App Functionality | No | No |

Mos zgjidh: Contact Info, Health & Fitness, Financial Info, Precise Location, Sensitive Info, Contacts,
User Content, Browsing History, Search History, User ID, Other Data.

**Rezultati në dyqan (pa ATT):** *Data Not Linked to You* — Identifiers, Usage Data, Diagnostics, Location, Purchases.
*Data Used to Track You* — asnjë.

### App Tracking Transparency (ATT)
- Aktualisht loja **nuk** shfaq kërkesën ATT ⇒ AdMob nuk merr IDFA dhe shfaq reklama jo të personalizuara në iOS.
- Nëse shton ATT (`NSUserTrackingUsageDescription` + `ATTrackingManager.requestTrackingAuthorization`) për të
  rritur të ardhurat: te tabela e mësipërme shëno **Device ID** dhe **Advertising Data** si *Used for tracking: Yes*,
  dhe kërkesa ATT duhet të shfaqet **para** inicializimit të AdMob.
- **Privacy manifest (`PrivacyInfo.xcprivacy`)**: Google Mobile Ads SDK (v11+) dhe Unity 6 përfshijnë manifestet e tyre;
  Xcode i bashkon në *Privacy Report* (Product → Archive → Generate Privacy Report) — kontrolloje para dërgimit.

---

## 3. Përmbledhje e qëndrueshmërisë
| | Privacy policy | Play Data safety | Apple App Privacy |
|---|---|---|---|
| Progresi lokal (PlayerPrefs) | §1 — vetëm në pajisje | Nuk deklarohet | Nuk deklarohet |
| Advertising ID / Device ID | §2 | Device or other IDs | Identifiers → Device ID |
| IP → vendndodhje e përafërt | §2 | Approximate location | Coarse Location |
| Ndërveprime me reklamat | §2 | App interactions | Product Interaction, Advertising Data |
| Diagnostika | §2 | Crash logs, Diagnostics | Crash/Performance/Other Diagnostic Data |
| Blerjet | §3 | Purchase history | Purchase History |
| Fëmijët | §4 — jo nën 13 | Target 13+, jo Families | Made for Kids: No |
