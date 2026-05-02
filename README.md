# Star Wars Game — R2D2 vs l'Empire

Projet réalisé dans le cadre du **TP7 — Jeux vidéo** du module Programmation Web Client 1, Université Grenoble Alpes 2026.

Groupe : PECHE Chirine, ... Alain

---

## Structure des fichiers

```
index.html      → structure HTML du jeu (sprites, HUD, écrans)
style.css       → mise en forme, animations CSS, HUD
code.js         → logique complète du jeu en JavaScript pur
data/           → images et fond (fournis par le sujet)
  R2D2.png
  x_wing.png
  anakin_starfighter.png
  naboo_starfighter.png
  obi_wan_starfighter.png
  darthvader.png
  desert_sand.jpg
```

---

## Lancement

Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).  
Aucune installation, aucune dépendance externe.

---

## Règles du jeu

- Déplacer R2D2 avec les **flèches directionnelles** ou **Z Q S D**
- **Attraper** les vaisseaux alliés qui tombent pour gagner des points
- **Éviter** Darth Vader qui traverse l'écran horizontalement — chaque contact coûte une vie
- **Attraper le cœur bonus** ❤️ qui apparaît aléatoirement pour regagner une vie
- La partie dure **3 minutes** ou se termine si R2D2 perd ses 3 vies

---

## Points par vaisseau

| Vaisseau              | Points |
|-----------------------|--------|
| X-Wing                | +30    |
| Obi-Wan Starfighter   | +25    |
| Anakin Starfighter    | +20    |
| Naboo Starfighter     | +15    |
| Darth Vader           | -1 vie |

---

## Niveaux de difficulté

Le niveau monte automatiquement selon le score. À chaque passage de niveau, la vitesse de tous les sprites augmente, de nouveaux vaisseaux s'ajoutent et de nouveaux Darth Vaders apparaissent.

| Niveau | Score requis | Multiplicateur vitesse | Darth Vaders | Vaisseaux supplémentaires       |
|--------|-------------|------------------------|--------------|----------------------------------|
| 1      | 0 pts       | ×1.0                   | 1            | —                                |
| 2      | 100 pts     | ×1.4                   | 2            | +1 X-Wing                        |
| 3      | 250 pts     | ×1.8                   | 3            | +1 X-Wing, +1 Naboo Starfighter  |

---

## Architecture technique

### Classes principales

#### `Position`
Représente une position immuable (x, y). Expose `shift(x, y)` et `move(speed, duration)` pour calculer une nouvelle position sans modifier l'originale.

#### `Rectangle`
Représente une hitbox rectangulaire définie par une position `{x, y}` et une taille `{width, height}`.

- `areIntersecting(r)` — implémente la formule du sujet :  
  deux rectangles R1 et R2 ne se touchent **pas** si :
  - R2 est à droite de R1 : `r.x > this.x + this.width`
  - R2 est à gauche de R1 : `r.x + r.width < this.x`
  - R2 est en dessous de R1 : `r.y > this.y + this.height`
  - R2 est au-dessus de R1 : `r.y + r.height < this.y`
- `isInside(r)` — retourne vrai si ce rectangle est entièrement contenu dans `r`

#### `Speed`
Vitesse en pixels par seconde sur les axes X et Y, avec une vitesse maximale. Expose `change(dx, dy)` (incrément) et `set(x, y)` (valeur directe). La méthode `delta(duration)` convertit px/s en déplacement réel selon le temps écoulé.

#### `Sprite`
Classe de base pour tous les objets du jeu. Gère :
- Le clonage du nœud DOM source et son ajout dans le playground
- Le positionnement CSS (`left`, `top`) via le setter `pos`
- La méthode `hitbox(pos?)` — **surcharge simulée** : si `pos` est `undefined`, utilise la position actuelle ; sinon simule la hitbox à une position future
- La méthode `collidesWith(other)` — raccourci vers `hitbox().areIntersecting(other.hitbox())`
- La méthode `shake()` — déclenche l'animation CSS de tremblement

> **Correction bug collision** : la taille du sprite (`#size`) est lue sur l'image **source** (dans `.resources`) avant clonage. Lire sur le clone donnait `{width:0, height:0}` car il n'était pas encore rendu par le navigateur.

#### `Plane extends Sprite`
Sous-type de Sprite pour les vaisseaux alliés. Gère :
- L'apparition aléatoire en haut de l'écran (`start()`)
- La chute verticale avec dérive horizontale
- Le redémarrage automatique après sortie par le bas
- Un `speedMultiplier` ajustable selon le niveau

#### `DarthVader extends Sprite`
Sous-type de Sprite pour l'ennemi. Traverse l'écran horizontalement (gauche→droite ou droite→gauche), réapparaît après un délai aléatoire. `speedMultiplier` ajustable.

#### `BonusLife`
Gère le cœur bonus : apparition aléatoire dans l'aire de jeu, durée de vie limitée à 8 secondes, détection de collision avec R2D2 via sa propre `hitbox()`.

---

### Boucle de jeu — `requestAnimationFrame`

```
window.addEventListener("load")
    → clic sur "JOUER"
        → audio.init()
        → countdown 3... 2... 1... GO !
            → game.init()
                → main(0)                          ← premier appel
                    → requestAnimationFrame(main)  ← le navigateur rappelle main(tFrame)
                        → game.update(tFrame)
                            duration = tFrame - tFrameLast   ← anti-saccades
                            → r2d2.update(duration)
                            → sprite.update(duration)        ← chaque vaisseau
                                → pos = pos.move(speed, duration)
                                    → delta = vitesse × duration / 1000
```

La clé : `duration / 1000` convertit les millisecondes en secondes, rendant le déplacement **indépendant du taux de rafraîchissement** réel de l'écran (60Hz, 144Hz...).

---

### Audio — Web Audio API

Aucune librairie externe. Tout est généré par `AudioContext` :

- **Musique d'ambiance** : mélodie en boucle composée d'oscillateurs `sine` enchaînés avec enveloppes de volume (attaque/release)
- **Son de capture** : oscillateur `square` avec glissement fréquentiel montant (880Hz → 1320Hz)
- **Son de collision Vader** : oscillateur `sawtooth` avec glissement descendant (440Hz → 110Hz)
- Bouton 🔊 / 🔇 qui coupe/rétablit le son via `GainNode`

> L'`AudioContext` est créé au clic sur "JOUER" (geste utilisateur requis par les navigateurs modernes).

---

### Gestion des niveaux

Définis dans le tableau `LEVELS`. À chaque frame, `game.checkLevelUp()` compare le score au seuil du niveau suivant. Si atteint, `game.applyLevel()` :
1. Met à jour le `speedMultiplier` de tous les sprites existants
2. Instancie les nouveaux vaisseaux supplémentaires
3. Instancie les nouveaux Darth Vaders
4. Affiche la bannière de niveau pendant 2,5 secondes

---

## Origine des images

Images fournies par le sujet du TP (Université Grenoble Alpes — J. Chevallier).  
Fond `desert_sand.jpg` : fourni dans `data.zip` du sujet.
Fond d'écran d'acceuil `fondmenu.png`
Logo d'écran d'acceuil `logo.png`

---

## Contrôles

| Touche             | Action                     |
|--------------------|----------------------------|
| ← / Q              | Déplacer R2D2 à gauche     |
| → / D              | Déplacer R2D2 à droite     |
| ↑ / Z              | Déplacer R2D2 en haut      |
| ↓ / S              | Déplacer R2D2 en bas       |
| Bouton 🔊          | Couper / activer le son    |
| Quitter            | Retour à l'écran d'accueil |
| F5                 | Rejouer                    |