/**
 * generarInventarioPDF.js
 *
 * Diseño de layout:
 * - advance(h) es el único punto que mueve cy y puede crear nueva página.
 * - Las filas de tabla tienen alto DINÁMICO: se mide el texto antes de dibujar
 *   con doc.heightOfString(), garantizando que nunca desborden.
 * - Las fotos tienen tamaño fijo FW x FH.
 * - Todo el contenido queda entre TOP_Y y BOT_Y, con margen de seguridad PAD.
 */

const PDFDocument = require('pdfkit');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ── Página A4 ─────────────────────────────────────────────────────────────────
const PW       = 595;
const PH       = 842;
const ML       = 40;
const CW       = 515;          // PW - 2*ML
const HEADER_H = 88;
const TOP_Y    = HEADER_H + 18;
const BOT_Y    = PH - 55;      // último Y utilizable (margen inferior 55px)
const PAD      = 6;            // padding de seguridad en advance()

// ── Layout ────────────────────────────────────────────────────────────────────
const SEC_H       = 28;
const AMB_HDR_H   = 26;
const ROW_PAD_V   = 8;         // padding vertical interior de cada fila de tabla
const FONT_KEY    = 7.5;       // tamaño fuente label
const FONT_VAL    = 9;         // tamaño fuente valor
const COL         = CW / 2;    // ancho de cada columna
const KW          = Math.round(COL * 0.38);  // ancho del label dentro de la columna
const VW          = Math.round(COL * 0.56);  // ancho del valor dentro de la columna
const MIN_ROW_H   = 22;        // alto mínimo de fila aunque el texto sea corto

const FW          = 155;
const FH          = 116;
const FGAP        = 10;
const CAP_H       = 13;
const FOTO_COLS   = 3;
const FOTO_ROW_H  = FH + CAP_H + FGAP + 4; // 143 — fijo

// ── Colores ───────────────────────────────────────────────────────────────────
const C = {
  primary:    '#1a3a2a',
  primaryMid: '#2d5a42',
  accent:     '#c8a96e',
  bg:         '#f7f9f7',
  border:     '#dde8e2',
  text:       '#1a1f1c',
  muted:      '#9aaba2',
  white:      '#ffffff',
  shadow:     '#d0d0d0',
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function safe(v) {
  if (v === null || v === undefined) return '-';
  const s = String(v).trim(); return s || '-';
}
function formatFecha(f) {
  if (!f) return '-';
  try { return new Date(f).toLocaleDateString('es-UY', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return '-'; }
}
async function loadImage(urlOrPath) {
  if (!urlOrPath) return null;
  try {
    if (!urlOrPath.startsWith('http')) {
      const lp = urlOrPath.startsWith('/')
        ? path.join(__dirname, '..', urlOrPath)
        : path.resolve(urlOrPath);
      if (fs.existsSync(lp)) return fs.readFileSync(lp);
      return null;
    }
    return await new Promise(resolve => {
      const mod = urlOrPath.startsWith('https') ? https : http;
      const req = mod.get(urlOrPath, res => {
        const buf = [];
        res.on('data', c => buf.push(c));
        res.on('end',  () => resolve(Buffer.concat(buf)));
        res.on('error',() => resolve(null));
      });
      req.on('error',   () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
  } catch { return null; }
}

// ═════════════════════════════════════════════════════════════════════════════
async function generarInventarioPDF(inventario, usuario) {
  return new Promise(async (resolve, reject) => {
    try {

      // Aplicar color del usuario (con fallback al color por defecto)
      C.primary    = usuario?.pdfColor || '#1a3a2a';
      C.primaryMid = usuario?.pdfColor || '#2d5a42';

      const doc = new PDFDocument({
        size: 'A4', autoFirstPage: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title:   `Inventario - ${safe(inventario.direccion)}`,
          Author:  `${safe(usuario.nombre)} ${safe(usuario.apellido)}`,
          Subject: 'Inventario de Propiedad',
        },
      });

      const chunks = [];
      doc.on('data',  c => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', e  => reject(e));

      let cy = TOP_Y, pageNum = 1;
      const logoBuf = usuario?.logo ? await loadImage(usuario.logo) : null;

      // ── Header ─────────────────────────────────────────────────────────
      function drawHeader() {
        doc.rect(0, 0, PW, HEADER_H).fill(C.primary);
        doc.rect(0, HEADER_H-5, PW, 5).fill(C.accent);
        const LS = 60, LX = ML, LY = Math.round((HEADER_H-LS)/2);
        if (logoBuf) {
          try {
            doc.save();
            doc.circle(LX+LS/2, LY+LS/2, LS/2).clip();
            doc.image(logoBuf, LX, LY, { width: LS, height: LS });
            doc.restore();
          } catch { doc.circle(LX+LS/2, LY+LS/2, LS/2).fill(C.primaryMid); }
        } else {
          doc.circle(LX+LS/2, LY+LS/2, LS/2).fill(C.primaryMid);
          const ini = ((usuario.nombre||'').charAt(0)+(usuario.apellido||'').charAt(0)).toUpperCase();
          doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(20)
             .text(ini, LX, LY+LS/2-12, { width: LS, align: 'center', lineBreak: false });
        }
        const TX = LX+LS+14, TW = CW-LS-14-80;
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14)
           .text(`${safe(usuario.nombre)} ${safe(usuario.apellido)}`, TX, 16, { width: TW, lineBreak: false });
        let iy = 35;
        doc.font('Helvetica').fontSize(8.5).fillColor('#ffffff99');
        if (usuario.email)   { doc.text(usuario.email,   TX, iy, { width: TW, lineBreak: false }); iy += 13; }
        if (usuario.celular) { doc.text(usuario.celular, TX, iy, { width: TW, lineBreak: false }); }
        doc.fillColor('#ffffff66').font('Helvetica').fontSize(8)
           .text(`Página ${pageNum}`, PW-ML-55, HEADER_H-17, { width: 55, align: 'right', lineBreak: false });
      }

      // ── Control de página ───────────────────────────────────────────────
      function newPage() {
        doc.addPage(); pageNum++; drawHeader(); cy = TOP_Y;
      }

      // advance(h): reserva h px. Si no caben (con margen PAD), nueva página.
      // Retorna el Y donde debe dibujarse el bloque.
      function advance(h) {
        if (cy + h + PAD > BOT_Y) newPage();
        const y = cy; cy += h; return y;
      }

      drawHeader();

      // ── Medir el alto real de una fila de 2 columnas ───────────────────
      // Calcula el alto necesario para que kL/vL y kR/vR quepan sin cortar.
      function measureRowH(kL, vL, kR, vR) {
        doc.font('Helvetica-Bold').fontSize(FONT_VAL);
        const hL = doc.heightOfString(safe(vL), { width: VW });
        const hR = kR !== undefined
          ? doc.heightOfString(safe(vR), { width: VW })
          : 0;
        const textH = Math.max(hL, hR);
        return Math.max(MIN_ROW_H, textH + ROW_PAD_V * 2);
      }

      // ── Dibujar una fila ya medida ──────────────────────────────────────
      function drawRow(kL, vL, kR, vR, rowH, even, topBorder) {
        const y = advance(rowH);
        doc.rect(ML, y, CW, rowH).fill(even ? C.white : C.bg);
        if (topBorder) doc.moveTo(ML, y).lineTo(ML+CW, y).stroke(C.border);

        // Columna izquierda
        doc.fillColor(C.muted).font('Helvetica').fontSize(FONT_KEY)
           .text(String(kL||'').toUpperCase(), ML+8, y+ROW_PAD_V, { width: KW, lineBreak: false });
        doc.fillColor(C.text).font('Helvetica-Bold').fontSize(FONT_VAL)
           .text(safe(vL), ML+8+KW, y+ROW_PAD_V-1, { width: VW, lineBreak: true });

        doc.moveTo(ML+COL, y+4).lineTo(ML+COL, y+rowH-4).stroke(C.border);

        // Columna derecha
        if (kR !== undefined) {
          doc.fillColor(C.muted).font('Helvetica').fontSize(FONT_KEY)
             .text(String(kR||'').toUpperCase(), ML+COL+8, y+ROW_PAD_V, { width: KW, lineBreak: false });
          doc.fillColor(C.text).font('Helvetica-Bold').fontSize(FONT_VAL)
             .text(safe(vR), ML+COL+8+KW, y+ROW_PAD_V-1, { width: VW, lineBreak: true });
        }
        return y;
      }

      // ── Tabla de pares con borde exterior por segmento de página ────────
      // Soporta filas de alto variable.
      function drawPairTable(pairs) {
        let segStartY  = cy;
        let segPage    = pageNum;
        let segH       = 0;   // altura acumulada del segmento actual

        for (let i = 0; i < pairs.length; i += 2) {
          const [kL, vL] = pairs[i];
          const [kR, vR] = pairs[i+1] || [undefined, undefined];
          const even     = Math.floor(i/2) % 2 === 0;

          // Medir ANTES de advance (que puede cambiar de página)
          const rowH = measureRowH(kL, vL, kR, vR);

          const prevPage = pageNum;
          const rowY     = drawRow(kL, vL, kR, vR, rowH, even, segH > 0);

          if (pageNum !== prevPage) {
            // Hubo salto: cerrar borde del segmento anterior
            if (segH > 0) doc.rect(ML, segStartY, CW, segH).stroke(C.border);
            segStartY = rowY; segPage = pageNum; segH = 0;
          }
          segH += rowH;
        }
        if (segH > 0) doc.rect(ML, segStartY, CW, segH).stroke(C.border);
        cy += 10;
      }

      // ── Dibujar una fila de fotos (alto fijo FOTO_ROW_H) ───────────────
      async function drawFotoRow(fila) {
        const y = advance(FOTO_ROW_H);
        for (let col = 0; col < fila.length; col++) {
          const foto = fila[col];
          const FX = ML + col * (FW + FGAP);
          const buf = await loadImage(foto.url);
          if (buf) {
            try {
              doc.rect(FX+2, y+2, FW, FH).fill(C.shadow);
              doc.rect(FX,   y,   FW, FH).fill(C.white);
              // Clip estricto al rectángulo: evita que imágenes con proporción
              // vertical desborden y se superpongan con el siguiente elemento.
              doc.save();
              doc.rect(FX, y, FW, FH).clip();
              doc.image(buf, FX+2, y+2, { width: FW-4, height: FH-4, cover: [FW-4, FH-4] });
              doc.restore();
              doc.rect(FX, y, FW, FH).stroke(C.border);
            } catch {
              doc.rect(FX, y, FW, FH).fill(C.bg).stroke(C.border);
              doc.fillColor(C.muted).fontSize(7)
                 .text('Imagen no disponible', FX, y+FH/2-4, { width: FW, align: 'center', lineBreak: false });
            }
          } else {
            doc.rect(FX, y, FW, FH).fill(C.bg).stroke(C.border);
            doc.fillColor(C.muted).font('Helvetica').fontSize(7)
               .text('Sin imagen', FX, y+FH/2-4, { width: FW, align: 'center', lineBreak: false });
          }
          doc.fillColor(C.muted).font('Helvetica').fontSize(7)
             .text(safe(foto.nombre).slice(0, 38), FX, y+FH+3, { width: FW, align: 'center', lineBreak: false });
        }
      }

      // ── Sección ─────────────────────────────────────────────────────────
      function drawSectionTitle(label) {
        const y = advance(SEC_H);
        doc.rect(ML, y, CW, 22).fill(C.primary);
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
           .text(label, ML+10, y+6, { width: CW-20, lineBreak: false });
      }

      // ══════════════════════════════════════════════════════════════════════
      // CONTENIDO
      // ══════════════════════════════════════════════════════════════════════

      // Título
      {
        const y = advance(36);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(17)
           .text('INVENTARIO DE PROPIEDAD', ML, y);
        doc.fillColor(C.muted).font('Helvetica').fontSize(9.5)
           .text(
             `Código: ${safe(inventario.codigo)}   ·   Fecha: ${formatFecha(inventario.fecha)}   ·   Estado: ${safe(inventario.estado).toUpperCase()}`,
             ML, y+22, { width: CW, lineBreak: false }
           );
      }
      {
        const y = advance(14);
        doc.moveTo(ML, y+8).lineTo(ML+CW, y+8).stroke(C.border);
      }

      // Datos generales
      drawSectionTitle('DATOS GENERALES');
      drawPairTable([
        ['Dirección',    inventario.direccion],   ['Localidad',    inventario.localidad],
        ['Padrón',       inventario.padron],       ['Código',       inventario.codigo],
        ['Arrendador',   inventario.arrendador],   ['Arrendatario', inventario.arrendatario],
        ['Fecha',        formatFecha(inventario.fecha)], ['Llaves', inventario.llaves],
      ]);

      // Observaciones
      if (inventario.observaciones?.trim()) {
        drawSectionTitle('OBSERVACIONES');
        const obs = inventario.observaciones.trim();
        doc.font('Helvetica').fontSize(9.5);
        const obsH = doc.heightOfString(obs, { width: CW-20 }) + 20;
        const y = advance(obsH);
        doc.fillColor(C.text).text(obs, ML+10, y+8, { width: CW-20, lineGap: 2 });
      }

      // ── Ambientes ──────────────────────────────────────────────────────────
      const ambientes = Array.isArray(inventario.ambientes) ? inventario.ambientes : [];

      for (let ai = 0; ai < ambientes.length; ai++) {
        const amb   = ambientes[ai];
        const tuplas = Array.isArray(amb.tuplas)   ? amb.tuplas   : [];
        const fotos  = Array.isArray(amb.archivos) ? amb.archivos.filter(a => a?.tipo === 'image') : [];
        const otros  = Array.isArray(amb.archivos) ? amb.archivos.filter(a => a?.tipo !== 'image') : [];

        // Encabezado ambiente — forzar que quede junto con al menos 1 fila
        if (cy + AMB_HDR_H + MIN_ROW_H + PAD > BOT_Y) newPage();

        const hY = cy; cy += AMB_HDR_H;
        doc.rect(ML, hY, CW, AMB_HDR_H).fill(C.primaryMid);
        doc.circle(ML+14, hY+AMB_HDR_H/2, 9).fill(C.accent);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
           .text(String(ai+1), ML+5, hY+AMB_HDR_H/2-5, { width: 18, align: 'center', lineBreak: false });
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
           .text(String(amb.nombre||'AMBIENTE').toUpperCase(), ML+28, hY+7, { width: CW-36, lineBreak: false });

        // Tuplas
        if (tuplas.length > 0) {
          drawPairTable(tuplas.map(t => [t.campo, t.valor]));
        } else {
          const y = advance(20);
          doc.fillColor(C.muted).font('Helvetica-Oblique').fontSize(9)
             .text('Sin campos registrados', ML+8, y, { width: CW-16, lineBreak: false });
        }

        // Fotos
        if (fotos.length > 0) {
          // Label "FOTOGRAFÍAS": garantizar que entre junto con al menos una fila de fotos
          if (cy + 18 + FOTO_ROW_H + PAD > BOT_Y) newPage();
          doc.fillColor(C.primaryMid).font('Helvetica-Bold').fontSize(8)
             .text('FOTOGRAFÍAS', ML, cy, { lineBreak: false });
          cy += 18;

          for (let fi = 0; fi < fotos.length; fi += FOTO_COLS) {
            await drawFotoRow(fotos.slice(fi, fi + FOTO_COLS));
          }
          cy += 4;
        }

        // Archivos no-imagen
        if (otros.length > 0) {
          const y = advance(14);
          doc.fillColor(C.primaryMid).font('Helvetica-Bold').fontSize(8)
             .text('ARCHIVOS ADJUNTOS', ML, y, { lineBreak: false });
          for (const arch of otros) {
            const ay = advance(14);
            doc.fillColor(C.text).font('Helvetica').fontSize(9)
               .text(`- ${safe(arch.nombre)}`, ML+8, ay, { width: CW-16, lineBreak: false });
          }
        }

        cy += 14; // separación entre ambientes
      }

      // ── Firmas ─────────────────────────────────────────────────────────────
      const firmas = inventario.firmas || {};
      const tieneArrendador  = firmas.arrendador?.firma;
      const tieneArrendatario = firmas.arrendatario?.firma;

      if (tieneArrendador || tieneArrendatario) {
        const FIRMA_H = 110; // alto total del bloque de firmas
        if (cy + FIRMA_H + PAD > BOT_Y) newPage();

        drawSectionTitle('FIRMAS');

        const firmaY = advance(FIRMA_H);
        const COL_W  = CW / 2;
        const firmasData = [
          { label: 'ARRENDADOR', nombre: inventario.arrendador, data: firmas.arrendador },
          { label: 'ARRENDATARIO', nombre: inventario.arrendatario, data: firmas.arrendatario },
        ];

        for (let fi = 0; fi < firmasData.length; fi++) {
          const { label, nombre, data } = firmasData[fi];
          const FX = ML + fi * COL_W;
          const imgW = COL_W - 20;
          const imgH = 60;
          const imgX = FX + 10;
          const imgY = firmaY + 6;

          // Recuadro de firma
          doc.rect(imgX, imgY, imgW, imgH).fill('#f9fafb').stroke(C.border);

          if (data?.firma) {
            try {
              // Extraer base64 (quitar "data:image/png;base64,")
              const b64 = data.firma.replace(/^data:image\/\w+;base64,/, '');
              const buf = Buffer.from(b64, 'base64');
              doc.save();
              doc.rect(imgX+2, imgY+2, imgW-4, imgH-4).clip();
              doc.image(buf, imgX+2, imgY+2, { width: imgW-4, height: imgH-4, fit: [imgW-4, imgH-4], align: 'center', valign: 'center' });
              doc.restore();
            } catch { /* imagen no disponible */ }
          }

          // Línea de firma
          const lineY = firmaY + 6 + imgH + 10;
          doc.moveTo(imgX + 10, lineY).lineTo(imgX + imgW - 10, lineY).stroke(C.border);

          // Nombre
          doc.fillColor(C.text).font('Helvetica-Bold').fontSize(8)
             .text(safe(nombre), imgX, lineY + 4, { width: imgW, align: 'center', lineBreak: false });

          // Label + fecha
          const fechaStr = data?.fechaFirma ? formatFecha(data.fechaFirma) : '';
          doc.fillColor(C.muted).font('Helvetica').fontSize(7)
             .text(`${label}${fechaStr ? '  ·  ' + fechaStr : ''}`, imgX, lineY + 14, { width: imgW, align: 'center', lineBreak: false });

          // Separador vertical entre columnas
          if (fi === 0) {
            doc.moveTo(ML + COL_W, firmaY + 4).lineTo(ML + COL_W, firmaY + FIRMA_H - 4).stroke(C.border);
          }
        }
        cy += 10;
      }

      // Pie
      if (cy + 36 + PAD > BOT_Y) newPage();
      doc.moveTo(ML, cy+8).lineTo(ML+CW, cy+8).stroke(C.border);
      doc.fillColor(C.muted).font('Helvetica').fontSize(8)
         .text(
           `Documento generado el ${formatFecha(new Date())}  ·  ${safe(usuario.nombre)} ${safe(usuario.apellido)}`,
           ML, cy+18, { width: CW, align: 'center', lineBreak: false }
         );

      doc.end();

    } catch (err) { reject(err); }
  });
}

module.exports = { generarInventarioPDF };
