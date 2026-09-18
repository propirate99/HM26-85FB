function box(west, south, east, north) {
  return {
    type: "Polygon",
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  };
}

function centroid(west, south, east, north) {
  return { type: "Point", coordinates: [(west + east) / 2, (south + north) / 2] };
}

export const demoZones = [
  {
    code: "CENTRAL",
    displayName: "Central Operational Zone",
    description: "Heart of Mysuru: Devaraja Market, Mysuru Palace, KR Circle & Lashkar Mohalla. Demo boundary.",
    geometry: box(76.635, 12.295, 76.665, 12.325),
    centroid: centroid(76.635, 12.295, 76.665, 12.325),
    isDemoData: true,
    isActive: true,
  },
  {
    code: "NORTH",
    displayName: "North Operational Zone",
    description: "Bannimantap, Mandi Mohalla, Sayyaji Rao Road North. Demo boundary.",
    geometry: box(76.55, 12.315, 76.645, 12.4),
    centroid: centroid(76.55, 12.315, 76.645, 12.4),
    isDemoData: true,
    isActive: true,
  },
  {
    code: "EAST",
    displayName: "East Operational Zone",
    description: "Nazarbad, Alanahalli, Siddartha Layout, Chamundi Foothills East. Demo boundary.",
    geometry: box(76.665, 12.295, 76.75, 12.4),
    centroid: centroid(76.665, 12.295, 76.75, 12.4),
    isDemoData: true,
    isActive: true,
  },
  {
    code: "SOUTH",
    displayName: "South Operational Zone",
    description: "Vidyaranyapuram, J.P. Nagar, Chamundipuram. Demo boundary.",
    geometry: box(76.635, 12.18, 76.75, 12.295),
    centroid: centroid(76.635, 12.18, 76.75, 12.295),
    isDemoData: true,
    isActive: true,
  },
  {
    code: "WEST",
    displayName: "West Operational Zone",
    description: "Kuvempunagar, Saraswathipuram, Jayalakshmipuram, Bogadi. Demo boundary.",
    geometry: box(76.55, 12.18, 76.635, 12.315),
    centroid: centroid(76.55, 12.18, 76.635, 12.315),
    isDemoData: true,
    isActive: true,
  },
];
