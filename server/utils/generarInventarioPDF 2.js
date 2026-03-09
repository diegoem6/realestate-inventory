/**
 * generarInventarioPDF.js
 *
 * Arquitectura de layout:
 * - Todas las medidas son constantes fijas conocidas en tiempo de compilación.
 * - Antes de dibujar cualquier elemento se calcula su alto exacto.
 * - "advance(h)" es la única función que avanza cy y puede forzar nueva página.
 * - Las fotos tienen tamaño fijo FW x FH: nunca se redimensionan.
 * - Una "fila de fotos" tiene alto fijo FOTO_ROW_H = FH + CAP_H + ROW_GAP.
 */

const PDFDocument = require('pdfkit');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ── Constantes de página ──────────────────────────────────────────────────────
const PW        = 595;   // A4 ancho
const PH        = 842;   // A4 alto
const ML        = 40;    // margen izq/der
const CW        = 515;   // PW - 2*ML
const HEADER_H  = 88;    // alto del membrete
const FOOT_PAD  = 50;    // espacio reservado al pie (margen + pie)
const TOP_Y     = HEADER_H + 18;   // primer Y disponible para contenido
const BOT_Y     = PH - FOOT_PAD;   // último Y disponible

// ── Constantes de layout (FIJAS, sin cálculos dinámicos) ─────────────────────
const SEC_H     = 28;    // alto bloque título de sección
const ROW_H     = 26;    // alto fila tabla datos generales
const TROW_H    = 23;    // alto fila tabla tuplas
const AMB_HDR_H = 30;    // alto encabezado de ambiente
const FOTO_COLS = 3;     // fotos por fila
const FW        = 155;   // ancho foto (fijo)
const FH        = 116;   // alto foto (fijo)
const FGAP      = 10;    // gap entre fotos
const CAP_H     = 14;    // alto caption debajo de foto
const FOTO_TITLE_H = 18; // alto del label "FOTOGRAFÍAS"
const FOTO_ROW_H   = FH + CAP_H + FGAP;   // 140 — alto fijo de una fila de fotos

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

// ── Utilidades ────────────────────────────────────────────────────────────────
function safe(v) {
  if (v === null || v === undefined) return '-';
  const s = String(v).trim();
  return s || '-';
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
      const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: true,
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

      // ── Estado global ────────────────────────────────────────────────
      let cy      = TOP_Y;
      let pageNum = 1;
      const logoBuf = (usuario?.logo) ? await loadImage(usuario.logo) : null;

      // ── Header ───────────────────────────────────────────────────────
      function drawHeader() {
        doc.rect(0, 0, PW, HEADER_H).fill(C.primary);
        doc.rect(0, HEADER_H - 5, PW, 5).fill(C.accent);
        const LS = 60, LX = ML, LY = Math.round((HEADER_H - LS) / 2);
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

      // ── Nueva página (siempre explícita) ─────────────────────────────
      function newPage() {
        doc.addPage();
        pageNum++;
        drawHeader();
        cy = TOP_Y;
      }

      // ── Avanzar cy; si el bloque no cabe, nueva página primero ───────
      // h = alto exacto del bloque que se va a dibujar a continuación.
      // Devuelve el Y donde se debe dibujar (= cy tras posible salto).
      function advance(h) {
        if (cy + h >= BOT_Y) {
          newPage();
        }
        const y = cy;
        cy += h;
        return y;
      }

      // Primera página
      drawHeader();

      // ── Primitivas de dibujo ──────────────────────────────────────────

      function drawSectionTitle(label) {
        const y = advance(SEC_H);
        doc.rect(ML, y, CW, 22).fill(C.primary);
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
           .text(label, ML+10, y+6, { width: CW-20, lineBreak: false });
      }

      // Dibuja UNA fila de tabla (2 columnas). Llama advance(ROW_H).
      function drawTableRow(kL, vL, kR, vR, rowH, even, showTopBorder) {
        const y = advance(rowH);
        doc.rect(ML, y, CW, rowH).fill(even ? C.white : C.bg);
        if (showTopBorder) doc.moveTo(ML, y).lineTo(ML+CW, y).stroke(C.border);
        const COL = CW/2;
        const KW  = Math.round(COL*0.40), VW = Math.round(COL*0.54);
        doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
           .text(String(kL||'').toUpperCase(), ML+8, y+6, { width: KW, lineBreak: false });
        doc.fillColor(C.text).font('Helvetica-Bold').fontSize(9)
           .text(safe(vL), ML+8+KW, y+5, { width: VW, lineBreak: false, ellipsis: true });
        doc.moveTo(ML+COL, y+4).lineTo(ML+COL, y+rowH-4).stroke(C.border);
        if (kR !== undefined) {
          doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
             .text(String(kR||'').toUpperCase(), ML+COL+8, y+6, { width: KW, lineBreak: false });
          doc.fillColor(C.text).font('Helvetica-Bold').fontSize(9)
             .text(safe(vR), ML+COL+8+KW, y+5, { width: VW, lineBreak: false, ellipsis: true });
        }
        return y; // Y donde se dibujó
      }

      // Dibuja una tabla de pares con borde exterior segmentado por página
      function drawPairTable(pairs, rowH) {
        let segStartY = cy, segPage = pageNum, segCount = 0;
        for (let i = 0; i < pairs.length; i += 2) {
          const [kL, vL] = pairs[i];
          const [kR, vR] = pairs[i+1] || [undefined, undefined];
          const even = Math.floor(i/2) % 2 === 0;
          const rowY = drawTableRow(kL, vL, kR, vR, rowH, even, segCount > 0);
          if (pageNum !== segPage) {
            // Cerrar borde del segmento anterior (estaba en otra página)
            doc.rect(ML, segStartY, CW, segCount * rowH).stroke(C.border);
            segStartY = rowY; segPage = pageNum; segCount = 0;
          }
          segCount++;
        }
        if (segCount > 0) doc.rect(ML, segStartY, CW, segCount * rowH).stroke(C.border);
        cy += 10;
      }

      // Dibuja UNA fila de fotos (array de hasta FOTO_COLS imágenes)
      // Todas las fotos tienen tamaño exacto FW x FH — sin variaciones.
      async function drawFotoRow(fotosEnFila) {
        // advance con el alto fijo exacto de la fila
        const y = advance(FOTO_ROW_H);
        for (let col = 0; col < fotosEnFila.length; col++) {
          const foto = fotosEnFila[col];
          const FX   = ML + col * (FW + FGAP);
          const FY   = y;
          const buf  = await loadImage(foto.url);
          if (buf) {
            try {
              doc.rect(FX+2, FY+2, FW, FH).fill(C.shadow);
              doc.rect(FX,   FY,   FW, FH).fill(C.white);
              doc.rect(FX,   FY,   FW, FH).stroke(C.border);
              doc.image(buf, FX+2, FY+2, { width: FW-4, height: FH-4, cover: [FW-4, FH-4] });
            } catch {
              doc.rect(FX, FY, FW, FH).fill(C.bg);
              doc.rect(FX, FY, FW, FH).stroke(C.border);
              doc.fillColor(C.muted).fontSize(7)
                 .text('Imagen no disponible', FX, FY+FH/2-4, { width: FW, align: 'center', lineBreak: false });
            }
          } else {
            doc.rect(FX, FY, FW, FH).fill(C.bg);
            doc.rect(FX, FY, FW, FH).stroke(C.border);
            doc.fillColor(C.muted).font('Helvetica').fontSize(7)
               .text('Sin imagen', FX, FY+FH/2-4, { width: FW, align: 'center', lineBreak: false });
          }
          // Caption con altura fija CAP_H
          doc.fillColor(C.muted).font('Helvetica').fontSize(7)
             .text(safe(foto.nombre).slice(0, 38), FX, FY+FH+3, { width: FW, align: 'center', lineBreak: false });
        }
        // NOTA: cy ya avanzó FOTO_ROW_H dentro de advance(). No tocar cy aquí.
      }

      // ══════════════════════════════════════════════════════════════════
      // CONTENIDO
      // ══════════════════════════════════════════════════════════════════

      // Título del documento
      advance(22);
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(17)
         .text('INVENTARIO DE PROPIEDAD', ML, cy-22);
      advance(14);
      doc.fillColor(C.muted).font('Helvetica').fontSize(9.5)
         .text(
           `Código: ${safe(inventario.codigo)}   ·   Fecha: ${formatFecha(inventario.fecha)}   ·   Estado: ${safe(inventario.estado).toUpperCase()}`,
           ML, cy-14, { width: CW, lineBreak: false }
         );
      advance(18);
      doc.moveTo(ML, cy-18).lineTo(ML+CW, cy-18).stroke(C.border);

      // Datos generales
      drawSectionTitle('DATOS GENERALES');
      drawPairTable([
        ['Dirección',    inventario.direccion],    ['Localidad',    inventario.localidad],
        ['Padrón',       inventario.padron],        ['Código',       inventario.codigo],
        ['Arrendador',   inventario.arrendador],    ['Arrendatario', inventario.arrendatario],
        ['Fecha',        formatFecha(inventario.fecha)], ['Llaves', inventario.llaves],
      ], ROW_H);

      // Observaciones
      if (inventario.observaciones?.trim()) {
        drawSectionTitle('OBSERVACIONES');
        if (cy + 30 > BOT_Y) newPage();
        doc.fillColor(C.text).font('Helvetica').fontSize(9.5)
           .text(inventario.observaciones.trim(), ML+10, cy+4, { width: CW-20, lineGap: 3 });
        cy = doc.y + 14;
      }

      // ── Ambientes ─────────────────────────────────────────────────────
      const ambientes = Array.isArray(inventario.ambientes) ? inventario.ambientes : [];

      for (let ai = 0; ai < ambientes.length; ai++) {
        const amb    = ambientes[ai];
        const tuplas = Array.isArray(amb.tuplas)   ? amb.tuplas   : [];
        const fotos  = Array.isArray(amb.archivos) ? amb.archivos.filter(a => a?.tipo === 'image') : [];
        const otros  = Array.isArray(amb.archivos) ? amb.archivos.filter(a => a?.tipo !== 'image') : [];

        // Calcular alto mínimo de este bloque para decidir si cabe en la página actual.
        // "Mínimo" = encabezado + al menos 1 fila de datos (o placeholder)
        const minBlockH = AMB_HDR_H + TROW_H;
        if (cy + minBlockH > BOT_Y) newPage();

        // ── Encabezado del ambiente ────────────────────────────────────
        const hY = cy;
        cy += AMB_HDR_H;
        doc.rect(ML, hY, CW, AMB_HDR_H-4).fill(C.primaryMid);
        doc.circle(ML+14, hY+(AMB_HDR_H-4)/2, 9).fill(C.accent);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
           .text(String(ai+1), ML+5, hY+(AMB_HDR_H-4)/2-5, { width: 18, align: 'center', lineBreak: false });
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
           .text(String(amb.nombre||'AMBIENTE').toUpperCase(), ML+28, hY+7, { width: CW-36, lineBreak: false });

        // ── Tuplas ─────────────────────────────────────────────────────
        if (tuplas.length > 0) {
          drawPairTable(
            tuplas.map(t => [t.campo, t.valor]),
            TROW_H
          );
        } else {
          if (cy + 20 > BOT_Y) newPage();
          doc.fillColor(C.muted).font('Helvetica-Oblique').fontSize(9)
             .text('Sin campos registrados', ML+8, cy, { width: CW-16, lineBreak: false });
          cy += 20;
        }

        // ── Fotos: fila a fila con advance(FOTO_ROW_H) ────────────────
        if (fotos.length > 0) {
          // Label "FOTOGRAFÍAS" con alto fijo
          if (cy + FOTO_TITLE_H > BOT_Y) newPage();
          doc.fillColor(C.primaryMid).font('Helvetica-Bold').fontSize(8)
             .text('FOTOGRAFÍAS', ML, cy, { lineBreak: false });
          cy += FOTO_TITLE_H;

          // Dibujar fila por fila
          for (let fi = 0; fi < fotos.length; fi += FOTO_COLS) {
            const fila = fotos.slice(fi, fi + FOTO_COLS);
            await drawFotoRow(fila);
            // cy fue avanzado FOTO_ROW_H exactos dentro de drawFotoRow/advance
          }
        }

        // ── Archivos no-imagen ─────────────────────────────────────────
        if (otros.length > 0) {
          if (cy + 30 > BOT_Y) newPage();
          doc.fillColor(C.primaryMid).font('Helvetica-Bold').fontSize(8)
             .text('ARCHIVOS ADJUNTOS', ML, cy, { lineBreak: false });
          cy += 14;
          for (const arch of otros) {
            if (cy + 16 > BOT_Y) newPage();
            doc.fillColor(C.text).font('Helvetica').fontSize(9)
               .text(`- ${safe(arch.nombre)}`, ML+8, cy, { width: CW-16, lineBreak: false });
            cy += 14;
          }
        }

        cy += 16; // separación entre ambientes
      }

      // ── Pie de página final ───────────────────────────────────────────
      if (cy + 36 > BOT_Y) newPage();
      doc.moveTo(ML, cy+8).lineTo(ML+CW, cy+8).stroke(C.border);
      cy += 18;
      doc.fillColor(C.muted).font('Helvetica').fontSize(8)
         .text(
           `Documento generado el ${formatFecha(new Date())}  ·  ${safe(usuario.nombre)} ${safe(usuario.apellido)}`,
           ML, cy, { width: CW, align: 'center', lineBreak: false }
         );

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generarInventarioPDF };
