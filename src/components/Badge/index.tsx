import React from 'react';

interface BadgeProps {
  count?: number;
  variant?: 'primary' | 'danger' | 'warning';
  children?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ count, variant = 'primary', children }) => {
  const colors = {
    primary: 'var(--color-primary)',
    danger:  'var(--color-danger)',
    warning: 'var(--color-warning)',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors[variant],
      color: '#fff',
      borderRadius: '100px',
      fontSize: '11px',
      fontWeight: 700,
      minWidth: '18px',
      height: '18px',
      padding: '0 5px',
    }}>
      {count ?? children}
    </span>
  );
};

export default Badge;
