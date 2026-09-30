using UnityEngine;

namespace TrafficRush
{
    /// <summary>Makinë trafiku që ecën drejt në korsinë e saj.</summary>
    [RequireComponent(typeof(Rigidbody))]
    public class TrafficCar : MonoBehaviour
    {
        public float Speed;
        public BoxCollider Box { get; private set; }

        // Near-miss: hapësira anësore më e vogël ndërsa lojtari ishte krah saj, dhe nëse u kontrollua.
        public float MinGap;
        public bool Passed;

        Rigidbody rb;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.isKinematic = true;
            rb.useGravity = false;
            Box = GetComponent<BoxCollider>();
        }

        public void Place(Vector3 position, float speed)
        {
            Speed = speed;
            MinGap = float.MaxValue;
            Passed = false;
            rb.position = position;
            transform.position = position;
            gameObject.SetActive(true);
        }

        void FixedUpdate()
        {
            rb.MovePosition(rb.position + Vector3.forward * (Speed * Time.fixedDeltaTime));
        }
    }
}
