import React from 'react';

const Card = ({
  children,
  title,
  subtitle,
  badge,
  headerAction,
  footer,
  className = '',
  bodyClassName = '',
  hoverEffect = false
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 ${
        hoverEffect ? 'hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {(title || subtitle || headerAction || badge) && (
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {title && (
                <div className="text-base font-bold text-slate-900 truncate">
                  {title}
                </div>
              )}
              {badge && <div>{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 font-normal leading-relaxed">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
