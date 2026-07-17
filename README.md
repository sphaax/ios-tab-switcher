# ios-tab-switcher

Extension Chrome (Manifest V3) qui reproduit le tab switcher de Chrome sur iOS, en version desktop : grille responsive de cartes d'onglets avec aperçus screenshot en direct, thème sombre, compteur d'onglets et bouton nouvel onglet flottant.

Référence visuelle : [docs/reference.jpg](docs/reference.jpg)

## Installation (mode développeur)

1. Ouvrir `chrome://extensions` dans Chrome.
2. Activer le **Mode développeur** (interrupteur en haut à droite).
3. Cliquer sur **Charger l'extension non empaquetée** (« Load unpacked »).
4. Sélectionner le dossier racine de ce dépôt (celui qui contient `manifest.json`).

## Utilisation

- **Ouvrir/fermer le switcher** : clic sur l'icône de l'extension, ou raccourci `Ctrl+Shift+Espace` (`Ctrl+Shift+Espace` aussi sur Mac, via la touche Ctrl physique). Le raccourci agit en bascule : depuis le switcher, il le referme et revient à l'onglet précédent. Modifiable dans `chrome://extensions/shortcuts`.
- **Clic sur une carte** : active l'onglet correspondant (et sa fenêtre) et ferme le switcher.
- **Clic sur le ✕** : ferme l'onglet.
- **Bouton +** : ouvre un nouvel onglet (dans le mode courant : normal, privé, ou dans le groupe ouvert).
- **Échap** : sort de la vue détail d'un groupe, sinon ferme le switcher et revient à l'onglet précédemment actif.
- Les onglets appartenant à un groupe Chrome affichent un liseré de la couleur du groupe. L'onglet actif est entouré d'une bordure bleue.
- Les **onglets épinglés** restent des cartes normales, identifiées par un badge épingle en haut à gauche de leur aperçu. Clic sur le badge → désépingle l'onglet.

### Les trois modes (pilule supérieure)

- **Onglets** (compteur, au centre) : la grille classique.
- **Navigation privée** (chapeau, à gauche) : les onglets incognito, cartes sombres, onglet actif cerclé de blanc. Nécessite d'autoriser l'extension en navigation privée (`chrome://extensions` → Détails → « Autoriser en mode navigation privée »). Les miniatures incognito sont stockées uniquement en mémoire (`storage.session`), jamais sur disque, et disparaissent à la fermeture de Chrome. Limitation Chrome : une page d'extension ne peut pas s'afficher *dans* une fenêtre privée (mode « spanning ») ; appelé depuis une fenêtre privée, le switcher s'ouvre donc dans une fenêtre normale, directement en mode privé, et rend le focus à la fenêtre privée à la fermeture.
- **Groupes** (grille, à droite) : la liste de vos vrais groupes d'onglets Chrome. Clic sur un groupe → vue détail teintée de la couleur du groupe ; le **+** y ajoute un onglet directement dans le groupe. Depuis la liste, le **+** crée un nouveau groupe Chrome.

## Comment marchent les aperçus

`chrome.tabs.captureVisibleTab()` ne peut capturer que l'onglet actuellement visible. Le service worker capture donc chaque onglet **au moment où vous le consultez** (activation ou fin de chargement, throttle ~1 s), redimensionne la capture à 480 px de large (JPEG qualité 60) et la stocke dans IndexedDB.

Conséquences :

- Un onglet jamais visité depuis l'installation n'a pas d'aperçu → carte de repli avec grand favicon centré (comme Chrome iOS pour les onglets non chargés).
- Les pages `chrome://`, le Chrome Web Store et autres pages protégées ne sont pas capturables → même repli.
- L'aperçu reflète le dernier passage sur l'onglet, pas nécessairement son état actuel.

## Structure

```
manifest.json    — MV3 ; permissions tabs, storage, favicon, tabGroups ; <all_urls>
background.js    — service worker : captures, suivi de l'onglet actif, ouverture du switcher
lib/thumbs.js    — accès IndexedDB aux miniatures (partagé SW / page)
switcher.html    — la page du switcher (ouverte en onglet plein écran)
switcher.css     — thème sombre iOS, grille responsive, animations
switcher.js      — rendu des cartes, interactions, mises à jour temps réel
```

`<all_urls>` en host permission est nécessaire : sans lui, `captureVisibleTab` exige un geste utilisateur sur l'onglet capturé (`activeTab`), incompatible avec la capture automatique en arrière-plan.

## Hors scope v1

- Mode incognito fonctionnel (icône présente mais grisée).
- Recherche, drag & drop, création/édition de groupes.
