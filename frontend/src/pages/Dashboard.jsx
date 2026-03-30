import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { scanNow } from '../lib/api';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Crosshair,
  LogOut,
  Radar,
  Loader2,
} from 'lucide-react';
import StatsStrip from '../components/StatsStrip';
import LeadFeed from '../components/LeadFeed';
import AutoDMControl from '../components/AutoDMControl';
import CSVExport from '../components/CSVExport';
import MessagesView from '../components/MessagesView';
import TemplatesView from '../components/TemplatesView';
import SettingsView from '../components/SettingsView';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [scanning, setScanning] = useState(false);
  const { client, logout } = useAuth();
  const navigate = useNavigate();

  const clientId = client?.id || client?.client_id;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await scanNow(clientId);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const pageTitle = NAV_ITEMS.find((n) => n.key === activeNav)?.label || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <Crosshair className="w-6 h-6 text-brand" />
          <span className="text-lg font-bold tracking-tight">IntentHunt</span>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveNav(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeNav === key
                  ? 'bg-sidebar-hover text-white border-l-3 border-brand'
                  : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-gray-400 truncate mb-2">{client?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-surface overflow-y-auto">
        {/* Top Bar */}
        <header className="bg-card border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Radar className="w-4 h-4" />
            )}
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {activeNav === 'dashboard' && (
            <div className="space-y-6">
              <StatsStrip clientId={clientId} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LeadFeed clientId={clientId} />
                </div>
                <div className="space-y-6">
                  <AutoDMControl clientId={clientId} />
                  <CSVExport clientId={clientId} />
                </div>
              </div>
            </div>
          )}

          {activeNav === 'leads' && (
            <div className="space-y-6">
              <StatsStrip clientId={clientId} />
              <LeadFeed clientId={clientId} />
            </div>
          )}

          {activeNav === 'messages' && <MessagesView clientId={clientId} />}
          {activeNav === 'templates' && <TemplatesView clientId={clientId} />}
          {activeNav === 'settings' && <SettingsView clientId={clientId} />}
        </div>
      </main>
    </div>
  );
}
