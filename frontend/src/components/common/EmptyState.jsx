import React from 'react';
import Button from './Button';

const EmptyState = ({
  icon,
  title = 'No items found',
  description = 'There are no records to display at this moment.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 px-6 rounded-2xl border border-dashed border-slate-200 bg-white shadow-2xs ${className}`}>
      <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3.5 shadow-2xs text-2xl">
        {icon || (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>
      <h4 className="text-base font-bold text-slate-900 tracking-tight">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
