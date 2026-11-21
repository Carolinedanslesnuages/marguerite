/** Markdown formatting of answers (MCP server, command, skill). */
import { VERSION, SITE, TOPICS } from './rgaa.mjs';

export const SOURCE = `Source : RGAA ${VERSION}, DINUM, ${SITE} (Licence Ouverte 2.0).`;

/** A full criterion: title, tests, methodology (when asked), particular cases, references. */
export function criterionMarkdown(criterion, { methodology = true } = {}) {
  const lines = [`## Critère ${criterion.number} (thème ${criterion.topicName})`, '', `**${criterion.title}**`, ''];
  for (const test of criterion.tests) {
    // A specific test was requested: only show that one.
    if (criterion.requestedTest && criterion.requestedTest !== test.testId) continue;
    lines.push(`### Test ${test.testId}`, '', test.question);
    test.conditions.forEach((condition) => lines.push(`- ${condition}`));
    if (methodology && test.methodology) lines.push('', '**Méthodologie de test**', '', test.methodology);
    lines.push('');
  }
  if (criterion.particularCases.length) lines.push('### Cas particuliers', '', ...criterion.particularCases, '');
  if (criterion.technicalNotes.length) lines.push('### Notes techniques', '', ...criterion.technicalNotes, '');
  if (criterion.wcag.length) lines.push(`**WCAG 2.1** : ${criterion.wcag.join(' · ')}`);
  if (criterion.techniques.length) lines.push(`**Techniques WCAG** : ${criterion.techniques.join(', ')}`);
  lines.push(`**Fiche officielle** : ${criterion.link}`);
  return lines.join('\n');
}

export const criterionLine = (criterion) => `- **${criterion.number}** ${criterion.title}`;

export function topicMarkdown(topic) {
  return [`## Thème ${topic.number} — ${topic.name}`, '', ...topic.criteria.map(criterionLine)].join('\n');
}

export function indexMarkdown() {
  return [`# RGAA ${VERSION} — les 106 critères`, '', ...TOPICS.map((topic) => topicMarkdown(topic) + '\n')].join('\n');
}
