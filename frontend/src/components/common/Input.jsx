import React from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  const inputId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-3.5 py-2 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
