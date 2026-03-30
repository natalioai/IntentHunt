const express = require('express');
const supabase = require('../db/supabase');
const { scanNow } = require('../services/scanner');

const router = express.Router();

// POST /api/scanner/scan-now - trigger immediate scan
router.post('/scan-now', async (req, res, next) => {
  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    console.log(`Manual scan triggered for client ${client_id}`);
    const result = await scanNow(client_id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/scanner/settings - update scanner settings
router.put('/settings', async (req, res, next) => {
  try {
    const { client_id, keywords, city, target_subreddits, auto_dm_enabled, auto_dm_threshold } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const updates = {};

    if (keywords !== undefined) updates.keywords = keywords;
    if (city !== undefined) updates.city = city;
    if (target_subreddits !== undefined) updates.target_subreddits = target_subreddits;
    if (auto_dm_enabled !== undefined) updates.auto_dm_enabled = auto_dm_enabled;
    if (auto_dm_threshold !== undefined) updates.auto_dm_threshold = auto_dm_threshold;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', client_id)
      .select('id, email, business_name, niche, keywords, city, target_subreddits, auto_dm_enabled, auto_dm_threshold')
      .single();

    if (error) {
      throw error;
    }

    console.log(`Scanner settings updated for client ${client_id}`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
