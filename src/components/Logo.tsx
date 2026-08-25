import React from 'react';
import { Play } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export default function Logo({ className = "", iconSize = 24, textSize = "text-xl" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
        <Play className="text-white fill-white" size={iconSize} />
      </div>
      <span className={`${textSize} font-black tracking-tighter text-gray-900`}>
        Ad Earn <span className="text-orange-600">BD</span>
      </span>
    </div>
  );
}
