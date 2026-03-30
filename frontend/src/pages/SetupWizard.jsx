import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { updateSettings, getRedditConnectURL } from '../lib/api';
import {
  Home,
  Briefcase,
  Scale,
  Car,
  Shield,
  Wrench,
  Plus,
  X,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Crosshair,
  Loader2,
} from 'lucide-react';

const NICHES = [
  { key: 'real_estate', label: 'Real Estate', icon: Home, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'home_services', label: 'Home Services', icon: Wrench, color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'legal', label: 'Legal', icon: Scale, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: 'auto', label: 'Auto', icon: Car, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { key: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'custom', label: 'Custom', icon: Briefcase, color: 'bg-gray-50 text-gray-600 border-gray-200' },
];

const STEPS = ['Choose Niche', 'Enter Keywords', 'Enter Location', 'Connect Reddit'];

export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [city, setCity] = useState('');
  const [redditConnected, setRedditConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { client } = useAuth();
  const navigate = useNavigate();

  const clientId = client?.id || client?.client_id;

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => setKeywords(keywords.filter((k) => k !== kw));

  const handleConnectReddit = () => {
    const url = getRedditConnectURL(clientId);
    window.open(url, '_blank');
    setRedditConnected(true);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings(clientId, { niche, keywords, city });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!niche;
    if (step === 1) return keywords.length > 0;
    if (step === 2) return city.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Crosshair className="w-8 h-8 text-brand" />
          <span className="text-2xl font-bold text-gray-900">IntentHunt</span>
        </div>
        <p className="text-gray-500">Let's set up your account</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  i <= step ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i <= step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full mt-4">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-xl bg-card rounded-xl shadow-lg p-8 transition-opacity duration-200">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Step 1: Choose Niche */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Niche</h2>
            <p className="text-gray-500 text-sm mb-6">Select the industry that best describes your business.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {NICHES.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setNiche(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition cursor-pointer ${
                    niche === key
                      ? 'border-brand bg-brand/5 ring-2 ring-brand/20'
                      : `border-gray-200 hover:border-gray-300 ${color.split(' ')[0]}`
                  }`}
                >
                  <Icon className={`w-6 h-6 ${niche === key ? 'text-brand' : color.split(' ')[1]}`} />
                  <span className={`text-sm font-medium ${niche === key ? 'text-brand' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Keywords */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Keywords</h2>
            <p className="text-gray-500 text-sm mb-6">
              Add keywords to monitor. We'll find Reddit posts matching these terms.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="e.g. need a plumber, looking for lawyer..."
              />
              <button
                onClick={addKeyword}
                className="inline-flex items-center gap-1 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-sm font-medium">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="text-brand/60 hover:text-brand cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && (
                <p className="text-sm text-gray-400">No keywords yet. Add at least one to continue.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Location</h2>
            <p className="text-gray-500 text-sm mb-6">
              Specify your service area so we can find local intent signals.
            </p>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="e.g. Austin, TX"
              />
            </div>
          </div>
        )}

        {/* Step 4: Connect Reddit */}
        {step === 3 && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Reddit</h2>
            <p className="text-gray-500 text-sm mb-8">
              Connect your Reddit account to enable monitoring and auto-DMs.
            </p>

            {redditConnected ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-green-600 font-medium">Reddit Connected!</p>
                <p className="text-sm text-gray-400">You're all set to start monitoring.</p>
              </div>
            ) : (
              <button
                onClick={handleConnectReddit}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition cursor-pointer"
              >
                Connect Reddit Account
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="w-full max-w-xl flex items-center justify-between mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1 px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-1 px-6 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Finish Setup'}
          </button>
        )}
      </div>
    </div>
  );
}
