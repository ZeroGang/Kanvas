import React from 'react';

export default function CompResultBox({ children, className = '' }) {
  return (
    <div
      className={`kanvas-result-box ${className}`}
      style={{
        display: 'block',
        marginTop: '16px',
        padding: '16px',
        background: 'var(--card-bg)',
        borderRadius: '8px'
      }}
    >
      {children}
    </div>
  );
}

export function CompResultRow({ label, value, highlight, color }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      {label && <span>{label}: </span>}
      {highlight ? (
        <span style={{ fontSize: '18px', fontWeight: '600' }}>{value}</span>
      ) : color ? (
        <span style={{ color }}>{value}</span>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}
