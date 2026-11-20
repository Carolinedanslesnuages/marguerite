/** Mise en forme Markdown des réponses (serveur MCP, commande, skill). */
import { VERSION, SITE, THEMES } from './referentiel.mjs';

export const SOURCE = `Source : RGAA ${VERSION}, DINUM, ${SITE} (Licence Ouverte 2.0).`;

/** Un critère complet : titre, tests, méthodologie (si demandée), cas particuliers, références. */
export function critereEnMarkdown(c, { methodologie = true } = {}) {
  const l = [`## Critère ${c.numero} (thème ${c.theme})`, '', `**${c.titre}**`, ''];
  for (const t of c.tests) {
    const vise = c.testDemande && c.testDemande !== t.id;
    if (vise) continue; // un test précis a été demandé : on n'affiche que lui
    l.push(`### Test ${t.id}`, '', t.question);
    t.conditions.forEach((cond) => l.push(`- ${cond}`));
    if (methodologie && t.methodologie) l.push('', '**Méthodologie de test**', '', t.methodologie);
    l.push('');
  }
  if (c.casParticuliers.length) l.push('### Cas particuliers', '', ...c.casParticuliers, '');
  if (c.notesTechniques.length) l.push('### Notes techniques', '', ...c.notesTechniques, '');
  if (c.wcag.length) l.push(`**WCAG 2.1** : ${c.wcag.join(' · ')}`);
  if (c.techniques.length) l.push(`**Techniques WCAG** : ${c.techniques.join(', ')}`);
  l.push(`**Fiche officielle** : ${c.lien}`);
  return l.join('\n');
}

export const ligneCritere = (c) => `- **${c.numero}** ${c.titre}`;

export function themeEnMarkdown(t) {
  return [`## Thème ${t.numero} — ${t.nom}`, '', ...t.criteres.map(ligneCritere)].join('\n');
}

export function index() {
  return [`# RGAA ${VERSION} — les 106 critères`, '', ...THEMES.map((t) => themeEnMarkdown(t) + '\n')].join('\n');
}
