const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all client numbers for user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM client_numbers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client numbers error:', error);
    res.status(500).json({ message: 'Erro ao buscar números' });
  }
});

// Add client number
router.post('/', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Número de telefone é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO client_numbers (user_id, phone_number, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.userId, phoneNumber.trim(), name?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create client number error:', error);
    res.status(500).json({ message: 'Erro ao adicionar número' });
  }
});

// Import client numbers
router.post('/import', async (req, res) => {
  try {
    const { numbers } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ message: 'Lista de números é obrigatória' });
    }

    const clients = [];
    for (const { phoneNumber, name } of numbers) {
      if (phoneNumber && phoneNumber.trim()) {
        const result = await db.query(
          `INSERT INTO client_numbers (user_id, phone_number, name)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [req.user.userId, phoneNumber.trim(), name?.trim() || null]
        );
        clients.push(result.rows[0]);
      }
    }

    res.status(201).json(clients);
  } catch (error) {
    console.error('Import client numbers error:', error);
    res.status(500).json({ message: 'Erro ao importar números' });
  }
});

// Delete client number
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM client_numbers WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Número não encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete client number error:', error);
    res.status(500).json({ message: 'Erro ao deletar número' });
  }
});

module.exports = router;
