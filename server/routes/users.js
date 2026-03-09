const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require auth + admin
router.use(protect, adminOnly);

// GET /api/users - list all inmobiliarias
router.get('/', async (req, res) => {
  try {
    const users = await User.find({ rol: 'inmobiliaria' }).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users - create inmobiliaria user
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { username, nombre, apellido, email, celular, password } = req.body;
    const userData = { username, nombre, apellido, email, celular, password, rol: 'inmobiliaria' };
    if (req.file) userData.logo = `/uploads/${req.file.filename}`;
    const user = await User.create(userData);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Usuario o email ya existe' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    const updates = {};
    const fields = ['nombre', 'apellido', 'email', 'celular', 'activo'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.file) updates.logo = `/uploads/${req.file.filename}`;
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(req.body.password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id — elimina definitivamente el usuario y sus inventarios
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.rol === 'admin') return res.status(400).json({ message: 'No se puede eliminar un administrador' });

    const Inventario = require('../models/Inventario');
    const inventariosEliminados = await Inventario.countDocuments({ creadoPor: req.params.id });
    await Inventario.deleteMany({ creadoPor: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Usuario eliminado', inventariosEliminados });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
