const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    // Create default config for user
    await db.query(
      `INSERT INTO warming_config (user_id, min_delay_seconds, max_delay_seconds, messages_per_hour, active_hours_start, active_hours_end)
       VALUES ($1, 60, 180, 20, 8, 22)`,
      [user.id]
    );

    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Find user
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const token = generateToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

module.exports = router;
