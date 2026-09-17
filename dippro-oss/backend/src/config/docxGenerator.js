const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak
} = require('docx');
const { stripRichTextMarkers } = require('./richTextStrip');

const STATUS_LABELS = {
  conforme: '✓ Conforme',
  a_verifier: '⚠ À vérifier',
  non_conforme: '✗ Non conforme'
};

const STATUS_COLORS = {
  conforme: '2D7D46',
  a_verifier: 'B45309',
  non_conforme: 'DC2626'
};

const generateDocx = async (sections, companyName = 'Franchiseur') => {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const children = [
    // Page de garde
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 400 },
      children: [
        new TextRun({ text: 'DOCUMENT D\'INFORMATION PRÉCONTRACTUELLE', bold: true, size: 32, color: '1a1a2e' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: companyName, bold: true, size: 40, color: 'C8A96E' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Établi conformément à la Loi Doubin — Article L.330-3 du Code de commerce`, size: 22, color: '6B7280' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: `Document généré le ${date}`, size: 20, color: '9CA3AF', italics: true })]
    }),

    // Séparateur
    new Paragraph({ children: [new PageBreak()] }),

    // Score global
    ...(sections.global_score !== undefined ? [
      new Paragraph({
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({ text: 'SCORE DE CONFORMITÉ GLOBAL : ', bold: true, size: 24 }),
          new TextRun({
            text: `${sections.global_score}/100`,
            bold: true,
            size: 28,
            color: sections.global_score >= 70 ? '2D7D46' : sections.global_score >= 40 ? 'B45309' : 'DC2626'
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: sections.summary || '', size: 20, italics: true, color: '374151' })]
      })
    ] : [])
  ];

  // 10 sections
  for (const section of (sections.sections || [])) {
    const status = section.status || 'a_verifier';
    const statusColor = STATUS_COLORS[status] || 'B45309';

    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
        children: [
          new TextRun({ text: `Section ${section.section_number} — `, bold: true, size: 28, color: '1a1a2e' }),
          new TextRun({ text: section.section_title, bold: true, size: 28, color: 'C8A96E' })
        ]
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: STATUS_LABELS[status] || status, bold: true, size: 20, color: statusColor })
        ]
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: stripRichTextMarkers(section.content) || 'Non renseigné', size: 22, color: '111827' })]
      })
    );

    if (section.issues && section.issues.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: 'Points à corriger :', bold: true, size: 20, color: 'DC2626' })]
        }),
        ...section.issues.map(issue => new Paragraph({
          indent: { left: 400 },
          spacing: { after: 100 },
          children: [new TextRun({ text: `• ${issue}`, size: 20, color: 'DC2626' })]
        }))
      );
    }

    if (section.suggestions && section.suggestions.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: 'Suggestions d\'amélioration :', bold: true, size: 20, color: 'B45309' })]
        }),
        ...section.suggestions.map(s => new Paragraph({
          indent: { left: 400 },
          spacing: { after: 100 },
          children: [new TextRun({ text: `→ ${s}`, size: 20, color: 'B45309' })]
        }))
      );
    }
  }

  // Pied de page légal
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: 'MENTIONS LÉGALES', bold: true, size: 24, color: '6B7280' })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: `Ce document a été établi conformément aux dispositions de la Loi n°89-1008 du 31 décembre 1989 (Loi Doubin) et de l'article L.330-3 du Code de commerce. Il doit être remis au candidat franchisé au moins 20 jours avant la signature de tout contrat et tout versement de fonds.`,
        size: 18, color: '9CA3AF', italics: true
      })]
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Document généré par DIPpro — Iralink Agency — ${date}`,
        size: 16, color: 'C8A96E', italics: true
      })]
    })
  );

  const doc = new Document({
    creator: 'DIPpro by Iralink',
    title: `DIP — ${companyName}`,
    description: 'Document d\'Information Précontractuelle conforme Loi Doubin',
    sections: [{ children }]
  });

  return Packer.toBuffer(doc);
};

module.exports = { generateDocx };
