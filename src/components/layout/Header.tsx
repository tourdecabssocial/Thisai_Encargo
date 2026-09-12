import React from 'react';
import { Layers, Sparkles, CheckCircle } from 'lucide-react';
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
          <div className="logo-badge">
            <Layers size={22} className="logo-icon" />
          </div>
          <div>
            <div className="brand-name">
              Thisai<span className="gradient-text">Cargo</span>
            </div>
            <div className="brand-tagline">Request & Quote Engine</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="engine-status">
            <span className="status-dot"></span>
            <span>System Active</span>
          </div>

          {submissionCount > 0 && (
            <button className="submissions-btn" onClick={onViewHistory}>
              <CheckCircle size={16} />
              <span>Informed Quotes ({submissionCount})</span>
            </button>
          )}

          <div className="badge-pill">
            <Sparkles size={14} />
            <span>React + Vite TS</span>
          </div>
        </div>
      </div>
    </header>
  );
};
