import React, { useState, useEffect } from 'react';
import { getClient, updateSettings } from '../lib/api';
import { Save, X, Plus, Loader2, AlertTriangle } from 'lucide-react';

export default function SettingsView({ clientId }) {
  const [keywords, setKeywords] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [city, setCity] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newSubreddit, setNewSubreddit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getClient(clientId);
        const c = data.client || data;
        if (cancelled) return;
        setKeywords(c.keywords || []);
        setSubreddits(c.subreddits || c.target_subreddits || []);
        setCity(c.city || c.location || '');
        setBusinessName(c.business_name || '');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => setKeywords(keywords.filter((k) => k !== kw));

  const addSubreddit = () => {
    const sr = newSubreddit.trim().replace(/^r\//, '');
    if (sr && !subreddits.includes(sr)) {
      setSubreddits([...subreddits, sr]);
      setNewSubreddit('');
    }
  };

  const removeSubreddit = (sr) => setSubreddits(subreddits.filter((s) => s !== sr));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateSettings(clientId, {
        keywords,
        subreddits,
        city,
        business_name: businessName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-card rounded-xl shadow-sm p-8 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Business Name */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Business Info</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Keywords</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            placeholder="Add a keyword..."
          />
          <button
            onClick={addKeyword}
            className="inline-flex items-center gap-1 px-3 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {kw}
              <button onClick={() => removeKeyword(kw)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {keywords.length === 0 && <p className="text-sm text-gray-400">No keywords added yet.</p>}
        </div>
      </div>

      {/* Location */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City / Location</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="e.g. Austin, TX"
          />
        </div>
      </div>

      {/* Subreddits */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Target Subreddits</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSubreddit}
            onChange={(e) => setNewSubreddit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubreddit())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            placeholder="Add a subreddit (e.g. homeimprovement)..."
          />
          <button
            onClick={addSubreddit}
            className="inline-flex items-center gap-1 px-3 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {subreddits.map((sr) => (
            <span key={sr} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
              r/{sr}
              <button onClick={() => removeSubreddit(sr)} className="text-purple-400 hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {subreddits.length === 0 && <p className="text-sm text-gray-400">No subreddits added yet.</p>}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl shadow-sm p-6 border border-red-200">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-600">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Disconnecting Reddit will stop all monitoring and DM functionality.</p>
        <button className="px-4 py-2 border-2 border-red-500 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition cursor-pointer">
          Disconnect Reddit Account
        </button>
      </div>
    </div>
  );
}
