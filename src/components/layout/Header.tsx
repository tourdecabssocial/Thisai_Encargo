import React from 'react';
import { Sparkles, FileCheck2 } from 'lucide-react';
import logoImg from '../../assets/logo.jpeg';
import './Header.css';

interface HeaderProps {
  submissionCount?: number;
  onViewHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ submissionCount = 0, onViewHistory }) => {
  return (
    <header className="app-header">
      <div className="container header-container">
        <div className="brand-logo">
          <div className="logo-badge" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
            <img src={logoImg} alt="Thisai Cargo Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div>
            <div className="brand-name">
              Thisai<span className="gradient-text">Cargo</span>
            </div>
            <div className="brand-tagline">AI Freight & Rate Engine</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="engine-status">
            <span className="status-dot"></span>
            <span>AI Freight Engine Live</span>
          </div>

          {submissionCount > 0 && (
            <button className="submissions-btn" onClick={onViewHistory}>
              <FileCheck2 size={16} />
              <span>Submitted RFQs ({submissionCount})</span>
            </button>
          )}

          <div className="badge-pill">
            <Sparkles size={14} />
            <span>Smart Logistics Portal</span>
          </div>
        </div>
      </div>
    </header>
  );
};
