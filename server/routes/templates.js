const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// GET /api/templates - todos los templates (admin ve todos, inmobiliaria ve los del sistema)
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find().sort({ orden: 1, nombre: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/templates - solo admin
router.post('/', adminOnly, async (req, res) => {
  try {
    const template = await Template.create({ ...req.body, creadoPor: req.user._id });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/templates/:id - solo admin
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ message: 'Template no encontrado' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/templates/:id - solo admin
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template eliminado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
