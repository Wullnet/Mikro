using System;
using UnityEngine;

namespace TrafficRush
{
    /// <summary>
    /// Zëri i lojës, krejt procedural: të gjithë klipet gjenerohen në Awake me AudioClip.Create,
    /// pa asnjë skedar audio. Një burim për efektet, një për motorin (loop) dhe një për muzikën (loop).
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        const int Rate = 44100;
        const string MutedKey = "tr_muted";
        const float EngineMaxVolume = 0.25f;
        const float MusicVolume = 0.18f;

        AudioSource sfx, engine, music;
        AudioClip coin, crash, nearMiss, laneChange, click, engineLoop, musicLoop;

        float engineTargetVol, engineTargetPitch = 0.7f;
        bool muted;

        // Gjenerator i thjeshtë zhurme, i pavarur nga UnityEngine.Random.
        readonly System.Random rng = new System.Random(1234);

        public static void Ensure()
        {
            if (Instance == null)
                new GameObject("AudioManager").AddComponent<AudioManager>();
        }

        public bool Muted
        {
            get => muted;
            set
            {
                muted = value;
                AudioListener.volume = muted ? 0f : 1f;
                PlayerPrefs.SetInt(MutedKey, muted ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            sfx = NewSource(false, 1f);
            engine = NewSource(true, 0f);
            music = NewSource(true, MusicVolume);

            coin = BuildCoin();
            crash = BuildCrash();
            nearMiss = BuildNearMiss();
            laneChange = BuildLaneChange();
            click = BuildClick();
            engineLoop = BuildEngine();
            musicLoop = BuildMusic();
            engine.clip = engineLoop;
            music.clip = musicLoop;

            muted = PlayerPrefs.GetInt(MutedKey, 0) == 1;
            AudioListener.volume = muted ? 0f : 1f;
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        AudioSource NewSource(bool loop, float volume)
        {
            var s = gameObject.AddComponent<AudioSource>();
            s.playOnAwake = false;
            s.loop = loop;
            s.volume = volume;
            s.spatialBlend = 0f;
            return s;
        }

        // ---------- API publike ----------

        public void PlayCoin() => sfx.PlayOneShot(coin, 0.7f);
        public void PlayCrash() => sfx.PlayOneShot(crash, 1f);
        public void PlayNearMiss() => sfx.PlayOneShot(nearMiss, 0.8f);
        public void PlayLaneChange() => sfx.PlayOneShot(laneChange, 0.5f);
        public void PlayClick() => sfx.PlayOneShot(click, 0.6f);

        public void SetEngine(bool on, float speed01)
        {
            speed01 = Mathf.Clamp01(speed01);
            engineTargetVol = on ? EngineMaxVolume * (0.6f + 0.4f * speed01) : 0f;
            engineTargetPitch = Mathf.Lerp(0.7f, 2f, speed01);
            if (on && !engine.isPlaying) { engine.volume = 0f; engine.Play(); }
        }

        public void SetMusic(bool playing)
        {
            if (playing && !music.isPlaying) music.Play();
            else if (!playing && music.isPlaying) music.Stop();
        }

        void Update()
        {
            // Zbutja e motorit: volumi dhe tonaliteti ndjekin objektivin gradualisht (edhe kur loja është në pauzë).
            float dt = Time.unscaledDeltaTime;
            engine.volume = Mathf.MoveTowards(engine.volume, engineTargetVol, dt * 0.8f);
            engine.pitch = Mathf.Lerp(engine.pitch, engineTargetPitch, Mathf.Clamp01(dt * 4f));
            if (engineTargetVol <= 0f && engine.volume <= 0.001f && engine.isPlaying) engine.Stop();
        }

        // ---------- Gjenerimi i klipeve ----------

        static float[] Buffer(float seconds) => new float[Mathf.Max(1, (int)(seconds * Rate))];

        static AudioClip MakeClip(string name, float[] data)
        {
            var clip = AudioClip.Create(name, data.Length, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        // Mbështjellëse me hyrje/dalje të shkurtra lineare, që të mos dëgjohen "klik"-e.
        static float Fade(int i, int n, float attackSec, float releaseSec)
        {
            float a = attackSec * Rate, r = releaseSec * Rate;
            float g = 1f;
            if (a > 0f && i < a) g = i / a;
            int left = n - 1 - i;
            if (r > 0f && left < r) g = Mathf.Min(g, left / r);
            return g;
        }

        static float Sin(double phase) => (float)Math.Sin(phase);
        static float Exp(double x) => (float)Math.Exp(x);
        float Noise() => (float)(rng.NextDouble() * 2.0 - 1.0);

        AudioClip BuildCoin()
        {
            // Dy tone të larta (E6 → A6) me pak harmonikë katrore për shkëlqim.
            var d = Buffer(0.22f);
            int split = (int)(0.07f * Rate);
            double phase = 0;
            for (int i = 0; i < d.Length; i++)
            {
                float f = i < split ? 1318.5f : 1760f;
                phase += 2 * Math.PI * f / Rate;
                float t = (i < split ? i : i - split) / (float)Rate;
                float tone = Sin(phase) * 0.7f + (Sin(phase) > 0 ? 0.3f : -0.3f) * 0.5f;
                d[i] = tone * Exp(-t * 14f) * Fade(i, d.Length, 0.002f, 0.01f) * 0.6f;
            }
            return MakeClip("coin", d);
        }

        AudioClip BuildCrash()
        {
            // Zhurmë e filtruar + goditje e ulët (frekuencë që bie), me shuarje ~0.6 s.
            var d = Buffer(0.7f);
            float lp = 0f;
            double phase = 0;
            for (int i = 0; i < d.Length; i++)
            {
                float t = i / (float)Rate;
                lp += (Noise() - lp) * 0.35f;
                phase += 2 * Math.PI * (40f + 70f * Exp(-t * 12f)) / Rate;
                float thump = Sin(phase) * Exp(-t * 7f);
                float noise = lp * Exp(-t * 6f);
                d[i] = (noise * 0.8f + thump * 0.9f) * Fade(i, d.Length, 0.001f, 0.05f) * 0.8f;
            }
            return MakeClip("crash", d);
        }

        AudioClip BuildNearMiss()
        {
            // "Whoosh": zhurmë përmes filtri me një pol, prerja rritet e pastaj bie.
            var d = Buffer(0.35f);
            float lp = 0f;
            for (int i = 0; i < d.Length; i++)
            {
                float x = i / (float)(d.Length - 1);
                float bell = Sin(Math.PI * x);
                float k = 0.03f + 0.35f * bell;
                lp += (Noise() - lp) * k;
                d[i] = lp * bell * bell * Fade(i, d.Length, 0.005f, 0.02f) * 1.4f;
            }
            return MakeClip("nearmiss", d);
        }

        AudioClip BuildLaneChange()
        {
            // Fërshëllimë e butë dhe shumë e shkurtër.
            var d = Buffer(0.12f);
            float lp = 0f;
            for (int i = 0; i < d.Length; i++)
            {
                float x = i / (float)(d.Length - 1);
                float bell = Sin(Math.PI * x);
                lp += (Noise() - lp) * (0.05f + 0.15f * x);
                d[i] = lp * bell * Fade(i, d.Length, 0.003f, 0.01f) * 1.2f;
            }
            return MakeClip("lane", d);
        }

        AudioClip BuildClick()
        {
            var d = Buffer(0.035f);
            double phase = 0;
            for (int i = 0; i < d.Length; i++)
            {
                float t = i / (float)Rate;
                phase += 2 * Math.PI * 1100f / Rate;
                d[i] = (Sin(phase) * 0.8f + Noise() * 0.15f) * Exp(-t * 120f) * Fade(i, d.Length, 0.0005f, 0.005f) * 0.7f;
            }
            return MakeClip("click", d);
        }

        AudioClip BuildEngine()
        {
            // 60 Hz = saktësisht 735 mostra për periodë; 20 perioda → loop pa kërcitje.
            const int period = 735;
            const int periods = 20;
            var d = new float[period * periods];
            for (int i = 0; i < d.Length; i++)
            {
                double p = (i % period) / (double)period;
                float saw = (float)(p * 2.0 - 1.0);
                float sine = Sin(2 * Math.PI * p);
                float sub = Sin(2 * Math.PI * 2 * p) * 0.3f;
                // Luhatje e lehtë 15 Hz (4 perioda) për "gurgullimë" motori.
                float wobble = 0.85f + 0.15f * Sin(2 * Math.PI * (i % (period * 4)) / (period * 4));
                d[i] = (saw * 0.35f + sine * 0.55f + sub) * wobble * 0.6f;
            }
            return MakeClip("engine", d);
        }

        AudioClip BuildMusic()
        {
            // 8 taktë × 8 hapa × 0.125 s = 8 s. Progresioni Am–F–C–G (2 takte secili).
            const float step = 0.125f;
            const int stepsPerBar = 8, bars = 8;
            int stepLen = (int)(step * Rate);
            var d = new float[stepLen * stepsPerBar * bars];
            int[][] chords =
            {
                new[] { 57, 60, 64 }, // Am
                new[] { 53, 57, 60 }, // F
                new[] { 48, 52, 55 }, // C
                new[] { 55, 59, 62 }, // G
            };
            int[] arpOrder = { 0, 1, 2, 1, 0, 2, 1, 2 };

            for (int bar = 0; bar < bars; bar++)
            {
                int[] ch = chords[bar / 2];
                for (int s = 0; s < stepsPerBar; s++)
                {
                    int start = (bar * stepsPerBar + s) * stepLen;
                    // Bas: rrënja një oktavë poshtë, me oktavë lart në hapat tek.
                    float bassF = Midi(ch[0] - 12 + (s % 2 == 1 ? 12 : 0));
                    float arpF = Midi(ch[arpOrder[s]] + 12);
                    double pb = 0, pa = 0;
                    for (int i = 0; i < stepLen; i++)
                    {
                        float t = i / (float)Rate;
                        pb += bassF / Rate;
                        pa += arpF / Rate;
                        // Bas trekëndor, arpexho me valë katrore 25% (tingull chiptune).
                        double fb = pb - Math.Floor(pb);
                        float tri = (float)(fb < 0.5 ? fb * 4 - 1 : 3 - fb * 4);
                        float pulse = (pa - Math.Floor(pa)) < 0.25 ? 1f : -1f;
                        float env = Fade(i, stepLen, 0.003f, 0.01f);
                        d[start + i] = (tri * 0.5f * Exp(-t * 4f) + pulse * 0.18f * Exp(-t * 18f)) * env;
                    }
                }
            }
            return MakeClip("music", d);
        }

        static float Midi(int note) => 440f * (float)Math.Pow(2.0, (note - 69) / 12.0);
    }
}
