const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar se é admin
async function requireAdmin(req, res, next) {
  try {
    const result = await db.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('superadmin', 'admin')`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Acesso negado. Somente administradores.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões' });
  }
}

// Get branding (public - no auth required)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM branding LIMIT 1');

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        logoUrl: null,
        appName: 'WhatsApp Warmer',
        appSubtitle: 'Sistema de Aquecimento',
        primaryColor: '#22c55e',
      });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      logoUrl: row.logo_url,
      appName: row.app_name,
      appSubtitle: row.app_subtitle,
      primaryColor: row.primary_color,
    });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ message: 'Erro ao buscar branding' });
  }
});

// Update branding (admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { logoUrl, appName, appSubtitle, primaryColor } = req.body;

    // Check if branding exists
    const existing = await db.query('SELECT id FROM branding LIMIT 1');

    let result;
    if (existing.rows.length === 0) {
      // Insert new
      result = await db.query(
        `INSERT INTO branding (logo_url, app_name, app_subtitle, primary_color)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [logoUrl || null, appName || 'WhatsApp Warmer', appSubtitle || 'Sistema de Aquecimento', primaryColor || '#22c55e']
      );
    } else {
      // Update existing
      result = await db.query(
        `UPDATE branding
         SET logo_url = COALESCE($1, logo_url),
             app_name = COALESCE($2, app_name),
             app_subtitle = COALESCE($3, app_subtitle),
             primary_color = COALESCE($4, primary_color),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [logoUrl, appName, appSubtitle, primaryColor, existing.rows[0].id]
      );
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      logoUrl: row.logo_url,
      appName: row.app_name,
      appSubtitle: row.app_subtitle,
      primaryColor: row.primary_color,
    });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ message: 'Erro ao atualizar branding' });
  }
});

module.exports = router;
