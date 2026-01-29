const express = require('express');
const db = require('../db');
const warmingService = require('../services/warmingService');

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

// Toggle warming status (legacy)
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

// ========== NEW: Warming Control Endpoints ==========

// Get warming status
router.get('/status', async (req, res) => {
  try {
    const status = warmingService.getWarmingStatus(req.user.userId);
    res.json(status);
  } catch (error) {
    console.error('Get warming status error:', error);
    res.status(500).json({ message: 'Erro ao buscar status do aquecimento' });
  }
});

// Start warming
router.post('/start', async (req, res) => {
  try {
    const result = await warmingService.startWarming(req.user.userId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json({ message: result.message, isActive: true });
  } catch (error) {
    console.error('Start warming error:', error);
    res.status(500).json({ message: 'Erro ao iniciar aquecimento' });
  }
});

// Stop warming
router.post('/stop', async (req, res) => {
  try {
    const result = await warmingService.stopWarming(req.user.userId);
    res.json({ message: result.message, isActive: false });
  } catch (error) {
    console.error('Stop warming error:', error);
    res.status(500).json({ message: 'Erro ao parar aquecimento' });
  }
});

// Get warming logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await db.query(
      `SELECT * FROM warming_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [req.user.userId, limit]
    );
    
    res.json(result.rows.map(row => ({
      id: row.id,
      action: row.action,
      details: row.details,
      createdAt: row.created_at
    })));
  } catch (error) {
    // Table might not exist yet
    if (error.message.includes('does not exist')) {
      return res.json([]);
    }
    console.error('Get warming logs error:', error);
    res.status(500).json({ message: 'Erro ao buscar logs' });
  }
});

// ========== NEW: Diagnostics Endpoints ==========

// Get warming diagnostics
router.get('/diagnostics', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get configuration
    const configResult = await db.query(
      'SELECT * FROM warming_config WHERE user_id = $1',
      [userId]
    );
    const config = configResult.rows[0] || null;
    
    // Get primary instance
    const primaryResult = await db.query(
      'SELECT id, name, phone_number, status, api_url, messages_sent, messages_received FROM instances WHERE user_id = $1 AND is_primary = TRUE',
      [userId]
    );
    const primaryInstance = primaryResult.rows[0] || null;
    
    // Get secondary instances count
    const secondaryResult = await db.query(
      `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE status = 'connected') as connected
       FROM instances WHERE user_id = $1 AND is_primary = FALSE`,
      [userId]
    );
    const secondaryStats = secondaryResult.rows[0];
    
    // Get messages count
    const messagesResult = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = $1',
      [userId]
    );
    const messagesCount = parseInt(messagesResult.rows[0].count);
    
    // Get client numbers count
    const clientsResult = await db.query(
      'SELECT COUNT(*) as count FROM client_numbers WHERE user_id = $1',
      [userId]
    );
    const clientsCount = parseInt(clientsResult.rows[0].count);
    
    // Get logs stats (last 24h)
    let logsStats = { total: 0, byAction: {} };
    try {
      const logsResult = await db.query(
        `SELECT action, COUNT(*) as count 
         FROM warming_logs 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         GROUP BY action`,
        [userId]
      );
      logsStats.byAction = logsResult.rows.reduce((acc, row) => {
        acc[row.action] = parseInt(row.count);
        return acc;
      }, {});
      logsStats.total = logsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    } catch (e) {
      // Table might not exist
    }
    
    // Get hourly stats (last 24h)
    let hourlyStats = [];
    try {
      const hourlyResult = await db.query(
        `SELECT 
           DATE_TRUNC('hour', created_at) as hour,
           COUNT(*) as count,
           COUNT(*) FILTER (WHERE action = 'SECONDARY_TO_PRIMARY') as secondary_to_primary,
           COUNT(*) FILTER (WHERE action = 'PRIMARY_TO_SECONDARY') as primary_to_secondary,
           COUNT(*) FILTER (WHERE action = 'PRIMARY_TO_CLIENT') as primary_to_client,
           COUNT(*) FILTER (WHERE action = 'ERROR') as errors
         FROM warming_logs 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         GROUP BY DATE_TRUNC('hour', created_at)
         ORDER BY hour DESC
         LIMIT 24`,
        [userId]
      );
      hourlyStats = hourlyResult.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count),
        secondaryToPrimary: parseInt(row.secondary_to_primary),
        primaryToSecondary: parseInt(row.primary_to_secondary),
        primaryToClient: parseInt(row.primary_to_client),
        errors: parseInt(row.errors)
      }));
    } catch (e) {
      // Table might not exist
    }
    
    // Get recent errors
    let recentErrors = [];
    try {
      const errorsResult = await db.query(
        `SELECT id, action, details, created_at 
         FROM warming_logs 
         WHERE user_id = $1 AND action = 'ERROR'
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );
      recentErrors = errorsResult.rows.map(row => ({
        id: row.id,
        details: row.details,
        createdAt: row.created_at
      }));
    } catch (e) {
      // Table might not exist
    }
    
    // Build diagnostics
    const diagnostics = {
      status: warmingService.getWarmingStatus(userId),
      config: config ? {
        minDelaySeconds: config.min_delay_seconds,
        maxDelaySeconds: config.max_delay_seconds,
        messagesPerHour: config.messages_per_hour,
        activeHoursStart: config.active_hours_start,
        activeHoursEnd: config.active_hours_end,
        receiveRatio: parseFloat(config.receive_ratio) || 2.0
      } : null,
      requirements: {
        hasPrimaryInstance: !!primaryInstance,
        primaryInstanceConnected: primaryInstance?.status === 'connected',
        primaryHasPhoneNumber: !!primaryInstance?.phone_number,
        hasSecondaryInstances: parseInt(secondaryStats.total) > 0,
        secondaryConnectedCount: parseInt(secondaryStats.connected),
        hasMessages: messagesCount > 0,
        messagesCount,
        hasClientNumbers: clientsCount > 0,
        clientNumbersCount: clientsCount
      },
      primaryInstance: primaryInstance ? {
        id: primaryInstance.id,
        name: primaryInstance.name,
        phoneNumber: primaryInstance.phone_number,
        status: primaryInstance.status,
        apiUrl: primaryInstance.api_url,
        messagesSent: primaryInstance.messages_sent || 0,
        messagesReceived: primaryInstance.messages_received || 0
      } : null,
      stats: {
        last24h: logsStats,
        hourly: hourlyStats.reverse()
      },
      recentErrors
    };
    
    res.json(diagnostics);
  } catch (error) {
    console.error('Get diagnostics error:', error);
    res.status(500).json({ message: 'Erro ao buscar diagnósticos' });
  }
});

// Test Evolution API connection
router.post('/test-connection/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    const instanceResult = await db.query(
      'SELECT * FROM instances WHERE id = $1 AND user_id = $2',
      [instanceId, req.user.userId]
    );
    
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Instância não encontrada' });
    }
    
    const instance = instanceResult.rows[0];
    
    // Test connection to Evolution API
    const testUrl = `${instance.api_url}/instance/connectionState/${instance.name}`;
    
    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': instance.api_key,
        'Content-Type': 'application/json'
      }
    });
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.json({
        success: false,
        status: response.status,
        error: errorText,
        latency
      });
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      status: response.status,
      state: data.instance?.state || data.state || 'unknown',
      latency,
      rawResponse: data
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
