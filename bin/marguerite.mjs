#!/usr/bin/env node
/** Marguerite : le RGAA officiel pour les agents de code, et pour vous. */
import { readFileSync } from 'node:fs';
import { appeler } from '../src/serveur.mjs';
import { demarrer } from '../src/serveur.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const AIDE = `Marguerite · le RGAA 4.1.2 officiel, pour les agents de code et pour vous

Usage :
  marguerite critere <numéro>     un critère (11.1) ou un test (11.1.2), avec sa méthodologie
  marguerite chercher <mots>      les critères qui parlent d'un sujet
  marguerite theme [numéro]       les critères d'un thème, ou la liste des 13 thèmes
  marguerite definition <terme>   un terme du glossaire officiel
  marguerite serveur              lance le serveur MCP (pour un agent de code)

Source : DINUM, https://accessibilite.numerique.gouv.fr (Licence Ouverte 2.0).`;

const [commande, ...reste] = process.argv.slice(2);
const arg = reste.join(' ');
const OUTIL = { critere: ['rgaa_critere', 'numero'], chercher: ['rgaa_chercher', 'texte'], theme: ['rgaa_theme', 'numero'], definition: ['rgaa_definition', 'terme'] };
const cle = commande && commande.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

if (cle === 'serveur') demarrer(version);
else if (OUTIL[cle]) {
  const [outil, param] = OUTIL[cle];
  const r = appeler(outil, arg ? { [param]: arg } : {});
  console.log(r.content[0].text);
  if (r.isError) process.exit(1);
} else if (!commande || ['aide', '--aide', '-h', '--help'].includes(cle)) console.log(AIDE);
else {
  console.error(`marguerite : commande inconnue « ${commande} ». Tapez « marguerite aide ».`);
  process.exit(1);
}
