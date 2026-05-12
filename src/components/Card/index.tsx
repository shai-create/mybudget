import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, style, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--border-radius)',
      boxShadow: 'var(--shadow-sm)',
      padding: '16px',
      cursor: onClick ? 'pointer' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

export default Card;
