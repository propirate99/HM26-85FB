import { useEffect, useRef } from "react";

export function MapPreview({ lng, lat, label }) {
  const el = useRef(null);

  useEffect(() => {
    if (lng == null || lat == null || !el.current) return undefined;
    let map;
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled) return;
      const L = mod.default || mod;
      map = L.map(el.current).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      L.circleMarker([lat, lng], { radius: 10, color: "#7a1f2b", fillOpacity: 0.8 }).addTo(map);
    });
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [lng, lat]);

  if (lng == null || lat == null) {
    return <p className="muted">{label || "Map unavailable until GPS is captured."}</p>;
  }

  return (
    <>
      {label ? <p className="muted">{label}</p> : null}
      <div className="map" ref={el} />
    </>
  );
}
