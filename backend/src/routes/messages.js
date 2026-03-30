const express = require('express');
const supabase = require('../db/supabase');
const { getDMCount } = require('../services/messenger');

const router = express.Router();

const HOURLY_DM_LIMIT = 10;

// GET /api/messages - get messages for a client
router.get('/', async (req, res, next) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', client_id)
      .order('sent_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/rate-status - DM rate limit status
router.get('/rate-status', async (req, res, next) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const count = await getDMCount(client_id);

    res.json({
      sent_last_hour: count,
      remaining: Math.max(0, HOURLY_DM_LIMIT - count),
      limit: HOURLY_DM_LIMIT,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
