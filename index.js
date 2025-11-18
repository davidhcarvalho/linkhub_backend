require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 Prefixo fixo para a URL curta
// Exemplo salvo no banco: lnk.hb/a1B2c3
const SHORT_DOMAIN = 'lnk.hb';

// 🟦 Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY/ANON_KEY não definido(s) no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🧩 Middlewares básicos
app.use(
  cors({
    origin: 'http://localhost:4200',
    credentials: true
  })
);
app.use(express.json());

// Helper: obter userId de query ou body
function getUserId(req) {
  return req.query.userId || req.body.userId || req.body.user_id || null;
}

// ======================== HEALTH =========================

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'LinkHub API rodando.' });
});

// ========================= LINKS =========================

// GET /api/links?userId=...
app.get('/api/links', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error });

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao buscar links:', err);
    res.status(500).json({ error: 'Erro ao buscar links' });
  }
});

// POST /api/links
app.post('/api/links', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, url, tags, collection_id } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }
    if (!title || !url) {
      return res.status(400).json({ error: 'title e url são obrigatórios' });
    }

    // 🔐 Gera código curto e monta short_url: lnk.hb/asd123
    const code = nanoid(6);
    const short_url = `${SHORT_DOMAIN}/${code}`;

    const { data, error } = await supabase
      .from('links')
      .insert([
        {
          user_id: userId,
          title,
          url,
          short_url,
          tags: tags || [],
          collection_id: collection_id || null
        }
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar link:', err);
    res.status(500).json({ error: 'Erro ao criar link' });
  }
});

// PUT /api/links/:id
app.put('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, tags, collection_id, is_favorite } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (tags !== undefined) updateData.tags = tags;
    if (collection_id !== undefined) updateData.collection_id = collection_id;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

    // 👉 se você quiser regenerar a short_url quando a URL mudar, descomente isto:
    // if (url !== undefined) {
    //   const code = nanoid(6);
    //   updateData.short_url = `${SHORT_DOMAIN}/${code}`;
    // }

    const { data, error } = await supabase
      .from('links')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar link:', err);
    res.status(500).json({ error: 'Erro ao atualizar link' });
  }
});

// DELETE /api/links/:id
app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('links').delete().eq('id', id);

    if (error) return res.status(400).json({ error });

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir link:', err);
    res.status(500).json({ error: 'Erro ao excluir link' });
  }
});

// ======================= COLEÇÕES ========================

// GET /api/collections?userId=...
app.get('/api/collections', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error });

    res.json(data || []);
  } catch (err) {
    console.error('Erro ao buscar coleções:', err);
    res.status(500).json({ error: 'Erro ao buscar coleções' });
  }
});

// POST /api/collections
app.post('/api/collections', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description, visibility } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }
    if (!name) {
      return res.status(400).json({ error: 'name é obrigatório' });
    }

    const { data, error } = await supabase
      .from('collections')
      .insert([
        {
          user_id: userId,
          name,
          description: description || null,
          visibility: visibility || 'publico'
        }
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar coleção:', err);
    res.status(500).json({ error: 'Erro ao criar coleção' });
  }
});

// PUT /api/collections/:id
app.put('/api/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, visibility } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) updateData.visibility = visibility;

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar coleção:', err);
    res.status(500).json({ error: 'Erro ao atualizar coleção' });
  }
});

// DELETE /api/collections/:id
app.delete('/api/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('collections').delete().eq('id', id);

    if (error) return res.status(400).json({ error });

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir coleção:', err);
    res.status(500).json({ error: 'Erro ao excluir coleção' });
  }
});

// ======================== MÉTRICAS ========================

// GET /api/metrics/overview?userId=...
app.get('/api/metrics/overview', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    const { data: links, error: linksError } = await supabase
      .from('links')
      .select('views, shares')
      .eq('user_id', userId);

    if (linksError) return res.status(400).json({ error: linksError });

    const linksTotal = (links || []).length;
    const totalViews = (links || []).reduce(
      (sum, l) => sum + (l.views || 0),
      0
    );
    const totalShares = (links || []).reduce(
      (sum, l) => sum + (l.shares || 0),
      0
    );

    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', userId);

    if (collectionsError)
      return res.status(400).json({ error: collectionsError });

    const collectionsTotal = (collections || []).length;

    res.json({
      linksTotal,
      collectionsTotal,
      totalViews,
      totalShares
    });
  } catch (err) {
    console.error('Erro ao buscar métricas:', err);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

// ========================= START =========================

app.listen(PORT, () => {
  console.log(`✅ LinkHub API rodando em http://localhost:${PORT}`);
});