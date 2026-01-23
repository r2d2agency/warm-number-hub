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
      active_hours_end: 22
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Evolution API error: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending Evolution message:', error);
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
  console.log(`[Warming][User:${userId}] ${action}:`, details);
  
  // Optionally store in database for audit
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
      console.log(`[Warming][User:${userId}] Outside active hours (${config.active_hours_start}h-${config.active_hours_end}h)`);
      scheduleNextCycle(userId, 60000); // Check again in 1 minute
      return;
    }

    const primaryInstance = await getPrimaryInstance(userId);
    if (!primaryInstance) {
      console.log(`[Warming][User:${userId}] No primary instance configured`);
      return;
    }

    const secondaryInstances = await getSecondaryInstances(userId);
    const message = await getRandomMessage(userId);
    
    if (!message) {
      console.log(`[Warming][User:${userId}] No messages configured`);
      scheduleNextCycle(userId, getRandomDelay(config.min_delay_seconds, config.max_delay_seconds));
      return;
    }

    // Decide action based on random factor
    const action = Math.random();
    
    if (action < 0.4 && secondaryInstances.length > 0) {
      // 40% chance: Secondary instance sends to primary
      const secondaryInstance = secondaryInstances[Math.floor(Math.random() * secondaryInstances.length)];
      const targetNumber = primaryInstance.phone_number;
      
      if (targetNumber) {
        const result = await sendEvolutionMessage(secondaryInstance, targetNumber, message);
        
        if (result.success) {
          await updateInstanceStats(secondaryInstance.id, 'sent');
          await updateInstanceStats(primaryInstance.id, 'received');
          await logWarmingActivity(userId, 'SECONDARY_TO_PRIMARY', {
            from: secondaryInstance.name,
            to: primaryInstance.name,
            message: message.substring(0, 50)
          });
        }
      }
    } else if (action < 0.7 && secondaryInstances.length > 0) {
      // 30% chance: Primary responds to a secondary instance
      const secondaryInstance = secondaryInstances[Math.floor(Math.random() * secondaryInstances.length)];
      const targetNumber = secondaryInstance.phone_number;
      
      if (targetNumber) {
        const result = await sendEvolutionMessage(primaryInstance, targetNumber, message);
        
        if (result.success) {
          await updateInstanceStats(primaryInstance.id, 'sent');
          await updateInstanceStats(secondaryInstance.id, 'received');
          await logWarmingActivity(userId, 'PRIMARY_TO_SECONDARY', {
            from: primaryInstance.name,
            to: secondaryInstance.name,
            message: message.substring(0, 50)
          });
        }
      }
    } else {
      // 30% chance: Primary sends to a client number
      const clientNumber = await getRandomClientNumber(userId);
      
      if (clientNumber) {
        const result = await sendEvolutionMessage(primaryInstance, clientNumber.phone_number, message);
        
        if (result.success) {
          await updateInstanceStats(primaryInstance.id, 'sent');
          await logWarmingActivity(userId, 'PRIMARY_TO_CLIENT', {
            from: primaryInstance.name,
            to: clientNumber.name || clientNumber.phone_number,
            message: message.substring(0, 50)
          });
        }
      }
    }

    // Schedule next cycle
    const delay = getRandomDelay(config.min_delay_seconds, config.max_delay_seconds);
    scheduleNextCycle(userId, delay);
    
  } catch (error) {
    console.error(`[Warming][User:${userId}] Cycle error:`, error);
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
