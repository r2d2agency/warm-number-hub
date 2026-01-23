const express = require('express');
const db = require('../db');

const router = express.Router();

// Convert snake_case DB row to camelCase for frontend
function formatConfig(row) {
  return {
    minDelaySeconds: row.min_delay_seconds,
    maxDelaySeconds: row.max_delay_seconds,
    messagesPerHour: row.messages_per_hour,
    activeHoursStart: row.active_hours_start,
    activeHoursEnd: row.active_hours_end,
  };
}

// Get config for user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM warming_config WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Create default config
      const newConfig = await db.query(
        `INSERT INTO warming_config (user_id, min_delay_seconds, max_delay_seconds, messages_per_hour, active_hours_start, active_hours_end)
         VALUES ($1, 60, 180, 20, 8, 22)
         RETURNING *`,
        [req.user.userId]
      );
      return res.json(formatConfig(newConfig.rows[0]));
    }

    res.json(formatConfig(result.rows[0]));
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ message: 'Erro ao buscar configuração' });
  }
});

// Update config
router.put('/', async (req, res) => {
  try {
    const { minDelaySeconds, maxDelaySeconds, messagesPerHour, activeHoursStart, activeHoursEnd } = req.body;

    const result = await db.query(
      `UPDATE warming_config 
       SET min_delay_seconds = COALESCE($1, min_delay_seconds),
           max_delay_seconds = COALESCE($2, max_delay_seconds),
           messages_per_hour = COALESCE($3, messages_per_hour),
           active_hours_start = COALESCE($4, active_hours_start),
           active_hours_end = COALESCE($5, active_hours_end),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [minDelaySeconds, maxDelaySeconds, messagesPerHour, activeHoursStart, activeHoursEnd, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }

    res.json(formatConfig(result.rows[0]));
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ message: 'Erro ao atualizar configuração' });
  }
});

module.exports = router;
