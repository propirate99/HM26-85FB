import { useCallback, useEffect, useState } from "react";

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setDenied(true);
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDenied(false);
        setError("");
        setCoords({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        setDenied(true);
        setError(err.message || "Location permission denied. This report will need manual review.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    capture();
  }, [capture]);

  return { coords, error, denied, capture };
}
