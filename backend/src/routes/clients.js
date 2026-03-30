const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/clients/:id - get client by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('clients')
      .select('id, email, business_name, niche, keywords, city, target_subreddits, reddit_username, auto_dm_enabled, auto_dm_threshold, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id - update client profile
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { business_name, niche, keywords, city, target_subreddits } = req.body;

    const updates = {};

    if (business_name !== undefined) updates.business_name = business_name;
    if (niche !== undefined) updates.niche = niche;
    if (keywords !== undefined) updates.keywords = keywords;
    if (city !== undefined) updates.city = city;
    if (target_subreddits !== undefined) updates.target_subreddits = target_subreddits;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('id, email, business_name, niche, keywords, city, target_subreddits, reddit_username, auto_dm_enabled, auto_dm_threshold, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Client not found' });
    }

    console.log(`Client ${id} profile updated`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id/auto-dm - update auto-DM settings
router.put('/:id/auto-dm', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { auto_dm_enabled, auto_dm_threshold } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (auto_dm_enabled !== undefined) updates.auto_dm_enabled = auto_dm_enabled;
    if (auto_dm_threshold !== undefined) updates.auto_dm_threshold = auto_dm_threshold;

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('id, email, business_name, auto_dm_enabled, auto_dm_threshold')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Client not found' });
    }

    console.log(`Auto-DM settings updated for client ${id}: enabled=${data.auto_dm_enabled}, threshold=${data.auto_dm_threshold}`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
