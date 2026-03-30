import React, { useState, useEffect } from 'react';
import { getStats } from '../lib/api';
import { Users, UserCheck, Briefcase, Send, Flame } from 'lucide-react';

const STAT_CONFIG = [
  { key: 'total_leads', label: 'Total Leads', icon: Users, bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
  { key: 'b2c_count', label: 'B2C Count', icon: UserCheck, bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
  { key: 'b2b_count', label: 'B2B Count', icon: Briefcase, bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
  { key: 'dms_sent', label: 'DMs Sent', icon: Send, bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
  { key: 'hot_leads', label: 'Hot Leads 90+', icon: Flame, bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
];

export default function StatsStrip({ clientId }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getStats(clientId);
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {STAT_CONFIG.map(({ key, label, icon: Icon, bg, text, iconBg }) => (
        <div key={key} className={`${bg} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`${iconBg} rounded-lg p-2`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-xl font-bold ${text}`}>
                {loading ? '-' : (stats[key] ?? 0)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
