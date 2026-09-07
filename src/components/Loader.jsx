// src/components/Loader.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Loader = ({ 
  show, 
  fullScreen = false, 
  size = 'md', 
  color = 'emerald',
  text = 'Loading...',
  overlay = true,
  zIndex = 50
}) => {
  if (!show) return null;

  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  };

  const colorClasses = {
    emerald: 'border-emerald-600',
    blue: 'border-blue-600',
    purple: 'border-purple-600',
    red: 'border-red-600',
    white: 'border-white'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`${sizeClasses[size]} rounded-full border-t-transparent animate-spin ${colorClasses[color]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <span className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-slate-600'}`}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50`}>
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-${zIndex}`}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

Loader.propTypes = {
  show: PropTypes.bool.isRequired,
  fullScreen: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['emerald', 'blue', 'purple', 'red', 'white']),
  text: PropTypes.string,
  overlay: PropTypes.bool,
  zIndex: PropTypes.number
};

Loader.defaultProps = {
  show: false,
  fullScreen: false,
  size: 'md',
  color: 'emerald',
  text: 'Loading...',
  overlay: true,
  zIndex: 50
};

export default Loader;