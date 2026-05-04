class Position {
    #x;
    #y;

    constructor(x = 0, y = 0) {
        this.#x = x;
        this.#y = y;
    }

    get x() { return this.#x; }
    get y() { return this.#y; }

    shift(x, y) {
        return new Position(this.#x + x, this.#y + y);
    }

    // Création d'une nouvelle position à partir d'une vitesse et un temps
    move(speed, duration) {
        let delta = speed.delta(duration);
        return this.shift(delta.x, delta.y);
    }
};

// class rectangle des hit-boxes
class Rectangle {
    #pos;
    #size;

    constructor(position, size) {
        this.#pos = position;
        this.#size = size;
    }

    get x() { return this.#pos.x; }
    get y() { return this.#pos.y; }
    get width() { return this.#size.width; }
    get height() { return this.#size.height; }

    // Colision des hit-boxes:

    // Retourne vrai s'il y a intersection avec le rectangle r
    areIntersecting(r) {
        if (r.x > this.x + this.width) return false;
        if (r.x + r.width < this.x) return false;

        if (r.y > this.y + this.height) return false;
        if (r.y + r.height < this.y) return false;

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
    #x;
    #y;
    #max;

    constructor(max) {
        if (max <= 0) {
            throw new Error("Vitesse maximum doit être positif");
        }
        this.#x = 0;
        this.#y = 0;
        this.#max = max;
    }

    stop() {
        this.#x = 0;
        this.#y = 0;
    }

    isStopped() {
        return this.#x == 0 && this.#y == 0;
    }

    // Gestion de l'acceleration jusqu'à la vitesse max
    change(dx, dy) {
        this.#x += dx;
        this.#y += dy;

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

    // Vitesse sans acceleration
    //  NB : la version initiale du code accélerais prgressivement r2d2 ce qui le redais peut maniable
    set(x, y) {
        this.#x = Math.max(-this.#max, Math.min(this.#max, x));
        this.#y = Math.max(-this.#max, Math.min(this.#max, y));
    }

    // Calcule un déplacement en x et y pour un temps donné
    // duration: Number, temps considéré en millisecondes
    // @return: un déplacement {x,y}
    delta(duration) {
        return { x: this.#x * duration / 1000, y: this.#y * duration / 1000 };
    }

    get maxSpeed() { return this.#max; }
    set maxSpeed(m) {
        if (m > 0) this.#max = m;
    }
}

///////////////////////////////////////////////////////////////
// Utilitaires pour les limites de l'aire de jeu
///////////////////////////////////////////////////////////////

// Fonction qui indique si on est en dehors des limites de la page
const outOfLimit = (min, val, max) => val <= min ? true : (val >= max ? true : false);

// Fonction qui retourne une valeur entre deux bornes
const limit = (min, val, max) => val < min ? min : (val > max ? max : val);


// Objet qui représente l'aire du jeu
const playground = {
    DOM: window.document.getElementById("playground"),
}

// Initialise la dimension de l'aire de jeu
playground.size = playground.DOM.getBoundingClientRect();


///////////////////////////////////////////////////////////////
// Sprites
///////////////////////////////////////////////////////////////

class Sprite {
    id;
    #DOM;
    #pos;                    // Position actuelle du sprite
    #speed;                  // La vitesse actuelle en pixels par seconde
    #size;
    #baseSpeedMax;
    #speedMultiplier = 1.0;  // Multiplicateur de vitesse selon le niveau

    constructor(id) {
        this.id = id;
        const DOM = document.getElementById(id);
        if (DOM == null) {
            throw new Error('HTML object ' + id + ' not found');
        }
        this.#DOM = DOM.cloneNode();
        this.#DOM.setAttribute("id", "");
        playground.DOM.appendChild(this.#DOM);
        this.#pos = new Position(0, 0);
        this.#speed = new Speed(502);

        //hitbox
        const rect = this.#DOM.getBoundingClientRect();
        this.#size = {
            width: rect.width || 60,
            height: rect.height || 60
        };
        this.#baseSpeedMax = 502;
    };

    // Place le sprite à une position p donnée
    set pos(p) {
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

    setSpeed(x, y) {
        this.#speed.set(x, y);
    }

    // Permet d'ajuster la vitesse max selon le niveau de difficulté
    set speedMultiplier(m) {
        this.#speedMultiplier = m;
        this.#speed.maxSpeed = this.#baseSpeedMax * m;
    }

    get speedMultiplier() {
        return this.#speedMultiplier;
    }

    // Change sa position pour la nouvelle frame en fonction de sa vitesse
    update(duration) {
        this.pos = this.#pos.move(this.#speed, duration);
    };

    // Retourne le Rectangle de la hitbox du sprite.
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

    // Applique le tremblement CSS sur le DOM du sprite
    shake() {
        this.#DOM.classList.remove('shake');
        void this.#DOM.offsetWidth;
        this.#DOM.classList.add('shake');
        setTimeout(() => this.#DOM.classList.remove('shake'), 500);
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
    #speedMultiplier;


    constructor(id, pts = 10) {
        super(id);
        this.waitingTime = 0;
        this.points = pts;
        this.#speedMultiplier = 1;
        this.stop();
    }

    set speedMultiplier(m) { this.#speedMultiplier = m; }

    // Démarre le mouvement des vaisseaux à attraper depuis le haut
    start() {
        let x = playground.size.width * Math.random();
        this.pos = new Position(x, -this.size.height);
        const vy = (80 + Math.random() * 140) * this.#speedMultiplier;
        const vx = (Math.random() - 0.5) * 60 * this.#speedMultiplier;
        this.setSpeed(vx, vy);
        console.log(this.id, 'start (x' + this.#speedMultiplier + ')');
    }

    isAtBottom() {
        return this.pos.y >= playground.size.height;
    }

    // Met à jour l'état du sprite et permet la réapparition
    update(duration) {
        super.update(duration);
        if (this.isAtBottom() && !this.isStopped()) {
            this.stop();
            this.waitingTime = 1000 + Math.random() * 3000;
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
// Sous-type de Sprite : Darth Vader (ennemi)
///////////////////////////////////////////////////////////////

class DarthVader extends Sprite {
    waitingTime;
    #speedMultiplier;

    constructor(id, initialDelay = 4000) {
        super(id);
        this.waitingTime = initialDelay;
        this.#speedMultiplier = 1;
        this.stop();
    }

    set speedMultiplier(m) { this.#speedMultiplier = m; }

    // Démarre Darth Vader depuis la gauche ou la droite de l'écran
    start() {
        const fromLeft = Math.random() < 0.5;
        // Position Y aléatoire dans la zone de jeu
        const y = playground.size.height * 0.1 + Math.random() * playground.size.height * 0.6;

        const spd = (130 + Math.random() * 80) * this.#speedMultiplier;

        if (fromLeft) {
            this.pos = new Position(-this.size.width, y);
            this.setSpeed(spd, 0);
        } else {
            this.pos = new Position(playground.size.width, y);
            this.setSpeed(-spd, 0);
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

////////////////////////////////////////////////
// BONUS VIE — cœur qui apparaît aléatoirement
////////////////////////////////////////////////
class BonusLife {
    #el;       // élément DOM (emoji ❤️)
    #pos;
    #size;
    #visible;
    #lifetime;

    constructor() {
        this.#el = document.createElement('div');
        this.#el.className = 'bonus-heart';
        this.#el.textContent = '❤️';
        this.#el.style.display = 'none';
        playground.DOM.appendChild(this.#el);
        this.#visible = false;
        this.#pos = new Position(0, 0);
        this.#size = { width: 40, height: 40 };
        this.#lifetime = 0;
    }

    get visible() { return this.#visible; }

    // Fait apparaître le bonus à une position aléatoire
    spawn() {
        const x = 40 + Math.random() * (playground.size.width - 80);
        const y = 60 + Math.random() * (playground.size.height - 120);
        this.#pos = new Position(x, y);
        this.#el.style.left = x + 'px';
        this.#el.style.top = y + 'px';
        this.#el.style.display = '';
        this.#visible = true;
        this.#lifetime = 8000;
    }

    hide() {
        this.#el.style.display = 'none';
        this.#visible = false;
    }

    // Hitbox du bonus pour la détection de collision
    hitbox() {
        return new Rectangle(
            { x: this.#pos.x, y: this.#pos.y },
            this.#size
        );
    }

    // Retourne vrai si r2d2 touche le bonus
    collidesWith(r2d2) {
        return this.hitbox().areIntersecting(r2d2.hitbox());
    }

    update(duration) {
        if (!this.#visible) return;
        this.#lifetime -= duration;
        if (this.#lifetime <= 0) this.hide();
    }
}

///////////////////////////////////////////////////////////////
// HUD — affichage du score et du timer
///////////////////////////////////////////////////////////////

const hud = {
    scoreEl: document.getElementById("score-value"),
    timerEl: document.getElementById("timer-value"),
    levelEl: document.getElementById("level-value"),
    msgEl: document.getElementById("message"),
    gameOverScreenEl: document.getElementById("game-over-screen"),
    hudEl: document.getElementById("hud"),
    hearts: [
        document.getElementById("heart-1"),
        document.getElementById("heart-2"),
        document.getElementById("heart-3"),
    ],

    setScore(v) { this.scoreEl.textContent = v; },
    setLevel(v) { this.levelEl.textContent = v; },
    setTimer(s) {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        this.timerEl.textContent = mm + ':' + ss;
    },
    // Met à jour l'affichage des cœurs selon les vies restantes
    setLives(lives) {
        for (let i = 0; i < this.hearts.length; i++) {
            if (i < lives) {
                this.hearts[i].classList.remove('lost');
            } else {
                this.hearts[i].classList.add('lost');
            }
        }
    },
    showMessage(txt) {
        this.msgEl.textContent = txt;
        this.gameOverScreenEl.classList.remove('hidden');
        this.hudEl.classList.add('hidden');
    },
    show() { this.hudEl.classList.remove('hidden'); },
};

////////////////////////////////////////////////
// AUDIO — musique d'ambiance + son de capture
// Web Audio API, aucune librairie externe
////////////////////////////////////////////////
const audio = {
    ctx: null,
    muted: false,
    musicNode: null,
    gainNode: null,

    // Initialise le contexte audio (doit être appelé après un geste utilisateur)
    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0.18;
        this.gainNode.connect(this.ctx.destination);
        this.startMusic();
    },

    // fonction stop musique
    stopMusic() {
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
            this.gainNode = null;
        }
    },

    // Musique d'ambiance générée avec des oscillateurs (style Star Wars)
    startMusic() {
        if (!this.ctx) return;
        // Mélodie simplifiée en boucle (~thème Star Wars)
        // code trouvé sur internet, adapté pour les besoins du jeu
        const notes = [
            { f: 392, d: 0.35 }, { f: 392, d: 0.35 }, { f: 392, d: 0.35 },
            { f: 311, d: 0.25 }, { f: 466, d: 0.1 },
            { f: 392, d: 0.35 }, { f: 311, d: 0.25 }, { f: 466, d: 0.1 },
            { f: 392, d: 0.7 },
            { f: 587, d: 0.35 }, { f: 587, d: 0.35 }, { f: 587, d: 0.35 },
            { f: 622, d: 0.25 }, { f: 466, d: 0.1 },
            { f: 370, d: 0.35 }, { f: 311, d: 0.25 }, { f: 466, d: 0.1 },
            { f: 392, d: 0.7 },
        ];

        const playLoop = (startTime) => {
            if (this.muted || !this.ctx) return;
            let t = startTime;
            for (const note of notes) {
                const osc = this.ctx.createOscillator();
                const gEnv = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = note.f;
                gEnv.gain.setValueAtTime(0, t);
                gEnv.gain.linearRampToValueAtTime(1, t + 0.02);
                gEnv.gain.linearRampToValueAtTime(0, t + note.d - 0.02);
                osc.connect(gEnv);
                gEnv.connect(this.gainNode);
                osc.start(t);
                osc.stop(t + note.d);
                t += note.d;
            }
            // Relance la boucle à la fin de la mélodie
            const loopDuration = notes.reduce((s, n) => s + n.d, 0);
            setTimeout(() => playLoop(this.ctx.currentTime), loopDuration * 1000);
        };
        playLoop(this.ctx.currentTime + 0.1);
    },

    // Son court joué quand on attrape un vaisseau (bip positif)
    playCapture() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1320, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },

    // Son court joué quand Vader touche R2D2 (bip négatif descendant)
    playHit() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.gainNode) {
            this.gainNode.gain.value = this.muted ? 0 : 0.18;
        }
        document.getElementById('mute-btn').textContent = this.muted ? '🔇' : '🔊';
        // Si on dé-mute, relance la musique
        if (!this.muted) this.startMusic();
    }
};

////////////////////////////////////////////////
// CONFIGURATION DES NIVEAUX
////////////////////////////////////////////////
const LEVELS = [
    // Niveau 1 : de 0 à 99 pts
    {
        scoreThreshold: 0,
        speedMult: 1.0,
        vaderCount: 1,
        extraPlanes: [],
        label: 'NIVEAU 1 - Les prémisses de la rébellion !',
    },
    // Niveau 2 : à partir de 100 pts
    {
        scoreThreshold: 100,
        speedMult: 1.4,
        vaderCount: 2,
        extraPlanes: ['x_wing'],
        label: 'NIVEAU 2 — L\'Empire contre-attaque !',
    },
    // Niveau 3 : à partir de 250 pts
    {
        scoreThreshold: 250,
        speedMult: 1.8,
        vaderCount: 3,
        extraPlanes: ['x_wing', 'naboo_starfighter'],
        label: 'NIVEAU 3 — Le retour du Jedi !',
    },
];


////////////////////////////////////////////////
// Objet jeu principal
////////////////////////////////////////////////

////////////////////////
// GAME
////////////////////////
let game = {
    run: false,
    tFrameLast: 0,
    score: 0,
    lives: 3,
    timeLeft: 180,
    timeAccum: 0,
    currentLevel: 0,
    r2d2: null,
    r2d2Speed: 280,
    sprites: [],    // vaisseaux alliés (tous niveaux confondus)
    enemies: [],    // Darth Vaders
    bonusLife: null,
    bonusTimer: 0,
    keys: {},
};

const R2D2_SPEED = 280; // px/s

////////////////////////////////////////////////
// EFFETS VISUELS DE COLLISION
////////////////////////////////////////////////

// Affiche un texte flottant (+pts ou -❤️) à la position du sprite
function showFX(text, x, y, cssClass) {
    const el = document.createElement('div');
    el.className = cssClass;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    playground.DOM.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

////////////////////////////////////////////////
// GESTION DES NIVEAUX
////////////////////////////////////////////////

// Vérifie si le score atteint un nouveau niveau et l'active
game.checkLevelUp = function () {
    const nextLevelIdx = this.currentLevel + 1;
    if (nextLevelIdx >= LEVELS.length) return;

    const next = LEVELS[nextLevelIdx];
    if (this.score >= next.scoreThreshold) {
        this.currentLevel = nextLevelIdx;
        this.applyLevel(nextLevelIdx);
    }
};

// Applique la configuration d'un niveau (vitesse, vaisseaux, Vaders)
game.applyLevel = function (levelIdx) {
    const cfg = LEVELS[levelIdx];
    console.log('Passage au ' + cfg.label);

    // Augmente la vitesse de R2D2
    this.r2d2.speedMultiplier = cfg.speedMult;
    this.r2d2Speed = 280 * cfg.speedMult;

    // Applique le multiplicateur de vitesse à tous les vaisseaux existants
    for (let s of this.sprites) {
        s.speedMultiplier = cfg.speedMult;
    }

    // Ajoute les vaisseaux supplémentaires prévus pour ce niveau
    for (let planeId of cfg.extraPlanes) {
        const p = new Plane(planeId, this.getPtsFor(planeId));
        p.speedMultiplier = cfg.speedMult;
        p.start();
        this.sprites.push(p);
    }

    // Ajoute les Darth Vaders supplémentaires
    while (this.enemies.length < cfg.vaderCount) {
        const delay = 2000 + Math.random() * 3000;
        const v = new DarthVader("darthvader", delay);
        v.speedMultiplier = cfg.speedMult;
        this.enemies.push(v);
    }
    // Met à jour la vitesse des Vaders existants
    for (let e of this.enemies) {
        e.speedMultiplier = cfg.speedMult;
    }

    // Affiche la bannière de niveau
    this.showLevelBanner(cfg.label);
    hud.setLevel(levelIdx + 1);
};

// Points associés à chaque vaisseau
game.getPtsFor = function (id) {
    const map = {
        'x_wing': 30,
        'anakin_starfighter': 20,
        'naboo_starfighter': 15,
        'obi_wan_starfighter': 25,
    };
    return map[id] || 10;
};

// Affiche la bannière de passage de niveau pendant 2 secondes
game.showLevelBanner = function (text) {
    const el = document.getElementById('level-banner');
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
};

////////////////////////////////////////////////
// BOUCLE PRINCIPALE
////////////////////////////////////////////////

// tFrame : temps absolu en ms depuis le premier appel à requestAnimationFrame
function main(tFrame) {
    game.stopMain = window.requestAnimationFrame(main);
    if (!game.run) {
        window.cancelAnimationFrame(game.stopMain);
        console.log("Game over");
        return;
    }
    game.update(tFrame);
}

////////////////////////////////////////////////
// MISE À JOUR DU JEU (appelée à chaque frame)
////////////////////////////////////////////////

// Mise à jour du jeu à la date indiquée
// tFrame : temps absolu en ms depuis le premier appel à requestAnimationFrame
game.update = function (tFrame) {
    // Calcule la durée qui s'est passée après la frame précédente
    let duration = tFrame - this.tFrameLast;
    if (this.tFrameLast === 0) duration = 0;
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
    // lit l'état des touches dans game.keys et utilise setSpeed
    // (vitesse directe) plutôt que changeSpeed (incrément), sinon la vitesse
    // s'accumule indéfiniment à chaque frame
    let vx = 0, vy = 0;
    if (this.keys['ArrowLeft'] || this.keys['q']) vx = -this.r2d2Speed;
    if (this.keys['ArrowRight'] || this.keys['d']) vx = this.r2d2Speed;
    if (this.keys['ArrowUp'] || this.keys['z']) vy = -this.r2d2Speed;
    if (this.keys['ArrowDown'] || this.keys['s']) vy = this.r2d2Speed;
    // Normalisation diagonale : évite d'aller plus vite en diagonale
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.r2d2.setSpeed(vx, vy);
    this.r2d2.update(duration);

    // --- Détection collision R2D2 / vaisseau allié ---
    for (let sprite of this.sprites) {
        sprite.update(duration);
        if (!sprite.isStopped() && this.r2d2.collidesWith(sprite)) {
            this.score += sprite.points;
            hud.setScore(this.score);

            // --- AJOUT DE LA LIMITE ICI ---
            if (this.score >= 1000) {
                this.end("victory");
                return;
            }

            sprite.stop();
            sprite.waitingTime = 1000 + Math.random() * 2000;
            showFX('+' + sprite.points, sprite.pos.x, sprite.pos.y, 'collect-fx');
            audio.playCapture();
            this.checkLevelUp();
        }
    }

    // --- Détection collision R2D2 / Darth Vader ---
    for (let enemy of this.enemies) {
        enemy.update(duration);
        if (!enemy.isStopped() && this.r2d2.collidesWith(enemy)) {
            // Perd une vie
            this.lives--;
            hud.setLives(this.lives);
            enemy.stop();
            enemy.waitingTime = 3000;
            // Effets : tremblement R2D2, texte flottant, son
            this.r2d2.shake();
            showFX('-❤️', this.r2d2.pos.x, this.r2d2.pos.y, 'hit-fx');
            audio.playHit();
            // Game over si plus de vies
            if (this.lives <= 0) { this.end("lives"); return; }
        }
    }

    // --- Bonus vie ---
    this.bonusTimer -= duration;
    if (this.bonusTimer <= 0) {
        // Fait apparaître le bonus toutes les ~20-35 secondes
        this.bonusTimer = 20000 + Math.random() * 15000;
        if (!this.bonusLife.visible) this.bonusLife.spawn();
    }
    this.bonusLife.update(duration);
    // Collision R2D2 / bonus vie
    if (this.bonusLife.visible && this.bonusLife.collidesWith(this.r2d2)) {
        if (this.lives < 3) {
            this.lives++;
            hud.setLives(this.lives);
        }
        showFX('+❤️', this.r2d2.pos.x, this.r2d2.pos.y, 'bonus-fx');
        audio.playCapture();
        this.bonusLife.hide();
    }

    // Fonction qui permet de retourner au menu principal (appelée dans end())

    game.returnToHome = function () {
        this.run = false;

        audio.stopMusic();

        //  Cacher le HUD et l'écran de fin de partie, montrer le menu
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');

        // Vider l'aire de jeu
        // Enlève tous les sprites de playground sauf les éléments originaux (modèles)
        const pg = playground.DOM;
        while (pg.firstChild) {
            pg.removeChild(pg.firstChild);
        }

        // Réinitialiser les listes de sprites pour la prochaine partie
        this.sprites = [];
        this.enemies = [];

        console.log("Retour au menu principal");
    };
};

////////////////////////////////////////////////
// CLAVIER
////////////////////////////////////////////////

// Réaction du jeu à l'enfoncement d'une touche
game.onkeydown = function (key) {
    this.keys[key] = true;
}

// Réaction du jeu au relâchement d'une touche: sans onkeyup, R2D2 continuerait à glisser après avoir lâché la touche
game.onkeyup = function (key) {
    this.keys[key] = false;
}

// Installe la lecture des touches
window.onkeydown = function (e) {
    game.onkeydown(e.key);
    e.preventDefault();
}
window.onkeyup = function (e) {
    game.onkeyup(e.key);
}

////////////////////////////////////////////////
// FIN DE PARTIE
////////////////////////////////////////////////

// Fin de partie
game.end = function (reason) {
    this.run = false;

    let finalMessage = "";

    if (reason === "victory") {
        finalMessage = `VICTOIRE ! Vous avez atteint ${this.score} points ! L'Empire est en déroute !`;
    } else {
        finalMessage = `Partie terminée ! Score final : ${this.score} pts`;
    }

    hud.showMessage(finalMessage);
}

// Redémarrage du jeu
game.restart = function () {
    document.getElementById('game-over-screen').classList.add('hidden');
    game.init();
}

////////////////////////////////////////////////
// COMPTE À REBOURS (3... 2... 1... GO !)
////////////////////////////////////////////////
game.startCountdown = function (callback) {
    const el = document.getElementById('countdown');
    const steps = ['3', '2', '1', 'GO !'];
    let i = 0;

    const next = () => {
        if (i >= steps.length) {
            el.classList.add('hidden');
            callback();
            return;
        }
        el.textContent = steps[i];
        el.classList.remove('hidden');
        // Relance l'animation CSS à chaque chiffre
        void el.offsetWidth;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        i++;
        setTimeout(next, 900);
    };
    next();
};

////////////////////////////////////////////////
// INITIALISATION
////////////////////////////////////////////////

game.init = function () {
    // Nettoyer les sprites préexistants: supprime tous les éléments DOM des sprites du playground
    const pg = playground.DOM;
    const resources = pg.querySelector('.resources');
    while (pg.firstChild) {
        pg.removeChild(pg.firstChild);
    }
    if (resources) {
        pg.appendChild(resources);
    }

    // Vider les tableaux de sprites
    this.sprites = [];
    this.enemies = [];
    this.r2d2 = null;

    this.r2d2 = new Sprite("R2D2");
    this.r2d2.pos = new Position(
        playground.size.width / 2 - this.r2d2.size.width / 2,
        playground.size.height * 0.8
    );

    // Vaisseaux alliés du niveau 1
    const alliesConfig = [
        { id: 'x_wing', pts: 30 },
        { id: 'anakin_starfighter', pts: 20 },
        { id: 'naboo_starfighter', pts: 15 },
        { id: 'obi_wan_starfighter', pts: 25 },
    ];
    for (let a of alliesConfig) {
        const p = new Plane(a.id, a.pts);
        p.start();
        this.sprites.push(p);
    }

    // Darth Vader niveau 1 (1 seul, apparaît après 4s)
    this.enemies = [];
    this.enemies.push(new DarthVader("darthvader", 4000));

    // Bonus vie
    this.bonusLife = new BonusLife();
    this.bonusTimer = 20000 + Math.random() * 10000;

    // État initial
    this.score = 0;
    this.lives = 3;
    this.timeLeft = 180;
    this.timeAccum = 0;
    this.tFrameLast = 0;
    this.currentLevel = 0;
    this.r2d2Speed = 280;
    this.keys = {};

    hud.setScore(0);
    hud.setLives(3);
    hud.setTimer(180);
    hud.setLevel(1);
    hud.show();

    // Compte à rebours puis lancement
    this.startCountdown(() => {
        this.run = true;
        main(0);
    });
};

////////////////////////////////////////////////
// BOUTON JOUER — écran de démarrage
////////////////////////////////////////////////

document.getElementById('start-btn').addEventListener('click', () => {
    audio.init();

    document.getElementById('start-screen').classList.add('hidden');

    game.init();
});

// Bouton mute
document.getElementById('mute-btn').addEventListener('click', () => {
    audio.toggleMute();
});

// Bouton quitter (retour à l'écran de démarrage)
document.getElementById('quit-btn').addEventListener('click', () => {
    game.returnToHome();
});

// Bouton recommencer (après fin de partie)
document.getElementById('restart-btn').addEventListener('click', () => {
    game.restart();
});

// Bouton retour au menu (après fin de partie)
document.getElementById('home-btn').addEventListener('click', () => {
    game.returnToHome();
});

// L'initialisation des sprites est asynchrone
window.addEventListener("load", () => {
    console.log("Images chargées — prêt.");
});