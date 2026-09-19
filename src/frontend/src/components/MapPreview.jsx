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
      map = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map);
      L.circleMarker([lat, lng], {
        radius: 10,
        color: "#37d39b",
        fillColor: "#37d39b",
        fillOpacity: 0.85,
        weight: 2
      }).addTo(map);
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
      <div className="map" ref={el} style={{ borderRadius: "var(--radius-sm)", overflow: "hidden" }} />
    </>
  );
}
