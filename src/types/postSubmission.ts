import type { SubmittedRFQRecord } from './rfq';

export type QuoteType = 'third_party' | 'thisai';
export type MarkupType = 'flat' | 'percent';
export type DocumentStatus = 'pending' | 'collected' | 'verified';

export interface StageQuote {
  id: string;
  type: QuoteType;
  providerName: string;
  baseRate: number;
  markupType: MarkupType;
  markupValue: number; // Value entered by user ($ or %)
  markupCalculatedAmount: number; // Calculated USD amount of markup
  finalRate: number; // baseRate + markupCalculatedAmount
  transitTime: string;
  validUntil: string;
  notes?: string;
  isSelected: boolean;
}

export interface StageDocument {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  fileName?: string;
  uploadedAt?: string;
}

export interface ShipmentStage {
  id: string;
  stageName: string;
  category: 'first_mile' | 'origin_customs' | 'main_haul' | 'dest_customs' | 'last_mile' | 'special_service';
  locationInfo: string;
  iconType: 'truck' | 'customs' | 'ship' | 'plane' | 'warehouse' | 'shield' | 'flame' | 'thermometer' | 'box';
  quotes: StageQuote[];
  documents: StageDocument[];
}

export interface PostSubmissionSummary {
  rfqRecord: SubmittedRFQRecord;
  stages: ShipmentStage[];
  totalCustomerPrice: number;
  totalBaseCost: number;
  totalThisaiMargin: number;
  overallDocumentProgress: number; // 0 to 100 %
}
