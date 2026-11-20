/**
 * Serveur MCP (Model Context Protocol) sur l'entrée et la sortie standard, sans dépendance :
 * JSON-RPC 2.0, un message par ligne.
 */
import { createInterface } from 'node:readline';
import { critere, chercher, theme, definition, THEMES, VERSION } from './referentiel.mjs';
import { critereEnMarkdown, ligneCritere, themeEnMarkdown, SOURCE } from './format.mjs';

const VERSIONS_PROTOCOLE = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const OUTILS = [
  {
    name: 'rgaa_critere',
    description: `Texte officiel d'un critère du RGAA ${VERSION} (« 11.1 ») ou d'un test (« 11.1.2 ») : titre, tests, méthodologie de test, cas particuliers, références WCAG. À utiliser pour citer un critère exactement, sans l'inventer.`,
    inputSchema: {
      type: 'object',
      properties: {
        numero: { type: 'string', description: 'Numéro du critère (« 11.1 ») ou du test (« 11.1.2 »).' },
        methodologie: { type: 'boolean', description: 'Inclure la méthodologie de test (défaut : oui).' },
      },
      required: ['numero'],
    },
  },
  {
    name: 'rgaa_chercher',
    description: `Cherche les critères du RGAA ${VERSION} qui parlent d'un sujet (« étiquette formulaire », « contraste », « captcha », « aria-label »). Renvoie les critères les plus pertinents, avec leur numéro.`,
    inputSchema: {
      type: 'object',
      properties: { texte: { type: 'string', description: 'Mots à chercher (tous doivent apparaître).' } },
      required: ['texte'],
    },
  },
  {
    name: 'rgaa_theme',
    description: `Liste les critères d'un des 13 thèmes du RGAA ${VERSION} (1 Images, 2 Cadres, 3 Couleurs, 4 Multimédia, 5 Tableaux, 6 Liens, 7 Scripts, 8 Éléments obligatoires, 9 Structuration, 10 Présentation, 11 Formulaires, 12 Navigation, 13 Consultation). Sans numéro : la liste des thèmes.`,
    inputSchema: { type: 'object', properties: { numero: { type: 'string', description: 'Numéro du thème, de 1 à 13.' } } },
  },
  {
    name: 'rgaa_definition',
    description: `Définition officielle d'un terme du glossaire du RGAA ${VERSION} (« alternative textuelle », « lien », « contraste »). Les critères emploient ces termes au sens du glossaire.`,
    inputSchema: {
      type: 'object',
      properties: { terme: { type: 'string', description: 'Le terme à définir.' } },
      required: ['terme'],
    },
  },
];

const texte = (t, isError = false) => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });

/** Exécute un outil. Fonction pure : facile à tester sans lancer le serveur. */
export function appeler(nom, args = {}) {
  if (nom === 'rgaa_critere') {
    const c = critere(args.numero);
    if (!c) return texte(`Aucun critère « ${args.numero} » dans le RGAA ${VERSION}. Les critères vont de 1.1 à 13.12 ; un test s'écrit « 11.1.2 ».`, true);
    return texte(`${critereEnMarkdown(c, { methodologie: args.methodologie !== false })}\n\n${SOURCE}`);
  }
  if (nom === 'rgaa_chercher') {
    const resultats = chercher(args.texte || '');
    if (!resultats.length) return texte(`Aucun critère ne contient « ${args.texte} ». Essayez des mots plus courts ou plus généraux.`);
    return texte([`Critères pour « ${args.texte} » (les plus pertinents d'abord) :`, '', ...resultats.map(ligneCritere), '', 'Détail : outil rgaa_critere.', SOURCE].join('\n'));
  }
  if (nom === 'rgaa_theme') {
    if (args.numero == null || args.numero === '') return texte([`Les 13 thèmes du RGAA ${VERSION} :`, '', ...THEMES.map((t) => `- **${t.numero}** ${t.nom} (${t.criteres.length} critères)`)].join('\n'));
    const t = theme(args.numero);
    if (!t) return texte(`Aucun thème « ${args.numero} » : les thèmes vont de 1 à 13.`, true);
    return texte(`${themeEnMarkdown(t)}\n\n${SOURCE}`);
  }
  if (nom === 'rgaa_definition') {
    const { exacte, proches } = definition(args.terme || '');
    if (exacte) return texte(`## ${exacte.terme}\n\n${exacte.definition}\n\n${SOURCE}`);
    if (proches.length) return texte([`Pas de terme exactement « ${args.terme} ». Termes proches :`, '', ...proches.map((g) => `- ${g.terme}`)].join('\n'));
    return texte(`« ${args.terme} » n'est pas dans le glossaire du RGAA ${VERSION}.`);
  }
  return texte(`Outil inconnu : ${nom}.`, true);
}

/** Répond à un message JSON-RPC ; renvoie null pour une notification. */
export function repondre(message, version) {
  const { id, method, params } = message;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const erreur = (code, msg) => ({ jsonrpc: '2.0', id, error: { code, message: msg } });
  if (id === undefined || id === null) return null; // notification (ex. notifications/initialized)
  switch (method) {
    case 'initialize': {
      const demandee = params && params.protocolVersion;
      return ok({
        protocolVersion: VERSIONS_PROTOCOLE.includes(demandee) ? demandee : VERSIONS_PROTOCOLE[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'marguerite', version },
        instructions: `Référentiel RGAA ${VERSION} officiel. Utilisez ces outils pour citer un critère exactement au lieu de le rédiger de mémoire.`,
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: OUTILS });
    case 'tools/call':
      return ok(appeler(params && params.name, (params && params.arguments) || {}));
    default:
      return erreur(-32601, `Méthode inconnue : ${method}`);
  }
}

export function demarrer(version) {
  const lignes = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lignes.on('line', (ligne) => {
    if (!ligne.trim()) return;
    let message;
    try {
      message = JSON.parse(ligne);
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }) + '\n');
      return;
    }
    const reponse = repondre(message, version);
    if (reponse) process.stdout.write(JSON.stringify(reponse) + '\n');
  });
}
