import React from 'react';

export default function CompFormGrid({ children, className = '', style = {} }) {
  return (
    <div
      className={`kanvas-form-grid ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
