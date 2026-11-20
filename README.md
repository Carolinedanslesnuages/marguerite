# Marguerite

Le RGAA 4.1.2 officiel pour les agents de code. Un agent qui cite un critère d'accessibilité de
mémoire se trompe souvent : mauvais numéro, formulation approximative, condition oubliée.
Marguerite lui donne le **texte officiel** : les 106 critères, leurs tests, la méthodologie de
test de chacun et le glossaire.

Trois façons de s'en servir :

| | Pour qui | Ce que ça donne |
|---|---|---|
| [Serveur MCP](#serveur-mcp) | Claude Code, et tout agent compatible MCP | 4 outils que l'agent appelle quand il en a besoin |
| [Skill](#skill) | Claude Code, Codex, Cursor, Copilot… (format Agent Skills) | Le référentiel en fichiers, lu par l'agent |
| [Commande](#commande) | Vous, dans le terminal | La réponse tout de suite |

Le nom rend hommage à sœur Marguerite, qui a mis au point, à la fin du XIXᵉ siècle, une méthode de
communication tactile pour Marie Heurtin, sourde et aveugle de naissance : trouver un moyen de
communiquer là où il n'en existait pas.

## Serveur MCP

Il faut Node.js 20 ou plus récent. Dans un projet, avec Claude Code :

```sh
claude mcp add marguerite -- npx -y github:Carolinedanslesnuages/marguerite serveur
```

| Outil | Exemple | Réponse |
|---|---|---|
| `rgaa_critere` | `11.1` ou `11.1.2` | Le critère ou le test : titre, tests, méthodologie, cas particuliers, références WCAG, fiche officielle |
| `rgaa_chercher` | `étiquette formulaire` | Les critères les plus pertinents, avec leur numéro |
| `rgaa_theme` | `11` | Les critères d'un thème (sans numéro : les 13 thèmes) |
| `rgaa_definition` | `alternative textuelle` | La définition du glossaire officiel |

La recherche ignore les accents et les majuscules. Tous les mots doivent apparaître.

## Skill

Copiez le dossier [`skill/marguerite`](skill/marguerite) dans `.claude/skills/` (Claude Code) ou
`.agents/skills/` (autres agents) de votre projet. Il contient :

- `SKILL.md` : quand et comment utiliser le référentiel, et quel thème ouvrir selon ce que touche
  le changement ;
- `references/00-index.md` : les 106 critères, un par ligne ;
- `references/01-images.md` … `13-consultation.md` : chaque critère en entier, avec la
  méthodologie de test ;
- `references/glossaire.md` : le glossaire.

## Commande

```sh
npx github:Carolinedanslesnuages/marguerite critere 11.1
npx github:Carolinedanslesnuages/marguerite chercher contraste
npx github:Carolinedanslesnuages/marguerite theme 11
npx github:Carolinedanslesnuages/marguerite definition "lien d'évitement"
```

## Source et licence

Le référentiel vient des fichiers officiels de la DINUM, dépôt
[DISIC/accessibilite.numerique.gouv.fr](https://github.com/DISIC/accessibilite.numerique.gouv.fr),
copiés sans modification dans [`referentiel/4.1.2`](referentiel/4.1.2/SOURCE.md). Ces contenus
sont sous [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/) ;
source : DINUM, https://accessibilite.numerique.gouv.fr.

Marguerite n'est pas un outil officiel. Elle aide à lire le référentiel ; elle ne remplace ni un
audit ni le site officiel.

Le code de Marguerite est sous licence [MIT](LICENSE).

## Développer

```sh
npm test          # tests, dont un échange MCP complet
npm run skill     # régénère skill/marguerite/references après une mise à jour du référentiel
```
