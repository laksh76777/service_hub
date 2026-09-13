import React from 'react';

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs ${className}`}>
    <div className="flex items-center justify-between">
      <div className="h-5 w-32 rounded-lg animate-shimmer" />
      <div className="h-5 w-16 rounded-full animate-shimmer" />
    </div>
    <div className="space-y-2">
      <div className="h-3.5 w-full rounded animate-shimmer" />
      <div className="h-3.5 w-4/5 rounded animate-shimmer" />
    </div>
    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
      <div className="h-4 w-20 rounded animate-shimmer" />
      <div className="h-8 w-24 rounded-xl animate-shimmer" />
    </div>
  </div>
);

export const SkeletonRow = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl animate-shimmer flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded animate-shimmer" />
            <div className="h-3 w-24 rounded animate-shimmer" />
          </div>
        </div>
        <div className="h-7 w-20 rounded-lg animate-shimmer" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ cols = 5, rows = 4 }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
    <div className="grid grid-cols-5 gap-4 pb-3 border-b border-slate-100 mb-3">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 rounded animate-shimmer" />
      ))}
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-5 gap-4 py-2 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 rounded animate-shimmer" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const Loading = ({ size = 'md', text = 'Loading...', fullPage = false, className = '' }) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-7 w-7 border-2.5',
    lg: 'h-10 w-10 border-3'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeMap[size] || sizeMap.md} animate-spin rounded-full border-blue-600 border-t-transparent`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-xs font-semibold text-slate-500 tracking-tight">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center w-full">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loading;
