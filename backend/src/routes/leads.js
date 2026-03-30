const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/leads - get all leads for a client
router.get('/', async (req, res, next) => {
  try {
    const { client_id, audience_type, min_score, urgency } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    let query = supabase
      .from('leads')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (audience_type) {
      query = query.eq('audience_type', audience_type);
    }

    if (min_score) {
      query = query.gte('intent_score', parseInt(min_score));
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/stats - aggregate stats for a client
router.get('/stats', async (req, res, next) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', client_id);

    if (error) {
      throw error;
    }

    const stats = {
      total: leads.length,
      b2c_count: leads.filter(l => l.audience_type === 'B2C').length,
      b2b_count: leads.filter(l => l.audience_type === 'B2B').length,
      dms_sent: leads.filter(l => l.dm_sent).length,
      hot_leads: leads.filter(l => l.intent_score >= 90).length,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/export - export leads as CSV
router.get('/export', async (req, res, next) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const headers = [
      'id', 'reddit_post_id', 'reddit_author', 'subreddit', 'post_title',
      'post_url', 'audience_type', 'intent_score', 'urgency',
      'matched_keyword', 'dm_sent', 'created_at'
    ];

    const csvRows = [headers.join(',')];

    for (const lead of leads) {
      const row = headers.map(h => {
        const val = lead[h] ?? '';
        // Escape commas and quotes in CSV values
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
