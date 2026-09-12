import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="container footer-container">
        <div className="footer-info">
          <ShieldCheck size={16} className="text-success" />
          <span>Form Data Processed & Informed Securely</span>
        </div>
        <div className="footer-copy">
          ThisaiCargo Engine • Built with React & TypeScript
        </div>
      </div>
    </footer>
  );
};
