import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { THEMES, CRITERES, GLOSSAIRE, critere, chercher, theme, definition, nettoyer, texteDeHtml } from '../src/referentiel.mjs';
import { appeler, OUTILS } from '../src/serveur.mjs';

const BIN = fileURLToPath(new URL('../bin/marguerite.mjs', import.meta.url));

test('le référentiel officiel est complet : 13 thèmes, 106 critères, glossaire', () => {
  assert.equal(THEMES.length, 13);
  assert.equal(CRITERES.length, 106);
  assert.ok(GLOSSAIRE.length > 100);
  assert.ok(CRITERES.every((c) => c.tests.length > 0 && c.titre && c.lien.startsWith('https://accessibilite.numerique.gouv.fr/')));
  assert.ok(CRITERES.every((c) => !/\]\(#/.test(c.titre)), 'aucun lien interne du glossaire ne reste dans les titres');
});

test('chaque test a sa méthodologie officielle', () => {
  const sans = CRITERES.flatMap((c) => c.tests).filter((t) => !t.methodologie).map((t) => t.id);
  assert.deepEqual(sans, []);
});

test('critère, test et numéros invalides', () => {
  // Le texte officiel garde sa typographie (espace insécable avant « ? »).
  assert.match(critere('11.1').titre, /^Chaque champ de formulaire a-t-il une étiquette\s\?$/u);
  assert.equal(critere(' 11.1 ').numero, '11.1');
  assert.equal(critere('11.1.2').testDemande, '11.1.2');
  assert.equal(critere('13.12').numero, '13.12');
  for (const faux of ['14.1', '11.99', '11.1.99', 'onze', '', '11']) assert.equal(critere(faux), null, faux);
});

test('recherche sans accents ni majuscules, tous les mots requis', () => {
  const r = chercher('ETIQUETTE formulaire').map((c) => c.numero);
  assert.ok(r.includes('11.1') && r.includes('11.2'));
  assert.ok(chercher('captcha').some((c) => c.numero === '1.4'));
  assert.ok(chercher('contraste').some((c) => c.numero === '3.2'));
  assert.deepEqual(chercher('zzzz introuvable'), []);
  assert.deepEqual(chercher(''), []);
  assert.ok(chercher('lien').length <= 10);
});

test('thèmes', () => {
  assert.equal(theme('11').nom, 'Formulaires');
  assert.equal(theme(3).criteres.length, 3);
  assert.equal(theme('14'), null);
});

test('glossaire : terme exact, terme approché, terme absent', () => {
  assert.equal(definition('Contraste').exacte.terme, 'Contraste');
  assert.match(definition('alternative textuelle').exacte.terme, /^Alternative textuelle/);
  assert.ok(definition('lien').proches.length > 1 || definition('lien').exacte);
  assert.equal(definition('licorne').exacte, null);
  assert.ok(!/<\w+/.test(definition('Contraste').exacte.definition), 'pas de HTML dans les définitions');
});

test('nettoyage du texte officiel', () => {
  assert.equal(nettoyer('Chaque [image](#image-porteuse-d-information) a-t-elle'), 'Chaque image a-t-elle');
  assert.equal(texteDeHtml('<p>A</p><ul><li>un</li><li>deux</li></ul>'), 'A\n- un\n- deux');
});

test('outils MCP : réponses et erreurs', () => {
  assert.deepEqual(OUTILS.map((o) => o.name), ['rgaa_critere', 'rgaa_chercher', 'rgaa_theme', 'rgaa_definition']);
  const c = appeler('rgaa_critere', { numero: '1.1' });
  assert.match(c.content[0].text, /## Critère 1\.1/);
  assert.match(c.content[0].text, /Méthodologie de test/);
  assert.match(c.content[0].text, /Licence Ouverte 2\.0/);
  assert.doesNotMatch(appeler('rgaa_critere', { numero: '1.1', methodologie: false }).content[0].text, /Méthodologie de test/);
  assert.equal(appeler('rgaa_critere', { numero: '99.9' }).isError, true);
  assert.match(appeler('rgaa_theme', {}).content[0].text, /13 thèmes/);
  assert.equal(appeler('outil_inconnu').isError, true);
});

test('un test précis n’affiche que ce test', () => {
  const t = appeler('rgaa_critere', { numero: '11.1.2' }).content[0].text;
  assert.match(t, /### Test 11\.1\.2/);
  assert.doesNotMatch(t, /### Test 11\.1\.1/);
});

test('serveur MCP : échange complet sur stdio', async () => {
  const serveur = spawn(process.execPath, [BIN, 'serveur'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const reponses = [];
  let tampon = '';
  serveur.stdout.on('data', (d) => {
    tampon += d;
    let i;
    while ((i = tampon.indexOf('\n')) >= 0) {
      reponses.push(JSON.parse(tampon.slice(0, i)));
      tampon = tampon.slice(i + 1);
    }
  });
  const envoyer = (m) => serveur.stdin.write((typeof m === 'string' ? m : JSON.stringify(m)) + '\n');
  envoyer({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'essai', version: '1' } } });
  envoyer({ jsonrpc: '2.0', method: 'notifications/initialized' });
  envoyer({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  envoyer({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'rgaa_critere', arguments: { numero: '3.2' } } });
  envoyer({ jsonrpc: '2.0', id: 4, method: 'ping' });
  envoyer({ jsonrpc: '2.0', id: 5, method: 'resources/list' });
  envoyer('pas du json');
  await new Promise((r) => setTimeout(r, 600));
  serveur.kill();
  const parId = Object.fromEntries(reponses.map((r) => [r.id, r]));
  assert.equal(parId[1].result.protocolVersion, '2025-06-18');
  assert.equal(parId[1].result.serverInfo.name, 'marguerite');
  assert.equal(parId[2].result.tools.length, 4);
  assert.match(parId[3].result.content[0].text, /contraste/i);
  assert.deepEqual(parId[4].result, {});
  assert.equal(parId[5].error.code, -32601);
  assert.equal(parId.null.error.code, -32700);
  assert.equal(reponses.length, 6, 'pas de réponse à une notification');
});

test('version de protocole inconnue : le serveur propose la sienne', async () => {
  const { repondre } = await import('../src/serveur.mjs');
  assert.equal(repondre({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, '1').result.protocolVersion, '2025-06-18');
});

test('commande : sorties et erreurs', () => {
  assert.match(execFileSync(process.execPath, [BIN, 'critère', '6.1'], { encoding: 'utf8' }), /Critère 6\.1/);
  assert.match(execFileSync(process.execPath, [BIN, 'aide'], { encoding: 'utf8' }), /serveur MCP/);
  assert.throws(() => execFileSync(process.execPath, [BIN, 'critere', '20.1'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync(process.execPath, [BIN, 'nimporte'], { stdio: 'pipe' }));
});

test('les références de la skill sont à jour', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/generer-skill.mjs', import.meta.url)), '--verifier'], { stdio: 'pipe' });
});
