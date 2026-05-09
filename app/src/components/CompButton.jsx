import React from 'react';

export default function CompButton({
  children,
  onClick,
  type = 'button',
  accent = false,
  icon,
  className = ''
}) {
  return (
    <button
      type={type}
      className={`btn ${accent ? 'btn-accent' : ''} ${className}`}
      onClick={onClick}
    >
      {icon && <i className={`ph ph-${icon}`} />}
      {children && <span>{children}</span>}
    </button>
  );
}
