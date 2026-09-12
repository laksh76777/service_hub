import React from 'react';

const Loading = ({ size = 'md', text = 'Loading...', fullPage = false, className = '' }) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeMap[size] || sizeMap.md} animate-spin rounded-full border-blue-600 border-t-transparent`}
      />
      {text && <p className="text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center w-full">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loading;
