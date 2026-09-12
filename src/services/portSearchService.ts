export interface PortRecord {
  unlocode: string;
  port_name: string;
  country: string;
  city?: string;
  subdivision?: string;
  function?: string; // '1' = Sea Port, '4' = Airport, '6' = Multimodal/Inland
}

export const MOCK_PORTS_DATABASE: PortRecord[] = [
  // Sea Ports (function: '1')
  { unlocode: 'INMAA', port_name: 'Chennai Port', city: 'Chennai', country: 'IN', function: '1' },
  { unlocode: 'INNSA', port_name: 'Jawaharlal Nehru Port (Nhava Sheva)', city: 'Navi Mumbai', country: 'IN', function: '1' },
  { unlocode: 'INMUN', port_name: 'Mundra Port', city: 'Mundra', country: 'IN', function: '1' },
  { unlocode: 'USNYC', port_name: 'Port of New York & New Jersey', city: 'New York', country: 'US', function: '1' },
  { unlocode: 'USLAX', port_name: 'Port of Los Angeles', city: 'Los Angeles', country: 'US', function: '1' },
  { unlocode: 'USLGB', port_name: 'Port of Long Beach', city: 'Long Beach', country: 'US', function: '1' },
  { unlocode: 'DEHAM', port_name: 'Port of Hamburg', city: 'Hamburg', country: 'DE', function: '1' },
  { unlocode: 'DEBRV', port_name: 'Port of Bremerhaven', city: 'Bremerhaven', country: 'DE', function: '1' },
  { unlocode: 'TYO', port_name: 'Port of Tokyo', city: 'Tokyo', country: 'JP', function: '1' },
  { unlocode: 'SGSIN', port_name: 'Port of Singapore', city: 'Singapore', country: 'SG', function: '1' },
  { unlocode: 'AEDXB', port_name: 'Jebel Ali Port / Dubai', city: 'Dubai', country: 'AE', function: '1' },
  { unlocode: 'CNSHA', port_name: 'Port of Shanghai', city: 'Shanghai', country: 'CN', function: '1' },

  // Air Terminals / Airports (function: '4')
  { unlocode: 'MAA', port_name: 'Chennai International Airport (MAA)', city: 'Chennai', country: 'IN', function: '4' },
  { unlocode: 'DEL', port_name: 'Indira Gandhi International Airport (DEL)', city: 'New Delhi', country: 'IN', function: '4' },
  { unlocode: 'BOM', port_name: 'Chhatrapati Shivaji International Airport (BOM)', city: 'Mumbai', country: 'IN', function: '4' },
  { unlocode: 'BLR', port_name: 'Kempegowda International Airport (BLR)', city: 'Bengaluru', country: 'IN', function: '4' },
  { unlocode: 'JFK', port_name: 'John F. Kennedy International Airport (JFK)', city: 'New York', country: 'US', function: '4' },
  { unlocode: 'ORD', port_name: "O'Hare International Airport (ORD)", city: 'Chicago', country: 'US', function: '4' },
  { unlocode: 'LAX', port_name: 'Los Angeles International Airport (LAX)', city: 'Los Angeles', country: 'US', function: '4' },
  { unlocode: 'FRA', port_name: 'Frankfurt Airport (FRA)', city: 'Frankfurt', country: 'DE', function: '4' },
  { unlocode: 'NRT', port_name: 'Narita International Airport (NRT)', city: 'Tokyo', country: 'JP', function: '4' },
  { unlocode: 'SIN', port_name: 'Singapore Changi Airport (SIN)', city: 'Singapore', country: 'SG', function: '4' },
  { unlocode: 'DXB', port_name: 'Dubai International Airport (DXB)', city: 'Dubai', country: 'AE', function: '4' },
];

/**
 * Fetches port records from Meilisearch with dynamic filters for country, subdivision, and transport mode.
 * Falls back seamlessly to offline UN/LOCODE database if Meilisearch host is unreachable.
 */
export const fetchFromMeiliSearch = async (
  query: string,
  countryCode?: string | null,
  subdivisionCode?: string | null,
  mode?: string | null
): Promise<PortRecord[]> => {
  const host = (import.meta as any).env?.VITE_MEILISEARCH_HOST || 'http://localhost:7700';
  const apiKey = (import.meta as any).env?.VITE_MEILISEARCH_API_KEY || '';

  // 1. Build dynamic filters array
  const filters: string[] = [];

  if (countryCode) {
    filters.push(`country = "${countryCode}"`);
  }
  if (subdivisionCode) {
    filters.push(`subdivision = "${subdivisionCode}"`);
  }

  // 2. Map Transport Mode to UN/LOCODE Function Classifier
  let funcVal = '6';
  if (mode === 'OCEAN' || mode === 'Ship') funcVal = '1';
  else if (mode === 'AIR' || mode === 'Air') funcVal = '4';
  filters.push(`function = "${funcVal}"`);

  // 3. Meilisearch API Request
  try {
    const payload: any = {
      q: query || '',
      limit: 50,
      filter: filters.length > 0 ? filters : undefined,
    };

    const response = await fetch(`${host}/indexes/ports/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.hits) && data.hits.length > 0) {
        return data.hits.map((p: any) => ({
          unlocode: p.unlocode || p.locode || p.code,
          port_name: p.port_name || p.name || p.city,
          country: p.country || '',
          city: p.city || p.port_name || p.name,
          subdivision: p.subdivision || '',
          function: p.function || funcVal,
        }));
      }
    }
  } catch {
    // Meilisearch offline/unreachable -> proceed to local UN/LOCODE database fallback
  }

  // 4. Local UN/LOCODE Database Search & Filtering Fallback
  const targetFunc = mode === 'AIR' || mode === 'Air' ? '4' : '1';
  const qLower = (query || '').trim().toLowerCase();

  return MOCK_PORTS_DATABASE.filter((p) => {
    // Match mode function (Air vs Sea)
    if (p.function && p.function !== targetFunc) return false;

    // Match country if specified
    if (countryCode && p.country.toUpperCase() !== countryCode.toUpperCase()) return false;

    // Match query substring against UNLOCODE, port_name, or city
    if (qLower) {
      const codeMatch = p.unlocode.toLowerCase().includes(qLower);
      const nameMatch = p.port_name.toLowerCase().includes(qLower);
      const cityMatch = (p.city || '').toLowerCase().includes(qLower);
      return codeMatch || nameMatch || cityMatch;
    }

    return true;
  });
};
