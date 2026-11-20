---
name: marguerite
description: Référentiel RGAA 4.1.2 officiel (accessibilité numérique, DINUM) - 106 critères, tests, méthodologies et glossaire. À utiliser dès qu'on crée ou modifie une interface (page, composant, formulaire, image, tableau, couleur, navigation), qu'on vérifie son accessibilité, ou qu'on doit citer un critère RGAA. Ne jamais citer un critère de mémoire.
---

# Marguerite : le RGAA, sans rien inventer

Le RGAA 4.1.2 est le référentiel d'accessibilité de la DINUM : 106 critères en 13 thèmes. Un
critère cité de mémoire est souvent faux (numéro, formulation, condition oubliée). Cette skill
donne le texte officiel.

## Quand l'utiliser

- Avant de créer ou de modifier une interface : ouvrir le thème concerné.
- Pour vérifier l'accessibilité d'un écran ou d'un composant.
- Dès qu'on cite un critère dans une PR, un ticket, un rapport ou une revue de code.

## Comment

1. Ouvrir `references/00-index.md` : les 106 critères, un par ligne, rangés par thème.
2. Ouvrir le fichier du thème touché (par exemple `references/11-formulaires.md`) : chaque
   critère avec ses tests, la **méthodologie de test officielle**, les cas particuliers, les
   références WCAG 2.1 et le lien vers la fiche officielle.
3. Un terme en italique dans votre tête (« étiquette », « alternative textuelle », « lien
   d'évitement ») a un **sens précis** : vérifier sa définition dans `references/glossaire.md`.

| Ce que touche le changement | Thème | Fichier |
|---|---|---|
| Images, icônes, SVG, captcha | 1 Images | `01-images.md` |
| `iframe` | 2 Cadres | `02-cadres.md` |
| Couleurs, contrastes | 3 Couleurs | `03-couleurs.md` |
| Vidéo, audio, animations | 4 Multimédia | `04-multimedia.md` |
| Tableaux | 5 Tableaux | `05-tableaux.md` |
| Liens | 6 Liens | `06-liens.md` |
| JavaScript, composants interactifs, ARIA | 7 Scripts | `07-scripts.md` |
| `lang`, `title`, validité du code | 8 Éléments obligatoires | `08-elements-obligatoires.md` |
| Titres, listes, régions, structure | 9 Structuration | `09-structuration-de-l-information.md` |
| CSS, zoom, focus visible, mise en page | 10 Présentation | `10-presentation-de-l-information.md` |
| Formulaires, champs, erreurs | 11 Formulaires | `11-formulaires.md` |
| Menus, plan du site, recherche, ordre de tabulation | 12 Navigation | `12-navigation.md` |
| Délais, téléchargements, nouvelles fenêtres, gestes | 13 Consultation | `13-consultation.md` |

## Règles

- **Citer exactement** : « critère 11.1 », avec son titre officiel. Jamais un numéro de mémoire.
- **Tous les critères comptent**, y compris ceux qu'aucun outil automatique ne détecte
  (pertinence d'une alternative, ordre de lecture, cohérence).
- Un test automatique (axe-core, Lighthouse) ne suffit pas à déclarer un critère conforme : la
  méthodologie officielle dit ce qu'il faut vérifier à la main.

## Avec le serveur MCP

Si le serveur Marguerite est branché, ses outils donnent la même chose à la demande :
`rgaa_critere` (« 11.1 » ou « 11.1.2 »), `rgaa_chercher` (« contraste »), `rgaa_theme`
(« 11 ») et `rgaa_definition` (« lien d'évitement »).

Source : RGAA 4.1.2, DINUM, https://accessibilite.numerique.gouv.fr (Licence Ouverte 2.0).
