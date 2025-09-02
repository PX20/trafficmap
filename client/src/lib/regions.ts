// Queensland regions and their suburbs mapping
export interface Region {
  id: string;
  name: string;
  suburbs: string[];
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
      'Kawana', 'Currimundi', 'Dicky Beach', 'Kings Beach', 'Bulcock Beach'
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