const mongoose = require('mongoose');

// Registro de pagos acreditados — evita doble acreditación de tokens
const paymentRecordSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true },
  userId:    { type: String, required: true },
  tokens:    { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
