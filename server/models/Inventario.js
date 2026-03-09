const mongoose = require('mongoose');

const tuplaAmbienteSchema = new mongoose.Schema({
  campo: { type: String, required: true },
  valor: { type: String, default: '' },
}, { _id: true });

const archivoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  url: { type: String, required: true },
  tipo: { type: String }, // 'image' | 'file'
  mimetype: { type: String },
  size: { type: Number },
}, { _id: true });

const ambienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tuplas: [tuplaAmbienteSchema],
  archivos: [archivoSchema],
  templateOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  orden: { type: Number, default: 0 },
}, { _id: true });

const firmaSchema = new mongoose.Schema({
  firma: { type: String }, // base64 data URL
  fechaFirma: { type: Date },
}, { _id: false });

const inventarioSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  direccion: { type: String, required: true, trim: true },
  padron: { type: Number, required: true },
  localidad: { type: String, required: true, trim: true },
  arrendador: { type: String, required: true, trim: true },
  arrendatario: { type: String, required: true, trim: true },
  codigo: { type: String, required: true, trim: true },
  llaves: { type: Number, required: true },
  observaciones: { type: String, default: '' },
  ambientes: [ambienteSchema],
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estado: { type: String, enum: ['borrador', 'completado'], default: 'borrador' },
  firmas: {
    arrendador: { type: firmaSchema, default: null },
    arrendatario: { type: firmaSchema, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Inventario', inventarioSchema);
