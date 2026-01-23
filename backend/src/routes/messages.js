const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all messages for user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Erro ao buscar mensagens' });
  }
});

// Add message
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Conteúdo é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO messages (user_id, content, type)
       VALUES ($1, $2, 'outgoing')
       RETURNING *`,
      [req.user.userId, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Erro ao criar mensagem' });
  }
});

// Import messages
router.post('/import', async (req, res) => {
  try {
    const { contents } = req.body;

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ message: 'Lista de mensagens é obrigatória' });
    }

    const messages = [];
    for (const content of contents.slice(0, 100)) {
      if (content && content.trim()) {
        const result = await db.query(
          `INSERT INTO messages (user_id, content, type)
           VALUES ($1, $2, 'outgoing')
           RETURNING *`,
          [req.user.userId, content.trim()]
        );
        messages.push(result.rows[0]);
      }
    }

    res.status(201).json(messages);
  } catch (error) {
    console.error('Import messages error:', error);
    res.status(500).json({ message: 'Erro ao importar mensagens' });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mensagem não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Erro ao deletar mensagem' });
  }
});

module.exports = router;
