import React from 'react';
import { MapPin, Package, ShieldCheck, Check } from 'lucide-react';
import './StepIndicator.css';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  { number: 1, title: 'Route & Schedule', subtitle: 'Origin & Dest', icon: MapPin },
  { number: 2, title: 'Cargo & Crating Specs', subtitle: 'Items & Crating', icon: Package },
  { number: 3, title: 'Services & Operations', subtitle: 'Insurance, Customs & Notes', icon: ShieldCheck },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="step-indicator-wrapper">
      <div className="step-indicator-track">
        <div
          className="step-progress-bar"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="steps-container">
        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <div
              key={step.number}
              className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => isCompleted && onStepClick(step.number)}
              role="button"
              tabIndex={0}
            >
              <div className="step-icon-box">
                {isCompleted ? <Check size={15} /> : <Icon size={15} />}
              </div>
              <div className="step-text">
                <span>{step.title}</span>
                <span className="step-subtitle">{step.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
