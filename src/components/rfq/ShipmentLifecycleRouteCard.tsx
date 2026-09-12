import React, { useState } from 'react';
import {
  generateShipmentRouteLifecycle,
  type LifecycleEngineInput,
  type RouteStage,
  type StageDocument,
} from '../../services/shipmentLifecycleEngine';
import {
  MapPin,
  Truck,
  Building2,
  Plane,
  Ship,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  ChevronDown,
  ArrowRight,
  Zap,
} from 'lucide-react';
import './ShipmentLifecycleRouteCard.css';

interface ShipmentLifecycleRouteCardProps {
  input: LifecycleEngineInput;
}

export const ShipmentLifecycleRouteCard: React.FC<ShipmentLifecycleRouteCardProps> = ({ input }) => {
  const stages = generateShipmentRouteLifecycle(input);
  const [expandedStageIds, setExpandedStageIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Origin' | 'Main Freight' | 'Destination'>('All');

  const toggleStage = (id: string) => {
    setExpandedStageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => setExpandedStageIds(stages.map((s) => s.id));
  const collapseAll = () => setExpandedStageIds([]);

  const filteredStages =
    filterCategory === 'All' ? stages : stages.filter((s) => s.category === filterCategory);

  const getStageIcon = (type: RouteStage['iconType']) => {
    switch (type) {
      case 'pickup':
      case 'truck':
        return <Truck size={16} />;
      case 'warehouse':
        return <Building2 size={16} />;
      case 'plane':
        return <Plane size={16} />;
      case 'ship':
        return <Ship size={16} />;
      case 'customs':
        return <ShieldCheck size={16} />;
      case 'delivery':
        return <MapPin size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getImportanceBadge = (importance: StageDocument['importance']) => {
    switch (importance) {
      case 'mandatory':
        return <span className="doc-importance-mandatory">Mandatory</span>;
      case 'regulatory':
        return <span className="doc-importance-regulatory">Customs</span>;
      case 'recommended':
        return <span className="doc-importance-recommended">Optional</span>;
    }
  };

  return (
    <div className="lifecycle-card-container">
      {/* Dynamic AI Banner */}
      <div className="route-header-banner">
        <div className="route-banner-top">
          <span className="route-ai-badge">
            <Zap size={11} /> AI Engine • {input.serviceType}
          </span>
        </div>

        <h3 className="route-banner-title">Interactive Shipment Route & Stage Documentation Map</h3>
        <div className="route-banner-subtitle">
          Transparent stage-by-stage operational roadmap & document checklist
        </div>

        {/* Visual Route Path Beam */}
        <div className="route-path-visualizer">
          <div className="route-points-row">
            <div className="route-point" style={{ flex: 1, minWidth: 0 }}>
              <span className="route-point-name" title={input.originPortOrCity || 'Origin Location'}>
                {input.originPortOrCity || 'Origin Location'}
              </span>
            </div>

            <span className="route-mode-pill" style={{ margin: '0 0.4rem' }}>
              {input.transportMode === 'Air' ? 'Air Linehaul' : 'Ship Linehaul'}
            </span>

            <div className="route-point" style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
              <span className="route-point-name" title={input.destinationPortOrCity || 'Destination Location'}>
                {input.destinationPortOrCity || 'Destination Location'}
              </span>
            </div>
          </div>

          <div className="route-beam-track">
            <div className="route-beam-pulse" />
          </div>
        </div>
      </div>

      {/* Filter & Control Action Bar */}
      <div className="route-control-row">
        <div className="route-filter-tabs">
          {(['All', 'Origin', 'Main Freight', 'Destination'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`route-filter-btn ${filterCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Interactive Timeline Map */}
      <div className="vertical-timeline-container">
        {filteredStages.map((stage, idx) => {
          const isExpanded = expandedStageIds.includes(stage.id);
          const isLast = idx === filteredStages.length - 1;

          return (
            <div
              key={stage.id}
              className={`timeline-stage-wrapper ${isExpanded ? 'expanded' : ''}`}
            >
              {!isLast && <div className="timeline-connecting-line" />}

              <div className="timeline-stage-card">
                {/* Clickable Accordion Header */}
                <div
                  className="stage-card-header"
                  onClick={() => toggleStage(stage.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stage-header-left">
                    <div className="stage-node-badge">
                      {isExpanded ? getStageIcon(stage.iconType) : `0${stage.stageNumber}`}
                    </div>
                    <div className="stage-header-text">
                      <span className="stage-number-tag">
                        Stage {stage.stageNumber} • {stage.category}
                      </span>
                      <span className="stage-main-title">{stage.title}</span>
                    </div>
                  </div>

                  <div className="stage-header-right">
                    <span className="stage-doc-count-chip">
                      {stage.documents.length} Docs
                    </span>
                    <ChevronDown size={16} className="expand-chevron-icon" />
                  </div>
                </div>

                {/* Accordion Expand Body */}
                {isExpanded && (
                  <div className="stage-card-body">
                    <div className="stage-subtitle-bar">{stage.subtitle}</div>

                    {/* Operational Activities */}
                    <div className="stage-section-block">
                      <div className="stage-block-title">
                        <CheckCircle2 size={14} style={{ color: '#10b981' }} /> Operational Activities
                      </div>
                      <ul className="activity-bullet-list">
                        {stage.activities.map((activity, aIdx) => (
                          <li key={aIdx} className="activity-bullet-item">
                            <ArrowRight size={13} style={{ minWidth: 13, color: '#3b82f6', marginTop: 2 }} />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Required Documents */}
                    <div className="stage-section-block">
                      <div className="stage-block-title">
                        <FileText size={14} style={{ color: '#6366f1' }} /> Stage Required Documents ({stage.documents.length})
                      </div>
                      <div className="document-badge-row">
                        {stage.documents.map((doc, dIdx) => (
                          <div key={dIdx} className="document-item-chip">
                            <div className="document-chip-top">
                              <span className="document-name">{doc.name}</span>
                              {getImportanceBadge(doc.importance)}
                            </div>
                            <div className="document-desc">
                              <strong>Issuer:</strong> {doc.issuer} — {doc.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Milestones Checkpoints */}
                    <div className="stage-section-block">
                      <div className="stage-block-title">
                        <Info size={14} style={{ color: '#0284c7' }} /> Key Stage Milestones
                      </div>
                      {stage.milestones.map((m, mIdx) => (
                        <div key={mIdx} className="milestone-checkpoint">
                          <div className="milestone-header-group">
                            <span className="checkpoint-title">{m.title}</span>
                            <span className="checkpoint-code">{m.code}</span>
                          </div>
                          <div className="checkpoint-desc">{m.description}</div>
                        </div>
                      ))}
                    </div>

                    {/* Pro Tip */}
                    <div className="protip-callout-card">
                      <AlertCircle size={16} style={{ color: '#15803d', minWidth: 16, marginTop: 1 }} />
                      <div className="protip-text">
                        <strong>Shipper Pro Tip:</strong> {stage.proTip}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
