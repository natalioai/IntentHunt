import React, { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../lib/api';
import { Plus, Pencil, Trash2, Save, X, FileText, Star, Loader2 } from 'lucide-react';

const PLACEHOLDERS = ['{{author}}', '{{subreddit}}', '{{keyword}}', '{{post_title}}', '{{business_name}}'];

const emptyForm = { name: '', subject: '', body: '', is_default: false };

export default function TemplatesView({ clientId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = list view, 'new' or template id
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchTemplates = async () => {
    if (!clientId) return;
    try {
      const data = await getTemplates(clientId);
      setTemplates(Array.isArray(data) ? data : data.templates || []);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, [clientId]);

  const startCreate = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const startEdit = (tpl) => {
    setForm({ name: tpl.name || '', subject: tpl.subject || '', body: tpl.body || '', is_default: !!tpl.is_default });
    setEditing(tpl.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing === 'new') {
        await createTemplate(clientId, form);
      } else {
        await updateTemplate(editing, form);
      }
      setEditing(null);
      setForm(emptyForm);
      await fetchTemplates();
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTemplate(id);
      setConfirmDelete(null);
      await fetchTemplates();
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  };

  if (loading) {
    return <div className="bg-card rounded-xl shadow-sm p-8 text-center text-gray-400">Loading templates...</div>;
  }

  // Edit / Create Form
  if (editing !== null) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing === 'new' ? 'Create Template' : 'Edit Template'}
          </h3>
          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="e.g. Default Outreach"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="Message subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-y"
              placeholder="Your message template..."
            />
          </div>

          {/* Placeholders */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Available placeholders (click to insert):</p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, body: f.body + ph }))}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition cursor-pointer font-mono"
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* Default toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_default: !f.is_default }))}
              className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                form.is_default ? 'bg-brand' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_default ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">Set as default template</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Message Templates</h3>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {templates.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm p-8 text-center text-gray-400">
          No templates yet. Create one to get started.
        </div>
      )}

      <div className="space-y-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-card rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h4 className="font-semibold text-gray-900">{tpl.name}</h4>
                  {tpl.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-brand/10 text-brand">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                </div>
                {tpl.subject && <p className="text-sm text-gray-600 mb-1">Subject: {tpl.subject}</p>}
                <p className="text-sm text-gray-400 line-clamp-2">{tpl.body}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => startEdit(tpl)}
                  className="p-2 text-gray-400 hover:text-brand rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {confirmDelete === tpl.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(tpl.id)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
