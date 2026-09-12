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

/**
 * Fetches matching ports for a given city and country directly from the UN/LOCODE CSV dataset.
 */
export const fetchPortsByCity = (
  cityName: string,
  countryCode?: string | null,
  mode?: string | null
): PortRecord[] => {
  if (!cityName || !cityName.trim()) return [];
  const cityLower = cityName.trim().toLowerCase();
  const isAir = mode === 'AIR' || mode === 'Air';

  return UNLOCODE_CSV_DATASET.filter((p) => {
    // Mode match (Sea vs Air)
    if (isAir && !p.is_air_port) return false;
    if (!isAir && !p.is_sea_port) return false;

    // Country match if provided
    if (countryCode && p.country.toUpperCase() !== countryCode.toUpperCase()) return false;

    // City match against CSV port_name, ascii name, subdivision, or remarks
    const pName = p.port_name.toLowerCase();
    const pSub = (p.subdivision || '').toLowerCase();
    const pRem = (p.remarks || '').toLowerCase();
    const pCode = p.unlocode.toLowerCase();

    return (
      pName.includes(cityLower) ||
      cityLower.includes(pName) ||
      pSub.includes(cityLower) ||
      pRem.includes(cityLower) ||
      pCode.includes(cityLower)
    );
  });
};

/**
 * Dynamically identifies corresponding UN/LOCODE ports for any address (manual text or address object).
 * Parses free-form manual address text into city/country tokens and queries the UN/LOCODE CSV dataset.
 */
export const findPortsFromAddress = (
  address: string | { city?: string; countryCode?: string; country?: string; street?: string; label?: string } | null,
  mode?: string | null
): PortRecord[] => {
  if (!address) return [];

  const isAir = mode === 'AIR' || mode === 'Air';

  // 1. If address is an object with explicit city property
  if (typeof address === 'object') {
    const city = address.city || address.label || '';
    const country = address.countryCode || '';
    const ports = fetchPortsByCity(city, country, mode);
    if (ports.length > 0) return ports;
    return fetchPortsByCity(city, null, mode);
  }

  // 2. If address is a free-form manually typed text string
  const addressText = address.trim();
  if (!addressText) return [];

  // Parse address string into comma/whitespace separated tokens
  const rawTokens = addressText
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const modeFiltered = UNLOCODE_CSV_DATASET.filter((p) => (isAir ? p.is_air_port : p.is_sea_port));

  // Search each token from right to left (City, State, Country are usually near the end)
  for (let i = rawTokens.length - 1; i >= 0; i--) {
    const token = rawTokens[i].toLowerCase();
    if (/^\d+$/.test(token)) continue; // skip numbers/zips

    const tokenMatches = modeFiltered.filter((p) => {
      const pName = p.port_name.toLowerCase();
      const pCountryName = (p.country_name || '').toLowerCase();
      const pCountry = p.country.toLowerCase();
      const pSub = (p.subdivision || '').toLowerCase();
      const pCode = p.unlocode.toLowerCase();

      return (
        pName === token ||
        pName.includes(token) ||
        token.includes(pName) ||
        pSub === token ||
        (pSub && pSub.includes(token)) ||
        pCode === token
      );
    });

    if (tokenMatches.length > 0) {
      return tokenMatches;
    }
  }

  // Fallback: substring check across whole address text
  const cleanFull = addressText.toLowerCase();
  return modeFiltered.filter((p) => {
    const pName = p.port_name.toLowerCase();
    return cleanFull.includes(pName) || pName.includes(cleanFull);
  });
};

/**
 * Searches ports dynamically via FastAPI backend if running, with full fallback to UN/LOCODE CSV dataset.
 */
export const fetchFromMeiliSearch = async (
  query: string,
  countryCode?: string | null,
  subdivisionCode?: string | null,
  mode?: string | null
): Promise<PortRecord[]> => {
  const isAir = mode === 'AIR' || mode === 'Air';
  const modeParam = isAir ? 'AIR' : 'SHIP';

  // 1. Try python FastAPI port_dataset backend first if available
  try {
    const apiRes = await fetch(
      `http://127.0.0.1:8000/api/port?city_name=${encodeURIComponent(query || '')}&mode=${modeParam}${
        countryCode ? `&country_code=${encodeURIComponent(countryCode)}` : ''
      }`
    );
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((item: any) => ({
          unlocode: item.unlocode,
          port_name: item.port_name,
          country: item.country_code,
          country_name: item.country_name,
          city: item.port_name,
          subdivision: item.state_name,
          is_sea_port: item.is_sea_port,
          is_air_port: item.is_air_port,
          function: isAir ? '4' : '1',
        }));
      }
    }
  } catch {
    // FastAPI server offline -> proceed to UN/LOCODE CSV dataset in memory
  }

  // 2. Query UN/LOCODE CSV Dataset
  const qLower = (query || '').trim().toLowerCase();

  return UNLOCODE_CSV_DATASET.filter((p) => {
    if (isAir && !p.is_air_port) return false;
    if (!isAir && !p.is_sea_port) return false;

    if (countryCode && p.country.toUpperCase() !== countryCode.toUpperCase()) return false;

    if (qLower) {
      const codeMatch = p.unlocode.toLowerCase().includes(qLower);
      const nameMatch = p.port_name.toLowerCase().includes(qLower);
      const subMatch = (p.subdivision || '').toLowerCase().includes(qLower);
      return codeMatch || nameMatch || subMatch;
    }

    return true;
  });
};
