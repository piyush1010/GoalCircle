'use client';

import React from 'react';

interface ProtectedAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function ProtectedAvatar({
  src,
  alt = 'Profile Picture',
  size = 'md',
  className = '',
}: ProtectedAvatarProps) {
  // Size options for mobile screens
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 select-none ${sizeClasses[size]} ${className}`}
      // Blocks right-click context menu
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none', // Prevents iOS Safari & Mobile Chrome long-press "Save Image" action sheet
      }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            onDragStart={(e) => e.preventDefault()}
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{
              WebkitTouchCallout: 'none',
            }}
          />
          {/* Invisible overlay shield: intercepts touch events so users cannot long-press on the <img> directly */}
          <div className="absolute inset-0 bg-transparent" />
        </>
      ) : (
        <span className="select-none">👤</span>
      )}
    </div>
  );
}