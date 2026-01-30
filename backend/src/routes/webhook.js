/**
 * Webhook route for Evolution API
 * Receives notifications about incoming messages and updates stats
 */

const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * Evolution API Webhook Endpoint
 * Configure in Evolution API: POST {backend_url}/api/webhook/evolution
 * 
 * Event types we care about:
 * - messages.upsert: New message received
 */
router.post('/evolution', async (req, res) => {
  try {
    const payload = req.body;
    
    console.log('[Webhook] Received event:', JSON.stringify(payload).substring(0, 500));
    
    // Evolution API sends different event types
    const event = payload.event || payload.type;
    const instanceName = payload.instance || payload.instanceName;
    
    if (!instanceName) {
      console.log('[Webhook] No instance name in payload');
      return res.status(200).json({ received: true, processed: false });
    }
    
    // Find the instance by name
    const instanceResult = await db.query(
      'SELECT id, user_id, name, is_primary FROM instances WHERE name = $1',
      [instanceName]
    );
    
    if (instanceResult.rows.length === 0) {
      console.log(`[Webhook] Instance not found: ${instanceName}`);
      return res.status(200).json({ received: true, processed: false });
    }
    
    const instance = instanceResult.rows[0];
    
    // Process based on event type
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      await handleMessageReceived(instance, payload);
    } else if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      await handleConnectionUpdate(instance, payload);
    }
    
    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('[Webhook] Error processing:', error);
    // Always return 200 to avoid Evolution API retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * Handle incoming message event
 */
async function handleMessageReceived(instance, payload) {
  try {
    // Extract message data
    const data = payload.data || payload;
    const messageData = Array.isArray(data) ? data[0] : data;
    
    if (!messageData) {
      console.log('[Webhook] No message data');
      return;
    }
    
    // Check if it's an incoming message (not sent by us)
    const fromMe = messageData.key?.fromMe || messageData.fromMe || false;
    
    if (fromMe) {
      console.log('[Webhook] Ignoring outgoing message');
      return;
    }
    
    // Get remote JID (sender)
    const remoteJid = messageData.key?.remoteJid || messageData.remoteJid || '';
    const senderNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    console.log(`[Webhook] Incoming message to ${instance.name} from ${senderNumber}`);
    
    // Update messages_received for this instance
    await db.query(
      `UPDATE instances 
       SET messages_received = messages_received + 1, 
           last_activity = NOW(), 
           updated_at = NOW()
       WHERE id = $1`,
      [instance.id]
    );
    
    // Log the activity
    await logWebhookActivity(instance.user_id, 'MESSAGE_RECEIVED', {
      instance: instance.name,
      from: senderNumber,
      isPrimary: instance.is_primary
    });
    
    console.log(`[Webhook] Updated received count for ${instance.name}`);
  } catch (error) {
    console.error('[Webhook] Error handling message:', error);
  }
}

/**
 * Handle connection status update
 */
async function handleConnectionUpdate(instance, payload) {
  try {
    const data = payload.data || payload;
    const state = data.state || data.connection || 'unknown';
    
    // Map Evolution states to our status
    let status = 'disconnected';
    if (state === 'open' || state === 'connected') {
      status = 'connected';
    }
    
    console.log(`[Webhook] Connection update for ${instance.name}: ${state} -> ${status}`);
    
    await db.query(
      'UPDATE instances SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, instance.id]
    );
    
  } catch (error) {
    console.error('[Webhook] Error handling connection update:', error);
  }
}

/**
 * Log webhook activity
 */
async function logWebhookActivity(userId, action, details) {
  try {
    await db.query(
      `INSERT INTO warming_logs (user_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, JSON.stringify(details)]
    );
  } catch (error) {
    // Table might not exist, that's ok
    if (!error.message.includes('does not exist')) {
      console.error('[Webhook] Error logging activity:', error);
    }
  }
}

/**
 * Health check endpoint for webhook
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'webhook',
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;
