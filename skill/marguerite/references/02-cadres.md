# Thème 2 — Cadres (RGAA 4.1.2)

> Généré par `scripts/build-skill.mjs` depuis les fichiers officiels : ne pas modifier à la main.
> Source : RGAA 4.1.2, DINUM, https://accessibilite.numerique.gouv.fr (Licence Ouverte 2.0).

## Critère 2.1 (thème Cadres)

**Chaque cadre a-t-il un titre de cadre ?**

### Test 2.1.1

Chaque cadre (balise `<iframe>` ou `<frame>`) a-t-il un attribut `title` ?

**Méthodologie de test**

1. Retrouver dans le document les cadres (élément `<iframe>` ou `<frame>`) ;
2. Pour chaque cadre, vérifier qu’il possède un attribut `title `;
3. Si c’est le cas pour chaque cadre, **le test est validé**.

**WCAG 2.1** : 4.1.2 Name, Role, Value (A)
**Techniques WCAG** : H64
**Fiche officielle** : https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#2.1

## Critère 2.2 (thème Cadres)

**Pour chaque cadre ayant un titre de cadre, ce titre de cadre est-il pertinent ?**

### Test 2.2.1

Pour chaque cadre (balise `<iframe>` ou `<frame>`) ayant un attribut `title`, le contenu de cet attribut est-il pertinent ?

**Méthodologie de test**

1. Retrouver dans le document les cadres (élément `<iframe>` ou `<frame>`) ;
2. Pour chaque cadre pourvu d’un attribut `title`, vérifier que son contenu est pertinent ;
3. Si c’est le cas pour chaque cadre, **le test est validé**.

**WCAG 2.1** : 4.1.2 Name, Role, Value (A)
**Techniques WCAG** : H64
**Fiche officielle** : https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#2.2
