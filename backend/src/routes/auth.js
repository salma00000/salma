const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

const limiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const { rows } = await pool.query('SELECT * FROM advisors WHERE email = $1', [email]);
    const advisor = rows[0];
    if (!advisor) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, advisor.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign(
      { id: advisor.id, email: advisor.email, full_name: advisor.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ token, advisor: { id: advisor.id, email: advisor.email, full_name: advisor.full_name } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, created_at FROM advisors WHERE id = $1',
      [req.advisor.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Conseiller introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
