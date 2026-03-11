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
    const inv = await Inventario.findOne(filter).populate('creadoPor', 'nombre apellido email celular logo username pdfColor');
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
      url: `${process.env.BASE_URL}/uploads/${f.filename}`,
//      url: `/uploads/${f.filename}`,
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

// ── IA: analizar fotos de un ambiente y completar campos ─────────────────────
router.post('/:id/ambientes/:ambienteId/analizar-ia', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;
    const inv = await Inventario.findOne(filter);
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });

    const ambiente = inv.ambientes.id(req.params.ambienteId);
    if (!ambiente) return res.status(404).json({ message: 'Ambiente no encontrado' });

    const fotos = ambiente.archivos.filter(a => a.tipo === 'image');
    if (fotos.length === 0) {
      return res.status(400).json({ message: 'El ambiente no tiene fotos para analizar' });
    }

    // Cargar las fotos: si la URL es local (/uploads/...) se lee del disco;
    // si es una URL completa (http/https, ej. Cloudinary) se descarga con axios.
    const axios = require('axios');
    const fsSync = require('fs');
    const pathMod = require('path');

    const uploadsDir = pathMod.join(__dirname, '..', process.env.UPLOADS_PATH || 'uploads');
    const mimeFromExt = (name) => {
      const ext = (name || '').split('.').pop().toLowerCase();
      return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
               gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
    };

    const imageContents = [];
    for (const foto of fotos.slice(0, 5)) { // máximo 5 fotos
      try {
        let buf, contentType;
        if (foto.url && (foto.url.startsWith('http://') || foto.url.startsWith('https://'))) {
          // URL externa (Cloudinary, etc.) → descargar
          const response = await axios.get(foto.url, { responseType: 'arraybuffer', timeout: 10000 });
          buf = Buffer.from(response.data);
          contentType = response.headers['content-type'] || mimeFromExt(foto.nombre);
        } else {
          // Ruta local: /uploads/archivo.jpg → leer del disco
          //const filename = (foto.url || foto.nombre || '').replace(/^\/uploads\//, '');
	const filename = (foto.url || foto.nombre || '').replace(/^.*\/uploads\//, '');          
	const filePath = pathMod.join(uploadsDir, filename);
          if (!fsSync.existsSync(filePath)) {
            console.warn('Archivo no encontrado en disco:', filePath);
            continue;
          }
          buf = fsSync.readFileSync(filePath);
          contentType = mimeFromExt(foto.nombre);
        }
        const b64 = buf.toString('base64');
        imageContents.push({ b64, contentType, nombre: foto.nombre });
      } catch (e) {
        console.warn('No se pudo cargar imagen:', foto.url, e.message);
      }
    }

    if (imageContents.length === 0) {
      return res.status(400).json({ message: 'No se pudieron descargar las imágenes' });
    }

    // Campos ya definidos en el ambiente
    const camposExistentes = (ambiente.tuplas || []).map(t => t.campo).filter(Boolean);

    const systemPrompt = `Sos un inspector inmobiliario profesional en Uruguay.
Analizás fotos de ambientes y generás informes detallados para contratos de arrendamiento.
Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.
Formato exacto: {"campos": [{"campo": "nombre", "valor": "estado"}, ...]}
Pautas para los valores:
- Usá lenguaje técnico-inmobiliario: "Buen estado", "Estado regular", "Deteriorado", "Nuevo", "Con desgaste normal de uso", "Requiere mantenimiento", "Sin daños aparentes", etc.
- Sé específico cuando sea visible: "Piso cerámico sin roturas", "Pintura con humedad en esquina superior", "Carpintería de madera en buen estado".
- Si algo no es visible en las fotos, usá "No visible en fotografía".
- Sé breve y conciso: máximo 10 palabras por valor. Sin oraciones largas ni explicaciones.`;

    const userContent = [];

    for (const img of imageContents) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: img.contentType, data: img.b64 },
      });
    }

    // Siempre: completar campos existentes + agregar campos adicionales detectados
    const instruccionCamposExistentes = camposExistentes.length > 0
      ? `PARTE 1 — Completá el valor para cada uno de estos campos ya definidos (incluílos todos en el resultado):
${camposExistentes.map(c => `- ${c}`).join('\n')}

PARTE 2 — `
      : '';

    userContent.push({
      type: 'text',
      text: `${instruccionCamposExistentes}Analizá las fotos del ambiente "${ambiente.nombre}" e identificá TODOS los elementos relevantes para un inventario inmobiliario profesional que no estén ya cubiertos por los campos anteriores.

Elementos a considerar según lo visible: terminaciones (piso, paredes, cielorraso, zócalos), carpintería (puertas, ventanas, marcos, herrajes), instalaciones (eléctrica, sanitaria, calefacción), mobiliario fijo (placares, alacenas, mesadas), estado general de pintura, humedad, grietas, iluminación, revestimientos, cortinas/persianas, y cualquier detalle relevante para el contrato.

Devolvé UN SOLO JSON con todos los campos (los de la Parte 1 completados + los nuevos de la Parte 2):
{"campos": [{"campo": "...", "valor": "..."}, ...]}`,
    });

    // Llamar a la API de Anthropic
    const anthropicRes = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 60000,
      }
    );

    // Parsear la respuesta
    const rawText = anthropicRes.data.content?.[0]?.text || '';
    let campos;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      campos = JSON.parse(cleaned).campos;
      if (!Array.isArray(campos)) throw new Error('formato inválido');
    } catch (e) {
      console.error('Error parseando respuesta IA:', rawText);
      return res.status(500).json({ message: 'La IA devolvió una respuesta inesperada', raw: rawText });
    }

    res.json({ campos });

  } catch (err) {
    if (err.response?.data) {
      console.error('Error Anthropic API:', JSON.stringify(err.response.data));
    }
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventarios/:id/firmas — guardar firma de arrendador o arrendatario
router.post('/:id/firmas', async (req, res) => {
  try {
    const { tipo, firma } = req.body; // tipo: 'arrendador' | 'arrendatario'
    if (!['arrendador', 'arrendatario'].includes(tipo)) {
      return res.status(400).json({ message: 'tipo debe ser arrendador o arrendatario' });
    }
    if (!firma) return res.status(400).json({ message: 'firma requerida' });

    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;

    const update = {
      [`firmas.${tipo}`]: { firma, fechaFirma: new Date() },
    };
    const inv = await Inventario.findOneAndUpdate(filter, update, { new: true });
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inventarios/:id/firmas/:tipo — borrar una firma
router.delete('/:id/firmas/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;
    if (!['arrendador', 'arrendatario'].includes(tipo)) {
      return res.status(400).json({ message: 'tipo debe ser arrendador o arrendatario' });
    }
    const filter = { _id: req.params.id };
    if (req.user.rol !== 'admin') filter.creadoPor = req.user._id;

    const update = { [`firmas.${tipo}`]: null };
    const inv = await Inventario.findOneAndUpdate(filter, update, { new: true });
    if (!inv) return res.status(404).json({ message: 'Inventario no encontrado' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
