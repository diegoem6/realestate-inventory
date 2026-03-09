const mongoose = require('mongoose');

const tuplaSchema = new mongoose.Schema({
  campo: { type: String, required: true },
  valorDefault: { type: String, default: '' },
}, { _id: true });

const templateSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  tuplas: [tuplaSchema],
  esDefault: { type: Boolean, default: false }, // si se agrega por defecto en nuevos inventarios
  orden: { type: Number, default: 0 },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = sistema/admin
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);
