"""Generate a synthetic-but-calibrated ward geometry set for Mysuru City Corporation.

65 wards, 9 zones, total MSW = 600 t/day (user scenario input).
Ward boundaries are Voronoi cells over seeded points inside an approximation of the
MCC administrative limit (~128 sq km). Boundaries are indicative, not survey-grade.
"""
import json, math, random
import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, Point, mapping
from shapely.ops import unary_union

random.seed(7); np.random.seed(7)

CENTER = (76.6394, 12.2958)  # lon, lat  (Mysuru Palace area)

# --- city boundary: irregular blob ~128 sq km ---------------------------------
def boundary():
    pts = []
    n = 46
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 6.35 + 1.5 * math.sin(3 * a + 0.7) + 0.75 * math.sin(7 * a + 2.1)  # km
        r = max(4.4, r)
        # lon/lat degrees per km at this latitude
        dlon = r * math.cos(a) / (111.32 * math.cos(math.radians(CENTER[1])))
        dlat = r * math.sin(a) / 110.57
        pts.append((CENTER[0] + dlon, CENTER[1] + dlat))
    return Polygon(pts)

CITY = boundary()

# --- seed points: denser in the core (higher density wards) -------------------
seeds = []
while len(seeds) < 65:
    a = random.uniform(0, 2 * math.pi)
    r = 6.6 * (random.random() ** 0.62)          # core-biased radial density
    dlon = r * math.cos(a) / (111.32 * math.cos(math.radians(CENTER[1])))
    dlat = r * math.sin(a) / 110.57
    p = Point(CENTER[0] + dlon, CENTER[1] + dlat)
    if CITY.contains(p) and all(p.distance(Point(s)) > 0.0055 for s in seeds):
        seeds.append((p.x, p.y))

# Lloyd relaxation for tidier cells
def voronoi_cells(points):
    pts = np.array(points)
    far = np.array([[CENTER[0] + 3, CENTER[1]], [CENTER[0] - 3, CENTER[1]],
                    [CENTER[0], CENTER[1] + 3], [CENTER[0], CENTER[1] - 3]])
    vor = Voronoi(np.vstack([pts, far]))
    cells = []
    for i in range(len(pts)):
        reg = vor.regions[vor.point_region[i]]
        if -1 in reg or len(reg) < 3:
            cells.append(None); continue
        poly = Polygon([vor.vertices[j] for j in reg]).intersection(CITY)
        if poly.geom_type == "MultiPolygon":
            poly = max(poly.geoms, key=lambda g: g.area)
        cells.append(poly)
    return cells

for _ in range(4):
    cells = voronoi_cells(seeds)
    seeds = [(c.centroid.x, c.centroid.y) if c and not c.is_empty else s
             for c, s in zip(cells, seeds)]
cells = voronoi_cells(seeds)

# --- zones: 9 clusters (k-means, angular+radial aware) -----------------------
from scipy.cluster.vq import kmeans2
arr = np.array(seeds)
scaled = np.column_stack([(arr[:, 0] - CENTER[0]) * math.cos(math.radians(CENTER[1])), arr[:, 1] - CENTER[1]])
_, labels = kmeans2(scaled, 9, minit="++", seed=3)

ZONE_NAMES = [f"Zone {i} · MCC zonal office {i}" for i in range(1, 10)]

WARD_NAMES = """Jayalakshmipuram,Vijayanagar 1st Stage,Vijayanagar 2nd Stage,Hebbal,Metagalli,
Bogadi North,Bogadi South,Srirampura,Kuvempunagar East,Kuvempunagar West,Ramakrishnanagar,
Saraswathipuram,Yadavagiri,Gokulam,Devaraja Mohalla,Mandi Mohalla,Ashokapuram,Chamundipuram,
Vidyaranyapuram,Rajivnagar,Kesare,Bannimantap A,Bannimantap B,Udayagiri,Azeez Sait Nagar,
Rajendranagar,Vishweshwaranagar,Nazarbad,Lakshmipuram,Chamarajapuram,Agrahara,Krishnamurthypuram,
Kalyanagiri,Alanahalli,Dattagalli,Gayathripuram,J P Nagar,Kumbarakoppal,Ittigegud,Siddhartha Layout,
Vinayakanagar,Shanthinagar,Tilaknagar,Subhashnagar,Sathagalli,Hootagalli,Belavatha,Kergalli,
N R Mohalla,Ghousia Nagar,Tilak Nagar East,Bamboo Bazaar,Kyathamaranahalli,Bharathi Nagar,
Mahadevapura,Kanakadasa Nagar,Hinkal,Manasagangothri,Kadakola North,Vasanth Nagar,Basaveshwara Nagar,
Ashraf Nagar,Rajiv Gandhi Nagar,Somanathapura,Vijayashreepura""".replace("\n", "").split(",")
WARD_NAMES = [w.strip() for w in WARD_NAMES if w.strip()]

def km2(poly):
    lat = CENTER[1]
    return abs(poly.area) * (111.32 * math.cos(math.radians(lat))) * 110.57

TOTAL_TPD = 600.0
features = []
raw = []
for i, poly in enumerate(cells):
    a = km2(poly)
    d = math.hypot((seeds[i][0] - CENTER[0]) * math.cos(math.radians(CENTER[1])) * 111.32,
                   (seeds[i][1] - CENTER[1]) * 110.57)
    # population density: high in the core, falling outward + noise
    dens = (16500 * math.exp(-d / 4.4) + 1800) * random.uniform(0.78, 1.24)
    pop = a * dens
    # commercial multiplier: core markets & hotels generate more per capita
    comm = 1.0 + 0.55 * math.exp(-d / 2.6) * random.uniform(0.6, 1.4)
    raw.append(dict(area=a, pop=pop, comm=comm, dist=d))

pop_total = sum(r["pop"] for r in raw)
load_total = sum(r["pop"] * r["comm"] for r in raw)
for i, poly in enumerate(cells):
    r = raw[i]
    pop = round(r["pop"] / pop_total * 1_010_000)          # ~2026 MCC-area population
    tpd = r["pop"] * r["comm"] / load_total * TOTAL_TPD
    wet = random.uniform(0.55, 0.64)
    features.append({
        "type": "Feature",
        "properties": {
            "ward_no": i + 1,
            "name": WARD_NAMES[i % len(WARD_NAMES)],
            "zone": int(labels[i]) + 1,
            "zone_name": ZONE_NAMES[int(labels[i])],
            "area_km2": round(r["area"], 3),
            "population": pop,
            "households": round(pop / 4.35),
            "waste_tpd": round(tpd, 2),
            "wet_share": round(wet, 3),
            "dry_share": round(1 - wet - 0.04, 3),
            "inert_share": 0.04,
            "density_t_km2": round(tpd / max(r["area"], 0.05), 2),
            "road_km": round(r["area"] * random.uniform(11, 17), 1),
            "narrow_lane_factor": round(min(1.6, 1.0 + 0.5 * math.exp(-r["dist"] / 3.0) * random.uniform(0.6, 1.3)), 3),
            "segregation_rate": round(min(0.92, 0.42 + 0.05 * r["dist"] + random.uniform(-0.08, 0.10)), 3),
            "centroid": [round(seeds[i][0], 6), round(seeds[i][1], 6)],
            "collection_points": max(6, round(pop / 4.35 / random.uniform(26, 36))),
        },
        "geometry": mapping(poly),
    })

gj = {"type": "FeatureCollection",
      "meta": {"city": "Mysuru City Corporation", "wards": 65, "zones": 9,
               "total_waste_tpd": TOTAL_TPD, "area_km2": round(km2(CITY), 1),
               "note": "Ward polygons are indicative Voronoi partitions of the MCC limit, not survey boundaries."},
      "features": features}

FAC = [
    ("Vidyaranyapuram Compost Plant", 76.6389, 12.2836, "compost", 200, 0.0),
    ("Kesare Processing Plant", 76.6845, 12.3305, "processing", 200, 0.0),
    ("Rayanakere Processing Plant", 76.5958, 12.2555, "processing", 150, 0.0),
    ("Hootagalli ZWM Unit", 76.5747, 12.3391, "zwm", 25, 0.0),
    ("Sewage Farm Landfill (capping site)", 76.6300, 12.2755, "landfill", 250, 0.0),
]
facilities = {"type": "FeatureCollection", "features": [
    {"type": "Feature",
     "properties": {"name": n, "kind": k, "capacity_tpd": c,
                    "note": "Location approximate"},
     "geometry": {"type": "Point", "coordinates": [lon, lat]}}
    for n, lon, lat, k, c, _ in FAC]}

import pathlib
out = pathlib.Path("/home/user/workspace/mysuru-swm/data")
out.mkdir(parents=True, exist_ok=True)
(out / "wards.geojson").write_text(json.dumps(gj))
(out / "facilities.geojson").write_text(json.dumps(facilities, indent=1))
print("wards", len(features), "city km2", round(km2(CITY), 1),
      "tpd", round(sum(f['properties']['waste_tpd'] for f in features), 1),
      "pop", sum(f['properties']['population'] for f in features))
print("zone counts", {z: sum(1 for f in features if f['properties']['zone'] == z) for z in range(1, 10)})
