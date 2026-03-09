const express = require('express');
const router = express.Router();
const Inventario = require('../models/Inventario');
const Template = require('../models/Template');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const { generarInventarioPDF } = require('../utils/generarInventarioPDF');

router.use(protect);

// GET /api/inventarios/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter).populate('creadoPor', 'nombre apellido email celular logo username');
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    const usuario = inv.creadoPor || req.user;
    const pdfBuffer = await generarInventarioPDF(inv.toObject(), usuario.toObject ? usuario.toObject() : usuario);
    const filename = ('inventario-' + (inv.codigo || inv._id) + '.pdf').replace(/[^a-z0-9-_.]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ message: 'Error generando el PDF: ' + err.message });
  }
});

// GET /api/inventarios
router.get('/', async (req, res) => {
  try {
    const filter = req.user.rol === 'admin' ? {} : { creadoPor: req.user._id };
    const { page = 1, limit = 20, search } = req.query;
    if (search) {
      filter.$or = [
        { direccion: { $regex: search, $options: 'i' } },
        { localidad: { $regex: search, $options: 'i' } },
        { codigo: { $regex: search, $options: 'i' } },
        { arrendador: { $regex: search, $options: 'i' } },
        { arrendatario: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Inventario.countDocuments(filter);
    const inventarios = await Inventario.find(filter)
      .populate('creadoPor', 'nombre apellido username logo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-ambientes'); // not loading ambientes for list
    res.json({ inventarios, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventarios/:id
router.get('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter).populate('creadoPor', 'nombre apellido username logo');
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventarios - create with default templates
router.post('/', async (req, res) => {
  try {
    const defaultTemplates = await Template.find({ esDefault: true }).sort({ orden: 1 });
    const ambientes = defaultTemplates.map((t, i) => ({
      nombre: t.nombre,
      tuplas: t.tuplas.map(tp => ({ campo: tp.campo, valor: tp.valorDefault || '' })),
      archivos: [],
      templateOrigen: t._id,
      orden: t.orden ?? i,
    }));

    const inv = await Inventario.create({
      ...req.body,
      ambientes,
      creadoPor: req.user._id,
    });
    res.status(201).json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/inventarios/:id
router.put('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOneAndUpdate(filter, req.body, { new: true });
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inventarios/:id
router.delete('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOneAndDelete(filter);
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    res.json({ message: 'Inventario eliminado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventarios/:id/ambientes - add ambiente from template or blank
router.post('/:id/ambientes', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter);
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });

    let newAmbiente;
    if (req.body.templateId) {
      const t = await Template.findById(req.body.templateId);
      if (!t) return res.status(404).json({ message: 'Template no encontrado' });
      newAmbiente = {
        nombre: t.nombre,
        tuplas: t.tuplas.map(tp => ({ campo: tp.campo, valor: tp.valorDefault || '' })),
        archivos: [],
        templateOrigen: t._id,
        orden: inv.ambientes.length,
      };
    } else {
      newAmbiente = {
        nombre: req.body.nombre || 'Nuevo Ambiente',
        tuplas: req.body.tuplas || [],
        archivos: [],
        orden: inv.ambientes.length,
      };
    }

    inv.ambientes.push(newAmbiente);
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventarios/:id/ambientes/:ambienteId/archivos - upload files to ambiente
router.post('/:id/ambientes/:ambienteId/archivos', upload.array('archivos', 20), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter);
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });

    const ambiente = inv.ambientes.id(req.params.ambienteId);
    if (!ambiente) return res.status(404).json({ message: 'Ambiente no encontrado' });

    const newFiles = req.files.map(f => ({
      nombre: f.originalname,
      url: `/uploads/${f.filename}`,
      tipo: f.mimetype.startsWith('image/') ? 'image' : 'file',
      mimetype: f.mimetype,
      size: f.size,
    }));

    ambiente.archivos.push(...newFiles);
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inventarios/:id/ambientes/:ambienteId/archivos/:archivoId
router.delete('/:id/ambientes/:ambienteId/archivos/:archivoId', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter);
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });

    const ambiente = inv.ambientes.id(req.params.ambienteId);
    if (!ambiente) return res.status(404).json({ message: 'Ambiente no encontrado' });

    ambiente.archivos = ambiente.archivos.filter(a => a._id.toString() !== req.params.archivoId);
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
