#!/usr/bin/env node
/**
 * Builds the skill references (skill/marguerite/references/) from the official files.
 * --verifier: fails when the committed files are out of date (used by CI).
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS, GLOSSARY, VERSION, anchor } from '../src/rgaa.mjs';
import { criterionMarkdown, indexMarkdown, SOURCE } from '../src/format.mjs';

const referencesFolder = fileURLToPath(new URL('../skill/marguerite/references/', import.meta.url));
const WARNING = `> Généré par \`scripts/build-skill.mjs\` depuis les fichiers officiels : ne pas modifier à la main.\n> ${SOURCE}\n`;

const files = new Map();
files.set('00-index.md', `${indexMarkdown()}\n${WARNING}`);
for (const topic of TOPICS) {
  const fileName = `${String(topic.number).padStart(2, '0')}-${anchor(topic.name)}.md`;
  files.set(fileName, [`# Thème ${topic.number} — ${topic.name} (RGAA ${VERSION})`, '', WARNING, ...topic.criteria.map((criterion) => criterionMarkdown(criterion) + '\n')].join('\n'));
}
files.set('glossaire.md', [`# Glossaire du RGAA ${VERSION}`, '', WARNING, ...GLOSSARY.map((entry) => `## ${entry.term}\n\n${entry.definition}\n`)].join('\n'));

if (process.argv.includes('--verifier')) {
  const outdated = [...files]
    .filter(([fileName, content]) => !existsSync(join(referencesFolder, fileName)) || readFileSync(join(referencesFolder, fileName), 'utf8') !== content)
    .map(([fileName]) => fileName);
  const extra = existsSync(referencesFolder) ? readdirSync(referencesFolder).filter((fileName) => !files.has(fileName)) : [];
  if (outdated.length || extra.length) {
    console.error(`Références de la skill pas à jour : ${[...outdated, ...extra].join(', ')}. Lancez « npm run skill ».`);
    process.exit(1);
  }
  console.log(`Références de la skill à jour (${files.size} fichiers).`);
} else {
  mkdirSync(referencesFolder, { recursive: true });
  for (const [fileName, content] of files) writeFileSync(join(referencesFolder, fileName), content);
  console.log(`${files.size} fichiers écrits dans skill/marguerite/references/.`);
}
