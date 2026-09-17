const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = require('docx');

const IMPACT_LABEL = { High: 'Élevé', Moderate: 'Modéré', Low: 'Faible' };
const IMPACT_COLOR = { High: 'DC2626', Moderate: 'D97706', Low: '64748B' };

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
};

const hr = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } },
  spacing: { after: 200 },
});

const label = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 18, color: '2563EB' })],
  spacing: { before: 160, after: 60 },
});

const value = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text: text || '—', size: 20, ...opts })],
  spacing: { after: 80 },
});

/**
 * Génère l'attestation de modification DIPpro en DOCX — même contenu que le
 * PDF (certificatePdf.js), pour un document que tout traitement de texte
 * (Word, LibreOffice, Google Docs) peut ouvrir sans dépendre d'un lecteur PDF.
 * @param {object} cert — enregistrement dip_certificates complet
 * @param {object} franchiseur — { nom, adresse, telephone }
 * @returns {Promise<Buffer>}
 */
const generateCertificateDocx = async (cert, franchiseur = {}) => {
  const changes = cert.changes_snapshot || [];
  const deliveries = cert.deliveries || [];
  const children = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: 'DIPpro — Attestation de modification', bold: true, size: 32, color: 'C8A96E' })],
    spacing: { after: 120 },
  }));
  // Numéro de série — identique au PDF, pour que les deux formats d'une même
  // attestation soient rattachables à la même série.
  if (cert.certificate_number) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `ATTESTATION N° ${String(cert.certificate_number).padStart(4, '0')}`, bold: true, size: 20, color: '2563EB' })],
      spacing: { after: 120 },
    }));
  }
  children.push(hr());

  children.push(label('Effectué le'));
  children.push(value(fmtDate(cert.generated_at)));
  children.push(label('Par'));
  children.push(value(franchiseur.nom));
  children.push(label('Adresse du franchiseur'));
  children.push(value(franchiseur.adresse));
  children.push(label('Numéro du franchiseur'));
  children.push(value(franchiseur.telephone));

  if (cert.legal_summary) {
    children.push(label('Synthèse'));
    children.push(value(cert.legal_summary));
  }

  if (changes.length === 0) {
    children.push(label('Modifications'));
    children.push(value('Aucune modification documentée.'));
  } else {
    changes.forEach((change, idx) => {
      children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
      children.push(hr());
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({
          text: `Modification ${idx + 1} — Section n°${change.section_number || idx + 1} — ${change.section || ''}`,
          bold: true, color: 'C8A96E', size: 24,
        })],
        spacing: { before: 120, after: 120 },
      }));

      if (change.type) {
        children.push(value(`Type : ${change.type}`, { color: '94A3B8', size: 18 }));
      }

      children.push(label('Post-modification'));
      children.push(value(change.nouveau));
      children.push(label('Pré-modification'));
      children.push(value(change.ancien, { color: '64748B' }));

      children.push(new Paragraph({
        children: [new TextRun({
          text: `Impact légal : ${IMPACT_LABEL[change.impact_legal] || change.impact_legal || '—'}`,
          bold: true, size: 18, color: IMPACT_COLOR[change.impact_legal] || '64748B',
        })],
        spacing: { before: 80, after: 120 },
      }));

      const enjeux = change.recommandation_ia
        || 'Cette modification impacte les informations précontractuelles transmises aux candidats franchisés. '
         + 'Toute omission ou inexactitude expose le franchiseur à une demande de nullité du contrat de franchise '
         + 'en application de l\'article L.330-3 du Code de commerce.';
      children.push(label('Les enjeux de la modification'));
      children.push(new Paragraph({
        children: [new TextRun({ text: enjeux, italics: true, size: 19, color: '334155' })],
        spacing: { after: 120 },
      }));
    });
  }

  if (deliveries.length > 0) {
    children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    children.push(hr());
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Remises aux franchisés', bold: true, size: 22, color: '2563EB' })],
      spacing: { after: 120 },
    }));
    deliveries.forEach((d) => {
      const runs = [
        new TextRun({ text: `• ${d.franchisee_name || '—'} — `, size: 18 }),
        new TextRun({ text: `envoyé ${fmtDateTime(d.sent_at)}`, size: 18, color: '64748B' }),
      ];
      if (d.read_at) {
        runs.push(new TextRun({ text: `  —  lu ${fmtDateTime(d.read_at)}`, size: 18, color: '16A34A' }));
      }
      children.push(new Paragraph({ children: runs, spacing: { after: 60 } }));
    });
  }

  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  children.push(hr());
  children.push(new Paragraph({
    children: [new TextRun({
      text: 'Certificat de modifications réalisé par Iralink-Agency grâce à l\'outil DIPpro',
      size: 15, color: '94A3B8',
    })],
  }));
  if (cert.public_token) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: `Vérification : dippro.business/attestation/${cert.public_token}`,
        size: 14, color: 'CBD5E1',
      })],
    }));
  }

  const doc = new Document({
    creator: 'DIPpro',
    title: cert.certificate_title || 'Attestation de modification',
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
};

module.exports = { generateCertificateDocx };
