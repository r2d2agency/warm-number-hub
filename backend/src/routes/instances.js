const express = require('express');
const db = require('../db');

const router = express.Router();

function mapDbErrorToUserMessage(error, fallback) {
  const code = error?.code;

  // Postgres common errors
  if (code === '42703') {
    return 'Banco desatualizado (coluna ausente). Reinicie o backend para aplicar as migrations.';
  }
  if (code === '42P01') {
    return 'Banco desatualizado (tabela ausente). Verifique se o schema foi criado e reinicie o backend para aplicar as migrations.';
  }
  if (code === '28P01') {
    return 'Falha de autenticação no banco (verifique DATABASE_URL).';
  }
  if (code === '3D000') {
    return 'Database não encontrada (verifique DATABASE_URL).';
  }

  return fallback;
}

// Convert snake_case DB row to camelCase for frontend
function formatInstance(row, currentUserId) {
  return {
    id: row.id,
    name: row.name,
    apiUrl: row.api_url,
    apiKey: row.api_key,
    phoneNumber: row.phone_number,
    status: row.status,
    isPrimary: row.is_primary || false,
    isGlobal: row.is_global || false,
    isOwner: row.user_id === currentUserId,
    messagesSent: row.messages_sent || 0,
    messagesReceived: row.messages_received || 0,
    lastActivity: row.last_activity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Check if user is admin/superadmin
async function isUserAdmin(userId) {
  const result = await db.query(
    `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('superadmin', 'admin')`,
    [userId]
  );
  return result.rows.length > 0;
}

// Get all instances for user (own instances + global instances)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM instances 
       WHERE user_id = $1 OR is_global = TRUE 
       ORDER BY is_global ASC, is_primary DESC, created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows.map(row => formatInstance(row, req.user.userId)));
  } catch (error) {
    console.error('Get instances error:', error);
    res.status(500).json({ message: 'Erro ao buscar instâncias' });
  }
});

// Create instance
router.post('/', async (req, res) => {
  try {
    const { name, apiUrl, apiKey, phoneNumber, isPrimary, isGlobal } = req.body;

    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({ message: 'Nome, URL e API Key são obrigatórios' });
    }

    // Only admins can create global instances
    let shouldBeGlobal = false;
    if (isGlobal) {
      const adminCheck = await isUserAdmin(req.user.userId);
      if (!adminCheck) {
        return res.status(403).json({ message: 'Apenas administradores podem criar instâncias globais' });
      }
      shouldBeGlobal = true;
    }

    // If setting as primary, unset other primary instances first
    if (isPrimary) {
      await db.query(
        'UPDATE instances SET is_primary = FALSE WHERE user_id = $1',
        [req.user.userId]
      );
    }

    const result = await db.query(
      `INSERT INTO instances (user_id, name, api_url, api_key, phone_number, status, is_primary, is_global)
       VALUES ($1, $2, $3, $4, $5, 'disconnected', $6, $7)
       RETURNING *`,
      [req.user.userId, name, apiUrl, apiKey, phoneNumber, isPrimary || false, shouldBeGlobal]
    );

    res.status(201).json(formatInstance(result.rows[0], req.user.userId));
  } catch (error) {
    console.error('Create instance error:', error);
    res
      .status(500)
      .json({ message: mapDbErrorToUserMessage(error, 'Erro ao criar instância') });
  }
});

// Update instance
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiUrl, apiKey, phoneNumber, status, isPrimary, isGlobal } = req.body;

    // Check ownership or admin access
    const ownerCheck = await db.query(
      'SELECT user_id, is_global FROM instances WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    const instance = ownerCheck.rows[0];
    const isAdmin = await isUserAdmin(req.user.userId);
    const isOwner = instance.user_id === req.user.userId;

    // Only owner or admin can update
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para editar esta instância' });
    }

    // Only admins can change global status
    let newGlobalStatus = instance.is_global;
    if (isGlobal !== undefined && isAdmin) {
      newGlobalStatus = isGlobal;
    }

    // If setting as primary, unset other primary instances first
    if (isPrimary === true) {
      await db.query(
        'UPDATE instances SET is_primary = FALSE WHERE user_id = $1 AND id != $2',
        [req.user.userId, id]
      );
    }

    const result = await db.query(
      `UPDATE instances 
       SET name = COALESCE($1, name), 
           api_url = COALESCE($2, api_url), 
           api_key = COALESCE($3, api_key),
           phone_number = COALESCE($4, phone_number),
           status = COALESCE($5, status),
           is_primary = COALESCE($6, is_primary),
           is_global = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, apiUrl, apiKey, phoneNumber, status, isPrimary, newGlobalStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    res.json(formatInstance(result.rows[0], req.user.userId));
  } catch (error) {
    console.error('Update instance error:', error);
    res.status(500).json({ message: 'Erro ao atualizar instância' });
  }
});

// Delete instance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership or admin access
    const ownerCheck = await db.query(
      'SELECT user_id FROM instances WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }

    const isOwner = ownerCheck.rows[0].user_id === req.user.userId;
    const isAdmin = await isUserAdmin(req.user.userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para deletar esta instância' });
    }

    await db.query('DELETE FROM instances WHERE id = $1', [id]);

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

    // Get instance details (allow checking global instances)
    const instanceResult = await db.query(
      'SELECT * FROM instances WHERE id = $1 AND (user_id = $2 OR is_global = TRUE)',
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
