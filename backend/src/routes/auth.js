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

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    // Find user with roles
    const result = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.must_change_password,
              COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];

    // Se o usuário não tem senha definida (password_hash é NULL), permitir login sem senha
    // Isso é usado para o primeiro acesso do superadmin
    if (!user.password_hash || user.password_hash === '') {
      // Login sem senha - forçar troca de senha
      const token = generateToken(user.id, user.email);
      return res.json({
        token,
        user: { id: user.id, email: user.email, roles: user.roles },
        mustChangePassword: true,
      });
    }

    // Se o usuário tem senha, a senha é obrigatória
    if (!password) {
      return res.status(400).json({ message: 'Senha é obrigatória' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, email: user.email, roles: user.roles },
      mustChangePassword: user.must_change_password || false,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Change password (authenticated)
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ message: 'Token inválido' });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
});

module.exports = router;
