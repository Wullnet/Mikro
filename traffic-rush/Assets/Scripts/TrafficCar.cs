using UnityEngine;

namespace TrafficRush
{
    /// <summary>Makinë trafiku që ecën drejt në korsinë e saj.</summary>
    [RequireComponent(typeof(Rigidbody))]
    public class TrafficCar : MonoBehaviour
    {
        public float Speed;
        Rigidbody rb;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.isKinematic = true;
            rb.useGravity = false;
        }

        public void Place(Vector3 position, float speed)
        {
            Speed = speed;
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
