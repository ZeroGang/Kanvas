import React from 'react';

export default function CompInput({
  label,
  value,
  onChange,
  placeholder = '0',
  type = 'number',
  min,
  max,
  step = 'any',
  onKeyDown,
  suffix,
  className = ''
}) {
  return (
    <div className={`filter-group ${className}`}>
      {label && <label>{label}</label>}
      {suffix ? (
        <div className="calc-ci-input-wrap">
          <input
            type={type}
            className="filter-input"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
          />
          <span>{suffix}</span>
        </div>
      ) : (
        <input
          type={type}
          className="filter-input"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
