import React, { useState } from 'react';
import { exportCSV } from '../lib/api';
import { Download, Loader2 } from 'lucide-react';

export default function CSVExport({ clientId }) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await exportCSV(clientId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intenthunt-leads-${clientId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Export Data</h3>
      <p className="text-sm text-gray-500 mb-4">Download all your leads as a CSV file for use in other tools.</p>
      <button
        onClick={handleExport}
        disabled={downloading}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-brand text-brand text-sm font-medium rounded-lg hover:bg-brand hover:text-white transition disabled:opacity-50 cursor-pointer"
      >
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {downloading ? 'Downloading...' : 'Export CSV'}
      </button>
    </div>
  );
}
