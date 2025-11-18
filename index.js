require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Links
app.get('/api/links', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/links', async (req, res) => {
  const { userId, title, url, shortUrl, tags, collectionId } = req.body;
  if (!userId || !title || !url) {
    return res.status(400).json({ error: 'userId, title e url são obrigatórios' });
  }

  const { data, error } = await supabase
    .from('links')
    .insert({
      user_id: userId,
      title,
      url,
      short_url: shortUrl,
      tags,
      collection_id: collectionId || null
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/links/:id', async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const { data, error } = await supabase
    .from('links')
    .update({
      title: payload.title,
      url: payload.url,
      short_url: payload.short_url,
      tags: payload.tags,
      collection_id: payload.collection_id
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/links/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// Collections
app.get('/api/collections', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/collections', async (req, res) => {
  const { userId, name, description, visibility } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: 'userId e name são obrigatórios' });
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name,
      description,
      visibility: visibility || 'publico'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/collections/:id', async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const { data, error } = await supabase
    .from('collections')
    .update({
      name: payload.name,
      description: payload.description,
      visibility: payload.visibility
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/collections/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// Métricas overview
app.get('/api/metrics/overview', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  const { data: links, error: errLinks } = await supabase
    .from('links')
    .select('clicks, views, shares')
    .eq('user_id', userId);

  if (errLinks) return res.status(500).json({ error: errLinks.message });

  const { data: cols, error: errCols } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', userId);

  if (errCols) return res.status(500).json({ error: errCols.message });

  const linksTotal = links?.length || 0;
  const collectionsTotal = cols?.length || 0;
  const totalViews = (links || []).reduce((acc, l) => acc + (l.views || 0), 0);
  const totalShares = (links || []).reduce((acc, l) => acc + (l.shares || 0), 0);

  res.json({ linksTotal, collectionsTotal, totalViews, totalShares });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Linkhub backend escutando na porta', port);
});
