/**
 * RGAA 4.1.2, read from DINUM's official files (Licence Ouverte 2.0).
 * Pure functions: find a criterion, search, list a topic, define a term.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VERSION = '4.1.2';
export const SITE = 'https://accessibilite.numerique.gouv.fr';
const readOfficialFile = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../rgaa/${VERSION}/${name}`, import.meta.url)), 'utf8'));

const rawCriteria = readOfficialFile('criteres.json');
const rawGlossary = readOfficialFile('glossaire.json').glossary;
const methodologies = readOfficialFile('methodologies.json');

/** "[term](#anchor)" → "term": the text keeps its full meaning without the glossary link. */
export const cleanText = (text) => String(text ?? '').replace(/\[([^\]]+)\]\(#[^)]+\)/g, '$1').trim();

/** Simple glossary HTML → readable text (lists as "- "). */
export function textFromHtml(html) {
  return String(html ?? '')
    .replace(/<li[^>]*>\s*/gi, '\n- ')
    .replace(/<\/(p|ul|ol|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+- /g, '\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Flattens particular cases and technical notes (strings, lists, { ul: [...] } objects). */
function flatten(value, bullet = '') {
  if (value == null) return [];
  if (typeof value === 'string') return [bullet + cleanText(value)];
  if (Array.isArray(value)) return value.flatMap((item) => flatten(item, bullet));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => flatten(item, '- '));
  return [bullet + String(value)];
}

export const withoutAccents = (text) => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const anchor = (text) => withoutAccents(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The 13 topics and their 106 criteria, cleaned up. */
export const TOPICS = rawCriteria.topics.map((topic) => ({
  number: topic.number,
  name: topic.topic,
  criteria: topic.criteria.map(({ criterium }) => {
    const number = `${topic.number}.${criterium.number}`;
    return {
      number,
      topicName: topic.topic,
      title: cleanText(criterium.title),
      tests: Object.entries(criterium.tests).map(([testNumber, lines]) => {
        const testId = `${number}.${testNumber}`;
        const [question, ...conditions] = (Array.isArray(lines) ? lines : [lines]).map(cleanText);
        return { testId, question, conditions, methodology: methodologies[testId] ? cleanText(methodologies[testId]) : null };
      }),
      wcag: (criterium.references || []).flatMap((reference) => reference.wcag || []),
      techniques: (criterium.references || []).flatMap((reference) => reference.techniques || []),
      particularCases: flatten(criterium.particularCases),
      technicalNotes: flatten(criterium.technicalNote),
      link: `${SITE}/methode/criteres-et-tests/#${number}`,
    };
  }),
}));

export const CRITERIA = TOPICS.flatMap((topic) => topic.criteria);

export const GLOSSARY = rawGlossary.map((entry) => ({
  term: cleanText(entry.title),
  anchor: anchor(cleanText(entry.title)),
  definition: textFromHtml(entry.body),
}));

/** A criterion ("11.1") or the criterion of a test ("11.1.2"). */
export function findCriterion(reference) {
  const match = /^\s*(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?\s*$/.exec(String(reference));
  if (!match) return null;
  const criterion = CRITERIA.find((candidate) => candidate.number === `${Number(match[1])}.${Number(match[2])}`);
  if (!criterion) return null;
  if (match[3]) {
    const test = criterion.tests.find((candidate) => candidate.testId === `${criterion.number}.${Number(match[3])}`);
    return test ? { ...criterion, requestedTest: test.testId } : null;
  }
  return criterion;
}

export function findTopic(number) {
  return TOPICS.find((topic) => String(topic.number) === String(number).trim()) || null;
}

/**
 * Searches criteria: every word must appear (ignoring accents and case), in the title, the tests
 * or the particular cases. The title weighs more.
 */
export function search(text, limit = 10) {
  const words = withoutAccents(text).split(/[^a-z0-9-]+/).filter((word) => word.length >= 2);
  if (!words.length) return [];
  return CRITERIA.map((criterion) => {
    const title = withoutAccents(criterion.title);
    const body = withoutAccents([
      ...criterion.tests.flatMap((test) => [test.question, ...test.conditions]),
      ...criterion.particularCases,
      ...criterion.wcag,
      ...criterion.techniques,
    ].join(' '));
    if (!words.every((word) => title.includes(word) || body.includes(word))) return null;
    const score = words.reduce((total, word) => total + (title.includes(word) ? 10 : 0) + body.split(word).length - 1, 0);
    return { criterion, score };
  })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || CRITERIA.indexOf(left.criterion) - CRITERIA.indexOf(right.criterion))
    .slice(0, limit)
    .map((match) => match.criterion);
}

/** Glossary definition: exact term, otherwise the single term containing it, otherwise the closest ones. */
export function define(term) {
  const searched = withoutAccents(term).trim();
  if (!searched) return { exact: null, close: [] };
  const exact = GLOSSARY.find((entry) => withoutAccents(entry.term) === searched) || GLOSSARY.find((entry) => anchor(entry.term) === anchor(searched));
  if (exact) return { exact, close: [] };
  const close = GLOSSARY.filter((entry) => {
    const candidate = withoutAccents(entry.term);
    return candidate.includes(searched) || searched.split(/\s+/).every((word) => candidate.includes(word));
  });
  return { exact: close.length === 1 ? close[0] : null, close: close.length === 1 ? [] : close.slice(0, 15) };
}
