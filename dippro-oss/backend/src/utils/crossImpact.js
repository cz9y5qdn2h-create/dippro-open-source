const { supabaseAdmin } = require('../config/supabase');
const { analyzeCrossImpact } = require('../config/claude');

// Déclenche l'analyse d'impact croisé après un changement détecté dans le DIP ou le contrat,
// et crée les alertes correspondantes dans le document lié — c'est le "tunnel" DIP <-> Contrat.
const triggerCrossImpactAlerts = async ({ sourceType, changes, dipId, contractId }) => {
  if (!changes || changes.length === 0) return [];

  if (sourceType === 'dip') {
    if (!contractId) return [];
    const { data: clauses } = await supabaseAdmin
      .from('contract_clauses').select('*').eq('contract_id', contractId).order('clause_number');
    if (!clauses || clauses.length === 0) return [];

    const { impacts } = await analyzeCrossImpact({
      sourceType: 'dip',
      changes,
      targetItems: clauses.map(c => ({ number: c.clause_number, title: c.clause_title, content: c.content }))
    });
    if (!impacts || impacts.length === 0) return [];

    const alertsToInsert = impacts.map(imp => {
      const clause = clauses.find(c => c.clause_number === imp.target_item_number);
      return {
        contract_id: contractId,
        clause_id: clause?.id || null,
        old_value: clause?.content || null,
        suggestion: imp.suggestion,
        source: 'Impact croisé (DIP → Contrat)',
        urgency: imp.urgency || 'moyenne',
        cross_impact_from: 'dip',
        status: 'pending',
        created_at: new Date().toISOString()
      };
    });

    const { data: created } = await supabaseAdmin.from('alerts').insert(alertsToInsert).select();
    return created || [];
  }

  if (sourceType === 'contract') {
    if (!dipId) return [];
    const { data: sections } = await supabaseAdmin
      .from('dip_sections').select('*').eq('dip_id', dipId).order('section_number');
    if (!sections || sections.length === 0) return [];

    const { impacts } = await analyzeCrossImpact({
      sourceType: 'contract',
      changes,
      targetItems: sections.map(s => ({ number: s.section_number, title: s.section_title, content: s.content }))
    });
    if (!impacts || impacts.length === 0) return [];

    const alertsToInsert = impacts.map(imp => {
      const section = sections.find(s => s.section_number === imp.target_item_number);
      return {
        dip_id: dipId,
        section_id: section?.id || null,
        old_value: section?.content || null,
        suggestion: imp.suggestion,
        source: 'Impact croisé (Contrat → DIP)',
        urgency: imp.urgency || 'moyenne',
        cross_impact_from: 'contract',
        status: 'pending',
        created_at: new Date().toISOString()
      };
    });

    const { data: created } = await supabaseAdmin.from('alerts').insert(alertsToInsert).select();
    return created || [];
  }

  return [];
};

module.exports = { triggerCrossImpactAlerts };
