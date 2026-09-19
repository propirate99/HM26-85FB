"""
Builds ward-level SWM dataset for Mysuru City Corporation (MCC).

REAL / SOURCED INPUTS
 - 65 wards, ward names, zone assignment (7 zonal offices), 2011-census-based
   ward populations: inmysore.com MCC zonal reorganisation list.
 - City generation ~500 TPD across 65 wards: Deccan Herald / Star of Mysore.
 - Per-capita 360 g/day + commercial/hotel/market loads: MCC Integrated SWM
   strategy (CSE India) and JETIR study.
 - Processing facilities and capacities: Kesare 300 TPD, Rayanakere 150-200 TPD,
   Vidyaranyapuram sewage-farm compost ~250 TPD (Star of Mysore, The Hindu).

MODELLED (clearly flagged in the UI)
 - Ward centroid coordinates: approximate locality centroids.
 - Ward-day tonnage: deterministic model = population x 360 g + zone commercial
   uplift, scaled to a 500 TPD city baseline, with weekday/market-day and
   seasonal variation from a seeded PRNG.
 - Collection completion %, backlog, trips, vehicles: modelled from ward load
   vs. assigned fleet capacity.
"""
import json, math, random, datetime, os

WARDS = [
    # (no, name, zone, population, lat, lng)
    (1,"Agrahara",1,9266,12.3007,76.6470),(2,"Sunnadakeri",1,12765,12.2966,76.6494),
    (3,"Lakshmipuram",1,12814,12.3040,76.6410),(4,"Ramachandra Agrahara",1,8753,12.2930,76.6440),
    (5,"Gunduraonagar",1,14661,12.2905,76.6395),(6,"Chamundipuram",1,12586,12.2880,76.6455),
    (10,"Vidyaranyapuram",1,15104,12.2830,76.6355),(36,"Subbarayanakere",1,9546,12.3055,76.6465),
    (7,"Krishnamurthipuram",2,11299,12.3060,76.6335),(8,"Jayanagar",2,7889,12.2990,76.6300),
    (9,"Asokapuram",2,14035,12.2915,76.6300),(11,"Vishweshwara Nagar",2,9884,12.2860,76.6265),
    (12,"J.P. Nagar",2,22982,12.2790,76.6260),(13,"Srirampura 2nd Stage",2,18355,12.2745,76.6320),
    (14,"Aravinda Nagar",2,10417,12.2800,76.6180),(15,"Vivekanandanagar",2,9557,12.2755,76.6205),
    (16,"Ramakrishnanagar",2,18451,12.2705,76.6255),(17,"Kuvempunagar KHB",2,12654,12.2820,76.6135),
    (18,"Kuvempunagar South",3,13498,12.2775,76.6085),(19,"Kannegowdana Koppal",3,10614,12.3005,76.6135),
    (20,"Saraswathipuram",3,9196,12.3090,76.6280),(21,"Kuvempunagar North",3,8113,12.2860,76.6070),
    (22,"Sharadadevinagar",3,17974,12.2925,76.6035),(23,"Jayalakshmipuram",3,10652,12.3130,76.6200),
    (24,"Vijayanagar",3,27702,12.3210,76.6090),(33,"Paduvarahalli",3,9302,12.3145,76.6295),
    (35,"Devaraja Mohalla",3,8064,12.3080,76.6520),(25,"Manchegowdana Koppal",4,21756,12.3350,76.6030),
    (26,"Hebbal, Lakshmikanthanagar",4,15437,12.3410,76.6135),(27,"Hebbal, Lokanayakanagar",4,24617,12.3465,76.6210),
    (28,"Kumbarakoppal",4,18048,12.3300,76.6205),(29,"Metagalli",4,17558,12.3395,76.6335),
    (30,"Brindhavan Extension",4,8393,12.3255,76.6255),(31,"Gokulam",4,10780,12.3215,76.6335),
    (32,"Ontikoppal",4,13585,12.3170,76.6405),(34,"Medhar Block",4,10101,12.3120,76.6465),
    (37,"Lashkar Mohalla",5,11608,12.3070,76.6560),(38,"Mandi Mohalla",5,10038,12.3040,76.6555),
    (39,"Kailasapuram",5,10006,12.3095,76.6605),(40,"Meena Bazar",5,9489,12.3120,76.6560),
    (41,"Veeranagere",5,9726,12.3160,76.6600),(42,"B.B. Keri",5,13767,12.3145,76.6520),
    (43,"Tilak Nagar",5,10190,12.3195,76.6545),(44,"Bannimantap",5,9164,12.3260,76.6600),
    (45,"Bannimantap HUDCO",5,13550,12.3315,76.6650),(64,"Nazarbad",5,8903,12.3000,76.6600),
    (46,"Kesare",6,16712,12.3390,76.6760),(47,"Subhashnagar",6,10670,12.3300,76.6720),
    (48,"Rajendranagar",6,14540,12.3230,76.6700),(49,"N.R. Mohalla",6,15137,12.3175,76.6690),
    (50,"Gandhi Nagar",6,9149,12.3120,76.6690),(51,"Sathyanagar",6,14290,12.3060,76.6720),
    (52,"Udayagiri",6,15346,12.2990,76.6690),(53,"Rajivnagar",6,16774,12.3050,76.6790),
    (54,"Shanthinagar",6,31423,12.3150,76.6830),(55,"Kalyanagiri",7,15846,12.2870,76.6660),
    (56,"Yaraganahalli",7,24411,12.2770,76.6600),(57,"Vidyanagar",7,13618,12.2810,76.6720),
    (58,"Ragavendranagar",7,6407,12.2700,76.6480),(59,"Gowrishankaranagar",7,27029,12.2680,76.6690),
    (60,"K.N. Pura",7,12337,12.2620,76.6560),(61,"Kyathamaranahalli",7,7865,12.2960,76.6570),
    (62,"Gayathripuram",7,15625,12.2900,76.6620),(63,"Siddarthanagar",7,12515,12.2930,76.6760),
    (65,"Ittigegudu",7,16733,12.2925,76.6520),
]

FACILITIES = [
    {"id":"KES","name":"Kesare Solid Waste Treatment & Recycling Plant","lat":12.3418,"lng":76.6805,
     "capacity_tpd":300,"kind":"Compost + MRF","serves":"Zones 5, 6, 7 (part)",
     "source":"https://starofmysore.com/commissioning-of-kesare-waste-processing-plant-this-week/"},
    {"id":"RAY","name":"Rayanakere Solid Waste Treatment & Recycling Plant","lat":12.2565,"lng":76.6605,
     "capacity_tpd":150,"kind":"Compost + MRF","serves":"Zones 6, 7 (south)",
     "source":"https://starofmysore.com/65-percent-of-rayanakere-solid-waste-plant-complete/"},
    {"id":"VID","name":"Vidyaranyapuram Sewage Farm Compost Plant","lat":12.2760,"lng":76.6330,
     "capacity_tpd":250,"kind":"Legacy compost yard","serves":"Zones 1, 2, 3, 4",
     "source":"https://www.thehindu.com/news/national/karnataka/mysurus-waste-management-system-set-for-upgrade/article65080264.ece"},
    {"id":"ZWM-N","name":"Zero Waste Plant — Hootagalli / North cluster","lat":12.3480,"lng":76.6060,
     "capacity_tpd":40,"kind":"Decentralised ZWM unit","serves":"Zone 4 wards",
     "source":"https://www.niti.gov.in/sites/default/files/2021-12/Waste-Wise-Cities.pdf"},
    {"id":"ZWM-W","name":"Zero Waste Plant — Kuvempunagar cluster","lat":12.2790,"lng":76.6060,
     "capacity_tpd":35,"kind":"Decentralised ZWM unit","serves":"Zones 2, 3 wards",
     "source":"https://www.niti.gov.in/sites/default/files/2021-12/Waste-Wise-Cities.pdf"},
]
FACILITIES[1]["lat"]=12.2565; FACILITIES[1]["lng"]=76.6605

# Zone commercial uplift multipliers (markets, hotels, Devaraja Market, Bannimantap, city core)
ZONE_UPLIFT = {1:1.18, 2:1.02, 3:1.05, 4:1.10, 5:1.42, 6:1.16, 7:1.08}
WARD_UPLIFT = {38:1.9, 35:1.75, 40:1.6, 37:1.45, 44:1.5, 24:1.25, 54:1.2, 20:1.2, 3:1.3, 34:1.3}
CITY_BASELINE_TPD = 500.0

def haversine(a,b,c,d):
    R=6371.0
    p1,p2=math.radians(a),math.radians(c)
    dp=p2-p1; dl=math.radians(d-b)
    h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

def road_km(km):  # network detour factor for city roads
    return round(km*1.35+0.6,1)

base_raw={}
for no,name,z,pop,lat,lng in WARDS:
    up=ZONE_UPLIFT[z]*WARD_UPLIFT.get(no,1.0)
    base_raw[no]=pop*0.360/1000.0*up
scale=CITY_BASELINE_TPD/sum(base_raw.values())

wards=[]
for no,name,z,pop,lat,lng in WARDS:
    major=[(road_km(haversine(lat,lng,f["lat"],f["lng"])),f) for f in FACILITIES if f["capacity_tpd"]>=150]
    micro=[(road_km(haversine(lat,lng,f["lat"],f["lng"])),f) for f in FACILITIES if f["capacity_tpd"]<150]
    major.sort(key=lambda t:t[0]); micro.sort(key=lambda t:t[0])
    dists=major
    nd,nf=major[0]
    # allocated fleet: compactors/autotippers assigned, ~1.15 t per autotipper trip
    base=round(base_raw[no]*scale,2)
    # assigned fleet is uneven across zones: outer/eastern zones are under-resourced,
    # core zones over-provisioned because of market routes. Deterministic per ward.
    zone_service={1:1.30,2:1.38,3:1.34,4:1.22,5:1.16,6:1.09,7:1.13}[z]
    jitter=1.0+((no*37)%23-11)/100.0          # -0.11 .. +0.11
    target=base*zone_service*jitter
    autotippers=max(2,round(target/2.6))
    trips=max(2,round(target/(autotippers*1.15)))
    cap=round(autotippers*trips*1.15,2)
    wards.append({"ward":no,"name":name,"zone":z,"population":pop,"lat":lat,"lng":lng,
        "base_tpd":base,"nearest_facility":nf["id"],"nearest_facility_name":nf["name"],
        "distance_km":nd,"second_facility":dists[1][1]["id"],"second_distance_km":dists[1][0],
        "autotippers":autotippers,"trips_per_vehicle":trips,"fleet_capacity_tpd":cap,
        "households":round(pop/4.4),
        "zwm_facility":micro[0][1]["id"],"zwm_distance_km":micro[0][0],
        "segregation_pct":round(min(96, 52 + (pop%17) + (8 if z in (2,3) else 0) - (9 if z==5 else 0)),1),
        })

# ---- daily time series (120 days ending today) ----
END = datetime.date(2026,9,18)
DAYS = 120
rows=[]
rng=random.Random(20260918)
noise={w["ward"]: random.Random(1000+w["ward"]) for w in wards}
for i in range(DAYS):
    d = END - datetime.timedelta(days=DAYS-1-i)
    dow = d.weekday()  # 0 Mon
    # market surge Sat/Sun in commercial zones, Monday post-weekend spike
    for w in wards:
        r=noise[w["ward"]]
        f=1.0
        if dow in (5,6): f *= 1.12 if w["zone"] in (5,1,6) else 1.05
        if dow==0: f *= 1.06
        if dow==3: f *= 0.96
        # festival/season bump (Dasara window late Sep-Oct in Mysuru)
        if (d.month,d.day) >= (9,10) and (d.month,d.day) <= (10,15): f *= 1.14
        f *= 1 + r.uniform(-0.07,0.09)
        gen=round(w["base_tpd"]*f,2)
        # collection: limited by fleet capacity and staff availability
        avail = 1.0 - (0.06 if dow==6 else 0.0) - r.uniform(0,0.05)
        collected=round(min(gen, w["fleet_capacity_tpd"]*avail),2)
        rows.append({"date":d.isoformat(),"ward":w["ward"],"generated":gen,"collected":collected,
                     "uncollected":round(max(0,gen-collected),2)})

# rolling backlog per ward
backlog={w["ward"]:0.0 for w in wards}
by_ward={}
for row in rows:
    b=backlog[row["ward"]]
    b = max(0.0, b*0.72 + row["uncollected"])   # 28% cleared next day
    backlog[row["ward"]]=b
    row["backlog"]=round(b,2)

data={
 "meta":{
  "city":"Mysuru City Corporation (MCC)","wards":65,"zones":7,
  "generated_on":END.isoformat(),"window_days":DAYS,
  "city_baseline_tpd":CITY_BASELINE_TPD,
  "total_processing_capacity_tpd":sum(f["capacity_tpd"] for f in FACILITIES),
  "per_capita_g":360,
  "sources":[
   {"label":"MCC generates 500+ TPD across 65 wards — Deccan Herald","url":"https://www.deccanherald.com/india/karnataka/solid-waste-management-poses-a-grave-challenge-to-mysuru-944510.html"},
   {"label":"Ward population & 7-zone reorganisation — InMysore","url":"https://www.inmysore.com/mcc-reduces-number-of-zonal-offices-to-seven"},
   {"label":"Integrated SWM strategy, 360 g/capita/day — CSE India","url":"https://cdn.cseindia.org/userfiles/ZWM_MYSORE.pdf"},
   {"label":"Kesare & Rayanakere plants processing ~130 TPD — Star of Mysore","url":"https://starofmysore.com/waste-treatment-plants-operational-130-tonnes-processed-daily-at-kesare-rayanakere/"},
   {"label":"Sewage farm capacity ~250 TPD — The Hindu","url":"https://www.thehindu.com/news/national/karnataka/mysurus-waste-management-system-set-for-upgrade/article65080264.ece"},
   {"label":"Zero-waste plants per zone — NITI Aayog Waste-Wise Cities","url":"https://www.niti.gov.in/sites/default/files/2021-12/Waste-Wise-Cities.pdf"},
   {"label":"450 TPD across 65 wards, GIS study — IJES","url":"https://theaspd.com/index.php/ijes/article/download/10415/7467/21764"}
  ]},
 "facilities":FACILITIES,"wards":wards,"daily":rows}

os.makedirs("/home/user/workspace/mcc-swm/data",exist_ok=True)
with open("/home/user/workspace/mcc-swm/data/swm.json","w") as f:
    json.dump(data,f,separators=(",",":"))
print("wards",len(wards),"rows",len(rows))
print("city tpd", round(sum(w["base_tpd"] for w in wards),1))
print("fleet cap", round(sum(w["fleet_capacity_tpd"] for w in wards),1))
print("top load", sorted(wards,key=lambda w:-w["base_tpd"])[:4])
print("max dist", max(w["distance_km"] for w in wards), "min", min(w["distance_km"] for w in wards))
print("size", os.path.getsize("/home/user/workspace/mcc-swm/data/swm.json"))
