import React, { useState, useEffect, useCallback } from 'react';
import { getLeads } from '../lib/api';
import { ExternalLink, Check, Clock, Filter } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreBarBg(score) {
  if (score >= 70) return 'bg-green-100';
  if (score >= 40) return 'bg-yellow-100';
  return 'bg-red-100';
}

function audienceBadge(audience) {
  if (!audience) return null;
  const lower = audience.toLowerCase();
  if (lower === 'b2c') return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">B2C</span>;
  if (lower === 'b2b') return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">B2B</span>;
  return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Noise</span>;
}

function urgencyBadge(urgency) {
  if (!urgency) return null;
  const lower = urgency.toLowerCase();
  if (lower === 'high') return <span className="text-xs font-medium text-red-600">High</span>;
  if (lower === 'medium') return <span className="text-xs font-medium text-yellow-600">Medium</span>;
  return <span className="text-xs font-medium text-green-600">Low</span>;
}

function highlightKeyword(text, keyword) {
  if (!text || !keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
  );
}

export default function LeadFeed({ clientId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ audience: '', minScore: 0, urgency: '' });

  const fetchLeads = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await getLeads(clientId, {
        audience: filters.audience || undefined,
        minScore: filters.minScore || undefined,
        urgency: filters.urgency || undefined,
      });
      setLeads(Array.isArray(data) ? data : data.leads || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [clientId, filters]);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  return (
    <div className="bg-card rounded-xl shadow-sm">
      {/* Filter Bar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
        </div>

        <select
          value={filters.audience}
          onChange={(e) => setFilters((f) => ({ ...f, audience: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All Audiences</option>
          <option value="B2C">B2C</option>
          <option value="B2B">B2B</option>
          <option value="Noise">Noise</option>
        </select>

        <select
          value={filters.urgency}
          onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All Urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Min Score:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minScore}
            onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
            className="w-24 accent-brand"
          />
          <span className="text-gray-700 font-medium w-8">{filters.minScore}</span>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {loading && (
          <div className="p-8 text-center text-gray-400">Loading leads...</div>
        )}

        {error && (
          <div className="p-4 text-center text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && leads.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No leads found. Try running a scan or adjusting your filters.
          </div>
        )}

        {leads.map((lead) => (
          <div key={lead.id || lead.reddit_post_id} className="p-4 hover:bg-gray-50 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Top row: badges */}
                <div className="flex items-center gap-2 mb-1.5">
                  {audienceBadge(lead.audience_type)}
                  {urgencyBadge(lead.urgency)}
                  {lead.dm_sent && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" /> DM Sent
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {lead.post_title || lead.title || 'Untitled'}
                </h3>

                {/* Preview text */}
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                  {highlightKeyword(
                    lead.post_text || lead.body || lead.selftext || '',
                    lead.matched_keyword
                  )}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {lead.subreddit && (
                    <span className="font-medium">r/{lead.subreddit}</span>
                  )}
                  {lead.matched_keyword && (
                    <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                      {lead.matched_keyword}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(lead.created_at || lead.scraped_at)}
                  </span>
                  {lead.reddit_post_id && (
                    <a
                      href={`https://reddit.com/comments/${lead.reddit_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:text-brand-dark"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                </div>
              </div>

              {/* Score bar */}
              <div className="w-20 shrink-0 text-right">
                <span className="text-lg font-bold text-gray-900">{lead.intent_score ?? 0}</span>
                <div className={`mt-1 h-2 rounded-full ${scoreBarBg(lead.intent_score)}`}>
                  <div
                    className={`h-full rounded-full ${scoreColor(lead.intent_score)} transition-all`}
                    style={{ width: `${Math.min(lead.intent_score ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
