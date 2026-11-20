/**
 * Le RGAA 4.1.2, lu depuis les fichiers officiels de la DINUM (Licence Ouverte 2.0).
 * Fonctions pures : retrouver un critère, chercher, lister un thème, définir un terme.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VERSION = '4.1.2';
export const SITE = 'https://accessibilite.numerique.gouv.fr';
const lire = (nom) => JSON.parse(readFileSync(fileURLToPath(new URL(`../referentiel/${VERSION}/${nom}`, import.meta.url)), 'utf8'));

const brut = lire('criteres.json');
const glossaireBrut = lire('glossaire.json').glossary;
const methodologies = lire('methodologies.json');

/** « [terme](#ancre) » → « terme » : le texte garde tout son sens sans le lien du glossaire. */
export const nettoyer = (texte) => String(texte ?? '').replace(/\[([^\]]+)\]\(#[^)]+\)/g, '$1').trim();

/** HTML simple du glossaire → texte lisible (listes en « - »). */
export function texteDeHtml(html) {
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

/** Aplatit les cas particuliers et notes techniques (chaînes, listes, objets { ul: [...] }). */
function aplatir(valeur, puce = '') {
  if (valeur == null) return [];
  if (typeof valeur === 'string') return [puce + nettoyer(valeur)];
  if (Array.isArray(valeur)) return valeur.flatMap((v) => aplatir(v, puce));
  if (typeof valeur === 'object') return Object.values(valeur).flatMap((v) => aplatir(v, '- '));
  return [puce + String(valeur)];
}

export const sansAccent = (t) => String(t).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const ancre = (t) => sansAccent(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Les 13 thèmes et leurs 106 critères, nettoyés. */
export const THEMES = brut.topics.map((t) => ({
  numero: t.number,
  nom: t.topic,
  criteres: t.criteria.map(({ criterium: c }) => {
    const numero = `${t.number}.${c.number}`;
    return {
      numero,
      theme: t.topic,
      titre: nettoyer(c.title),
      tests: Object.entries(c.tests).map(([n, lignes]) => {
        const id = `${numero}.${n}`;
        const [question, ...conditions] = (Array.isArray(lignes) ? lignes : [lignes]).map(nettoyer);
        return { id, question, conditions, methodologie: methodologies[id] ? nettoyer(methodologies[id]) : null };
      }),
      wcag: (c.references || []).flatMap((r) => r.wcag || []),
      techniques: (c.references || []).flatMap((r) => r.techniques || []),
      casParticuliers: aplatir(c.particularCases),
      notesTechniques: aplatir(c.technicalNote),
      lien: `${SITE}/methode/criteres-et-tests/#${numero}`,
    };
  }),
}));

export const CRITERES = THEMES.flatMap((t) => t.criteres);

export const GLOSSAIRE = glossaireBrut.map((g) => ({ terme: nettoyer(g.title), ancre: ancre(nettoyer(g.title)), definition: texteDeHtml(g.body) }));

/** Un critère (« 11.1 ») ou le critère d'un test (« 11.1.2 »). */
export function critere(numero) {
  const m = /^\s*(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?\s*$/.exec(String(numero));
  if (!m) return null;
  const c = CRITERES.find((x) => x.numero === `${Number(m[1])}.${Number(m[2])}`);
  if (!c) return null;
  if (m[3]) {
    const test = c.tests.find((t) => t.id === `${c.numero}.${Number(m[3])}`);
    return test ? { ...c, testDemande: test.id } : null;
  }
  return c;
}

export function theme(numero) {
  return THEMES.find((t) => String(t.numero) === String(numero).trim()) || null;
}

/**
 * Cherche des critères : tous les mots doivent apparaître (sans tenir compte des accents ni des
 * majuscules), dans le titre, les tests ou les cas particuliers. Le titre compte plus.
 */
export function chercher(texte, max = 10) {
  const mots = sansAccent(texte).split(/[^a-z0-9-]+/).filter((m) => m.length >= 2);
  if (!mots.length) return [];
  return CRITERES.map((c) => {
    const titre = sansAccent(c.titre);
    const corps = sansAccent([...c.tests.flatMap((t) => [t.question, ...t.conditions]), ...c.casParticuliers, ...c.wcag, ...c.techniques].join(' '));
    if (!mots.every((m) => titre.includes(m) || corps.includes(m))) return null;
    const score = mots.reduce((s, m) => s + (titre.includes(m) ? 10 : 0) + corps.split(m).length - 1, 0);
    return { critere: c, score };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || CRITERES.indexOf(a.critere) - CRITERES.indexOf(b.critere))
    .slice(0, max)
    .map((r) => r.critere);
}

/** Définition du glossaire : terme exact, sinon le terme qui le contient, sinon les plus proches. */
export function definition(terme) {
  const cle = sansAccent(terme).trim();
  if (!cle) return { exacte: null, proches: [] };
  const exacte = GLOSSAIRE.find((g) => sansAccent(g.terme) === cle) || GLOSSAIRE.find((g) => ancre(g.terme) === ancre(cle));
  if (exacte) return { exacte, proches: [] };
  const proches = GLOSSAIRE.filter((g) => sansAccent(g.terme).includes(cle) || cle.split(/\s+/).every((m) => sansAccent(g.terme).includes(m)));
  return { exacte: proches.length === 1 ? proches[0] : null, proches: proches.length === 1 ? [] : proches.slice(0, 15) };
}
