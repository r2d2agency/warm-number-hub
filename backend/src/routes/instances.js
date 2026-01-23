const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all instances for user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM instances WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get instances error:', error);
    res.status(500).json({ message: 'Erro ao buscar instâncias' });
  }
});

// Create instance
router.post('/', async (req, res) => {
  try {
    const { name, apiUrl, apiKey, phoneNumber } = req.body;

    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({ message: 'Nome, URL e API Key são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO instances (user_id, name, api_url, api_key, phone_number, status)
       VALUES ($1, $2, $3, $4, $5, 'disconnected')
       RETURNING *`,
      [req.user.userId, name, apiUrl, apiKey, phoneNumber]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create instance error:', error);
    res.status(500).json({ message: 'Erro ao criar instância' });
  }
});

// Update instance
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiUrl, apiKey, phoneNumber, status } = req.body;

    const result = await db.query(
      `UPDATE instances 
       SET name = COALESCE($1, name), 
           api_url = COALESCE($2, api_url), 
           api_key = COALESCE($3, api_key),
           phone_number = COALESCE($4, phone_number),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, apiUrl, apiKey, phoneNumber, status, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update instance error:', error);
    res.status(500).json({ message: 'Erro ao atualizar instância' });
  }
});

// Delete instance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM instances WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete instance error:', error);
    res.status(500).json({ message: 'Erro ao deletar instância' });
  }
});

// Check instance status from Evolution API
router.post('/:id/check-status', async (req, res) => {
  try {
    const { id } = req.params;

    // Get instance details
    const instanceResult = await db.query(
      'SELECT * FROM instances WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    const instance = instanceResult.rows[0];

    // Call Evolution API to check connection status
    const response = await fetch(`${instance.api_url}/instance/connectionState/${instance.name}`, {
      method: 'GET',
      headers: {
        'apikey': instance.api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Update status to disconnected if API call fails
      await db.query(
        'UPDATE instances SET status = $1, updated_at = NOW() WHERE id = $2',
        ['disconnected', id]
      );
      return res.json({ status: 'disconnected', message: 'Não foi possível conectar à API' });
    }

    const data = await response.json();
    
    // Determine status based on Evolution API response
    let newStatus = 'disconnected';
    if (data.instance?.state === 'open' || data.state === 'open') {
      newStatus = 'connected';
    } else if (data.instance?.state === 'connecting' || data.state === 'connecting') {
      newStatus = 'warming';
    }

    // Update instance status in database
    await db.query(
      'UPDATE instances SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    res.json({ 
      status: newStatus, 
      rawState: data.instance?.state || data.state,
      message: newStatus === 'connected' ? 'Conectado' : 'Desconectado'
    });
  } catch (error) {
    console.error('Check instance status error:', error);
    res.status(500).json({ message: 'Erro ao verificar status da instância' });
  }
});

module.exports = router;
