import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: 'var(--border-radius-sm)',
    fontFamily: 'var(--font-family)',
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    transition: 'background 0.15s, opacity 0.15s',
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '14px 24px' : '10px 18px',
    fontSize: size === 'sm' ? '13px' : size === 'lg' ? '17px' : '15px',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--color-primary)',   color: '#fff' },
    secondary: { background: 'var(--color-secondary)', color: '#fff' },
    danger:    { background: 'var(--color-danger)',    color: '#fff' },
    ghost:     { background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)' },
  };

  return (
    <button style={{ ...base, ...variants[variant], ...style }} disabled={disabled || loading} {...props}>
      {loading ? '...' : children}
    </button>
  );
};

export default Button;
