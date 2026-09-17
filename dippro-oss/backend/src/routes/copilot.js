const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware, requireFranchisor } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(profile) {
  const addressingName = profile?.copilot_addressing_name?.trim();
  const formality = profile?.copilot_formality === 'tu' ? 'tu' : 'vous';
  const memoryNotes = profile?.copilot_memory_notes?.trim();

  const addressing = addressingName
    ? `Appelle l'utilisateur "${addressingName}". Vouvoie/tutoie-le au "${formality}" (${formality === 'tu' ? 'tutoiement' : 'vouvoiement'}).`
    : `Tu ne connais pas de prénom pour l'utilisateur — reste neutre. Vouvoie/tutoie-le au "${formality}".`;

  const memoryBlock = memoryNotes
    ? `\n\nNotes mémorisées par l'utilisateur à propos de lui-même ou de son activité (à prendre en compte dans tes réponses) :\n"""\n${memoryNotes}\n"""`
    : '';

  return `Tu es DIPpro Copilot, l'assistant IA intégré à la plateforme DIPpro by Iralink.

DIPpro aide les franchiseurs français à gérer leurs Documents d'Information Précontractuelle (DIP) et leurs contrats de franchise, obligatoires selon la Loi Doubin (art. L.330-3 Code de commerce).

Tes capacités :
- Répondre aux questions sur le DIP, la Loi Doubin et les obligations légales franchise
- Consulter en temps réel le DIP actif, le contrat actif, le score de conformité, les alertes, les franchisés et l'historique
- Modifier directement le contenu d'une section du DIP ou d'une clause du contrat, à la demande explicite de l'utilisateur
- Effectuer des actions directes : valider ou ignorer des corrections IA
- Faire un checkup complet du compte
- Expliquer comment utiliser les fonctionnalités de DIPpro (import, génération IA, monitoring, export)

${addressing}${memoryBlock}

Si l'utilisateur demande une démonstration, une présentation, un rendez-vous ou à rencontrer l'équipe :
→ Propose-lui ce lien Cal.com : https://cal.com/theo-coutard-mhdsix/presentation-dippro
→ Précise que c'est une présentation de 30 min avec Théo de l'équipe Iralink, gratuite, sans engagement

Règles :
- Sois concis, professionnel et bienveillant
- Mentionne l'impact légal quand pertinent (délai 20 jours, Loi Doubin, sanctions)
- Réponds en français (ou dans la langue de l'utilisateur)
- Avant de modifier une section du DIP ou une clause du contrat, annonce clairement le contenu que tu vas écrire
- Après une modification via update_dip_section ou update_contract_clause, rappelle que la section repasse en statut "à vérifier" et que l'utilisateur doit la valider dans l'interface`;
}

const TOOLS = [
  {
    name: 'get_dip_status',
    description: "Récupère le statut complet du DIP actif : score de conformité, sections conformes/non conformes, date du dernier import",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_pending_alerts',
    description: "Récupère toutes les alertes et corrections IA en attente de validation",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'validate_alert',
    description: "Valide et applique une correction IA sur le DIP",
    input_schema: {
      type: 'object',
      properties: { alert_id: { type: 'string', description: "UUID de l'alerte à valider" } },
      required: ['alert_id']
    }
  },
  {
    name: 'ignore_alert',
    description: "Ignore une alerte (la marque comme ignorée sans modifier le DIP)",
    input_schema: {
      type: 'object',
      properties: { alert_id: { type: 'string', description: "UUID de l'alerte à ignorer" } },
      required: ['alert_id']
    }
  },
  {
    name: 'get_franchisees',
    description: "Récupère la liste des franchisés avec statut et contact",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_history',
    description: "Récupère les 10 derniers événements de l'historique des modifications",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'full_checkup',
    description: "Lance un checkup complet : récupère le DIP, les alertes et l'historique pour dresser un bilan de conformité",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_contract_status',
    description: "Récupère le contrat de franchise actif avec la liste de ses clauses (numéro, titre, statut, aperçu du contenu)",
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'update_dip_section',
    description: "Réécrit le contenu d'une section du DIP actif. La section repasse automatiquement en statut 'à vérifier' pour relecture par l'utilisateur. À utiliser uniquement à la demande explicite de l'utilisateur, après lui avoir annoncé le contenu proposé.",
    input_schema: {
      type: 'object',
      properties: {
        section_number: { type: 'integer', description: 'Numéro de la section du DIP à modifier (1 à 10)' },
        new_content: { type: 'string', description: 'Nouveau contenu complet de la section' },
      },
      required: ['section_number', 'new_content']
    }
  },
  {
    name: 'update_contract_clause',
    description: "Réécrit le contenu d'une clause du contrat de franchise actif. La clause repasse automatiquement en statut 'à vérifier' pour relecture par l'utilisateur. À utiliser uniquement à la demande explicite de l'utilisateur, après lui avoir annoncé le contenu proposé.",
    input_schema: {
      type: 'object',
      properties: {
        clause_number: { type: 'integer', description: 'Numéro de la clause/article du contrat à modifier' },
        new_content: { type: 'string', description: 'Nouveau contenu complet de la clause' },
      },
      required: ['clause_number', 'new_content']
    }
  }
];

async function executeTool(name, input, userId) {
  try {
    switch (name) {
      case 'get_dip_status': {
        const { data: dip } = await supabaseAdmin
          .from('dip_documents')
          .select('id, title, conformity_score, status, created_at')
          .eq('user_id', userId)
          .eq('status', 'actif')
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (!dip) return { error: 'Aucun DIP actif. Importez votre premier DIP.' };
        const { data: sections } = await supabaseAdmin
          .from('dip_sections').select('status').eq('dip_id', dip.id);
        const stats = (sections || []).reduce((a, s) => { a[s.status] = (a[s.status] || 0) + 1; return a; }, {});
        return { title: dip.title, score: dip.conformity_score, status: dip.status, last_import: dip.created_at, sections: { total: sections?.length || 0, conforme: stats.conforme || 0, a_verifier: stats.a_verifier || 0, non_conforme: stats.non_conforme || 0 } };
      }
      case 'get_pending_alerts': {
        const { data: userDips } = await supabaseAdmin
          .from('dip_documents').select('id').eq('user_id', userId);
        const dipIds = (userDips || []).map(d => d.id);
        if (dipIds.length === 0) return { alerts: [], count: 0 };
        const { data } = await supabaseAdmin
          .from('alerts')
          .select('id, urgency, source, suggestion, status, created_at, dip_sections(section_title, section_number)')
          .in('dip_id', dipIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);
        return { alerts: data || [], count: data?.length || 0 };
      }
      case 'validate_alert': {
        const { data: alert, error: fetchErr } = await supabaseAdmin
          .from('alerts')
          .select('*, dip_sections(*), contract_clauses(*)')
          .eq('id', input.alert_id)
          .single();
        if (fetchErr || !alert) return { error: 'Alerte introuvable' };

        // Vérification propriété
        if (alert.dip_id) {
          const { data: ownerDip } = await supabaseAdmin
            .from('dip_documents').select('id').eq('id', alert.dip_id).eq('user_id', userId).single();
          if (!ownerDip) return { error: 'Accès refusé' };
        } else if (alert.contract_id) {
          const { data: ownerContract } = await supabaseAdmin
            .from('franchise_contracts').select('id').eq('id', alert.contract_id).eq('user_id', userId).single();
          if (!ownerContract) return { error: 'Accès refusé' };
        }

        const newContent = alert.suggestion || alert.new_value;
        if (alert.section_id && newContent) {
          await supabaseAdmin.from('dip_sections')
            .update({ content: newContent, status: 'conforme', last_updated: new Date().toISOString() })
            .eq('id', alert.section_id);
        }
        if (alert.clause_id && newContent) {
          await supabaseAdmin.from('contract_clauses')
            .update({ content: newContent, status: 'conforme', last_updated: new Date().toISOString() })
            .eq('id', alert.clause_id);
        }

        await supabaseAdmin.from('alerts')
          .update({ status: 'validated', resolved_at: new Date().toISOString() })
          .eq('id', input.alert_id);

        await supabaseAdmin.from('audit_log').insert({
          dip_id: alert.dip_id || null,
          section_id: alert.section_id || null,
          action: 'alert_validated',
          old_content: alert.old_value,
          new_content: newContent,
          user_id: userId,
          timestamp: new Date().toISOString()
        });

        return { success: true, validated_id: input.alert_id, section_updated: !!(alert.section_id && newContent) };
      }
      case 'ignore_alert': {
        const { data: alert } = await supabaseAdmin
          .from('alerts').select('dip_id, contract_id').eq('id', input.alert_id).single();
        if (!alert) return { error: 'Alerte introuvable' };

        if (alert.dip_id) {
          const { data: ownerDip } = await supabaseAdmin
            .from('dip_documents').select('id').eq('id', alert.dip_id).eq('user_id', userId).single();
          if (!ownerDip) return { error: 'Accès refusé' };
        } else if (alert.contract_id) {
          const { data: ownerContract } = await supabaseAdmin
            .from('franchise_contracts').select('id').eq('id', alert.contract_id).eq('user_id', userId).single();
          if (!ownerContract) return { error: 'Accès refusé' };
        }

        const { error } = await supabaseAdmin.from('alerts')
          .update({ status: 'ignored', resolved_at: new Date().toISOString() })
          .eq('id', input.alert_id);
        if (error) return { error: error.message };
        return { success: true, ignored_id: input.alert_id };
      }
      case 'get_franchisees': {
        const { data } = await supabaseAdmin
          .from('franchisees')
          .select('id, name, email, territory, status')
          .eq('franchiseur_id', userId)
          .order('name')
          .limit(50);
        return { franchisees: data || [], count: data?.length || 0 };
      }
      case 'get_history': {
        const { data } = await supabaseAdmin
          .from('audit_log')
          .select('action, new_content, timestamp')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(10);
        return { events: data || [] };
      }
      case 'full_checkup': {
        const { data: dip } = await supabaseAdmin
          .from('dip_documents')
          .select('id, title, conformity_score, status, created_at')
          .eq('user_id', userId)
          .eq('status', 'actif')
          .order('created_at', { ascending: false })
          .maybeSingle();

        const dipId = dip?.id;
        const [alertsRes, historyRes, sectionsRes] = await Promise.all([
          dipId
            ? supabaseAdmin.from('alerts').select('id, urgency, source, status').eq('dip_id', dipId).eq('status', 'pending').limit(20)
            : Promise.resolve({ data: [] }),
          supabaseAdmin.from('audit_log').select('action, timestamp').eq('user_id', userId).order('timestamp', { ascending: false }).limit(5),
          dipId
            ? supabaseAdmin.from('dip_sections').select('status').eq('dip_id', dipId)
            : Promise.resolve({ data: [] })
        ]);

        const sections = sectionsRes.data || [];
        const stats = sections.reduce((a, s) => { a[s.status] = (a[s.status] || 0) + 1; return a; }, {});

        return {
          dip: dip ? { title: dip.title, score: dip.conformity_score, status: dip.status, last_import: dip.created_at, sections: { total: sections.length, ...stats } } : null,
          pending_alerts: { count: alertsRes.data?.length || 0, haute: (alertsRes.data || []).filter(a => a.urgency === 'haute').length, items: alertsRes.data || [] },
          recent_history: historyRes.data || []
        };
      }
      case 'get_contract_status': {
        const { data: contract } = await supabaseAdmin
          .from('franchise_contracts')
          .select('id, title, conformity_score, status, created_at, contract_clauses(clause_number, clause_title, status, content)')
          .eq('user_id', userId)
          .eq('status', 'actif')
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (!contract) return { error: 'Aucun contrat actif. Générez ou importez un contrat.' };
        const clauses = (contract.contract_clauses || [])
          .sort((a, b) => a.clause_number - b.clause_number)
          .map(c => ({ clause_number: c.clause_number, clause_title: c.clause_title, status: c.status, preview: (c.content || '').slice(0, 160) }));
        return { title: contract.title, score: contract.conformity_score, status: contract.status, clauses };
      }
      case 'update_dip_section': {
        const { section_number, new_content } = input;
        if (!section_number || !new_content?.trim()) return { error: 'section_number et new_content requis' };

        const { data: dip } = await supabaseAdmin
          .from('dip_documents')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'actif')
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (!dip) return { error: 'Aucun DIP actif' };

        const { data: section } = await supabaseAdmin
          .from('dip_sections')
          .select('id, section_title, content')
          .eq('dip_id', dip.id)
          .eq('section_number', section_number)
          .maybeSingle();
        if (!section) return { error: `Section ${section_number} introuvable` };

        const oldContent = section.content;
        const { error } = await supabaseAdmin
          .from('dip_sections')
          .update({ content: new_content, status: 'a_verifier', last_updated: new Date().toISOString() })
          .eq('id', section.id);
        if (error) return { error: error.message };

        await supabaseAdmin.from('audit_log').insert({
          dip_id: dip.id,
          section_id: section.id,
          action: 'copilot_section_update',
          old_content: oldContent,
          new_content,
          user_id: userId,
          timestamp: new Date().toISOString(),
        });

        return { success: true, section_number, section_title: section.section_title, new_status: 'a_verifier' };
      }
      case 'update_contract_clause': {
        const { clause_number, new_content } = input;
        if (!clause_number || !new_content?.trim()) return { error: 'clause_number et new_content requis' };

        const { data: contract } = await supabaseAdmin
          .from('franchise_contracts')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'actif')
          .order('created_at', { ascending: false })
          .maybeSingle();
        if (!contract) return { error: 'Aucun contrat actif' };

        const { data: clause } = await supabaseAdmin
          .from('contract_clauses')
          .select('id, clause_title, content')
          .eq('contract_id', contract.id)
          .eq('clause_number', clause_number)
          .maybeSingle();
        if (!clause) return { error: `Clause ${clause_number} introuvable` };

        const oldContent = clause.content;
        const { error } = await supabaseAdmin
          .from('contract_clauses')
          .update({ content: new_content, status: 'a_verifier', last_updated: new Date().toISOString() })
          .eq('id', clause.id);
        if (error) return { error: error.message };

        await supabaseAdmin.from('audit_log').insert({
          dip_id: null,
          section_id: null,
          action: 'copilot_clause_update',
          old_content: oldContent,
          new_content,
          user_id: userId,
          timestamp: new Date().toISOString(),
        });

        return { success: true, clause_number, clause_title: clause.clause_title, new_status: 'a_verifier' };
      }
      default:
        return { error: `Outil inconnu: ${name}` };
    }
  } catch (e) {
    return { error: e.message };
  }
}

router.post('/chat', authMiddleware, requireFranchisor, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requis' });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('copilot_addressing_name, copilot_formality, copilot_memory_notes')
      .eq('id', req.user.id)
      .maybeSingle();
    const system = buildSystemPrompt(profile);

    let currentMessages = messages.slice(-20);
    const actions = [];

    for (let i = 0; i < 6; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-opus-5',
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        system,
        tools: TOOLS,
        messages: currentMessages
      });

      if (response.stop_reason === 'end_turn') {
        const text = response.content.find(b => b.type === 'text')?.text || '';
        return res.json({ reply: text, actions });
      }

      if (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter(b => b.type === 'tool_use');
        const toolResults = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input, req.user.id);
          actions.push({ tool: tu.name, input: tu.input, result });
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        }
        currentMessages = [...currentMessages, { role: 'assistant', content: response.content }, { role: 'user', content: toolResults }];
        continue;
      }
      break;
    }
    res.json({ reply: "Je n'ai pas pu traiter cette demande. Réessayez.", actions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
