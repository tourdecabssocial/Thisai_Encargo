import React, { useState, useEffect, useRef } from 'react';
import { fetchFromMeiliSearch, normalizeIsAirMode, type PortRecord } from '../../services/portSearchService';
import { Anchor, Plane, ChevronDown, Check } from 'lucide-react';
import './FormInput.css';

export interface PortOptionItem {
  value: string; // UN/LOCODE (e.g. INMAA, USJFK)
  label: string; // Display label (e.g. INMAA - Chennai Port)
  name: string;  // Port name (e.g. Chennai Port)
  city?: string;
  country?: string;
}

interface PortAutocompleteProps {
  label: string;
  value: string; // UN/LOCODE code
  selectedPortName?: string;
  countryCode?: string | null;
  subdivisionCode?: string | null;
  mode?: string | null; // 'Air' | 'Ship' | 'AIR' | 'OCEAN'
  error?: string;
  placeholder?: string;
  helperText?: string;
  icon?: React.ReactNode;
  onChange: (portCode: string, portName: string, country?: string) => void;
}

export const PortAutocomplete: React.FC<PortAutocompleteProps> = ({
  label,
  value,
  selectedPortName,
  countryCode,
  subdivisionCode,
  mode,
  error,
  placeholder,
  helperText,
  icon,
  onChange,
}) => {
  const [options, setOptions] = useState<PortOptionItem[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAir = normalizeIsAirMode(mode);

  // Sync initial input value display text
  useEffect(() => {
    if (value) {
      if (selectedPortName) {
        setInputValue(`${selectedPortName} (${value})`);
      } else {
        const found = options.find((o) => o.value === value);
        if (found) {
          setInputValue(`${found.name} (${found.value})`);
        } else {
          setInputValue(value);
        }
      }
    } else {
      setInputValue('');
    }
  }, [value, selectedPortName]);

  // 1. Automatic Pre-fetching when mode, country, or subdivision changes
  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    fetchFromMeiliSearch('', countryCode, subdivisionCode, mode)
      .then((hits) => {
        if (!isSubscribed) return;
        const mapped: PortOptionItem[] = hits.map((p: PortRecord) => ({
          value: p.unlocode,
          name: p.port_name,
          label: `${p.unlocode} - ${p.port_name}`,
          city: p.city,
          country: p.country,
        }));
        setOptions(mapped);
      })
      .finally(() => {
        if (isSubscribed) setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [countryCode, subdivisionCode, mode]);

  // 2. Debounced User Search (300ms)
  useEffect(() => {
    if (!isOpen) return;
    const cleanQuery = inputValue.replace(/\s*\([A-Z0-9]+\)\s*$/, '').trim();

    const timer = setTimeout(() => {
      setIsLoading(true);
      fetchFromMeiliSearch(cleanQuery, countryCode, subdivisionCode, mode)
        .then((hits) => {
          const mapped: PortOptionItem[] = hits.map((p: PortRecord) => ({
            value: p.unlocode,
            name: p.port_name,
            label: `${p.unlocode} - ${p.port_name}`,
            city: p.city,
            country: p.country,
          }));

          setOptions(mapped);
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, isOpen, countryCode, subdivisionCode, mode]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPort = (opt: PortOptionItem) => {
    setInputValue(`${opt.name} (${opt.value})`);
    onChange(opt.value, opt.name, opt.country);
    setIsOpen(false);
  };

  return (
    <div className="form-field" ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="field-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {label}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '0.75rem', color: isAir ? '#2563eb' : '#0891b2', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          {icon || (isAir ? <Plane size={16} /> : <Anchor size={16} />)}
        </div>

        <input
          type="text"
          value={inputValue}
          placeholder={placeholder || (isAir ? 'Search Airport by UN/LOCODE, Name or City (e.g. MAA, JFK)...' : 'Search Seaport by UN/LOCODE, Name or City (e.g. INMAA, USNYC)...')}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '0.6rem 2.2rem 0.6rem 2.3rem',
            borderRadius: '8px',
            border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#0f172a',
            background: '#ffffff',
            outline: 'none',
            boxShadow: isOpen ? `0 0 0 3px ${isAir ? 'rgba(37, 99, 235, 0.15)' : 'rgba(8, 145, 178, 0.15)'}` : 'none',
          }}
        />

        <div style={{ position: 'absolute', right: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {helperText && <div className="field-helper-text" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{helperText}</div>}
      {error && <div className="field-error-text" style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.25rem' }}>{error}</div>}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 99,
            marginTop: '0.35rem',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            maxHeight: '230px',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '0.4rem 0.75rem', background: isAir ? '#eff6ff' : '#ecfeff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.73rem', fontWeight: 700, color: isAir ? '#1d4ed8' : '#0e7490' }}>
            <span>{isAir ? '✈️ Air Terminals & International Airports (Mode: Air)' : '⚓ Sea Ports & Maritime Terminals (Mode: Ship)'}</span>
            {isLoading && <span style={{ color: '#2563eb' }}>Searching...</span>}
          </div>

          {options.length > 0 ? (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={`${opt.value}-${opt.name}`}
                  onClick={() => handleSelectPort(opt)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelected ? (isAir ? '#eff6ff' : '#ecfeff') : '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.85rem',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 800, color: isAir ? '#1d4ed8' : '#0891b2', background: isAir ? '#dbeafe' : '#cff4fc', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {opt.value}
                    </span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {opt.name} {opt.country ? `(${opt.country})` : ''}
                    </span>
                  </div>
                  {isSelected && <Check size={16} style={{ color: isAir ? '#2563eb' : '#0891b2' }} />}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748b' }}>
              No matching {isAir ? 'airports' : 'sea ports'} found. Type custom UN/LOCODE directly.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
