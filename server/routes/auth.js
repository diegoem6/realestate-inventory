const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    if (!user.activo) return res.status(401).json({ message: 'Usuario inactivo' });
    res.json({ token: generateToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

// PUT /api/auth/profile - update own profile
router.put('/profile', protect, upload.single('logo'), async (req, res) => {
  try {
    console.log('PROFILE UPDATE - body:', req.body);
    console.log('PROFILE UPDATE - pdfColor:', req.body.pdfColor);
    const updates = {};
    const fields = ['nombre', 'apellido', 'email', 'celular'];
    fields.forEach(f => { if (req.body[f]) updates[f] = req.body[f]; });
    if (req.body.pdfColor && /^#[0-9a-fA-F]{6}$/.test(req.body.pdfColor)) {
      updates.pdfColor = req.body.pdfColor;
    }
    console.log('PROFILE UPDATE - updates:', updates);
    if (req.file) updates.logo = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(req.body.password, 12);
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
