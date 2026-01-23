const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar se é superadmin ou admin
async function requireAdmin(req, res, next) {
  try {
    const result = await db.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('superadmin', 'admin')`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Acesso negado. Somente administradores.' });
    }

    req.userRole = result.rows[0].role;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões' });
  }
}

// Listar todos os usuários
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.created_at, u.must_change_password,
              COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// Criar novo usuário
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    // Verificar se email já existe
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    // Se tiver senha, fazer hash; senão, deixar null (forçar troca no primeiro acesso)
    let passwordHash = null;
    let mustChangePassword = true;

    if (password && password.length >= 6) {
      passwordHash = await bcrypt.hash(password, 10);
      mustChangePassword = false;
    }

    // Criar usuário
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, must_change_password)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at, must_change_password`,
      [email, passwordHash, mustChangePassword]
    );

    const user = userResult.rows[0];

    // Atribuir role (default: user)
    const userRole = role || 'user';
    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [user.id, userRole]
    );

    // Criar config padrão
    await db.query(
      `INSERT INTO warming_config (user_id, min_delay_seconds, max_delay_seconds, messages_per_hour, active_hours_start, active_hours_end)
       VALUES ($1, 60, 180, 20, 8, 22)`,
      [user.id]
    );

    res.status(201).json({
      ...user,
      roles: [userRole],
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// Resetar senha de um usuário
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Verificar se usuário existe
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    let passwordHash = null;
    let mustChangePassword = true;

    if (newPassword && newPassword.length >= 6) {
      passwordHash = await bcrypt.hash(newPassword, 10);
      mustChangePassword = false;
    }

    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3',
      [passwordHash, mustChangePassword, id]
    );

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Erro ao resetar senha' });
  }
});

// Atualizar role de um usuário
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['superadmin', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role inválida' });
    }

    // Não permitir que um admin promova alguém a superadmin
    if (role === 'superadmin' && req.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Somente superadmin pode promover a superadmin' });
    }

    // Remover roles anteriores e adicionar nova
    await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    await db.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [id, role]);

    res.json({ message: 'Role atualizada com sucesso' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Erro ao atualizar role' });
  }
});

// Deletar usuário
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir deletar a si mesmo
    if (id === req.user.userId) {
      return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
    }

    // Verificar se o usuário a ser deletado é superadmin
    const roleCheck = await db.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
      [id]
    );

    if (roleCheck.rows.length > 0 && req.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Somente superadmin pode deletar outro superadmin' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
});

module.exports = router;
