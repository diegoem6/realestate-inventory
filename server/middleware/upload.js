const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOADS_PATH || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|webp|heic|heif|pdf|doc|docx|xls|xlsx|txt/;
  const allowedMime = /^image\/|application\/(pdf|msword|vnd\.openxmlformats|vnd\.ms-excel)|text\/plain/;
  const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedMime.test(file.mimetype);
  if (ext || mime) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

module.exports = upload;
