const express = require('express');
const db = require('../db');

const router = express.Router();

// Get warming number for user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM warming_numbers WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get warming number error:', error);
    res.status(500).json({ message: 'Erro ao buscar número' });
  }
});

// Set warming number
router.post('/', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Número de telefone é obrigatório' });
    }

    // Delete existing warming number for user
    await db.query('DELETE FROM warming_numbers WHERE user_id = $1', [req.user.userId]);

    // Create new warming number
    const result = await db.query(
      `INSERT INTO warming_numbers (user_id, phone_number, status, messages_sent, messages_received)
       VALUES ($1, $2, 'idle', 0, 0)
       RETURNING *`,
      [req.user.userId, phoneNumber.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Set warming number error:', error);
    res.status(500).json({ message: 'Erro ao definir número' });
  }
});

// Toggle warming status
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const current = await db.query(
      'SELECT status FROM warming_numbers WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'Número não encontrado' });
    }

    const newStatus = current.rows[0].status === 'warming' ? 'paused' : 'warming';

    const result = await db.query(
      `UPDATE warming_numbers 
       SET status = $1, last_activity = NOW(), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [newStatus, id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle warming status error:', error);
    res.status(500).json({ message: 'Erro ao alterar status' });
  }
});

module.exports = router;
