# Itérations — représentation visuelle des groupes d'onglets

Harnais : `node test/screenshot.js <N>` monte `test/fixture.html` (vraie vue,
`chrome.*` mockés, données factices) en 1920×1080 et 1280×720 →
`test/shots/iter-{N}-{taille}.png`.

Critères notés /5 (sévère) : **Délimitation**, **Identité** (nom+couleur),
**Hiérarchie** (fenêtre > groupe > onglet), **Onglets libres** (distincts sans
paraître cassés), **Densité**, **Cohérence** (iOS), **Accessibilité** (pas que
la couleur). Stop quand tous ≥ 4.

---

## Iter 0 — baseline (overlay SVG concave/convexe, anneau 2px, sans nom)

Direction : état de départ de la branche — fond de groupe en SVG derrière les
cartes + anneau coloré par carte, aucun nom affiché.

Scores : Délimitation 2 · Identité 1 · Hiérarchie 2 · Libres 4 · Densité 5 ·
Cohérence 4 · Accessibilité 1.

3 pires défauts :
1. Aucun nom de groupe dans la grille — impossible de distinguer « Recherche
   design » de « Veille » autrement que par la couleur (échoue Accessibilité).
2. Le fond SVG (opacité 0.16) est quasi invisible sur fond sombre ; le seul
   signal réel est l'anneau par carte, qui fait lire 6 cartes séparées plutôt
   qu'un groupe.
3. Le groupe rouge sans titre n'a aucun libellé de repli.

Décision : itérer. Attaquer nom + délimitation en priorité.

---

## Iter 1 — conteneur de groupe pleine largeur avec en-tête

Direction : chaque suite d'un même groupe devient une `<section>` pleine
largeur, fond teinté de la couleur du groupe, en-tête = pastille + nom +
compteur. Repli « Groupe sans nom » en italique. Anneau par carte retiré dans
le conteneur. Overlay SVG désactivé.

Scores : Délimitation 4 · Identité 5 · Hiérarchie 3 · Libres 5 · Densité 2 ·
Cohérence 4 · Accessibilité 5.

3 pires défauts :
1. Densité : le groupe « Perso » (1 onglet) occupe une rangée pleine largeur
   avec ~80 % de vide teinté ; les dernières rangées des groupes laissent
   aussi des cellules vides.
2. Hiérarchie inversée : « Fenêtre 2 · 14 onglets » est un petit texte gris,
   visuellement plus faible que les en-têtes de groupe en gras — la fenêtre
   (niveau supérieur) paraît subordonnée au groupe.
3. Teinte de fond assez saturée (bleu/violet), un peu lourde pour l'esthétique
   iOS, et elle souligne la zone vide des petits groupes.

Décision : itérer. Attaquer densité (conteneur dimensionné au contenu) et
hiérarchie (en-tête de fenêtre renforcé).

---

## Iter 2 — conteneur dimensionné au contenu (`grid-column: span N`) — ÉCHEC

Direction : au lieu de pleine largeur, le conteneur s'étend sur `span N`
colonnes (N = nb d'onglets) pour laisser les onglets libres occuper le reste
de la ligne. + en-tête de fenêtre renforcé + teinte calmée.

Résultat : régression catastrophique. `span var(--span)` combiné à
`auto-fill` + `1fr` + `aspect-ratio` casse la grille — colonnes géantes,
cartes empilées verticalement, hauteurs délirantes. Tous les critères
s'effondrent.

Décision : REVENIR EN ARRIÈRE (consigne : ne pas empiler de rustines). On
garde les bons apports (en-tête fenêtre, teinte) et on rétablit la pleine
largeur. Pas de commit de cette direction.

---

## Iter 3 — retour pleine largeur + hiérarchie fenêtre + teinte calmée

Direction : conteneur pleine largeur (revert du span), en-tête de fenêtre
affirmé (texte clair 18px gras + filet de séparation pleine largeur), fond de
groupe adouci (teinte 9 % + liseré 1px de la couleur).

Scores : Délimitation 4 · Identité 5 · Hiérarchie 4 · Libres 5 · Densité 2 ·
Cohérence 4 · Accessibilité 5.

3 pires défauts :
1. Densité : « Perso » (1 onglet) et « Groupe sans nom » (2) laissent une
   grande zone teintée vide à droite ; le groupe bleu (6) laisse 2 cellules
   vides. Gaspillage net vs la grille de base.
2. Les onglets libres après un groupe (GitHub, Docs) repartent sur une
   nouvelle rangée sous le conteneur : ok, mais accentue le vide.
3. Le liseré coloré sur fond sombre reste discret pour les couleurs foncées
   (rouge/violet).

Décision : tous ≥ 4 sauf Densité. Itérer UNIQUEMENT sur la densité, sans
casser le reste (le span est exclu). Piste iter-4 : onglets libres autorisés
à combler la fin de rangée d'un groupe, OU petits groupes rendus compacts.
