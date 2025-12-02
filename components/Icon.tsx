import React, { useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: keyof typeof LucideIcons;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className = "", onClick }) => {
  const IconComponent = LucideIcons[name] as React.ElementType;

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent 
      size={size} 
      className={className} 
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    />
  );
};