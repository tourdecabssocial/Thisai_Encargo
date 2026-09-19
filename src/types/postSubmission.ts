import type { SubmittedRFQRecord, CurrencyType } from './rfq';

export type QuoteType = 'third_party' | 'thisai';
export type MarkupType = 'flat' | 'percent';
export type DocumentStatus = 'pending' | 'collected' | 'verified';

export interface LineItemChargeBreakdown {
  id: string;
  chargeName: string;
  category: string;
  amount: number;
  notes: string;
  isMandatory: boolean;
}

export interface ChargeItemOptionQuote {
  id: string;
  providerName: string;
  type: QuoteType;
  baseRate: number;
  markupValue: number;
  finalRate: number;
  isSelected: boolean;
  transitTime?: string;
  notes?: string;
}

export interface ChargeItemGroupBundle {
  groupId: string;
  groupName: string;
  lineItemIds: string[];
  bundleRate: number;
}

export interface CategoryQuote {
  id: string;
  providerName: string;
  type?: QuoteType;
  baseRate: number;
  markupValue: number;
  markupType?: MarkupType;
  currency?: CurrencyType;
  finalRate: number;
  isSelected: boolean;
  transitTime?: string;
  validUntil?: string;
  notes?: string;
  rateMode?: 'category_lump' | 'itemized_charge' | 'grouped_sets';
  itemizedAmounts?: Record<string, number>;
  bundles?: ChargeItemGroupBundle[];
}

export interface CategoryGroupedChargeLineItem {
  id: string;
  chargeName: string;
  category: string;
  stage: string;
  notes: string;
  applicableScopes: string;
  mode: string[];
  selectedRate: number;
  quotes?: ChargeItemOptionQuote[];
}

export interface StageCategoryGroup {
  categoryName: string;
  categoryQuotes: CategoryQuote[];
  lineItems: CategoryGroupedChargeLineItem[];
}

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
  chargesBreakdown?: LineItemChargeBreakdown[];
  categoryGroups?: StageCategoryGroup[];
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
  categoryGroups?: StageCategoryGroup[];
}

export interface PostSubmissionSummary {
  rfqRecord: SubmittedRFQRecord;
  stages: ShipmentStage[];
  totalCustomerPrice: number;
  totalBaseCost: number;
  totalThisaiMargin: number;
  overallDocumentProgress: number; // 0 to 100 %
}
