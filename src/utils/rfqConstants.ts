export const SCOPE_INCOTERMS_MAP: Record<string, string[]> = {
  D2D: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DDP'],
  P2P: ['FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DPU'],
  P2D: ['CPT', 'CIP', 'DPU'],
  D2P: ['FCA', 'CPT', 'CIP'],
};

// Ready Date must be at least 6 days in the future from today
export const getMinReadyDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Delivery Date must be later than Ready Date and provide sufficient transit time based on mode
export const getMinDeliveryDate = (readyDateStr?: string, mode: string = 'Ship'): string => {
  const baseReady = readyDateStr || getMinReadyDate();
  const parts = baseReady.split('-').map(Number);
  if (parts.length !== 3) return baseReady;

  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  // Air mode requires at least 4 transit days; Ocean mode requires at least 14 transit days
  const transitDays = mode === 'Air' ? 4 : 14;
  d.setDate(d.getDate() + transitDays);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
