import React, { useState } from 'react';
import {
  Ship,
  Plane,
  Truck,
  Home,
  Warehouse,
  Anchor,
  Clock,
  FileText,
  UserCheck,
  ShieldCheck,
  Cloud,
  Sun,
  Compass,
} from 'lucide-react';
import { resolveTradeLane, getHSChapterComplianceFromSchema } from '../../services/cargoDocService';
import './ShipmentFlowVisualizer.css';

interface ShipmentFlowVisualizerProps {
  mode?: 'Air' | 'Ocean' | string;
  serviceScope?: 'D2D' | 'P2P' | 'D2P' | 'P2D' | string;
  originName?: string;
  destName?: string;
  fromAddress?: string;
  toAddress?: string;
  currentStep?: number;
  hsCode?: string;
  isHazmat?: boolean;
  isReefer?: boolean;
}

export interface RoutePoint {
  id: string;
  name: string;
  sub: string;
  fullTitle?: string;
  type: 'home' | 'hub' | 'port' | 'linehaul' | 'dest_port' | 'dest_hub' | 'customer';
}

export interface FlowConnector {
  id: string;
  flowName: string;
  shortLabel: string;
  milestoneCode: string;
  description: string;
  stakeholder: string;
  estimatedTime: string;
  document: string;
  documents?: string[];
  vehicleType: 'truck' | 'clearance' | 'main_linehaul';
}

export const ShipmentFlowVisualizer: React.FC<ShipmentFlowVisualizerProps> = ({
  mode = 'Ocean',
  serviceScope = 'D2D',
  originName,
  destName,
  fromAddress,
  toAddress,
  hsCode,
  isHazmat,
  isReefer,
}) => {
  const isAir = mode === 'Air';
  const scope = serviceScope || 'D2D';
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  // Scope boolean checks
  const isOriginDoorActive = scope === 'D2D' || scope === 'D2P';
  const isDestDoorActive = scope === 'D2D' || scope === 'P2D';

  // Dynamic Selected Addresses & Ports Formatted Labels
  const displayFromAddr = fromAddress || 'Origin Pickup Address';
  const displayToAddr = toAddress || 'Destination Delivery Door';
  const displayOriginPort = originName || (isAir ? 'Origin POL Airport' : 'Origin POL Sea Port');
  const displayDestPort = destName || (isAir ? 'Dest POD Airport' : 'Dest POD Sea Port');

  // 7 Location Points (Nodes) with Selected Address & Port names
  const points: RoutePoint[] = [
    {
      id: 'p1',
      name: displayFromAddr,
      sub: 'Shipper Pickup',
      fullTitle: `Origin Pickup Address: ${displayFromAddr}`,
      type: 'home',
    },
    {
      id: 'p2',
      name: 'Origin Hub',
      sub: 'CFS Consolidation',
      fullTitle: 'Origin Consolidation CFS Terminal',
      type: 'hub',
    },
    {
      id: 'p3',
      name: displayOriginPort,
      sub: isAir ? 'Origin Airport (POL)' : 'Origin Seaport (POL)',
      fullTitle: `Origin Gateway Port: ${displayOriginPort}`,
      type: 'port',
    },
    {
      id: 'p4',
      name: isAir ? 'Air Linehaul Flight' : 'Sea Linehaul Vessel',
      sub: isAir ? 'Direct Flight' : 'Ocean Liner Voyage',
      fullTitle: isAir ? 'Main Freight Air Cargo Transit' : 'Main Freight Ocean Vessel Transit',
      type: 'linehaul',
    },
    {
      id: 'p5',
      name: displayDestPort,
      sub: isAir ? 'Dest Airport (POD)' : 'Dest Seaport (POD)',
      fullTitle: `Destination Gateway Port: ${displayDestPort}`,
      type: 'dest_port',
    },
    {
      id: 'p6',
      name: 'Dest Hub',
      sub: 'CFS Deconsolidation',
      fullTitle: 'Destination CFS Terminal',
      type: 'dest_hub',
    },
    {
      id: 'p7',
      name: displayToAddr,
      sub: 'Consignee Door',
      fullTitle: `Destination Delivery Address: ${displayToAddr}`,
      type: 'customer',
    },
  ];

  const tradeLane = resolveTradeLane(displayFromAddr || displayOriginPort, displayToAddr || displayDestPort);
  const hsCompliance = getHSChapterComplianceFromSchema(hsCode, tradeLane);

  const hsExportDocs = hsCompliance?.exportAgencyDocs || [];
  const hsImportDocs = hsCompliance?.importAgencyDocs || [];

  // 6 Intermediate Flow Connections (Flow Names between Points)
  const flows: FlowConnector[] = [
    {
      id: 'f1',
      flowName: `First Mile Pickup from ${displayFromAddr}`,
      shortLabel: 'First Mile',
      milestoneCode: 'F-01',
      description: `First-mile truck pickup from ${displayFromAddr} to origin consolidation hub.`,
      stakeholder: 'Drayage Trucker',
      estimatedTime: '2 - 4 Hours',
      document: isReefer ? 'Dock Receipt & Cold Chain Temp Setup' : 'Dock Receipt & Dispatch Order',
      documents: [
        'Dock Receipt & Dispatch Order',
        'Booking Confirmation',
        ...(isReefer ? ['Cold Chain Temperature Setting Instructions'] : []),
        ...(isHazmat ? ['Dangerous Goods Multimodal Declaration'] : []),
      ],
      vehicleType: 'truck',
    },
    {
      id: 'f2',
      flowName: `Transfer to ${displayOriginPort}`,
      shortLabel: 'Drayage',
      milestoneCode: 'F-02',
      description: `Cargo transfer, palletization, and drayage transport to ${displayOriginPort}.`,
      stakeholder: 'Hub Logistics Team',
      estimatedTime: '3 - 6 Hours',
      document: isHazmat ? 'Terminal Gate Pass & IMO DG Gate Pass' : 'Terminal Gate Pass',
      documents: [
        'Terminal Gate Pass',
        'Verified Gross Mass (VGM) Certificate',
        ...(isHazmat ? ['IMO Hazmat Approval & Terminal DG Gate Pass'] : []),
      ],
      vehicleType: 'truck',
    },
    {
      id: 'f3',
      flowName: 'Export Customs Clearance',
      shortLabel: 'Export Clearance',
      milestoneCode: 'F-03',
      description: `Automated AES export customs filing & gantry loading at ${displayOriginPort}.`,
      stakeholder: 'Export Customs Broker',
      estimatedTime: '4 - 12 Hours',
      document: hsExportDocs.length > 0
        ? `Export Clearance (${hsExportDocs.length} HS Ch. ${hsCompliance?.chapter} Docs)`
        : 'Export Clearance Release',
      documents: [
        'Shipping Bill / AES Export Declaration',
        'Export Clearance Release Certificate',
        ...hsExportDocs,
      ],
      vehicleType: 'clearance',
    },
    {
      id: 'f4',
      flowName: isAir ? `Air Linehaul (${displayOriginPort} ➔ ${displayDestPort})` : `Ocean Linehaul (${displayOriginPort} ➔ ${displayDestPort})`,
      shortLabel: isAir ? 'Air Freight' : 'Ocean Linehaul',
      milestoneCode: 'F-04',
      description: isAir
        ? `Direct air cargo flight transit from ${displayOriginPort} to ${displayDestPort}.`
        : `Deep-sea container liner vessel voyage from ${displayOriginPort} to ${displayDestPort} with AIS tracking.`,
      stakeholder: isAir ? 'Air Carrier' : 'Ocean Carrier',
      estimatedTime: isAir ? '12 - 36 Hours' : '10 - 25 Days',
      document: isAir ? 'Air Waybill (AWB)' : 'Master Bill of Lading (MBL)',
      documents: isAir
        ? ['Air Waybill (AWB)', 'Master Cargo Manifest', 'Commercial Invoice & Packing List']
        : ['Master Bill of Lading (MBL)', 'Container Load Plan', 'Commercial Invoice & Packing List'],
      vehicleType: 'main_linehaul',
    },
    {
      id: 'f5',
      flowName: 'Import Customs Clearance',
      shortLabel: 'Import Clearance',
      milestoneCode: 'F-05',
      description: `Vessel unberthing/discharge at ${displayDestPort}, CBP import clearance & DO release.`,
      stakeholder: 'Import Customs Broker',
      estimatedTime: '6 - 24 Hours',
      document: hsImportDocs.length > 0
        ? `Import Clearance (${hsImportDocs.length} HS Ch. ${hsCompliance?.chapter} Permits)`
        : 'Import Customs Entry 7501',
      documents: [
        'Bill of Entry (Import Customs Entry 7501)',
        'Delivery Order (DO) Release',
        ...hsImportDocs,
      ],
      vehicleType: 'clearance',
    },
    {
      id: 'f6',
      flowName: `Last Mile Delivery to ${displayToAddr}`,
      shortLabel: 'Last Mile',
      milestoneCode: 'F-06',
      description: `Outbound drayage from destination terminal to ${displayToAddr} with clean POD.`,
      stakeholder: 'Last-Mile Delivery Trucker',
      estimatedTime: '3 - 8 Hours',
      document: 'Signed Proof of Delivery (POD)',
      documents: ['Signed Proof of Delivery (POD)', 'Gate Pass Out', 'e-Way Bill / Transshipment Permit'],
      vehicleType: 'truck',
    },
  ];

  // Utility to determine if a point is active under the current service scope
  const isPointActive = (type: string) => {
    if ((type === 'home' || type === 'hub') && !isOriginDoorActive) return false;
    if ((type === 'dest_hub' || type === 'customer') && !isDestDoorActive) return false;
    return true;
  };

  // Utility to determine if a flow leg is active under current service scope
  const isFlowActive = (index: number) => {
    if ((index === 0 || index === 1) && !isOriginDoorActive) return false;
    if ((index === 4 || index === 5) && !isDestDoorActive) return false;
    return true;
  };

  const activeFlowData = flows.find((f) => f.id === activeFlowId);

  return (
    <div className={`shipment-visual-flow-card node-flow-style fit-width ${isAir ? 'air-mode' : 'ocean-mode'}`}>
      {/* Card Header */}
      <div className="flow-card-header">
        <div className="flow-header-title-group">
          <span className={`flow-badge ${isAir ? 'air-badge' : 'ocean-badge'}`}>
            {isAir ? <Plane size={14} className="pulse-icon" /> : <Ship size={14} className="bobbing-icon" />}{' '}
            {isAir ? 'Air Freight Route' : 'Ocean Freight Route'}
          </span>
          <h3 className="flow-title">Point-to-Point Operational Route & Leg Flows</h3>
        </div>

        <div className="flow-scope-pill">
          <span className="scope-label">Scope:</span>
          <strong className="scope-value">
            {scope === 'D2D' && 'Door-to-Door (Full Route)'}
            {scope === 'P2P' && 'Port-to-Port (Main Linehaul Only)'}
            {scope === 'D2P' && 'Door-to-Port'}
            {scope === 'P2D' && 'Port-to-Door'}
          </strong>
        </div>
      </div>

      {/* Main Chain: 100% Fit Width with Realistic Animated Ocean Sea & Drifting Clouds */}
      <div className={`point-to-point-flow-wrapper fit-width ${isAir ? 'sky-background' : 'sea-background'}`}>
        {/* Animated Background Ambience */}
        <div className="flow-ambience-overlay">
          {isAir ? (
            /* ☁️ VIBRANT SKY & DRIFTING CLOUDS */
            <div className="sky-canvas">
              <Sun size={28} className="sky-sun-glow" />
              <div className="drifting-clouds-group">
                <div className="cloud-wrapper cloud-1">
                  <Cloud size={40} className="cloud-icon" />
                </div>
                <div className="cloud-wrapper cloud-2">
                  <Cloud size={34} className="cloud-icon" />
                </div>
                <div className="cloud-wrapper cloud-3">
                  <Cloud size={46} className="cloud-icon" />
                </div>
                <div className="cloud-wrapper cloud-4">
                  <Cloud size={28} className="cloud-icon" />
                </div>
                <div className="cloud-wrapper cloud-5">
                  <Cloud size={36} className="cloud-icon" />
                </div>
              </div>
            </div>
          ) : (
            /* 🌊 REALISTIC ROLLING OCEAN SEA WATER WITH FOAM & WAVES */
            <div className="sea-canvas">
              <Compass size={22} className="sea-compass-icon" />
              <div className="ocean-waves-container">
                <svg className="sea-wave-svg wave-layer-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,0 C150,90 350,-40 500,45 C650,110 900,-30 1200,30 L1200,120 L0,120 Z"></path>
                </svg>
                <svg className="sea-wave-svg wave-layer-2" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,20 C200,-20 400,70 600,15 C800,-30 1000,60 1200,10 L1200,120 L0,120 Z"></path>
                </svg>
                <svg className="sea-wave-svg wave-layer-3" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,40 C300,80 600,-20 900,60 C1050,90 1150,30 1200,45 L1200,120 L0,120 Z"></path>
                </svg>
              </div>
              <div className="sea-foam-particles">
                <span className="foam-dot f1"></span>
                <span className="foam-dot f2"></span>
                <span className="foam-dot f3"></span>
                <span className="foam-dot f4"></span>
              </div>
            </div>
          )}
        </div>

        <div className="flow-chain-container fit-width">
          {points.map((point, index) => {
            const active = isPointActive(point.type);
            const flow = flows[index];
            const flowActive = isFlowActive(index);

            return (
              <React.Fragment key={point.id}>
                {/* 📍 POINT NODE */}
                <div
                  className={`route-point-node fit ${active ? 'active' : 'muted'} ${
                    point.type === 'linehaul' ? 'center-linehaul' : ''
                  }`}
                  title={point.fullTitle || point.name}
                >
                  <div className={`point-icon-box compact ${point.type}-node-box`}>
                    {point.type === 'home' && <Home size={18} className="node-icon pulse-home" />}
                    {point.type === 'hub' && <Warehouse size={18} className="node-icon pulse-hub" />}
                    {point.type === 'port' && <Anchor size={18} className="node-icon pulse-port" />}
                    {point.type === 'linehaul' &&
                      (isAir ? (
                        <Plane size={22} className="node-icon float-plane" />
                      ) : (
                        <Ship size={22} className="node-icon bob-ship" />
                      ))}
                    {point.type === 'dest_port' && <Anchor size={18} className="node-icon pulse-port" />}
                    {point.type === 'dest_hub' && <Warehouse size={18} className="node-icon pulse-hub" />}
                    {point.type === 'customer' && <Home size={18} className="node-icon pulse-home" />}

                    {/* Aura Glow Effect */}
                    {active && <div className="node-aura-pulse"></div>}
                  </div>

                  <div className="point-text-labels compact">
                    <span className="point-name" title={point.fullTitle || point.name}>
                      {point.name}
                    </span>
                    <span className="point-sub">{point.sub}</span>
                  </div>
                </div>

                {/* ↔️ FLOW CONNECTOR LEG WITH BIGGER ANIMATED MOVING VEHICLES */}
                {flow && (
                  <div
                    className={`flow-connector-leg fit ${flowActive ? 'active' : 'muted'} ${
                      activeFlowId === flow.id ? 'selected' : ''
                    } leg-${flow.vehicleType}`}
                    onClick={() => setActiveFlowId(activeFlowId === flow.id ? null : flow.id)}
                    title={`${flow.flowName} - Click for details`}
                  >
                    <div className="flow-line-track">
                      <span className="flow-arrow-head left">‹</span>

                      {/* Laser Beam & Dashed Track Line */}
                      <div className="flow-dashed-line">
                        {flowActive && <div className="flow-laser-pulse"></div>}
                      </div>

                      <span className="flow-arrow-head right">›</span>

                      {/* 🚗 ✈️ 🚢 BIGGER ANIMATED MOVING VEHICLES ALONG THE LEG */}
                      {flowActive && (
                        <div className="vehicle-traveler-container">
                          {flow.vehicleType === 'truck' && (
                            <Truck size={16} className="animated-vehicle truck-driving" />
                          )}
                          {flow.vehicleType === 'clearance' && (
                            <ShieldCheck size={16} className="animated-vehicle clearance-scanning" />
                          )}
                          {flow.vehicleType === 'main_linehaul' &&
                            (isAir ? (
                              <Plane size={22} className="animated-vehicle plane-flying" />
                            ) : (
                              <Ship size={22} className="animated-vehicle ship-sailing" />
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flow-label-badge compact">
                      <span className="flow-tag">{flow.milestoneCode}</span>
                      <span className="flow-text">{flow.shortLabel}</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Flow Leg Operational Details Dropdown / Bar */}
      {activeFlowData && (
        <div className="active-flow-detail-card animate-fade-in">
          <div className="flow-detail-header">
            <div className="detail-title-group">
              <span className="detail-badge">{activeFlowData.milestoneCode}</span>
              <strong className="detail-name">{activeFlowData.flowName} Details</strong>
            </div>

            <button type="button" className="close-detail-btn" onClick={() => setActiveFlowId(null)}>
              ×
            </button>
          </div>

          <p className="detail-desc">{activeFlowData.description}</p>

          <div className="detail-meta-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="meta-item">
              <UserCheck size={12} /> {activeFlowData.stakeholder}
            </span>
            <span className="meta-item">
              <Clock size={12} /> {activeFlowData.estimatedTime}
            </span>

            {activeFlowData.documents && activeFlowData.documents.length > 0 ? (
              <div style={{ width: '100%', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={13} style={{ color: '#2563eb' }} /> Leg Compliance & Required Documents ({activeFlowData.documents.length}):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeFlowData.documents.map((docName, dIdx) => (
                    <span
                      key={dIdx}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: '#eff6ff',
                        color: '#1e40af',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      📄 {docName}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="meta-item doc">
                <FileText size={12} /> {activeFlowData.document}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
