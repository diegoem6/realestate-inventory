const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const PaymentRecord = require('../models/PaymentRecord');
const { protect, adminOnly } = require('../middleware/auth');

const DLOCAL_BASE = process.env.DLOCAL_ENV === 'production'
  ? 'https://api.dlocalgo.com'
  : 'https://api-sbx.dlocalgo.com';

const PAQUETES = [
  { id: 'token_1',  tokens: 1,  precio: parseInt(process.env.TOKEN_1_PRECIO  || '200'),  label: '1 Token',   descripcion: 'Crea 1 inventario' },
  { id: 'token_5',  tokens: 5,  precio: parseInt(process.env.TOKEN_5_PRECIO  || '800'),  label: '5 Tokens',  descripcion: 'Crea 5 inventarios · Ahorrá 20%' },
  { id: 'token_10', tokens: 10, precio: parseInt(process.env.TOKEN_10_PRECIO || '1400'), label: '10 Tokens', descripcion: 'Crea 10 inventarios · Ahorrá 30%' },
  { id: 'token_20', tokens: 20, precio: parseInt(process.env.TOKEN_20_PRECIO || '2400'), label: '20 Tokens', descripcion: 'Crea 20 inventarios · Ahorrá 40%' },
];

// Genera los headers de autenticación dLocal Go
function dlocalHeaders() {
  return {
    'Authorization': `Bearer ${process.env.DLOCAL_X_LOGIN}:${process.env.DLOCAL_SECRET}`,
    'Content-Type':  'application/json',
  };
}

// Acredita tokens de forma idempotente (usa PaymentRecord para evitar duplicados)
async function acreditarTokens(paymentId, userId, tokens) {
  try {
    await PaymentRecord.create({ paymentId, userId, tokens });
  } catch (err) {
    if (err.code === 11000) return; // Ya fue acreditado
    throw err;
  }
  await User.findByIdAndUpdate(userId, { $inc: { tokens } });
  console.log(`✓ dLocal: +${tokens} tokens → usuario ${userId} (pago ${paymentId})`);
}

// GET /api/pagos/paquetes
router.get('/paquetes', (_req, res) => {
  res.json(PAQUETES);
});

// POST /api/pagos/crear-pago
router.post('/crear-pago', protect, async (req, res) => {
  try {
    const { paqueteId } = req.body;
    const paquete = PAQUETES.find(p => p.id === paqueteId);
    if (!paquete) return res.status(400).json({ message: 'Paquete no válido' });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const apiUrl    = process.env.API_URL    || '';
    const isPublic  = apiUrl && !apiUrl.includes('localhost');

    // order_id codifica userId + tokens para recuperarlos en el webhook
    const orderId = `USR${req.user._id}TKN${paquete.tokens}T${Date.now()}`;

    const body = {
      amount:      paquete.precio,
      currency:    'UYU',
      country:     'UY',
      order_id:    orderId,
      description: paquete.label,
      success_url: isPublic
        ? `${apiUrl}/api/pagos/redirect/exito`
        : `${clientUrl}/tokens/exito`,
      back_url: isPublic
        ? `${apiUrl}/api/pagos/redirect/cancelado`
        : `${clientUrl}/tokens?cancelado=1`,
      ...(isPublic && { notification_url: `${apiUrl}/api/pagos/webhook` }),
    };

    const login = process.env.DLOCAL_X_LOGIN || '';
    const secret = process.env.DLOCAL_SECRET || '';
    console.log('[dLocal] URL:', `${DLOCAL_BASE}/v1/payments`);
    console.log('[dLocal] X_LOGIN (primeros 8):', login.slice(0, 8));
    console.log('[dLocal] SECRET (primeros 8):', secret.slice(0, 8));
    console.log('[dLocal] Auth header:', `Bearer ${login.slice(0,4)}...${login.slice(-4)}:${secret.slice(0,4)}...${secret.slice(-4)}`);

    const { data } = await axios.post(`${DLOCAL_BASE}/v1/payments`, body, {
      headers: dlocalHeaders(),
    });

    res.json({ paymentId: data.id, redirectUrl: data.redirect_url, status: data.status });
  } catch (err) {
    console.error('Error dLocal crear-pago:', err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
});

// GET /api/pagos/verificar-pago/:paymentId
router.get('/verificar-pago/:paymentId', protect, async (req, res) => {
  try {
    const { data: payment } = await axios.get(
      `${DLOCAL_BASE}/v1/payments/${req.params.paymentId}`,
      { headers: dlocalHeaders() }
    );

    if (payment.status === 'PAID') {
      const match = payment.order_id?.match(/^USR(.+)TKN(\d+)T\d+$/);
      if (match) {
        await acreditarTokens(payment.id, match[1], parseInt(match[2], 10));
      }
    }

    const user = await User.findById(req.user._id);
    res.json({ tokens: user.tokens, status: payment.status });
  } catch (err) {
    console.error('Error dLocal verificar-pago:', err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
});

// POST /api/pagos/webhook — dLocal notifica pagos
router.post('/webhook', async (req, res) => {
  try {
    const { payment_id } = req.body;
    if (!payment_id) return res.status(200).json({ received: true });

    // Buscar detalles completos del pago
    const { data: payment } = await axios.get(
      `${DLOCAL_BASE}/v1/payments/${payment_id}`,
      { headers: dlocalHeaders() }
    );
    console.log('Webhook dLocal pago:', payment.id, payment.status, payment.order_id);

    if (payment.status === 'PAID') {
      const match = payment.order_id?.match(/^USR(.+)TKN(\d+)T\d+$/);
      if (match) {
        await acreditarTokens(payment.id, match[1], parseInt(match[2], 10));
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error webhook dLocal:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/pagos/admin/agregar-tokens — solo admin
router.post('/admin/agregar-tokens', protect, adminOnly, async (req, res) => {
  try {
    const { userId, tokens } = req.body;
    const cantidad = parseInt(tokens, 10);
    if (!userId || isNaN(cantidad) || cantidad < 1) {
      return res.status(400).json({ message: 'Datos inválidos' });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { tokens: cantidad } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    console.log(`✓ Admin: +${cantidad} tokens → ${user.email} (total: ${user.tokens})`);
    res.json({ tokens: user.tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Redirects del servidor → cliente (para cuando API_URL es pública pero CLIENT_URL es localhost)
router.get('/redirect/exito', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const query = new URLSearchParams(req.query).toString();
  res.redirect(`${clientUrl}/tokens/exito${query ? '?' + query : ''}`);
});
router.get('/redirect/cancelado', (_req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  res.redirect(`${clientUrl}/tokens?cancelado=1`);
});

module.exports = router;
