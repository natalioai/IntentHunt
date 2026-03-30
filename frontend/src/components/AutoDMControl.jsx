import React, { useState, useEffect } from 'react';
import { getClient, updateAutoDM, getRateStatus } from '../lib/api';
import { Zap, Save, Loader2 } from 'lucide-react';

export default function AutoDMControl({ clientId }) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [rateUsed, setRateUsed] = useState(0);
  const [rateLimit, setRateLimit] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [clientData, rateData] = await Promise.all([
          getClient(clientId),
          getRateStatus(clientId).catch(() => ({ used: 0, limit: 10 })),
        ]);
        if (cancelled) return;
        const c = clientData.client || clientData;
        setEnabled(!!c.auto_dm_enabled);
        setThreshold(c.dm_score_threshold ?? 70);
        setRateUsed(rateData.used ?? rateData.dms_sent_this_hour ?? 0);
        setRateLimit(rateData.limit ?? rateData.hourly_limit ?? 10);
      } catch (err) {
        console.error('Failed to load DM settings:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateAutoDM(clientId, enabled, threshold);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save DM settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-6 text-center text-gray-400">
        Loading DM settings...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-brand" />
        <h3 className="font-semibold text-gray-900">Auto-DM Control</h3>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-700">Auto-DM Enabled</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
            enabled ? 'bg-brand' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Threshold Slider */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 block mb-2">
          Auto-send DMs to leads scoring above <span className="font-bold text-gray-900">{threshold}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Rate limit status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{rateUsed}/{rateLimit}</span> DMs sent this hour
        </p>
        <div className="mt-1.5 h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min((rateUsed / rateLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
