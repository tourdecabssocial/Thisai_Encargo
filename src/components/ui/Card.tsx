import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  headerAction,
  footer,
  className = '',
  glow = false,
}) => {
  return (
    <div className={`ui-card ${glow ? 'ui-card-glow' : ''} ${className}`}>
      {(title || icon || headerAction) && (
        <div className="ui-card-header">
          <div className="ui-card-title-group">
            {icon && <div className="ui-card-icon">{icon}</div>}
            <div>
              {title && <h3 className="ui-card-title">{title}</h3>}
              {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="ui-card-action">{headerAction}</div>}
        </div>
      )}
      <div className="ui-card-body">{children}</div>
      {footer && <div className="ui-card-footer">{footer}</div>}
    </div>
  );
};
