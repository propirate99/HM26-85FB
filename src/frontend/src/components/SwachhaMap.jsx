import { useEffect, useRef } from "react";

export function SwachhaMap({
  mode = "centroid", // "centroid" | "choropleth"
  wards = [],
  facilities = [],
  wardsGeoJson = null,
  metric = "coverage", // for choropleth
  onSelectWard = null,
  selectedWardId = null,
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    import("leaflet").then((mod) => {
      if (cancelled || mapInstance.current) return;
      const L = mod.default || mod;

      const map = L.map(mapContainer.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([12.305, 76.645], 12);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map);

      layerGroup.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    });

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Layers when data / mode / metric changes
  useEffect(() => {
    if (!mapInstance.current || !layerGroup.current) return;
    import("leaflet").then((mod) => {
      const L = mod.default || mod;
      layerGroup.current.clearLayers();

      // Render Facilities
      if (facilities && facilities.length) {
        facilities.forEach((fac) => {
          const lat = fac.lat || (fac.pos ? fac.pos[1] : 0);
          const lng = fac.lng || (fac.pos ? fac.pos[0] : 0);
          if (!lat || !lng) return;

          const facMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: "#7ad6b4",
            weight: 2,
            fillColor: "#131c22",
            fillOpacity: 0.9,
          });

          facMarker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 13px; color: #111;">
              <strong style="color: #0d5c4a;">${fac.name}</strong><br/>
              <b>Capacity:</b> ${fac.capacity_tpd || fac.cap} TPD<br/>
              <b>Type:</b> ${fac.kind || "Processing Plant"}<br/>
              <b>Serves:</b> ${fac.serves || "Designated Wards"}
            </div>
          `);
          layerGroup.current.addLayer(facMarker);
        });
      }

      // Mode: Centroid & Haulage Vectors
      if (mode === "centroid" && wards && wards.length) {
        wards.forEach((w) => {
          const lat = w.lat || (w.centroid ? w.centroid[1] : 0);
          const lng = w.lng || (w.centroid ? w.centroid[0] : 0);
          if (!lat || !lng) return;

          const status = w.status || (w.util > 1.0 ? "critical" : "stable");
          let color = "#10b981"; // stable
          if (status === "critical") color = "#ef4444";
          else if (status === "strained") color = "#f59e0b";

          const radius = Math.max(5, Math.min(14, (w.gen || 5) * 0.8));
          const isSelected = selectedWardId === w.ward || selectedWardId === w.ward_no;

          const marker = L.circleMarker([lat, lng], {
            radius: isSelected ? radius + 4 : radius,
            color: isSelected ? "#fff" : color,
            weight: isSelected ? 3 : 1.5,
            fillColor: color,
            fillOpacity: 0.85,
          });

          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 13px; color: #111;">
              <strong>Ward ${w.ward || w.ward_no}: ${w.name}</strong> (Zone ${w.zone})<br/>
              <b>Avg Generation:</b> ${(w.gen || w.avg_generated_tpd || 0).toFixed(1)} TPD<br/>
              <b>Collection:</b> ${(w.rate || w.collection_pct || 100).toFixed(1)}%<br/>
              <b>Standing Backlog:</b> ${(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t<br/>
              <b>Nearest Plant:</b> ${w.nearest_facility || w.facility?.name || "VID"} (${(w.distance_km || w.haulKm || 0).toFixed(1)} km)
            </div>
          `);

          marker.on("click", () => {
            if (onSelectWard) onSelectWard(w);
          });

          layerGroup.current.addLayer(marker);

          // If selected, draw line to facility
          if (isSelected && (w.facility || w.nearest_facility)) {
            const facId = w.facility?.name || w.nearest_facility;
            const targetFac = facilities.find(
              (f) => f.id === facId || f.name === facId || (w.facility && f.name === w.facility.name)
            );
            if (targetFac) {
              const fLat = targetFac.lat || targetFac.pos[1];
              const fLng = targetFac.lng || targetFac.pos[0];
              const polyline = L.polyline(
                [
                  [lat, lng],
                  [fLat, fLng],
                ],
                { color: "#7ad6b4", weight: 2, dashArray: "4, 6" }
              );
              layerGroup.current.addLayer(polyline);
            }
          }
        });
      }

      // Mode: Choropleth Polygons
      if (mode === "choropleth" && wardsGeoJson) {
        const geoLayer = L.geoJSON(wardsGeoJson, {
          style: (feature) => {
            const p = feature.properties;
            const simWard = wards.find((w) => w.ward_no === p.ward_no);
            let val = 0;
            let fillColor = "#34d399";

            if (simWard) {
              if (metric === "gen") val = simWard.gen;
              else if (metric === "coverage") val = simWard.coverage * 100;
              else if (metric === "backlog") val = simWard.uncollected;
              else if (metric === "density") val = simWard.density;
              else if (metric === "fuel") val = simWard.fuel;
            }

            if (metric === "coverage") {
              if (val < 85) fillColor = "#ef4444";
              else if (val < 95) fillColor = "#f59e0b";
              else fillColor = "#10b981";
            } else if (metric === "backlog") {
              if (val > 1.5) fillColor = "#ef4444";
              else if (val > 0.4) fillColor = "#f59e0b";
              else fillColor = "#10b981";
            } else {
              if (val > 14) fillColor = "#ef4444";
              else if (val > 8) fillColor = "#f59e0b";
              else fillColor = "#3b82f6";
            }

            return {
              color: "#7ad6b4",
              weight: 1,
              fillColor,
              fillOpacity: 0.65,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties;
            const simWard = wards.find((w) => w.ward_no === p.ward_no);
            layer.bindPopup(`
              <div style="font-family: sans-serif; font-size: 13px; color: #111;">
                <strong>Ward ${p.ward_no}: ${p.name}</strong><br/>
                <b>Zone:</b> ${p.zone} (${p.zone_name || ""})<br/>
                <b>Generation:</b> ${simWard ? simWard.gen.toFixed(1) : p.waste_tpd} TPD<br/>
                <b>Coverage:</b> ${simWard ? (simWard.coverage * 100).toFixed(1) : "100"}%<br/>
                <b>Uncollected:</b> ${simWard ? simWard.uncollected.toFixed(2) : "0"} t<br/>
                <b>Trips/day:</b> ${simWard ? simWard.trips.toFixed(1) : "—"}
              </div>
            `);
            layer.on("click", () => {
              if (onSelectWard && simWard) onSelectWard(simWard);
            });
          },
        });
        layerGroup.current.addLayer(geoLayer);
      }
    });
  }, [mode, wards, facilities, wardsGeoJson, metric, selectedWardId, onSelectWard]);

  return (
    <div className="swm-map-container">
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
