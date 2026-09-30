using System;
using UnityEngine;

namespace TrafficRush
{
    /// <summary>Makina e lojtarit: ecën vetë përpara, ndërron korsi me swipe ose shigjeta.</summary>
    [RequireComponent(typeof(Rigidbody))]
    public class PlayerCar : MonoBehaviour
    {
        public event Action Crashed;
        public event Action CoinCollected;

        public float Speed { get; private set; }
        public bool Driving { get; private set; }
        public float Distance => transform.position.z - startZ;
        public float TopSpeed => def.TopSpeed;
        public BoxCollider Box { get; private set; }
        public float LastLaneChangeTime { get; private set; } = -10f;

        CarDef def;
        Rigidbody rb;
        GameObject model;
        int lane = 1;
        float startZ;

        // Swipe (në mobile, prekja simulohet si maus, kështu mjafton një rrugë e vetme)
        Vector2 pressPos;
        bool pressing, swipeUsed;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.isKinematic = true;
            rb.useGravity = false;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
        }

        public void SetModel(CarDef car)
        {
            def = car;
            if (model != null) Destroy(model);
            model = CarFactory.Build("Model", car.Color, transform, CarBody.Sedan, car.Spoiler);
            Box = model.GetComponent<BoxCollider>();
            Box.isTrigger = true;
        }

        public void ResetTo(Vector3 position)
        {
            lane = 1;
            LastLaneChangeTime = -10f;
            Speed = 0f;
            Driving = false;
            rb.position = position;
            rb.rotation = Quaternion.identity;
            transform.SetPositionAndRotation(position, Quaternion.identity);
            startZ = position.z;
        }

        public void StartDriving()
        {
            Speed = Mathf.Max(Speed, GameConfig.StartSpeed);
            Driving = true;
        }

        /// <summary>Pas reklamës "vazhdo": rinis me shpejtësi pak më të ulët.</summary>
        public void Revive()
        {
            Speed = Mathf.Max(GameConfig.StartSpeed, Speed * 0.8f);
            Driving = true;
        }

        void Update()
        {
            // Në pauzë (timeScale = 0) mos lexo input, që prekjet e butonave të mos ndërrojnë korsi.
            if (!Driving || Time.timeScale == 0f) { pressing = false; return; }
            HandleInput();
            Speed = Mathf.Min(def.TopSpeed, Speed + GameConfig.Acceleration * Time.deltaTime);
        }

        void FixedUpdate()
        {
            if (!Driving) return;
            Vector3 p = rb.position;
            float targetX = GameConfig.Lanes[lane];
            p.z += Speed * Time.fixedDeltaTime;
            p.x = Mathf.MoveTowards(p.x, targetX, def.Handling * Time.fixedDeltaTime);
            rb.MovePosition(p);

            // Anim i vogël: makina kthehet lehtë drejt korsisë ku po shkon.
            float yaw = Mathf.Clamp((targetX - p.x) * 8f, -14f, 14f);
            rb.MoveRotation(Quaternion.Euler(0f, yaw, 0f));
        }

        void HandleInput()
        {
            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) ChangeLane(-1);
            if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) ChangeLane(1);

            if (Input.GetMouseButtonDown(0))
            {
                pressing = true;
                swipeUsed = false;
                pressPos = Input.mousePosition;
            }
            else if (Input.GetMouseButtonUp(0))
            {
                pressing = false;
            }

            if (pressing && !swipeUsed)
            {
                float dx = ((Vector2)Input.mousePosition - pressPos).x;
                float threshold = Screen.width * 0.06f;
                if (Mathf.Abs(dx) > threshold)
                {
                    ChangeLane(dx > 0 ? 1 : -1);
                    swipeUsed = true;
                }
            }
        }

        void ChangeLane(int dir)
        {
            int next = Mathf.Clamp(lane + dir, 0, GameConfig.Lanes.Length - 1);
            if (next == lane) return;
            lane = next;
            LastLaneChangeTime = Time.time;
            if (AudioManager.Instance != null) AudioManager.Instance.PlayLaneChange();
        }

        void OnTriggerEnter(Collider other)
        {
            if (!Driving) return;

            var coin = other.GetComponent<Coin>();
            if (coin != null)
            {
                coin.gameObject.SetActive(false);
                CoinCollected?.Invoke();
                return;
            }

            if (other.GetComponentInParent<TrafficCar>() != null)
            {
                Driving = false;
                Crashed?.Invoke();
            }
        }
    }
}
