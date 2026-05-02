// Notion de Position par rapport à un point fixe
// C'est une valeur, donc non modifiable
class Position {
    #x; // Coordonne x de la position
    #y; // Coordonne y de la position

    // Construit une position à partir de 2 nombres
    constructor(x = 0, y = 0) {
        this.#x = x;
        this.#y = y;
    }

    // Acces en lecture aux attributs
    get x() { return this.#x; }
    get y() { return this.#y; }

    // Création d'une nouvelle position par translation
    shift(x, y) {
        return new Position(this.#x + x, this.#y + y);
    }

    // Création d'une nouvelle position à partir d'une vitesse et un temps
    move(speed, duration) {
        // Calcule le déplacement de la vitesse en fonction du temps
        let delta = speed.delta(duration);
        // calcule la nouvelle position
        return this.shift(delta.x, delta.y);
    }
};

// class rectangle
class Rectangle {
    #pos;   // { x, y }
    #size;  // { width, height }

    constructor(position, size) {
        this.#pos = position;  // position : objet { x, y }
        this.#size = size;     // size : objet { width, height }
    }

    get x() { return this.#pos.x; }
    get y() { return this.#pos.y; }
    get width() { return this.#size.width; }
    get height() { return this.#size.height; }

    // Retourne vrai s'il y a intersection avec le rectangle r
    areIntersecting(r) {
        // Pas d'intersection sur l'axe X si :
        //   R2 est à droite de R1 : r.x > this.x + this.width
        //   R2 est à gauche de R1 : r.x + r.width < this.x
        if (r.x > this.x + this.width) return false;
        if (r.x + r.width < this.x) return false;

        // Pas d'intersection sur l'axe Y si :
        //   R2 est en dessous de R1 : r.y > this.y + this.height
        //   R2 est au dessus de R1  : r.y + r.height < this.y
        if (r.y > this.y + this.height) return false;
        if (r.y + r.height < this.y) return false;

        // Aucune condition de non-intersection → ils se touchent
        return true;
    }

    // Retourne vrai si CE rectangle est entièrement contenu dans r
    isInside(r) {
        return this.x >= r.x &&
            this.y >= r.y &&
            this.x + this.width <= r.x + r.width &&
            this.y + this.height <= r.y + r.height;
    }
}

// Notion de vitesse : nombre de pixels à bouger par secondes
class Speed {
    #x;     // distance à parcourir sur l'axe des X en 1 seconde
    #y;     // distance à parcourir sur l'axe des Y en 1 seconde
    #max;   // Vitesse maximum, doit être positive

    // Indique la vitesse maximum
    constructor(max) {
        if (max <= 0) {
            throw new Error("Vitesse maximum doit être positif");
        }
        // CORRECTION : initialisé à 0 pour que R2D2 soit immobile au départ
        this.#x = 0;
        this.#y = 0;
        this.#max = max;
    }

    // Stoppe sur les deux axes
    stop() {
        this.#x = 0;
        this.#y = 0;
    }

    // Vrai si la vitesse est nulle. 
    isStopped() {
        return this.#x == 0 && this.#y == 0;
    }

    // Accelère si dx ou dy est positif ou freine si negatif
    change(dx, dy) {
        this.#x += dx;
        this.#y += dy;

        // Limite les vitesses
        if (this.#x > this.#max) {
            this.#x = this.#max;
        } else if (this.#x < -this.#max) {
            this.#x = -this.#max;
        }
        if (this.#y > this.#max) {
            this.#y = this.#max;
        } else if (this.#y < -this.#max) {
            this.#y = -this.#max;
        }
    }

    // AJOUT : définit directement la vitesse (sans incrément)
    // Utilisé pour le mouvement de R2D2 avec les touches maintenues enfoncées
    set(x, y) {
        this.#x = Math.max(-this.#max, Math.min(this.#max, x));
        this.#y = Math.max(-this.#max, Math.min(this.#max, y));
    }

    // Calcule un déplacement en x et y à cette vitesse pour un temps donné
    // duration: Number, temps considéré en millisecondes
    // @return: un déplacement {x,y}
    delta(duration) {
        return { x: this.#x * duration / 1000, y: this.#y * duration / 1000 };
    }
}

// Fonction qui indique si on est en dehors des limites
const outOfLimit = (min, val, max) => val <= min ? true : (val >= max ? true : false);

// Fonction qui retourne une valeur entre deux bornes
const limit = (min, val, max) => val < min ? min : (val > max ? max : val);

///////////////////////////////////////////////////////////////
// Objet qui représente l'aire du jeu
///////////////////////////////////////////////////////////////

const playground = {
    // Objet DOM de l'aire de jeu
    DOM: window.document.getElementById("playground"),
}

// Initialise la dimension de l'aire de jeu
playground.size = playground.DOM.getBoundingClientRect();


///////////////////////////////////////////////////////////////
// Notion de sprite
///////////////////////////////////////////////////////////////

class Sprite {
    id;             // l'Id du sprite, pour info
    #DOM;           // Objet DOM qui représente le sprite
    #pos;           // Position actuelle du sprite
    #speed;         // La vitesse de déplacement actuelle en pixels par seconde
    #size;          // Taille de l'objet { height, width }

    constructor(id) {
        this.id = id;
        // Recherche l'élément DOM
        const DOM = document.getElementById(id);
        // Vérifie qu'il existe
        if (DOM == null) {
            throw new Error('HTML object ' + id + ' not found');
        }
        // Crée un objet DOM pour l'afficher
        this.#DOM = DOM.cloneNode();
        // Supprime l'attribut id
        this.#DOM.setAttribute("id", "");
        // Place l'objet dans la DOM
        playground.DOM.appendChild(this.#DOM);
        // Initialise sa position relative
        this.#pos = new Position(0, 0);
        // Vitesse en pixels par secondes : objet initialement immobile
        this.#speed = new Speed(502);
        // Calcule sa taille
        this.#size = this.#DOM.getBoundingClientRect();
    };

    // Place le sprite à une position p donnée
    set pos(p) {
        // Empeche de sortir de l'aire de jeux
        let minX = -this.#size.width;
        let minY = -this.#size.height;
        let maxX = playground.size.width;
        let maxY = playground.size.height;
        let pos = new Position(limit(minX, p.x, maxX), limit(minY, p.y, maxY));
        this.#DOM.style.left = pos.x + "px";
        this.#DOM.style.top = pos.y + "px";
        this.#pos = pos;
    };

    get pos() {
        return this.#pos;
    }

    get size() {
        return this.#size;
    }

    stop() {
        this.#speed.stop();
    }

    isStopped() {
        return this.#speed.isStopped();
    }

    get speed() {
        return this.#speed;
    }

    // Change la vitesse du sprite par des incréments
    changeSpeed(dx, dy) {
        this.#speed.change(dx, dy);
    }

    // AJOUT : définit directement la vitesse (sans incrément)
    setSpeed(x, y) {
        this.#speed.set(x, y);
    }

    // Change sa position pour la nouvelle frame en fonction de sa vitesse
    update(duration) {
        // Deplace la position en fonction de la vitesse et du temps
        this.pos = this.#pos.move(this.#speed, duration);
    };

    // Retourne le Rectangle de la hitbox du sprite.
    // Surcharge simulée : si pos est fourni → hitbox à cette position future,
    //                     si pos est undefined → hitbox à la position actuelle.
    hitbox(pos) {
        const p = (pos !== undefined) ? pos : this.#pos;
        return new Rectangle(
            { x: p.x, y: p.y },
            { width: this.#size.width, height: this.#size.height }
        );
    }

    // Raccourci : retourne vrai si ce sprite est en collision avec un autre
    collidesWith(other) {
        return this.hitbox().areIntersecting(other.hitbox());
    }
}

///////////////////////////////////////////////////////////////
// Sous-type de Sprite : vaisseaux alliés
///////////////////////////////////////////////////////////////

class Plane extends Sprite {
    // Temps avant un démarrage (en ms)
    waitingTime;
    // Points gagnés quand R2D2 attrape ce vaisseau
    points;

    constructor(id, pts = 10) {
        super(id);
        this.waitingTime = 0;
        this.points = pts;
        // Immobile au départ, start() l'activera
        this.stop();
    }

    // Démarre l'avion du haut de l'écran
    start() {
        // Choisit une position x random
        let x = playground.size.width * Math.random();
        this.pos = new Position(x, -this.size.height);
        // CORRECTION : setSpeed (valeur directe) plutôt que changeSpeed (incrément)
        // pour éviter que la vitesse s'accumule à chaque redémarrage
        const vy = 80 + Math.random() * 140;
        const vx = (Math.random() - 0.5) * 60;
        this.setSpeed(vx, vy);
        console.log(this.id, 'start');
    }

    // Vrai si le sprite a atteint le bas de l'aire de jeux
    isAtBottom() {
        return this.pos.y >= playground.size.height;
    }

    update(duration) {
        super.update(duration);
        // Regarde si le sprite a disparu au bas de l'écran
        if (this.isAtBottom() && !this.isStopped()) {
            // Arrête le sprite
            this.stop();
            // Place un temps d'attente (en ms) avant de redémarrer
            this.waitingTime = 1000 + Math.random() * 3000;
        }
        // Si le sprite est arrêté, attend puis redémarre
        if (this.isStopped()) {
            this.waitingTime -= duration; // décompte en ms réelles
            if (this.waitingTime <= 0) {
                this.waitingTime = 0;
                this.start();
            }
        }
    }
}

///////////////////////////////////////////////////////////////
// Sous-type de Sprite : Darth Vader (ennemi)
///////////////////////////////////////////////////////////////

class DarthVader extends Sprite {
    // Temps avant apparition (en ms)
    waitingTime;

    constructor(id) {
        super(id);
        // Apparaît après 4 secondes
        this.waitingTime = 4000;
        this.stop();
    }

    // Démarre Darth Vader depuis la gauche ou la droite de l'écran
    start() {
        const fromLeft = Math.random() < 0.5;
        // Position Y aléatoire dans la zone de jeu
        const y = playground.size.height * 0.1 + Math.random() * playground.size.height * 0.6;

        if (fromLeft) {
            this.pos = new Position(-this.size.width, y);
            this.setSpeed(130 + Math.random() * 80, 0);
        } else {
            this.pos = new Position(playground.size.width, y);
            this.setSpeed(-(130 + Math.random() * 80), 0);
        }
        console.log('darthvader start');
    }

    // Vrai si Darth Vader est sorti de l'écran
    isOutOfBounds() {
        return this.pos.x > playground.size.width + this.size.width ||
            this.pos.x < -this.size.width * 2;
    }

    update(duration) {
        super.update(duration);

        if (this.isOutOfBounds() && !this.isStopped()) {
            this.stop();
            // Réapparition après 3 à 7 secondes
            this.waitingTime = 3000 + Math.random() * 4000;
        }

        if (this.isStopped()) {
            this.waitingTime -= duration;
            if (this.waitingTime <= 0) {
                this.waitingTime = 0;
                this.start();
            }
        }
    }
}

///////////////////////////////////////////////////////////////
// HUD — affichage du score et du timer
///////////////////////////////////////////////////////////////

const hud = {
    scoreEl: document.getElementById("score-value"),
    timerEl: document.getElementById("timer-value"),
    msgEl:   document.getElementById("message"),

    setScore(v) {
        this.scoreEl.textContent = v;
    },
    setTimer(s) {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        this.timerEl.textContent = mm + ':' + ss;
    },
    showMessage(txt) {
        this.msgEl.textContent = txt;
        this.msgEl.style.display = 'block';
    },
    hideMessage() {
        this.msgEl.style.display = 'none';
    }
};

///////////////////////////////////////////////////////////////
// Objet jeu principal
///////////////////////////////////////////////////////////////

let game = {
    run: false,
    tFrameLast: 0,
    score: 0,
    timeLeft: 180,    // durée de la partie en secondes
    timeAccum: 0,     // accumulateur en ms pour le décompte du timer
    // CORRECTION : r2d2 et enemies initialisés dans game.init() après chargement images
    r2d2: null,
    sprites: [],      // vaisseaux alliés
    enemies: [],      // ennemis
    keys: {},         // touches actuellement enfoncées
};

// Vitesse de déplacement de R2D2 en px/s
const R2D2_SPEED = 280;

// Mise à jour du jeu à la date indiquée
// tFrame : temps absolu en ms depuis le premier appel à requestAnimationFrame
game.update = function (tFrame) {
    // Calcule la durée qui s'est passée après la frame précédente
    let duration = tFrame - this.tFrameLast;
    // Évite un grand saut à la toute première frame
    if (this.tFrameLast === 0) duration = 0;
    // Met à jour le temps précédent
    this.tFrameLast = tFrame;

    // --- Décompte du timer ---
    this.timeAccum += duration;
    if (this.timeAccum >= 1000) {
        const secs = Math.floor(this.timeAccum / 1000);
        this.timeAccum -= secs * 1000;
        this.timeLeft -= secs;
        if (this.timeLeft < 0) this.timeLeft = 0;
        hud.setTimer(this.timeLeft);
        if (this.timeLeft <= 0) {
            this.end();
            return;
        }
    }

    // --- Déplacement de R2D2 selon les touches maintenues ---
    // CORRECTION : on lit l'état des touches dans game.keys et on utilise setSpeed
    // (vitesse directe) plutôt que changeSpeed (incrément), sinon la vitesse
    // s'accumule indéfiniment à chaque frame
    let vx = 0, vy = 0;
    if (this.keys['ArrowLeft']  || this.keys['q']) vx = -R2D2_SPEED;
    if (this.keys['ArrowRight'] || this.keys['d']) vx =  R2D2_SPEED;
    if (this.keys['ArrowUp']    || this.keys['z']) vy = -R2D2_SPEED;
    if (this.keys['ArrowDown']  || this.keys['s']) vy =  R2D2_SPEED;
    // Normalisation diagonale : évite d'aller plus vite en diagonale
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.r2d2.setSpeed(vx, vy);
    this.r2d2.update(duration);

    // --- Détection collision R2D2 / vaisseau allié ---
    for (let sprite of this.sprites) {
        sprite.update(duration);
        // collidesWith() utilise hitbox() → areIntersecting() avec la formule du sujet
        if (!sprite.isStopped() && this.r2d2.collidesWith(sprite)) {
            this.score += sprite.points;
            hud.setScore(this.score);
            sprite.stop();
            sprite.waitingTime = 1000 + Math.random() * 2000;
        }
    }

    // --- Détection collision R2D2 / Darth Vader ---
    for (let enemy of this.enemies) {
        enemy.update(duration);
        if (!enemy.isStopped() && this.r2d2.collidesWith(enemy)) {
            this.score = Math.max(0, this.score - 20);
            hud.setScore(this.score);
            enemy.stop();
            enemy.waitingTime = 3000;
        }
    }
}

// Réaction du jeu à l'enfoncement d'une touche
game.onkeydown = function (key) {
    this.keys[key] = true;
}

// Réaction du jeu au relâchement d'une touche
// CORRECTION : sans onkeyup, R2D2 continuerait à glisser après avoir lâché la touche
game.onkeyup = function (key) {
    this.keys[key] = false;
}

// Installe la lecture des touches
window.onkeydown = function (e) {
    game.onkeydown(e.key);
    e.preventDefault(); // évite le scroll de la page avec les flèches
}
window.onkeyup = function (e) {
    game.onkeyup(e.key);
}

// tFrame est le temps d'appel de l'animation passé à main en ms
function main(tFrame) {
    game.stopMain = window.requestAnimationFrame(main);
    if (!game.run) {
        window.cancelAnimationFrame(game.stopMain);
        console.log("Game over");
    } else {
        game.update(tFrame);
    }
}

// Démarre le jeu
game.start = function () {
    // Lance tous les sprites
    for (let sprite of this.sprites) {
        sprite.start();
    }
}

game.stop = function () {
    game.run = false;
}

// Fin de partie
game.end = function () {
    this.run = false;
    hud.showMessage(`Partie terminée ! Score final : ${this.score} pts — Appuyez sur F5 pour rejouer.`);
}

game.init = function () {
    // CORRECTION : R2D2 créé ici, après le chargement des images (event load)
    this.r2d2 = new Sprite("R2D2");
    // Place R2D2 au centre-bas de l'écran
    this.r2d2.pos = new Position(
        playground.size.width  / 2 - this.r2d2.size.width  / 2,
        playground.size.height * 0.8
    );

    // Vaisseaux alliés avec leurs points respectifs
    let sprite = new Plane("x_wing", 30);
    game.sprites.push(sprite);

    sprite = new Plane("anakin_starfighter", 20);
    game.sprites.push(sprite);

    sprite = new Plane("naboo_starfighter", 15);
    game.sprites.push(sprite);

    sprite = new Plane("obi_wan_starfighter", 25);
    game.sprites.push(sprite);

    // Ennemi : Darth Vader
    this.enemies = [];
    this.enemies.push(new DarthVader("darthvader"));

    this.score     = 0;
    this.timeLeft  = 180;
    this.timeAccum = 0;
    this.tFrameLast = 0;
    this.run = true;

    hud.setScore(0);
    hud.setTimer(180);
    hud.hideMessage();

    game.start();
    main(0); // Début du cycle
}

// L'initialisation est asynchrone donc il faut attendre
// Il faut que toutes les images soient chargées donc on
// s'accroche à l'événement load de window
window.addEventListener("load", () => { game.init(); })