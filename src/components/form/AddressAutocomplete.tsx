import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Globe, Building2, Compass } from 'lucide-react';
import './AddressAutocomplete.css';

export interface ExtractedAddress {
  fullAddress: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  postcode?: string;
  rawAddress?: any;
}

interface AddressAutocompleteProps {
  label?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  onChangeAddress: (address: ExtractedAddress) => void;
}

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
  'காஞ்சிபுரம்': 'Kanchipuram',
  'செங்கல்பட்டு': 'Chengalpattu',
  'இந்தியா': 'India',
  'மாவட்டம': '',
  'மாவட்டம்': '',
};

export const sanitizeToEnglish = (inputStr: string): string => {
  if (!inputStr) return '';
  let text = inputStr;

  Object.keys(TAMIL_TO_ENGLISH_MAP).forEach((tamilKey) => {
    if (text.includes(tamilKey)) {
      text = text.split(tamilKey).join(TAMIL_TO_ENGLISH_MAP[tamilKey]);
    }
  });

  // Remove remaining non-Latin script characters if any
  text = text.replace(/[\u0B80-\u0BFF]+/g, '').trim();
  text = text.replace(/\s+/g, ' ').replace(/^,\s*|,\s*$/g, '').trim();

  return text;
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label = 'Pickup Address *',
  value = '',
  placeholder = 'Type street, city, state, or postal code...',
  error,
  onChangeAddress,
}) => {
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<ExtractedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<ExtractedAddress | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value && value !== inputText) {
      setInputText(value);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch OpenStreetMap / LocationIQ Autocomplete Suggestions ONLY IN ENGLISH (`accept-language=en`)
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const envKey = (import.meta as any).env?.VITE_LOCATIONIQ_API_KEY;
    const locationIqKey = envKey && !envKey.includes('0123456789') ? envKey : null;

    try {
      let response: Response | null = null;

      // 1. Try LocationIQ Autocomplete API ONLY if valid non-placeholder key exists
      if (locationIqKey) {
        try {
          const locIqUrl = `https://api.locationiq.com/v1/autocomplete?key=${locationIqKey}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&accept-language=en&limit=6`;
          response = await fetch(locIqUrl, {
            headers: {
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
        } catch {
          response = null;
        }
      }

      // 2. Fallback to OpenStreetMap Nominatim Search API (Free, No API Key Required)
      if (!response || !response.ok) {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&accept-language=en&limit=6`;
        response = await fetch(nominatimUrl, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'ThisaiFreightApp/1.0',
          },
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const parsed: ExtractedAddress[] = data.map((item: any) => {
            const addr = item.address || {};

            // Raw fields
            let rawCity =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.suburb ||
              addr.county ||
              item.display_name.split(',')[0] ||
              '';
            let rawState = addr.state || addr.region || addr.state_district || '';
            let rawCountry = addr.country || '';
            let rawFull = item.display_name;

            // Enforce 100% English Transliteration & Sanitization
            let city = sanitizeToEnglish(rawCity) || rawCity;
            let state = sanitizeToEnglish(rawState) || rawState;
            let country = sanitizeToEnglish(rawCountry) || rawCountry;
            let fullAddress = sanitizeToEnglish(rawFull) || rawFull;

            // Strip redundant "District" suffix from city names (e.g. "Chennai District" -> "Chennai")
            if (city.toLowerCase().endsWith(' district')) {
              city = city.substring(0, city.length - 9).trim();
            }

            const countryCode = (addr.country_code || '').toUpperCase();
            const postcode = addr.postcode || '';

            return {
              fullAddress,
              city,
              state,
              country,
              countryCode,
              postcode,
              rawAddress: addr,
            };
          });

          setSuggestions(parsed);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.warn('OpenStreetMap / LocationIQ lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(val);
    }, 400); // 400ms debounce trigger
  };

  const handleSelectSuggestion = (item: ExtractedAddress) => {
    setInputText(item.fullAddress);
    setSelectedAddress(item);
    setIsOpen(false);
    onChangeAddress(item);
  };

  return (
    <div className="address-autocomplete-container" ref={containerRef}>
      {label && <label className="field-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.25rem', display: 'block' }}>{label}</label>}

      <div className="address-input-wrapper">
        <div className="address-input-icon">
          <MapPin size={15} />
        </div>

        <input
          type="text"
          className="address-input-field"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
        />

        {isLoading && <Loader2 size={15} className="address-spinner" />}
      </div>

      {error && <div className="field-error-text" style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: '0.2rem' }}>{error}</div>}

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div className="address-suggestions-dropdown">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              className="address-suggestion-item"
              onClick={() => handleSelectSuggestion(item)}
            >
              <MapPin size={15} className="address-suggestion-icon" />
              <div className="address-suggestion-details">
                <span className="address-suggestion-display">{item.fullAddress}</span>
                <span className="address-suggestion-sub">
                  City: <strong>{item.city || 'N/A'}</strong> • State: <strong>{item.state || 'N/A'}</strong> • Country: <strong>{item.country} ({item.countryCode})</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extracted City, State & Country Bar for Easy Port Matching */}
      {selectedAddress && (
        <div className="extracted-location-pills">
          <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.70rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Compass size={12} className="text-blue-600" /> Extracted Address:
          </span>

          <span className="location-pill city-pill">
            <Building2 size={11} /> City: {selectedAddress.city || 'N/A'}
          </span>

          <span className="location-pill state-pill">
            State: {selectedAddress.state || 'N/A'}
          </span>

          <span className="location-pill">
            <Globe size={11} /> {selectedAddress.country} ({selectedAddress.countryCode})
          </span>
        </div>
      )}
    </div>
  );
};
