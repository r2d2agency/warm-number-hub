const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Middleware para verificar se é admin
async function requireAdmin(req, res, next) {
  try {
    const result = await db.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('superadmin', 'admin')`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Acesso negado. Somente administradores.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões' });
  }
}

// Upload logo
router.post('/logo', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // Build the URL for the uploaded file
    const logoUrl = `/uploads/${req.file.filename}`;

    // Update branding with new logo URL
    const existing = await db.query('SELECT id FROM branding LIMIT 1');
    
    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO branding (logo_url) VALUES ($1)`,
        [logoUrl]
      );
    } else {
      // Delete old logo file if exists
      const oldBranding = await db.query('SELECT logo_url FROM branding WHERE id = $1', [existing.rows[0].id]);
      if (oldBranding.rows[0]?.logo_url && oldBranding.rows[0].logo_url.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '../../', oldBranding.rows[0].logo_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await db.query(
        `UPDATE branding SET logo_url = $1, updated_at = NOW() WHERE id = $2`,
        [logoUrl, existing.rows[0].id]
      );
    }

    res.json({ logoUrl });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do logo' });
  }
});

// Delete logo
router.delete('/logo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const existing = await db.query('SELECT id, logo_url FROM branding LIMIT 1');
    
    if (existing.rows.length > 0 && existing.rows[0].logo_url) {
      // Delete file if it's a local upload
      if (existing.rows[0].logo_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../', existing.rows[0].logo_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await db.query(
        `UPDATE branding SET logo_url = NULL, updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ message: 'Erro ao remover logo' });
  }
});

module.exports = router;
