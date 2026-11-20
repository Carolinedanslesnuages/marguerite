#!/usr/bin/env node
/**
 * Génère les références de la skill (skill/marguerite/references/) depuis les fichiers officiels.
 * --verifier : échoue si les fichiers commités ne sont plus à jour (utilisé par la CI).
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, GLOSSAIRE, VERSION, ancre } from '../src/referentiel.mjs';
import { critereEnMarkdown, index, SOURCE } from '../src/format.mjs';

const dossier = fileURLToPath(new URL('../skill/marguerite/references/', import.meta.url));
const AVERTISSEMENT = `> Généré par \`scripts/generer-skill.mjs\` depuis les fichiers officiels : ne pas modifier à la main.\n> ${SOURCE}\n`;

const fichiers = new Map();
fichiers.set('00-index.md', `${index()}\n${AVERTISSEMENT}`);
for (const t of THEMES) {
  const nom = `${String(t.numero).padStart(2, '0')}-${ancre(t.nom)}.md`;
  fichiers.set(nom, [`# Thème ${t.numero} — ${t.nom} (RGAA ${VERSION})`, '', AVERTISSEMENT, ...t.criteres.map((c) => critereEnMarkdown(c) + '\n')].join('\n'));
}
fichiers.set('glossaire.md', [`# Glossaire du RGAA ${VERSION}`, '', AVERTISSEMENT, ...GLOSSAIRE.map((g) => `## ${g.terme}\n\n${g.definition}\n`)].join('\n'));

if (process.argv.includes('--verifier')) {
  const differents = [...fichiers].filter(([nom, contenu]) => !existsSync(join(dossier, nom)) || readFileSync(join(dossier, nom), 'utf8') !== contenu).map(([nom]) => nom);
  const enTrop = existsSync(dossier) ? readdirSync(dossier).filter((n) => !fichiers.has(n)) : [];
  if (differents.length || enTrop.length) {
    console.error(`Références de la skill pas à jour : ${[...differents, ...enTrop].join(', ')}. Lancez « npm run skill ».`);
    process.exit(1);
  }
  console.log(`Références de la skill à jour (${fichiers.size} fichiers).`);
} else {
  mkdirSync(dossier, { recursive: true });
  for (const [nom, contenu] of fichiers) writeFileSync(join(dossier, nom), contenu);
  console.log(`${fichiers.size} fichiers écrits dans skill/marguerite/references/.`);
}
