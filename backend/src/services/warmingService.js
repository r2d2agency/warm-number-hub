/**
 * Warming Service
 * Gerencia o processo de aquecimento de números WhatsApp
 * Envia mensagens automáticas entre instâncias respeitando delays e horários
 */

const db = require('../db');

// Store active warming sessions per user
const activeWarmingSessions = new Map();

/**
 * Get random delay between min and max
 */
function getRandomDelay(minSeconds, maxSeconds) {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

/**
 * Check if current time is within active hours
 */
function isWithinActiveHours(startHour, endHour) {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour;
  } else {
    // Handle overnight ranges (e.g., 22 to 6)
    return currentHour >= startHour || currentHour < endHour;
  }
}

/**
 * Get random message for user
 */
async function getRandomMessage(userId) {
  const result = await db.query(
    'SELECT content FROM messages WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1',
    [userId]
  );
  return result.rows[0]?.content || null;
}

/**
 * Get all secondary instances (non-primary) for user
 */
async function getSecondaryInstances(userId) {
  const result = await db.query(
    `SELECT * FROM instances 
     WHERE user_id = $1 AND is_primary = FALSE AND status = 'connected'
     ORDER BY RANDOM()`,
    [userId]
  );
  return result.rows;
}

/**
 * Get primary instance for user
 */
async function getPrimaryInstance(userId) {
  const result = await db.query(
    'SELECT * FROM instances WHERE user_id = $1 AND is_primary = TRUE LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get random client number for user
 */
async function getRandomClientNumber(userId) {
  const result = await db.query(
    'SELECT phone_number, name FROM client_numbers WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get warming config for user
 */
async function getWarmingConfig(userId) {
  const result = await db.query(
    'SELECT * FROM warming_config WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return {
      min_delay_seconds: 60,
      max_delay_seconds: 180,
      messages_per_hour: 20,
      active_hours_start: 8,
      active_hours_end: 22,
      receive_ratio: 2.0
    };
  }
  
  return result.rows[0];
}

/**
 * Send message via Evolution API
 */
async function sendEvolutionMessage(instance, toNumber, message) {
  try {
    const url = `${instance.api_url}/message/sendText/${instance.name}`;
    
    console.log(`[Evolution] Sending to ${url}`);
    console.log(`[Evolution] From: ${instance.name}, To: ${toNumber}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': instance.api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: toNumber,
        text: message
      })
    });

    const responseText = await response.text();
    console.log(`[Evolution] Response status: ${response.status}`);
    console.log(`[Evolution] Response body: ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      console.error(`[Evolution] API error: ${response.status} - ${responseText}`);
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('[Evolution] Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update instance message stats
 */
async function updateInstanceStats(instanceId, type) {
  const field = type === 'sent' ? 'messages_sent' : 'messages_received';
  await db.query(
    `UPDATE instances 
     SET ${field} = ${field} + 1, last_activity = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [instanceId]
  );
}

/**
 * Log warming activity
 */
async function logWarmingActivity(userId, action, details) {
  console.log(`[Warming][User:${userId}] ${action}:`, JSON.stringify(details));
  
  try {
    await db.query(
      `INSERT INTO warming_logs (user_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, JSON.stringify(details)]
    );
  } catch (error) {
    // Table might not exist, that's ok
    if (!error.message.includes('does not exist')) {
      console.error('Error logging warming activity:', error);
    }
  }
}

/**
 * Execute one warming cycle
 */
async function executeWarmingCycle(userId) {
  const session = activeWarmingSessions.get(userId);
  if (!session || !session.isActive) {
    console.log(`[Warming][User:${userId}] Session stopped or not found`);
    return;
  }

  try {
    const config = await getWarmingConfig(userId);
    
    // Check if within active hours
    if (!isWithinActiveHours(config.active_hours_start, config.active_hours_end)) {
      const msg = `Outside active hours (${config.active_hours_start}h-${config.active_hours_end}h), current: ${new Date().getHours()}h`;
      console.log(`[Warming][User:${userId}] ${msg}`);
      await logWarmingActivity(userId, 'SKIPPED', { reason: msg });
      scheduleNextCycle(userId, 60000); // Check again in 1 minute
      return;
    }

    const primaryInstance = await getPrimaryInstance(userId);
    if (!primaryInstance) {
      const msg = 'No primary instance configured';
      console.log(`[Warming][User:${userId}] ${msg}`);
      await logWarmingActivity(userId, 'ERROR', { reason: msg });
      return;
    }

    if (primaryInstance.status !== 'connected') {
      const msg = `Primary instance not connected (status: ${primaryInstance.status})`;
      console.log(`[Warming][User:${userId}] ${msg}`);
      await logWarmingActivity(userId, 'ERROR', { reason: msg });
      scheduleNextCycle(userId, 30000);
      return;
    }

    if (!primaryInstance.phone_number) {
      const msg = 'Primary instance has no phone number';
      console.log(`[Warming][User:${userId}] ${msg}`);
      await logWarmingActivity(userId, 'ERROR', { reason: msg });
      scheduleNextCycle(userId, 30000);
      return;
    }

    const secondaryInstances = await getSecondaryInstances(userId);
    const message = await getRandomMessage(userId);
    
    if (!message) {
      const msg = 'No messages configured';
      console.log(`[Warming][User:${userId}] ${msg}`);
      await logWarmingActivity(userId, 'ERROR', { reason: msg });
      scheduleNextCycle(userId, getRandomDelay(config.min_delay_seconds, config.max_delay_seconds));
      return;
    }

    // Decide action based on random factor
    // Regra de negócio: Primária recebe X vezes mais do que envia (configurável)
    // Calcula proporções baseado no receive_ratio configurado
    const receiveRatio = parseFloat(config.receive_ratio) || 2.0;
    // receiveRatio = received / sent
    // Se ratio = 2, então receive_pct = 2/(2+1) = 66.6%
    // Se ratio = 3, então receive_pct = 3/(3+1) = 75%
    const receivePct = receiveRatio / (receiveRatio + 1);
    const sendPct = 1 - receivePct;
    const sendToSecondaryPct = sendPct / 2; // metade vai para secundárias
    
    const actionRoll = Math.random();
    let actionTaken = 'NONE';
    let actionResult = null;
    
    console.log(`[Warming][User:${userId}] Action roll: ${actionRoll.toFixed(2)}, Ratio: ${receiveRatio}:1, Receive%: ${(receivePct*100).toFixed(0)}%, Secondary instances: ${secondaryInstances.length}`);
    
    if (actionRoll < receivePct && secondaryInstances.length > 0) {
      // receivePct chance: Secondary instance sends to primary (PRIMARY RECEIVES)
      actionTaken = 'SECONDARY_TO_PRIMARY';
      const secondaryInstance = secondaryInstances[Math.floor(Math.random() * secondaryInstances.length)];
      const targetNumber = primaryInstance.phone_number;
      
      console.log(`[Warming][User:${userId}] Trying ${actionTaken}: ${secondaryInstance.name} -> ${primaryInstance.name}`);
      
      if (targetNumber) {
        const result = await sendEvolutionMessage(secondaryInstance, targetNumber, message);
        actionResult = result;
        
        if (result.success) {
          await updateInstanceStats(secondaryInstance.id, 'sent');
          await updateInstanceStats(primaryInstance.id, 'received');
          await logWarmingActivity(userId, actionTaken, {
            from: secondaryInstance.name,
            to: primaryInstance.name,
            message: message.substring(0, 50),
            success: true
          });
        } else {
          await logWarmingActivity(userId, 'ERROR', {
            action: actionTaken,
            from: secondaryInstance.name,
            to: primaryInstance.name,
            error: result.error
          });
        }
      }
    } else if (actionRoll < (receivePct + sendToSecondaryPct) && secondaryInstances.length > 0) {
      // sendToSecondaryPct chance: Primary responds to a secondary instance (PRIMARY SENDS)
      actionTaken = 'PRIMARY_TO_SECONDARY';
      const secondaryInstance = secondaryInstances[Math.floor(Math.random() * secondaryInstances.length)];
      const targetNumber = secondaryInstance.phone_number;
      
      console.log(`[Warming][User:${userId}] Trying ${actionTaken}: ${primaryInstance.name} -> ${secondaryInstance.name}`);
      
      if (targetNumber) {
        const result = await sendEvolutionMessage(primaryInstance, targetNumber, message);
        actionResult = result;
        
        if (result.success) {
          await updateInstanceStats(primaryInstance.id, 'sent');
          await updateInstanceStats(secondaryInstance.id, 'received');
          await logWarmingActivity(userId, actionTaken, {
            from: primaryInstance.name,
            to: secondaryInstance.name,
            message: message.substring(0, 50),
            success: true
          });
        } else {
          await logWarmingActivity(userId, 'ERROR', {
            action: actionTaken,
            from: primaryInstance.name,
            to: secondaryInstance.name,
            error: result.error
          });
        }
      } else {
        await logWarmingActivity(userId, 'ERROR', {
          action: actionTaken,
          reason: `Secondary instance ${secondaryInstance.name} has no phone number`
        });
      }
    } else {
      // remaining chance (or fallback): Primary sends to a client number (PRIMARY SENDS)
      actionTaken = 'PRIMARY_TO_CLIENT';
      const clientNumber = await getRandomClientNumber(userId);
      
      if (clientNumber) {
        console.log(`[Warming][User:${userId}] Trying ${actionTaken}: ${primaryInstance.name} -> ${clientNumber.phone_number}`);
        
        const result = await sendEvolutionMessage(primaryInstance, clientNumber.phone_number, message);
        actionResult = result;
        
        if (result.success) {
          await updateInstanceStats(primaryInstance.id, 'sent');
          await logWarmingActivity(userId, actionTaken, {
            from: primaryInstance.name,
            to: clientNumber.name || clientNumber.phone_number,
            message: message.substring(0, 50),
            success: true
          });
        } else {
          await logWarmingActivity(userId, 'ERROR', {
            action: actionTaken,
            from: primaryInstance.name,
            to: clientNumber.phone_number,
            error: result.error
          });
        }
      } else {
        const msg = 'No client numbers configured';
        console.log(`[Warming][User:${userId}] ${msg}`);
        await logWarmingActivity(userId, 'SKIPPED', { 
          action: actionTaken, 
          reason: msg 
        });
      }
    }

    // Schedule next cycle
    const delay = getRandomDelay(config.min_delay_seconds, config.max_delay_seconds);
    scheduleNextCycle(userId, delay);
    
  } catch (error) {
    console.error(`[Warming][User:${userId}] Cycle error:`, error);
    await logWarmingActivity(userId, 'ERROR', { 
      reason: 'Cycle execution failed', 
      error: error.message 
    });
    // Retry after a delay
    scheduleNextCycle(userId, 30000);
  }
}

/**
 * Schedule next warming cycle
 */
function scheduleNextCycle(userId, delayMs) {
  const session = activeWarmingSessions.get(userId);
  if (!session || !session.isActive) return;

  session.nextCycleTimeout = setTimeout(() => {
    executeWarmingCycle(userId);
  }, delayMs);
  
  session.nextCycleAt = new Date(Date.now() + delayMs);
  console.log(`[Warming][User:${userId}] Next cycle in ${Math.round(delayMs / 1000)}s`);
}

/**
 * Start warming for a user
 */
async function startWarming(userId) {
  // Stop existing session if any
  await stopWarming(userId);

  const primaryInstance = await getPrimaryInstance(userId);
  if (!primaryInstance) {
    return { success: false, error: 'Nenhuma instância principal configurada' };
  }

  if (!primaryInstance.phone_number) {
    return { success: false, error: 'A instância principal não tem número de telefone configurado' };
  }

  const messages = await db.query(
    'SELECT COUNT(*) as count FROM messages WHERE user_id = $1',
    [userId]
  );
  
  if (parseInt(messages.rows[0].count) === 0) {
    return { success: false, error: 'Nenhuma mensagem configurada' };
  }

  // Create session
  const session = {
    isActive: true,
    startedAt: new Date(),
    nextCycleTimeout: null,
    nextCycleAt: null
  };
  
  activeWarmingSessions.set(userId, session);
  
  console.log(`[Warming][User:${userId}] Started warming session`);
  await logWarmingActivity(userId, 'STARTED', { 
    primaryInstance: primaryInstance.name,
    primaryPhone: primaryInstance.phone_number
  });
  
  // Start first cycle immediately
  executeWarmingCycle(userId);
  
  return { success: true, message: 'Aquecimento iniciado' };
}

/**
 * Stop warming for a user
 */
async function stopWarming(userId) {
  const session = activeWarmingSessions.get(userId);
  
  if (session) {
    session.isActive = false;
    
    if (session.nextCycleTimeout) {
      clearTimeout(session.nextCycleTimeout);
    }
    
    activeWarmingSessions.delete(userId);
    console.log(`[Warming][User:${userId}] Stopped warming session`);
    await logWarmingActivity(userId, 'STOPPED', {});
  }
  
  return { success: true, message: 'Aquecimento pausado' };
}

/**
 * Get warming status for a user
 */
function getWarmingStatus(userId) {
  const session = activeWarmingSessions.get(userId);
  
  if (!session || !session.isActive) {
    return {
      isActive: false,
      startedAt: null,
      nextCycleAt: null
    };
  }
  
  return {
    isActive: true,
    startedAt: session.startedAt,
    nextCycleAt: session.nextCycleAt
  };
}

module.exports = {
  startWarming,
  stopWarming,
  getWarmingStatus
};
