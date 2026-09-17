const PDFDocument = require('pdfkit');
const { getAppUrl } = require('./appUrl');

const C = {
  black:    '#0F172A',
  blue:     '#1E40AF',
  blueHead: '#2563EB',
  muted:    '#64748B',
  border:   '#CBD5E1',
  bg:       '#F8FAFC',
  white:    '#FFFFFF',
  gold:     '#B89357',
  red:      '#DC2626',
  green:    '#16A34A',
  orange:   '#D97706',
};

const IMPACT_COLOR = {
  'High':     C.red,
  'Moderate': C.orange,
  'Low':      C.muted,
};

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

/**
 * Génère le PDF d'une attestation de modification DIPpro.
 * Fidèle au modèle : titre, deux colonnes, une entrée par modification.
 * @param {object} cert  — enregistrement dip_certificates complet
 * @param {object} franchiseur — { nom, adresse, telephone }
 * @returns {Promise<Buffer>}
 */
const generateCertificatePDF = (cert, franchiseur = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 52, bottom: 52, left: 56, right: 48 }, bufferPages: true });
  const chunks = [];
  doc.on('data',  c => chunks.push(c));
  doc.on('end',   () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const W   = doc.page.width;
  const ML  = 56;   // marge gauche
  const MR  = 48;   // marge droite
  const CW  = W - ML - MR;   // largeur contenu totale

  const COL_L = 152;          // largeur colonne gauche
  const COL_G = 12;           // gouttière
  const COL_R = CW - COL_L - COL_G; // largeur colonne droite

  const changes   = cert.changes_snapshot || [];
  const deliveries = cert.deliveries || [];

  // ─── TITRE ──────────────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(28).fillColor(C.black)
     .text('DIPpro - attestation de modification', ML, 52, { width: CW });

  // Numéro de série — une attestation isolée prouve un état à une date ;
  // une série numérotée sans trou prouve en plus qu'aucune modification n'a
  // été dissimulée, ce qui est bien plus difficile à contester.
  if (cert.certificate_number) {
    const numLabel = `ATTESTATION N° ${String(cert.certificate_number).padStart(4, '0')}`;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blueHead)
       .text(numLabel, ML, doc.y + 4, { width: CW });
  }

  // ligne de séparation fine sous le titre
  const titleBottom = doc.y + 6;
  doc.save().strokeColor(C.border).lineWidth(0.5)
     .moveTo(ML, titleBottom).lineTo(W - MR, titleBottom).stroke().restore();

  let y = titleBottom + 18;

  // ─── BLOC EN-TÊTE DEUX COLONNES ──────────────────────────────────────────────
  const headerY = y;

  // Colonne gauche : infos franchiseur
  const lx = ML;
  const rx = ML + COL_L + COL_G;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.black)
     .text('Effectué le :', lx, headerY);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(fmtDate(cert.generated_at), lx, headerY + 11, { width: COL_L });

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.black)
     .text('Par :', lx, headerY + 26);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(franchiseur.nom || '—', lx, headerY + 37, { width: COL_L });

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.black)
     .text('Adresse du franchiseur :', lx, headerY + 54);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(franchiseur.adresse || '—', lx, headerY + 65, { width: COL_L });

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.black)
     .text('Numéro du franchiseur :', lx, headerY + 90);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(franchiseur.telephone || '—', lx, headerY + 101, { width: COL_L });

  // Colonne droite : première modification (ou "aucune")
  const firstChange = changes[0];
  if (firstChange) {
    y = renderChangeBlock(doc, firstChange, 0, rx, headerY, COL_R);
  } else {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
       .text('Aucune modification documentée.', rx, headerY + 20, { width: COL_R });
    y = headerY + 40;
  }

  // s'assurer que y est en dessous du bloc gauche aussi
  y = Math.max(y, headerY + 120);
  y += 16;

  // ─── MODIFICATIONS SUIVANTES (à partir de la 2e) ─────────────────────────────
  for (let i = 1; i < changes.length; i++) {
    if (y > 740) {
      addFooter(doc, cert);
      doc.addPage();
      y = 52;
    }

    // séparateur
    doc.save().strokeColor(C.border).lineWidth(0.4)
       .moveTo(ML, y).lineTo(W - MR, y).stroke().restore();
    y += 14;

    y = renderChangeBlock(doc, changes[i], i, ML, y, CW);
    y += 16;
  }

  // ─── REMISES (si présentes) ───────────────────────────────────────────────────
  if (deliveries.length > 0) {
    if (y > 680) { addFooter(doc, cert); doc.addPage(); y = 52; }

    doc.save().strokeColor(C.border).lineWidth(0.5)
       .moveTo(ML, y).lineTo(W - MR, y).stroke().restore();
    y += 14;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blueHead)
       .text('Remises aux franchisés :', ML, y);
    y += 14;

    deliveries.forEach((d) => {
      if (y > 740) { addFooter(doc, cert); doc.addPage(); y = 52; }
      doc.font('Helvetica').fontSize(8).fillColor(C.black)
         .text(`• ${d.franchisee_name || '—'}  —  `, ML, y, { continued: true })
         .fillColor(C.muted).text(`envoyé ${fmt(d.sent_at)}`, { continued: !!d.read_at });
      if (d.read_at) {
        doc.fillColor(C.green).text(`  —  lu ${fmt(d.read_at)}`);
      }
      y = doc.y + 4;
    });
    y += 8;
  }

  // ─── PIED DE PAGE ────────────────────────────────────────────────────────────
  addFooter(doc, cert);
  doc.end();
});

// ── Rend un bloc de modification ─────────────────────────────────────────────
function renderChangeBlock(doc, change, idx, x, startY, width) {
  let y = startY;

  // "Section du DIP modifié :"
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2563EB')
     .text('Section du DIP modifié :', x, y, { width });
  y += 14;

  doc.font('Helvetica').fontSize(9).fillColor('#64748B')
     .text(`Section n°${change.section_number || (idx + 1)} — ${change.section || ''}`, x, y, { width });
  y += 12;

  if (change.type) {
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
       .text(`Type : ${change.type}`, x, y, { width });
    y += 12;
  }

  y += 4;

  // "Modifications apportées :"
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2563EB')
     .text('Modifications apportées :', x, y, { width });
  y += 14;

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A')
     .text('Post-modification :', x, y, { continued: true })
     .font('Helvetica').fillColor('#0F172A')
     .text('  ' + (change.nouveau || '—'), { width: width - 4 });
  y = doc.y + 6;

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A')
     .text('Pré-modification :', x, y, { continued: true })
     .font('Helvetica').fillColor('#64748B')
     .text('  ' + (change.ancien || '—'), { width: width - 4 });
  y = doc.y + 10;

  // Impact légal tag
  const impColor = IMPACT_COLOR[change.impact_legal] || '#64748B';
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(impColor)
     .text(`Impact légal : ${change.impact_legal || '—'}`, x, y, { width });
  y = doc.y + 10;

  // "Les enjeux de la/des modification(s) :"
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2563EB')
     .text('Les enjeux de la/des modification(s) :', x, y, { width });
  y += 14;

  const enjeux = change.recommandation_ia
    || 'Cette modification impacte les informations précontractuelles transmises aux candidats franchisés. '
     + 'Toute omission ou inexactitude expose le franchiseur à une demande de nullité du contrat de franchise '
     + 'en application de l\'article L.330-3 du Code de commerce.';

  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#334155')
     .text(enjeux, x, y, { width, lineGap: 2 });
  y = doc.y + 6;

  return y;
}

// ── Pied de page sur toutes les pages ────────────────────────────────────────
function addFooter(doc, cert) {
  const pageCount = doc.bufferedPageRange().count;
  const W = doc.page.width;
  // L'URL de vérification était figée sur « dippro.fr », un domaine qui
  // n'est pas celui de l'application : un juge suivant le lien imprimé
  // n'aurait rien trouvé, ruinant la valeur probatoire du document.
  const baseUrl = getAppUrl().replace(/^https?:\/\//, '');
  const numLabel = cert.certificate_number
    ? `Attestation n° ${String(cert.certificate_number).padStart(4, '0')}`
    : null;

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const fy = doc.page.height - 42;

    doc.save().strokeColor('#CBD5E1').lineWidth(0.5)
       .moveTo(56, fy).lineTo(W - 48, fy).stroke().restore();

    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
       .text(
         'Certificat de modifications réalisé par Iralink-Agency grâce à l\'outil DIPpro - 2026',
         56, fy + 7, { width: W - 200 }
       );

    // Numéro de série + pagination sur chaque page : une page isolée d'une
    // attestation reste rattachable à sa série et son document complet.
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
       .text(
         `${numLabel ? numLabel + ' — ' : ''}Page ${i + 1} / ${pageCount}`,
         W - 244, fy + 7, { width: 196, align: 'right' }
       );

    if (cert.public_token) {
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
         .text(
           `Vérification en ligne : ${baseUrl}/attestation/${cert.public_token}`,
           56, fy + 18, { width: W - 104 }
         );
    }

    if (cert.sha256_dip) {
      doc.font('Helvetica').fontSize(6.5).fillColor('#CBD5E1')
         .text(
           `Empreinte SHA-256 du DIP attesté : ${cert.sha256_dip}`,
           56, fy + 28, { width: W - 104 }
         );
    }
  }
}

module.exports = { generateCertificatePDF };
