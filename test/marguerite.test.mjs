import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TOPICS, CRITERIA, GLOSSARY, findCriterion, search, findTopic, define, cleanText, textFromHtml } from '../src/rgaa.mjs';
import { callTool, answer, TOOLS } from '../src/server.mjs';

const BINARY = fileURLToPath(new URL('../bin/marguerite.mjs', import.meta.url));
const numbers = (criteria) => criteria.map((criterion) => criterion.number);

test('le référentiel officiel est complet : 13 thèmes, 106 critères, glossaire', () => {
  assert.equal(TOPICS.length, 13);
  assert.equal(CRITERIA.length, 106);
  assert.ok(GLOSSARY.length > 100);
  assert.ok(CRITERIA.every((criterion) => criterion.tests.length > 0 && criterion.title && criterion.link.startsWith('https://accessibilite.numerique.gouv.fr/')));
  assert.ok(CRITERIA.every((criterion) => !/\]\(#/.test(criterion.title)), 'aucun lien interne du glossaire ne reste dans les titres');
});

test('chaque test a sa méthodologie officielle', () => {
  const missing = CRITERIA.flatMap((criterion) => criterion.tests).filter((test) => !test.methodology).map((test) => test.testId);
  assert.deepEqual(missing, []);
});

test('critère, test et numéros invalides', () => {
  // The official text keeps its typography (non-breaking space before "?").
  assert.match(findCriterion('11.1').title, /^Chaque champ de formulaire a-t-il une étiquette\s\?$/u);
  assert.equal(findCriterion(' 11.1 ').number, '11.1');
  assert.equal(findCriterion('11.1.2').requestedTest, '11.1.2');
  assert.equal(findCriterion('13.12').number, '13.12');
  for (const invalid of ['14.1', '11.99', '11.1.99', 'onze', '', '11']) assert.equal(findCriterion(invalid), null, invalid);
});

test('recherche sans accents ni majuscules, tous les mots requis', () => {
  const found = numbers(search('ETIQUETTE formulaire'));
  assert.ok(found.includes('11.1') && found.includes('11.2'));
  assert.ok(numbers(search('captcha')).includes('1.4'));
  assert.ok(numbers(search('contraste')).includes('3.2'));
  assert.deepEqual(search('zzzz introuvable'), []);
  assert.deepEqual(search(''), []);
  assert.ok(search('lien').length <= 10);
});

test('thèmes', () => {
  assert.equal(findTopic('11').name, 'Formulaires');
  assert.equal(findTopic(3).criteria.length, 3);
  assert.equal(findTopic('14'), null);
});

test('glossaire : terme exact, terme approché, terme absent', () => {
  assert.equal(define('Contraste').exact.term, 'Contraste');
  assert.match(define('alternative textuelle').exact.term, /^Alternative textuelle/);
  assert.ok(define('lien').close.length > 1 || define('lien').exact);
  assert.equal(define('licorne').exact, null);
  assert.ok(!/<\w+/.test(define('Contraste').exact.definition), 'pas de HTML dans les définitions');
});

test('nettoyage du texte officiel', () => {
  assert.equal(cleanText('Chaque [image](#image-porteuse-d-information) a-t-elle'), 'Chaque image a-t-elle');
  assert.equal(textFromHtml('<p>A</p><ul><li>un</li><li>deux</li></ul>'), 'A\n- un\n- deux');
});

test('outils MCP : noms publics, réponses et erreurs', () => {
  assert.deepEqual(TOOLS.map((tool) => tool.name), ['rgaa_critere', 'rgaa_chercher', 'rgaa_theme', 'rgaa_definition']);
  const criterionText = callTool('rgaa_critere', { numero: '1.1' }).content[0].text;
  assert.match(criterionText, /## Critère 1\.1/);
  assert.match(criterionText, /Méthodologie de test/);
  assert.match(criterionText, /Licence Ouverte 2\.0/);
  assert.doesNotMatch(callTool('rgaa_critere', { numero: '1.1', methodologie: false }).content[0].text, /Méthodologie de test/);
  assert.equal(callTool('rgaa_critere', { numero: '99.9' }).isError, true);
  assert.match(callTool('rgaa_chercher', { texte: 'captcha' }).content[0].text, /1\.4/);
  assert.match(callTool('rgaa_theme', {}).content[0].text, /13 thèmes/);
  assert.match(callTool('rgaa_definition', { terme: 'contraste' }).content[0].text, /## Contraste/);
  assert.equal(callTool('outil_inconnu').isError, true);
});

test('un test précis n’affiche que ce test', () => {
  const text = callTool('rgaa_critere', { numero: '11.1.2' }).content[0].text;
  assert.match(text, /### Test 11\.1\.2/);
  assert.doesNotMatch(text, /### Test 11\.1\.1/);
});

test('serveur MCP : échange complet sur stdio', async () => {
  const server = spawn(process.execPath, [BINARY, 'serveur'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const responses = [];
  let buffer = '';
  server.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      responses.push(JSON.parse(buffer.slice(0, newline)));
      buffer = buffer.slice(newline + 1);
    }
  });
  const send = (message) => server.stdin.write((typeof message === 'string' ? message : JSON.stringify(message)) + '\n');
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'essai', version: '1' } } });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'rgaa_critere', arguments: { numero: '3.2' } } });
  send({ jsonrpc: '2.0', id: 4, method: 'ping' });
  send({ jsonrpc: '2.0', id: 5, method: 'resources/list' });
  send('pas du json');
  await new Promise((resolve) => setTimeout(resolve, 600));
  server.kill();
  const byId = Object.fromEntries(responses.map((response) => [response.id, response]));
  assert.equal(byId[1].result.protocolVersion, '2025-06-18');
  assert.equal(byId[1].result.serverInfo.name, 'marguerite');
  assert.equal(byId[2].result.tools.length, 4);
  assert.match(byId[3].result.content[0].text, /contraste/i);
  assert.deepEqual(byId[4].result, {});
  assert.equal(byId[5].error.code, -32601);
  assert.equal(byId.null.error.code, -32700);
  assert.equal(responses.length, 6, 'pas de réponse à une notification');
});

test('version de protocole inconnue : le serveur propose la sienne', () => {
  const response = answer({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, '1');
  assert.equal(response.result.protocolVersion, '2025-06-18');
});

test('commande : sorties et erreurs', () => {
  assert.match(execFileSync(process.execPath, [BINARY, 'critère', '6.1'], { encoding: 'utf8' }), /Critère 6\.1/);
  assert.match(execFileSync(process.execPath, [BINARY, 'aide'], { encoding: 'utf8' }), /serveur MCP/);
  assert.throws(() => execFileSync(process.execPath, [BINARY, 'critere', '20.1'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync(process.execPath, [BINARY, 'nimporte'], { stdio: 'pipe' }));
});

test('les références de la skill sont à jour', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/build-skill.mjs', import.meta.url)), '--verifier'], { stdio: 'pipe' });
});
