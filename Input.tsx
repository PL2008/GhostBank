import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-ghost-300 text-sm font-medium mb-2">
        {label}
      </label>
      <input
        className={`w-full bg-darkbg border ${error ? 'border-red-500' : 'border-gray-700'} focus:border-ghost-500 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghost-500/20 transition-all duration-200 ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};