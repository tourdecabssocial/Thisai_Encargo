import React, { useState } from 'react';
import { Ship, Plane, Home, Warehouse, Anchor, Clock, FileText, UserCheck } from 'lucide-react';
import './ShipmentFlowVisualizer.css';

interface ShipmentFlowVisualizerProps {
  mode?: 'Air' | 'Ocean' | string;
  serviceScope?: 'D2D' | 'P2P' | 'D2P' | 'P2D' | string;
  originName?: string;
  destName?: string;
}

export interface RoutePoint {
  id: string;
  name: string;
  sub: string;
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
}

export const ShipmentFlowVisualizer: React.FC<ShipmentFlowVisualizerProps> = ({
  mode = 'Ocean',
  serviceScope = 'D2D',
}) => {
  const isAir = mode === 'Air';
  const scope = serviceScope || 'D2D';
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  // Scope boolean checks
  const isOriginDoorActive = scope === 'D2D' || scope === 'D2P';
  const isDestDoorActive = scope === 'D2D' || scope === 'P2D';

  // 7 Location Points (Nodes)
  const points: RoutePoint[] = [
    { id: 'p1', name: 'Factory', sub: 'Shipper', type: 'home' },
    { id: 'p2', name: 'Origin Hub', sub: 'CFS', type: 'hub' },
    { id: 'p3', name: isAir ? 'Airport' : 'Origin Port', sub: 'POL', type: 'port' },
    { id: 'p4', name: isAir ? 'Air Linehaul' : 'Sea Linehaul', sub: isAir ? 'Flight' : 'Vessel', type: 'linehaul' },
    { id: 'p5', name: isAir ? 'Dest Airport' : 'Dest Port', sub: 'POD', type: 'dest_port' },
    { id: 'p6', name: 'Dest Hub', sub: 'CFS', type: 'dest_hub' },
    { id: 'p7', name: 'Consignee', sub: 'Customer', type: 'customer' },
  ];

  // 6 Intermediate Flow Connections (Flow Names between the Points)
  const flows: FlowConnector[] = [
    {
      id: 'f1',
      flowName: 'First Mile Pickup',
      shortLabel: 'First Mile',
      milestoneCode: 'F-01',
      description: 'First-mile truck pickup from shipper factory to origin consolidation hub.',
      stakeholder: 'Drayage Trucker',
      estimatedTime: '2 - 4 Hours',
      document: 'Dock Receipt & Dispatch Order',
    },
    {
      id: 'f2',
      flowName: 'Transfer & Drayage',
      shortLabel: 'Drayage',
      milestoneCode: 'F-02',
      description: 'Cargo transfer, palletization, and drayage transport to terminal.',
      stakeholder: 'Hub Logistics Team',
      estimatedTime: '3 - 6 Hours',
      document: 'Terminal Gate Pass',
    },
    {
      id: 'f3',
      flowName: 'Export Customs Clearance',
      shortLabel: 'Export Clearance',
      milestoneCode: 'F-03',
      description: 'Automated AES export customs filing & gantry loading.',
      stakeholder: 'Export Customs Broker',
      estimatedTime: '4 - 12 Hours',
      document: 'Export Clearance Release',
    },
    {
      id: 'f4',
      flowName: isAir ? 'Air Freight Linehaul' : 'Ocean Freight Linehaul',
      shortLabel: isAir ? 'Air Freight' : 'Ocean Linehaul',
      milestoneCode: 'F-04',
      description: isAir
        ? 'Direct air cargo flight transit to destination airport.'
        : 'Deep-sea container liner vessel voyage with AIS tracking.',
      stakeholder: isAir ? 'Air Carrier' : 'Ocean Carrier',
      estimatedTime: isAir ? '12 - 36 Hours' : '10 - 25 Days',
      document: isAir ? 'Air Waybill (AWB)' : 'Master Bill of Lading (MBL)',
    },
    {
      id: 'f5',
      flowName: 'Import Customs Clearance',
      shortLabel: 'Import Clearance',
      milestoneCode: 'F-05',
      description: 'Vessel unberthing/discharge, CBP import clearance & DO release.',
      stakeholder: 'Import Customs Broker',
      estimatedTime: '6 - 24 Hours',
      document: 'Import Customs Entry 7501',
    },
    {
      id: 'f6',
      flowName: 'Last Mile Delivery',
      shortLabel: 'Last Mile',
      milestoneCode: 'F-06',
      description: 'Outbound drayage from dest hub to consignee door with clean POD.',
      stakeholder: 'Last-Mile Delivery Trucker',
      estimatedTime: '3 - 8 Hours',
      document: 'Signed Proof of Delivery (POD)',
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
    <div className="shipment-visual-flow-card node-flow-style fit-width">
      {/* Card Header */}
      <div className="flow-card-header">
        <div className="flow-header-title-group">
          <span className="flow-badge">
            {isAir ? <Plane size={12} /> : <Ship size={12} />} {isAir ? 'Air Freight Route' : 'Ocean Freight Route'}
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

      {/* Main Chain: 100% Fit Width without Horizontal Scrollbar */}
      <div className="point-to-point-flow-wrapper fit-width">
        <div className="flow-chain-container fit-width">
          {points.map((point, index) => {
            const active = isPointActive(point.type);
            const flow = flows[index];
            const flowActive = isFlowActive(index);

            return (
              <React.Fragment key={point.id}>
                {/* 📍 POINT NODE */}
                <div className={`route-point-node fit ${active ? 'active' : 'muted'} ${point.type === 'linehaul' ? 'center-linehaul' : ''}`}>
                  <div className="point-icon-box compact">
                    {point.type === 'home' && <Home size={14} />}
                    {point.type === 'hub' && <Warehouse size={14} />}
                    {point.type === 'port' && <Anchor size={14} />}
                    {point.type === 'linehaul' && (isAir ? <Plane size={15} /> : <Ship size={15} />)}
                    {point.type === 'dest_port' && <Anchor size={14} />}
                    {point.type === 'dest_hub' && <Warehouse size={14} />}
                    {point.type === 'customer' && <Home size={14} />}
                  </div>

                  <div className="point-text-labels compact">
                    <span className="point-name">{point.name}</span>
                    <span className="point-sub">{point.sub}</span>
                  </div>
                </div>

                {/* ↔️ FLOW CONNECTOR LEG (Flow Name between Points) */}
                {flow && (
                  <div
                    className={`flow-connector-leg fit ${flowActive ? 'active' : 'muted'} ${activeFlowId === flow.id ? 'selected' : ''}`}
                    onClick={() => setActiveFlowId(activeFlowId === flow.id ? null : flow.id)}
                    title={`${flow.flowName} - Click for details`}
                  >
                    <div className="flow-line-track">
                      <span className="flow-arrow-head left">‹</span>
                      <div className="flow-dashed-line"></div>
                      <span className="flow-arrow-head right">›</span>
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

          <div className="detail-meta-row">
            <span className="meta-item"><UserCheck size={12} /> {activeFlowData.stakeholder}</span>
            <span className="meta-item"><Clock size={12} /> {activeFlowData.estimatedTime}</span>
            <span className="meta-item doc"><FileText size={12} /> {activeFlowData.document}</span>
          </div>
        </div>
      )}
    </div>
  );
};
