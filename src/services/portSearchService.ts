import unlocodePortsRaw from '../data/unlocode_ports.json';

export interface PortRecord {
  unlocode: string;
  port_name: string;
  country: string;
  country_name?: string;
  city?: string;
  subdivision?: string;
  subdivision_code?: string;
  function?: string; // '1' = Sea Port, '4' = Airport, '6' = Multimodal
  is_sea_port?: boolean;
  is_air_port?: boolean;
  remarks?: string;
}

export interface PortSearchResult {
  ports: PortRecord[];
  matchLevel: 'city' | 'state' | 'country';
  matchedLocationName: string;
}

// 📦 Complete UN/LOCODE Dataset (24,884 Ports & Airports) compiled dynamically from port_dataset/csv/
export const UNLOCODE_CSV_DATASET: PortRecord[] = (unlocodePortsRaw as any[]).map((item) => ({
  unlocode: item.unlocode,
  country: item.country,
  country_name: item.country_name,
  port_name: item.port_name,
  city: item.port_name || item.name_ascii,
  subdivision: item.subdivision,
  subdivision_code: item.subdivision_code,
  is_sea_port: item.is_sea_port,
  is_air_port: item.is_air_port,
  function: item.is_sea_port ? '1' : item.is_air_port ? '4' : '6',
  remarks: item.remarks,
}));

// 🌐 Tamil to English Transliteration Dictionary for Port Matching Accuracy
const TAMIL_TO_ENGLISH_MAP: Record<string, string> = {
  'சென்னை மாவட்டம்': 'Chennai',
  'சென்னை': 'Chennai',
  'தமிழ் நாடு': 'Tamil Nadu',
  'தமிழ்நாடு': 'Tamil Nadu',
  'கோயம்புத்தூர்': 'Coimbatore',
  'மதுரை': 'Madurai',
  'தூத்துக்குடி': 'Tuticorin',
  'திருச்சிராப்பள்ளி': 'Tiruchirappalli',
  'திருச்சி': 'Trichy',
  'சேலம்': 'Salem',
  'ஈரோடு': 'Erode',
  'வேலூர்': 'Vellore',
  'தஞ்சாவூர்': 'Thanjavur',
  'கன்னியாகுமரி': 'Kanyakumari',
  'இந்தியா': 'India',
  'மாவட்டம': '',
  'மாவட்டம்': '',
};

export const sanitizeCityToEnglish = (inputStr: string): string => {
  if (!inputStr) return '';
  let text = inputStr;

  Object.keys(TAMIL_TO_ENGLISH_MAP).forEach((tamilKey) => {
    if (text.includes(tamilKey)) {
      text = text.split(tamilKey).join(TAMIL_TO_ENGLISH_MAP[tamilKey]);
    }
  });

  text = text.replace(/[\u0B80-\u0BFF]+/g, '').trim();
  text = text.replace(/\s+/g, ' ').replace(/^,\s*|,\s*$/g, '').trim();
  if (text.toLowerCase().endsWith(' district')) {
    text = text.substring(0, text.length - 9).trim();
  }
  return text || inputStr;
};

const normalizeSubdivisionText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const STATE_ALIAS_MAP: Record<string, string[]> = {
  'tamil nadu': ['tamil nadu', 'tamilnadu', 'tn'],
  'maharashtra': ['maharashtra', 'mh'],
  'gujarat': ['gujarat', 'gj'],
  'kerala': ['kerala', 'kl'],
  'karnataka': ['karnataka', 'ka'],
  'andhra pradesh': ['andhra pradesh', 'ap'],
  'telangana': ['telangana', 'tg', 'ts'],
  'west bengal': ['west bengal', 'wb', 'bengal'],
  'odisha': ['odisha', 'orissa', 'od', 'or'],
  'goa': ['goa', 'ga'],
  'delhi': ['delhi', 'dl'],
  'punjab': ['punjab', 'pb'],
  'haryana': ['haryana', 'hr'],
  'uttar pradesh': ['uttar pradesh', 'up'],
  'california': ['california', 'ca'],
  'new york': ['new york', 'ny'],
  'texas': ['texas', 'tx'],
  'florida': ['florida', 'fl'],
};

export const normalizeIsAirMode = (mode?: string | null): boolean => {
  if (!mode) return false;
  const m = mode.trim().toLowerCase();
  return m === 'air' || m === 'airports' || m === 'air_freight' || m === 'airfreight' || m === 'a';
};

/**
 * 3-Tier Hierarchical Realtime Port Search Engine (Strict Matching & Mode Filtered):
 * 1. Tier 1: Search by City (return city ports matching transport mode)
 * 2. Tier 2: Search by State / Subdivision (if 0 ports found in city)
 * 3. Tier 3: Search by Country (if 0 ports found in state)
 * Mode Filtering: If mode is Air, returns ONLY airports (is_air_port: true).
 *                 If mode is Ship/Ocean, returns ONLY seaports (is_sea_port: true).
 */
export const fetchPortsWithHierarchicalFallback = (
  addressInput: string | { city?: string; state?: string; countryCode?: string; country?: string; label?: string } | null,
  mode?: string | null
): PortSearchResult => {
  const isAir = normalizeIsAirMode(mode);
  const modeFiltered = UNLOCODE_CSV_DATASET.filter((p) => (isAir ? p.is_air_port : p.is_sea_port));

  if (!addressInput) {
    return {
      ports: modeFiltered.slice(0, 30),
      matchLevel: 'country',
      matchedLocationName: isAir ? 'Featured Air Terminals' : 'Featured Sea Ports',
    };
  }

  let city = '';
  let state = '';
  let countryCode = '';
  let countryName = '';

  if (typeof addressInput === 'object') {
    city = addressInput.city || addressInput.label || '';
    state = addressInput.state || '';
    countryCode = addressInput.countryCode || '';
    countryName = addressInput.country || '';
  } else {
    const parts = addressInput.split(',').map((p) => p.trim());
    city = parts[0] || '';
    if (parts.length > 1) state = parts[parts.length - 2] || '';
    if (parts.length > 2) countryName = parts[parts.length - 1] || '';
  }

  city = sanitizeCityToEnglish(city);
  state = sanitizeCityToEnglish(state);

  // TIER 1: Match by City
  if (city) {
    const cityLower = city.toLowerCase();
    const cityPorts = modeFiltered.filter((p) => {
      if (countryCode && p.country.toUpperCase() !== countryCode.toUpperCase()) return false;
      const pName = p.port_name.toLowerCase();
      const pCode = p.unlocode.toLowerCase();
      return pName.includes(cityLower) || cityLower.includes(pName) || pCode.includes(cityLower);
    });

    if (cityPorts.length > 0) {
      return { ports: cityPorts, matchLevel: 'city', matchedLocationName: city };
    }
  }

  // TIER 2: Fallback Match by State / Subdivision (if 0 ports found in city)
  if (state) {
    const sNorm = normalizeSubdivisionText(state);
    const aliases = STATE_ALIAS_MAP[sNorm] || [sNorm];

    const statePorts = modeFiltered.filter((p) => {
      if (countryCode && p.country.toUpperCase() !== countryCode.toUpperCase()) return false;

      const pSub = normalizeSubdivisionText(p.subdivision || '');
      const pSubCode = (p.subdivision_code || '').toLowerCase().trim();

      // Reject empty subdivisions to prevent matching ports in other states
      if (!pSub && !pSubCode) return false;

      return aliases.some(
        (a) =>
          (pSub && (pSub === a || pSub.includes(a) || a.includes(pSub))) ||
          (pSubCode && pSubCode === a)
      );
    });

    if (statePorts.length > 0) {
      return { ports: statePorts, matchLevel: 'state', matchedLocationName: state };
    }
  }

  // TIER 3: Fallback Match by Country (if 0 ports found in state)
  if (countryCode || countryName) {
    const targetCountryCode = (countryCode || '').toUpperCase();
    const countryLower = countryName.toLowerCase();

    const countryPorts = modeFiltered.filter((p) => {
      if (targetCountryCode) {
        return p.country.toUpperCase() === targetCountryCode;
      }
      const pCountryName = (p.country_name || '').toLowerCase();
      return pCountryName.includes(countryLower) || countryLower.includes(pCountryName);
    });

    if (countryPorts.length > 0) {
      return {
        ports: countryPorts.slice(0, 30),
        matchLevel: 'country',
        matchedLocationName: countryName || countryCode || 'Country',
      };
    }
  }

  // Strict Realtime Policy: Return top mode-filtered ports if location is generic or unmapped
  return {
    ports: modeFiltered.slice(0, 30),
    matchLevel: 'country',
    matchedLocationName: countryName || countryCode || (isAir ? 'Airports' : 'Sea Ports'),
  };
};

/**
 * Fetches matching ports for a given city and country directly from the UN/LOCODE CSV dataset.
 */
export const fetchPortsByCity = (
  cityName: string,
  countryCode?: string | null,
  mode?: string | null
): PortRecord[] => {
  const result = fetchPortsWithHierarchicalFallback({ city: cityName, countryCode: countryCode || undefined }, mode);
  return result.ports;
};

/**
 * Dynamically identifies corresponding UN/LOCODE ports for any address (manual text or address object).
 * Parses free-form manual address text into city/country tokens and queries the UN/LOCODE CSV dataset.
 */
export const findPortsFromAddress = (
  address: string | { city?: string; state?: string; countryCode?: string; country?: string; street?: string; label?: string } | null,
  mode?: string | null
): PortRecord[] => {
  const result = fetchPortsWithHierarchicalFallback(address, mode);
  return result.ports;
};

/**
 * Searches ports dynamically via FastAPI backend if running, with full fallback to UN/LOCODE CSV dataset.
 * Supports flexible signature: (query, countryCode, subdivisionCode, mode) or (query, mode, countryCode).
 */
export const fetchFromMeiliSearch = async (
  query: string,
  arg2?: string | null,
  arg3?: string | null,
  arg4?: string | null
): Promise<PortRecord[]> => {
  let countryCode: string | undefined;
  let subdivisionCode: string | undefined;
  let mode: string | undefined;

  if (arg4 !== undefined) {
    // Signature: (query, countryCode, subdivisionCode, mode)
    countryCode = arg2 || undefined;
    subdivisionCode = arg3 || undefined;
    mode = arg4 || undefined;
  } else if (arg2 && (normalizeIsAirMode(arg2) || arg2.toLowerCase() === 'ship' || arg2.toLowerCase() === 'ocean' || arg2.toLowerCase() === 'sea')) {
    // Signature: (query, mode, countryCode)
    mode = arg2 || undefined;
    countryCode = arg3 || undefined;
  } else {
    // Default Signature: (query, countryCode, subdivisionCode, mode)
    countryCode = arg2 || undefined;
    subdivisionCode = arg3 || undefined;
    mode = arg4 || undefined;
  }

  const cleanQuery = (query || '').trim();
  const isAir = normalizeIsAirMode(mode);

  try {
    const params = new URLSearchParams({ q: cleanQuery, mode: isAir ? 'AIR' : 'SEA' });
    if (countryCode) params.append('country', countryCode);
    if (subdivisionCode) params.append('subdivision', subdivisionCode);

    const res = await fetch(`http://127.0.0.1:8000/api/port?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          unlocode: item.unlocode || item.code,
          port_name: item.name || item.port_name,
          country: item.country,
          subdivision: item.subdivision,
          is_sea_port: item.is_sea_port ?? !isAir,
          is_air_port: item.is_air_port ?? isAir,
        }));
      }
    }
  } catch {
    // API offline, fallback to client UN/LOCODE CSV dataset
  }

  // Fallback: Client-side UN/LOCODE search strictly mode-filtered
  const result = fetchPortsWithHierarchicalFallback(
    {
      city: cleanQuery,
      countryCode: countryCode || undefined,
      state: subdivisionCode || undefined,
    },
    mode
  );
  return result.ports;
};
