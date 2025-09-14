// Queensland regions and their suburbs mapping
export interface Region {
  id: string;
  name: string;
  suburbs: string[];
  // Polygon boundary coordinates [lng, lat] for precise geographical filtering
  boundary?: Array<[number, number]>;
}

export const QLD_REGIONS: Region[] = [
  {
    id: 'sunshine-coast',
    name: 'Sunshine Coast',
    suburbs: [
      'Caloundra', 'Caloundra West', 'Golden Beach', 'Pelican Waters',
      'Maroochydore', 'Mooloolaba', 'Alexandra Headland', 'Mooloolah Valley',
      'Noosa', 'Noosa Heads', 'Noosaville', 'Tewantin', 'Sunrise Beach',
      'Nambour', 'Palmwoods', 'Maleny', 'Montville', 'Yandina',
      'Cooroy', 'Pomona', 'Eumundi', 'Peregian Beach', 'Coolum Beach',
      'Buderim', 'Sippy Downs', 'Chancellor Park', 'Birtinya',
      'Kawana', 'Kawana Forest', 'Currimundi', 'Dicky Beach', 'Kings Beach', 'Bulcock Beach',
      'Bells Creek'
    ],
    boundary: [
      [152.7, -26.9],   // North-west (inland near Cooroy)
      [153.1, -26.4],   // North-east (Noosa Heads coastal)
      [153.15, -26.65], // East (Coolum Beach area)
      [153.16, -26.8],  // South-east (Caloundra coastal - extended to include coastline)
      [152.9, -26.85],  // South-west (inland Caloundra)
      [152.75, -26.82], // West (Nambour-Maleny area)
      [152.7, -26.9]    // Close polygon
    ]
  },
  {
    id: 'gold-coast',
    name: 'Gold Coast',
    suburbs: [
      'Surfers Paradise', 'Broadbeach', 'Main Beach', 'Southport',
      'Nerang', 'Robina', 'Varsity Lakes', 'Burleigh Heads',
      'Currumbin', 'Tugun', 'Coolangatta', 'Tweed Heads',
      'Miami', 'Mermaid Beach', 'Nobby Beach', 'Palm Beach',
      'Elanora', 'Tallebudgera', 'West Burleigh', 'Burleigh Waters',
      'Mudgeeraba', 'Springbrook', 'Advancetown', 'Coomera',
      'Upper Coomera', 'Oxenford', 'Hope Island', 'Sanctuary Cove'
    ],
    boundary: [
      [153.05, -27.75],  // North-west (Hope Island area)
      [153.45, -27.8],   // North-east (coastal Southport)
      [153.55, -28.17],  // South-east (Coolangatta)
      [153.25, -28.25],  // South-west (inland Currumbin)
      [153.0, -28.1],    // West (Springbrook area)
      [152.9, -27.9],    // West (Nerang inland)
      [153.05, -27.75]   // Close polygon
    ]
  },
  {
    id: 'brisbane',
    name: 'Greater Brisbane',
    suburbs: [
      'Brisbane', 'Brisbane City', 'South Brisbane', 'West End', 'Fortitude Valley',
      'New Farm', 'Paddington', 'Red Hill', 'Spring Hill', 'Petrie Terrace',
      'Toowong', 'St Lucia', 'Indooroopilly', 'Taringa', 'Chapel Hill',
      'Kenmore', 'Fig Tree Pocket', 'Brookfield', 'Pullenvale',
      'Ashgrove', 'The Gap', 'Enoggera', 'Kelvin Grove', 'Herston',
      'Woolloongabba', 'Annerley', 'Fairfield', 'Yeronga', 'Yeerongpilly',
      'Moorooka', 'Rocklea', 'Acacia Ridge', 'Sunnybank', 'Sunnybank Hills',
      'Calamvale', 'Stretton', 'Karawatha', 'Algester', 'Parkinson',
      'Forest Lake', 'Inala', 'Richlands', 'Darra', 'Oxley',
      'Corinda', 'Sherwood', 'Graceville', 'Chelmer', 'Jindalee',
      'Mount Ommaney', 'Jamboree Heights', 'Westlake', 'Riverhills',
      'Chermside', 'Aspley', 'Carseldine', 'Bridgeman Downs', 'Bald Hills',
      'Strathpine', 'Lawnton', 'Petrie', 'Kallangur', 'Murrumba Downs',
      'Griffin', 'North Lakes', 'Mango Hill', 'Rothwell', 'Redcliffe',
      'Clontarf', 'Margate', 'Woody Point', 'Scarborough', 'Newport',
      'Deception Bay', 'Narangba', 'Burpengary', 'Caboolture', 'Morayfield',
      'Ipswich', 'Springfield', 'Springfield Central', 'Augustine Heights',
      'Redbank', 'Goodna', 'Bellbird Park', 'Collingwood Park', 'Redbank Plains',
      'Logan', 'Logan Central', 'Springwood', 'Daisy Hill', 'Shailer Park',
      'Beenleigh', 'Eagleby', 'Waterford', 'Holmview', 'Bahrs Scrub'
    ],
    boundary: [
      [152.5, -27.0],    // North-west (Caboolture area)
      [153.2, -27.1],    // North-east (Redcliffe Peninsula)
      [153.25, -27.65],  // South-east (Logan area)
      [152.8, -27.75],   // South-west (Ipswich area)
      [152.6, -27.5],    // West (Springfield area)
      [152.5, -27.0]     // Close polygon
    ]
  },
  {
    id: 'ipswich',
    name: 'Ipswich',
    suburbs: [
      'Ipswich', 'Ipswich CBD', 'Booval', 'Bundamba', 'Dinmore',
      'Riverview', 'Karalee', 'Springfield', 'Springfield Central',
      'Springfield Lakes', 'Augustine Heights', 'Redbank', 'Goodna',
      'Collingwood Park', 'Redbank Plains', 'Bellbird Park', 'Brookwater',
      'Ripley', 'Bellvista', 'Providence', 'Deebing Heights'
    ]
  },
  {
    id: 'logan',
    name: 'Logan',
    suburbs: [
      'Logan', 'Logan Central', 'Logan Village', 'Springwood', 'Daisy Hill',
      'Shailer Park', 'Beenleigh', 'Eagleby', 'Waterford', 'Holmview',
      'Bahrs Scrub', 'Windaroo', 'Yarrabilba', 'Park Ridge', 'Jimboomba',
      'Beaudesert', 'Tamborine', 'Mount Tamborine', 'Canungra'
    ]
  },
  {
    id: 'moreton-bay',
    name: 'Moreton Bay',
    suburbs: [
      'Caboolture', 'Morayfield', 'Burpengary', 'Narangba', 'Deception Bay',
      'Redcliffe', 'Clontarf', 'Margate', 'Woody Point', 'Scarborough',
      'Newport', 'Rothwell', 'North Lakes', 'Mango Hill', 'Griffin',
      'Murrumba Downs', 'Kallangur', 'Petrie', 'Lawnton', 'Strathpine'
    ]
  },
  {
    id: 'cairns',
    name: 'Cairns',
    suburbs: [
      'Cairns', 'Cairns City', 'Cairns North', 'Edge Hill', 'Whitfield',
      'Redlynch', 'Stratford', 'Freshwater', 'Brinsmead', 'Kamerunga',
      'Smithfield', 'Trinity Beach', 'Palm Cove', 'Ellis Beach',
      'Port Douglas', 'Mossman', 'Kuranda', 'Mareeba', 'Atherton'
    ]
  },
  {
    id: 'townsville',
    name: 'Townsville',
    suburbs: [
      'Townsville', 'Townsville City', 'South Townsville', 'West End',
      'North Ward', 'Railway Estate', 'Hermit Park', 'Aitkenvale',
      'Mysterton', 'Cranbrook', 'Annandale', 'Kirwan', 'Thuringowa',
      'Condon', 'Deeragun', 'Bohle Plains', 'Mount Louisa', 'Douglas'
    ]
  },
  {
    id: 'toowoomba',
    name: 'Toowoomba',
    suburbs: [
      'Toowoomba', 'Toowoomba City', 'South Toowoomba', 'East Toowoomba',
      'West Toowoomba', 'North Toowoomba', 'Newtown', 'Harristown',
      'Kearneys Spring', 'Mount Lofty', 'Highfields', 'Crows Nest',
      'Dalby', 'Chinchilla', 'Miles', 'Wandoan'
    ]
  },
  {
    id: 'rockhampton',
    name: 'Rockhampton',
    suburbs: [
      'Rockhampton', 'Rockhampton City', 'North Rockhampton', 'West Rockhampton',
      'South Rockhampton', 'Berserker', 'Norman Gardens', 'Kawana',
      'Park Avenue', 'Frenchville', 'Mount Archer', 'Yeppoon',
      'Emu Park', 'Rosslyn Bay', 'Keppel Sands'
    ]
  }
];

// Find which region a suburb belongs to
export function findRegionBySuburb(suburb: string): Region | null {
  const normalizedSuburb = suburb.toLowerCase().trim();
  
  for (const region of QLD_REGIONS) {
    // Check if the input matches the region name directly
    if (region.name.toLowerCase().includes(normalizedSuburb) || 
        normalizedSuburb.includes(region.name.toLowerCase())) {
      return region;
    }
    
    // Check if the input matches any suburb within the region
    const matchingSuburb = region.suburbs.find(s => 
      s.toLowerCase().includes(normalizedSuburb) || 
      normalizedSuburb.includes(s.toLowerCase())
    );
    
    if (matchingSuburb) {
      return region;
    }
  }
  
  return null;
}

// Get all suburbs in the same region as the given suburb
export function getRegionalSuburbs(suburb: string): string[] {
  const region = findRegionBySuburb(suburb);
  return region ? region.suburbs : [suburb];
}

// Check if two suburbs are in the same region
export function areInSameRegion(suburb1: string, suburb2: string): boolean {
  const region1 = findRegionBySuburb(suburb1);
  const region2 = findRegionBySuburb(suburb2);
  
  return !!(region1 && region2 && region1.id === region2.id);
}

// Point-in-polygon algorithm using ray casting
export function isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [lng, lat] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Get region from coordinates (lat/lng) with text fallback
export function getRegionFromCoordinates(
  lat: number, 
  lng: number, 
  textFallback?: string
): Region | null {
  // First try coordinate-based matching
  for (const region of QLD_REGIONS) {
    if (region.boundary && isPointInPolygon([lng, lat], region.boundary)) {
      return region;
    }
  }
  
  // Fallback to text-based matching if coordinates don't match
  if (textFallback) {
    return findRegionBySuburb(textFallback);
  }
  
  return null;
}

// Extract coordinates from GeoJSON geometry
export function extractCoordinatesFromGeometry(geometry: any): [number, number] | null {
  if (!geometry) return null;
  
  try {
    if (geometry.type === 'Point' && geometry.coordinates) {
      const [lng, lat] = geometry.coordinates;
      return [lat, lng];
    }
    
    if (geometry.type === 'MultiPoint' && geometry.coordinates?.[0]) {
      const [lng, lat] = geometry.coordinates[0];
      return [lat, lng];
    }
    
    if (geometry.type === 'GeometryCollection' && geometry.geometries) {
      const pointGeometry = geometry.geometries.find((g: any) => g.type === 'Point');
      if (pointGeometry?.coordinates) {
        const [lng, lat] = pointGeometry.coordinates;
        return [lat, lng];
      }
    }
    
    // Handle legacy format from your traffic map component
    if (geometry.geometries?.[0]?.coordinates) {
      const coords = geometry.geometries[0].coordinates;
      if (coords.length === 2) {
        const [lng, lat] = coords;
        return [lat, lng];
      }
    }
  } catch (error) {
    console.warn('Error extracting coordinates from geometry:', error);
  }
  
  return null;
}