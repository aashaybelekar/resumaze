'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
};

export default function StatsCard({ title, value, icon: Icon, subtitle, color = 'blue' }: StatsCardProps) {
  const colors = colorMap[color];
  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-lg ${colors.bg}`}>
        <Icon className={`w-5 h-5 ${colors.icon}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-600 mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}
