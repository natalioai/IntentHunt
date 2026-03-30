const express = require('express');
const crypto = require('crypto');
const supabase = require('../db/supabase');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, business_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const password_hash = crypto.createHash('sha256').update(password).digest('hex');

    const { data, error } = await supabase
      .from('clients')
      .insert({ email, password_hash, business_name })
      .select('id, email, business_name, niche, keywords, city, target_subreddits, auto_dm_enabled, auto_dm_threshold, created_at')
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw error;
    }

    console.log(`New client registered: ${email}`);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const password_hash = crypto.createHash('sha256').update(password).digest('hex');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password_hash)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Remove password_hash from response
    const { password_hash: _, ...clientData } = data;
    console.log(`Client logged in: ${email}`);
    res.json(clientData);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/reddit/connect
router.get('/reddit/connect', (req, res) => {
  const { client_id } = req.query;

  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }

  const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?client_id=${process.env.REDDIT_CLIENT_ID}&response_type=code&state=${client_id}&redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&duration=permanent&scope=privatemessages,identity,read`;

  res.redirect(redditAuthUrl);
});

// GET /api/auth/reddit/callback
router.get('/reddit/callback', async (req, res, next) => {
  try {
    const { code, state: client_id } = req.query;

    if (!code || !client_id) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Exchange code for tokens
    const credentials = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'IntentHunt/1.0',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDDIT_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Reddit token exchange failed:', tokens.error);
      return res.status(400).json({ error: 'Reddit authentication failed' });
    }

    // Get Reddit username
    const meResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'IntentHunt/1.0',
      },
    });
    const meData = await meResponse.json();

    // Store tokens in client record
    const { error } = await supabase
      .from('clients')
      .update({
        reddit_access_token: tokens.access_token,
        reddit_refresh_token: tokens.refresh_token,
        reddit_username: meData.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client_id);

    if (error) {
      throw error;
    }

    console.log(`Reddit connected for client ${client_id} as u/${meData.name}`);

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?reddit=connected`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
