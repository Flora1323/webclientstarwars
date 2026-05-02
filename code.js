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
        // calcule la nouvelle pôsition
        return this.shift(delta.x, delta.y);
    }
};

// class rectangle 

class Rectangle {
    #pos;   // { x, y }
    #size;  // { width, height }

    constructor(position, size) {
        this.#pos  = position;  // position : objet { x, y }
        this.#size = size;      // size : objet { width, height }
    }

    get x()      { return this.#pos.x; }
    get y()      { return this.#pos.y; }
    get width()  { return this.#size.width; }
    get height() { return this.#size.height; }

    // Retourne vrai s'il y a intersection avec le rectangle r
    areIntersecting(r) {
        // Pas d'intersection sur l'axe X si :
        //   R2 est à droite de R1 : r.x > this.x + this.width
        //   R2 est à gauche de R1 : r.x + r.width < this.x
        if (r.x > this.x + this.width)  return false;
        if (r.x + r.width < this.x)     return false;

        // Pas d'intersection sur l'axe Y si :
        //   R2 est en dessous de R1 : r.y > this.y + this.height
        //   R2 est au dessus de R1  : r.y + r.height < this.y
        if (r.y > this.y + this.height) return false;
        if (r.y + r.height < this.y)    return false;

        // Aucune condition de non-intersection → ils se touchent
        return true;
    }

    // Retourne vrai si CE rectangle est entièrement contenu dans r
    isInside(r) {
        return this.x >= r.x &&
               this.y >= r.y &&
               this.x + this.width  <= r.x + r.width &&
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
        this.#x = 0; // Bien mettre à 0 pour que le bonhomme bouge pas.
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
        console.log(dx, dy, this.#x, this.#y, this);

        // Limite les vitesses
        if (this.#x > this.#max) {
            this.#x = this.#max;
        } else if (this.#x < - this.#max) {
            this.#x = - this.#max;
        }
        if (this.#y > this.#max) {
            this.#y = this.#max;
        } else if (this.#y < - this.#max) {
            this.#y = - this.#max;
        }
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

// Initialiste la dimension de l'aire de jeu
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
        let minX = - this.#size.width;
        let minY = - this.#size.height;
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

    // Change sa position pour la nouvelle frame en fonction de sa vitesse
    update(duration) {
        // Deplace la position en fonction de la vitesse et du temps
        this.pos = this.#pos.move(this.#speed, duration);
    };

// AJOUT DE LA FONCTION getRectangle POUR AVOIR LE RECTANGLE DE COLLISION DU SPRITE
    getRectangle(pos) {
        // Détermine quelle position est utilisé
        let positionToUse;
        if (pos === undefined) {
            // Si aucun paramètre, on prend la position actuelle du Sprite
            positionToUse = this.pos;
        } else {
            // Sinon, on utilise celle passée en paramètre (pour "prédire")
            positionToUse = pos;
        }

    // Créer et retourne l'objet Rectangle PAS SUR DE CA JUSTE FAUT REFAIRE POSITIONTOUSE JCROIS
        return new Rectangle(positionToUse, this.size);
    }
}

class Plane extends Sprite {
    // Temps avant un démmarage
    waitingTime;
    constructor(id) {
        super(id);
        this.waitingTime = 0;
    }

    // Démarre l'avion du haut de l'écran 
    start() {
        // Choisit une position x random
        let x = playground.size.width * Math.random();
        this.pos = new Position(x, -this.size.height);
        this.changeSpeed(3, 203);
        console.log(this.id, 'start')
    }

    // Vrai si le sprite a atteint de bas de l'aire de jeux
    isAtBottom() {
        return this.pos.y >= playground.size.height;
    }

    update(duration) {
        super.update(duration);
        // Regarde si le sprite a disparu au bas de l'écran
        if (this.isAtBottom() && !this.isStopped()) {
            // Arrete le sprite
            this.stop();
            // Place un temps d'attende avant de redémmarer
            this.waitingTime = 60;
        }
        // Si le sprite est arrété, attend puis redémmare
        if (this.isStopped()) {
            this.waitingTime -= duration;
            if (this.waitingTime <= 0) {
                this.waitingTime = 0;
                this.start();
            }
        }
    }
}

let game = {
    run: false,
    tFrameLast: 0,
    r2d2: new Sprite("R2D2"),
    sprites: []
};



// Mise à jour du jeux à la date indiquée
game.update = function (tFrame) {
    // Calcule la durée qui s'est passé apres la frame précédente
    let duration = tFrame - this.tFrameLast;
    // Met à jour le temps précédent
    this.tFrameLast = tFrame;
    // Déplace le robot
    game.r2d2.update(duration);
    // Déplace les autres objets
    for (let sprite of this.sprites) {
        sprite.update(duration);
    }
}

// Reaction du jeux à l'enfoncement d'une touche
game.onkeydown = function (key) {
    const delta = 10;
    switch (key) {
        case "ArrowLeft":
            game.r2d2.changeSpeed(-delta, 0);
            break;
        case "ArrowUp":
            game.r2d2.changeSpeed(0, -delta);
            break;
        case "ArrowRight":
            game.r2d2.changeSpeed(delta, 0);
            break;
        case "ArrowDown":
            game.r2d2.changeSpeed(0, delta);
            break;
        case "s":
            game.run = false;
            break;
        default:
            console.log(key)
    }
}

// Installe la lecture des caractères
window.onkeydown = function (e) {
    game.onkeydown(e.key);
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

// Démmare le jeu
game.start = function () {
    // lance tous les sprites
    for (sprite of this.sprites) {
        sprite.start();
    }
}

game.stop = function () {
    game.run = false;
}
game.init = function () {
    // Attend l'initialisation des autres sprites
    let sprite = new Plane("x_wing");
    game.sprites.push(sprite);

    sprite = new Plane("anakin_starfighter");
    game.sprites.push(sprite);

    sprite = new Plane("naboo_starfighter");
    game.sprites.push(sprite);

    sprite = new Plane("obi_wan_starfighter");
    game.sprites.push(sprite);

    this.run = true;
    this.tFrameLast = 0;

    game.start();
    main(0); // Début du cycle
}

// L'initialisation est asynchrone donc il faut attendre
// Il faut que toutes les images soient chargées donc on
// s'acroche à l'évelment load de window
window.addEventListener("load", () => { game.init(); })