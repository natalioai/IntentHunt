const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/templates - get templates for a client
router.get('/', async (req, res, next) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates - create a template
router.post('/', async (req, res, next) => {
  try {
    const { client_id, name, subject, body, is_default } = req.body;

    if (!client_id || !name || !subject || !body) {
      return res.status(400).json({ error: 'client_id, name, subject, and body are required' });
    }

    // If this template is being set as default, unset any existing default
    if (is_default) {
      await supabase
        .from('templates')
        .update({ is_default: false })
        .eq('client_id', client_id)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({ client_id, name, subject, body, is_default: is_default || false })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`Template created: "${name}" for client ${client_id}`);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/templates/:id - update a template
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, subject, body, is_default, client_id } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;
    if (is_default !== undefined) updates.is_default = is_default;

    // If setting as default, unset any existing default for this client
    if (is_default && client_id) {
      await supabase
        .from('templates')
        .update({ is_default: false })
        .eq('client_id', client_id)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`Template ${id} updated`);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/templates/:id - delete a template
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log(`Template ${id} deleted`);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
