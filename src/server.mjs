/**
 * MCP (Model Context Protocol) server over standard input and output, without dependencies:
 * JSON-RPC 2.0, one message per line.
 * Tool names and their arguments are public (agents call them): they stay in French.
 */
import { createInterface } from 'node:readline';
import { findCriterion, search, findTopic, define, TOPICS, VERSION } from './rgaa.mjs';
import { criterionMarkdown, criterionLine, topicMarkdown, SOURCE } from './format.mjs';

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const TOOLS = [
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

const textResult = (text, isError = false) => ({ content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) });

function criterionTool(args) {
  const criterion = findCriterion(args.numero);
  if (!criterion) return textResult(`Aucun critère « ${args.numero} » dans le RGAA ${VERSION}. Les critères vont de 1.1 à 13.12 ; un test s'écrit « 11.1.2 ».`, true);
  return textResult(`${criterionMarkdown(criterion, { methodology: args.methodologie !== false })}\n\n${SOURCE}`);
}

function searchTool(args) {
  const results = search(args.texte || '');
  if (!results.length) return textResult(`Aucun critère ne contient « ${args.texte} ». Essayez des mots plus courts ou plus généraux.`);
  return textResult([`Critères pour « ${args.texte} » (les plus pertinents d'abord) :`, '', ...results.map(criterionLine), '', 'Détail : outil rgaa_critere.', SOURCE].join('\n'));
}

function topicTool(args) {
  if (args.numero == null || args.numero === '') {
    return textResult([`Les 13 thèmes du RGAA ${VERSION} :`, '', ...TOPICS.map((topic) => `- **${topic.number}** ${topic.name} (${topic.criteria.length} critères)`)].join('\n'));
  }
  const topic = findTopic(args.numero);
  if (!topic) return textResult(`Aucun thème « ${args.numero} » : les thèmes vont de 1 à 13.`, true);
  return textResult(`${topicMarkdown(topic)}\n\n${SOURCE}`);
}

function definitionTool(args) {
  const { exact, close } = define(args.terme || '');
  if (exact) return textResult(`## ${exact.term}\n\n${exact.definition}\n\n${SOURCE}`);
  if (close.length) return textResult([`Pas de terme exactement « ${args.terme} ». Termes proches :`, '', ...close.map((entry) => `- ${entry.term}`)].join('\n'));
  return textResult(`« ${args.terme} » n'est pas dans le glossaire du RGAA ${VERSION}.`);
}

const HANDLERS = { rgaa_critere: criterionTool, rgaa_chercher: searchTool, rgaa_theme: topicTool, rgaa_definition: definitionTool };

/** Runs a tool. Pure function: easy to test without starting the server. */
export function callTool(name, args = {}) {
  const handler = HANDLERS[name];
  return handler ? handler(args) : textResult(`Outil inconnu : ${name}.`, true);
}

/** Answers a JSON-RPC message; returns null for a notification. */
export function answer(message, version) {
  const { id, method, params } = message;
  const success = (result) => ({ jsonrpc: '2.0', id, result });
  const failure = (code, errorMessage) => ({ jsonrpc: '2.0', id, error: { code, message: errorMessage } });
  if (id === undefined || id === null) return null; // notification (e.g. notifications/initialized)
  switch (method) {
    case 'initialize': {
      const requested = params && params.protocolVersion;
      return success({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'marguerite', version },
        instructions: `Référentiel RGAA ${VERSION} officiel. Utilisez ces outils pour citer un critère exactement au lieu de le rédiger de mémoire.`,
      });
    }
    case 'ping':
      return success({});
    case 'tools/list':
      return success({ tools: TOOLS });
    case 'tools/call':
      return success(callTool(params && params.name, (params && params.arguments) || {}));
    default:
      return failure(-32601, `Méthode inconnue : ${method}`);
  }
}

export function startServer(version) {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on('line', (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }) + '\n');
      return;
    }
    const response = answer(message, version);
    if (response) process.stdout.write(JSON.stringify(response) + '\n');
  });
}
