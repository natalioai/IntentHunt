import React, { useState, useEffect } from 'react';
import { getMessages, getRateStatus } from '../lib/api';
import { Mail, Clock, AlertCircle } from 'lucide-react';

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

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'sent') return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Sent</span>;
  if (s === 'failed') return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Failed</span>;
  return <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
}

export default function MessagesView({ clientId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rateInfo, setRateInfo] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [msgData, rateData] = await Promise.all([
          getMessages(clientId),
          getRateStatus(clientId).catch(() => null),
        ]);
        if (cancelled) return;
        setMessages(Array.isArray(msgData) ? msgData : msgData.messages || []);
        setRateInfo(rateData);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  return (
    <div className="space-y-4">
      {/* Rate limit indicator */}
      {rateInfo && (
        <div className="bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-brand shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{rateInfo.sent_last_hour ?? 0}</span>
              /{rateInfo.limit ?? 10} DMs sent this hour
            </p>
          </div>
        </div>
      )}

      {/* Messages table */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Sent Messages</h3>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-400">Loading messages...</div>
        )}

        {error && (
          <div className="p-4 text-center text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="p-8 text-center text-gray-400">No messages sent yet.</div>
        )}

        {!loading && !error && messages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map((msg, idx) => (
                  <tr key={msg.id || idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-gray-900 font-medium">
                      {msg.reddit_author || msg.recipient || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-600 truncate max-w-xs">
                      {msg.message_subject || msg.subject || '-'}
                    </td>
                    <td className="px-6 py-3">{statusBadge(msg.status)}</td>
                    <td className="px-6 py-3 text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(msg.sent_at || msg.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
