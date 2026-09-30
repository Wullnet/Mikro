using UnityEngine;

namespace TrafficRush
{
    /// <summary>Monedhë që rrotullohet dhe ecën me trafikun e korsisë; mblidhet nga PlayerCar.</summary>
    public class Coin : MonoBehaviour
    {
        public float Speed;

        void Update()
        {
            transform.position += Vector3.forward * (Speed * Time.deltaTime);
            transform.Rotate(0f, 180f * Time.deltaTime, 0f, Space.World);
        }
    }
}
