import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


// ============================================================
// ESCENA
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x07111f);


// ============================================================
// CÁMARA
// ============================================================

const camera = new THREE.PerspectiveCamera(

    50,

    window.innerWidth / window.innerHeight,

    0.1,

    500

);

camera.position.set(5, 3.5, 7);


// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({

    antialias: true

});

renderer.setPixelRatio(

    Math.min(window.devicePixelRatio, 2)

);

renderer.setSize(

    window.innerWidth,

    window.innerHeight

);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

document
    .getElementById('scene-container')
    .appendChild(renderer.domElement);


// ============================================================
// CONTROLES DE CÁMARA
// ============================================================

const controls =
    new OrbitControls(
        camera,
        renderer.domElement
    );

controls.enableDamping = true;

controls.dampingFactor = 0.08;

controls.target.set(0, 1, 0);


// ============================================================
// ILUMINACIÓN
// ============================================================

const hemiLight =
    new THREE.HemisphereLight(
        0xffffff,
        0x223344,
        1.8
    );

scene.add(hemiLight);


const mainLight =
    new THREE.DirectionalLight(
        0xffffff,
        3
    );

mainLight.position.set(
    5,
    10,
    6
);

mainLight.castShadow = true;

mainLight.shadow.mapSize.set(
    2048,
    2048
);

// Área de sombras más grande
mainLight.shadow.camera.left = -20;
mainLight.shadow.camera.right = 20;
mainLight.shadow.camera.top = 20;
mainLight.shadow.camera.bottom = -20;

scene.add(mainLight);


// ============================================================
// PISO
// ============================================================

const floorSize = 80;

const floor = new THREE.Mesh(

    new THREE.PlaneGeometry(
        floorSize,
        floorSize
    ),

    new THREE.MeshStandardMaterial({

        color: 0x263445,

        roughness: 0.9

    })

);

floor.rotation.x =
    -Math.PI / 2;

floor.receiveShadow = true;

scene.add(floor);


// ============================================================
// CUADRÍCULA
// ============================================================

const grid = new THREE.GridHelper(

    floorSize,

    80,

    0x7dd3fc,

    0x475569

);

grid.position.y = 0.002;

scene.add(grid);


// ============================================================
// LOADER Y ANIMACIONES
// ============================================================

const loader =
    new FBXLoader();

const clock =
    new THREE.Clock();

const actions = {};

let model;

let mixer;

let currentAction;


// ============================================================
// ARCHIVOS DE ANIMACIÓN
// ============================================================

const animationFiles = {

    HipHop:
        './assets/models/animations/HipHopDancing.fbx',

    BreakDance:
        './assets/models/animations/BreakdanceFreezeVar2.fbx',

    Jump:
        './assets/models/animations/JoyfulJump.fbx',

    NortherSoul:
        './assets/models/animations/NorthernSoulSpin.fbx',

    SillyDancing:
        './assets/models/animations/SillyDancing.fbx',

    RumbaDancing:
        './assets/models/animations/RumbaDancing.fbx',

    Ballet:
        './assets/models/animations/Dancing.fbx'

};


// ============================================================
// CARGAR ANIMACIÓN
// ============================================================

function loadAnimation(name, url) {

    return new Promise(
        (resolve, reject) => {

            loader.load(

                url,

                (fbx) => {

                    const clip =
                        fbx.animations[0];

                    actions[name] =
                        mixer.clipAction(clip);

                    resolve();

                },

                undefined,

                reject

            );

        }
    );

}


// ============================================================
// CAMBIAR ANIMACIÓN SUAVEMENTE
// ============================================================

function playAction(name) {

    const nextAction =
        actions[name];


    if (!nextAction)
        return;


    if (nextAction === currentAction)
        return;


    // ========================================================
    // YA EXISTE UNA ANIMACIÓN
    // ========================================================

    if (currentAction) {

        const currentClip =
            currentAction.getClip();

        const nextClip =
            nextAction.getClip();


        let progress = 0;


        if (currentClip.duration > 0) {

            progress =

                (
                    currentAction.time %
                    currentClip.duration
                )

                /

                currentClip.duration;

        }


        nextAction.enabled = true;

        nextAction
            .setEffectiveTimeScale(1);

        nextAction
            .setEffectiveWeight(1);


        // Mantener aproximadamente
        // el progreso de la animación anterior
        nextAction.time =

            progress *
            nextClip.duration;


        nextAction.play();


        currentAction.crossFadeTo(

            nextAction,

            0.6,

            true

        );

    }

    // ========================================================
    // PRIMERA ANIMACIÓN
    // ========================================================

    else {

        nextAction

            .reset()

            .setEffectiveTimeScale(1)

            .setEffectiveWeight(1)

            .fadeIn(0.3)

            .play();

    }


    currentAction =
        nextAction;


    const animationLabel =
        document.getElementById(
            'animation-name'
        );


    if (animationLabel) {

        animationLabel.textContent =
            name.toUpperCase();

    }

}


// ============================================================
// CARGAR MODELO
// ============================================================

loader.load(

    './assets/models/character.fbx',

    async (fbx) => {

        model = fbx;


        model.scale.setScalar(
            0.01
        );


        model.position.set(
            0,
            0,
            0
        );


        model.traverse(
            (child) => {

                if (child.isMesh) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );


        scene.add(model);


        mixer =
            new THREE.AnimationMixer(
                model
            );


        await Promise.all(

            Object
                .entries(animationFiles)
                .map(
                    ([name, url]) =>
                        loadAnimation(
                            name,
                            url
                        )
                )

        );


        // Animación inicial
        playAction('HipHop');

    },

    undefined,

    (error) => {

        console.error(
            'Error al cargar el modelo:',
            error
        );

    }

);


// ============================================================
// TECLAS ACTIVAS
// ============================================================

const keys = {

    forward: false,

    backward: false,

    left: false,

    right: false,

    sprint: false

};


// ============================================================
// KEYDOWN
// ============================================================

window.addEventListener(
    'keydown',
    (event) => {


        // ----------------------------------------------------
        // MOVIMIENTO
        // ----------------------------------------------------

        switch (event.code) {

            case 'KeyW':
            case 'ArrowUp':

                keys.forward = true;

                break;


            case 'KeyS':
            case 'ArrowDown':

                keys.backward = true;

                break;


            case 'KeyA':
            case 'ArrowLeft':

                keys.left = true;

                break;


            case 'KeyD':
            case 'ArrowRight':

                keys.right = true;

                break;


            case 'ShiftLeft':
            case 'ShiftRight':

                keys.sprint = true;

                break;

        }


        // ----------------------------------------------------
        // ANIMACIONES
        // ----------------------------------------------------

        const keyboard = {

            Digit1: 'HipHop',

            Digit2: 'BreakDance',

            Digit3: 'Jump',

            Digit4: 'NortherSoul',

            Digit5: 'SillyDancing',

            Digit6: 'RumbaDancing',

            Digit7: 'Ballet'

        };


        if (keyboard[event.code]) {

            playAction(
                keyboard[event.code]
            );

        }

    }
);


// ============================================================
// KEYUP
// ============================================================

window.addEventListener(
    'keyup',
    (event) => {

        switch (event.code) {

            case 'KeyW':
            case 'ArrowUp':

                keys.forward = false;

                break;


            case 'KeyS':
            case 'ArrowDown':

                keys.backward = false;

                break;


            case 'KeyA':
            case 'ArrowLeft':

                keys.left = false;

                break;


            case 'KeyD':
            case 'ArrowRight':

                keys.right = false;

                break;


            case 'ShiftLeft':
            case 'ShiftRight':

                keys.sprint = false;

                break;

        }

    }
);


// ============================================================
// PARÁMETROS DE MOVIMIENTO
// ============================================================

const WALK_SPEED = 2.2;

const RUN_SPEED = 4.5;

const ROTATION_SPEED = 2.3;


// Vector temporal
const movementDirection =
    new THREE.Vector3();


// ============================================================
// MOVIMIENTO DEL PERSONAJE
// ============================================================

function updateCharacterMovement(delta) {

    if (!model)
        return;


    // --------------------------------------------------------
    // GIRAR
    // --------------------------------------------------------

    if (keys.left) {

        model.rotation.y +=

            ROTATION_SPEED *
            delta;

    }


    if (keys.right) {

        model.rotation.y -=

            ROTATION_SPEED *
            delta;

    }


    // --------------------------------------------------------
    // VELOCIDAD
    // --------------------------------------------------------

    const speed =

        keys.sprint

            ? RUN_SPEED

            : WALK_SPEED;


    let direction = 0;


    if (keys.forward)
        direction += 1;


    if (keys.backward)
        direction -= 1;


    // --------------------------------------------------------
    // AVANZAR / RETROCEDER
    // --------------------------------------------------------

    if (direction !== 0) {

        movementDirection.set(

            Math.sin(
                model.rotation.y
            ),

            0,

            Math.cos(
                model.rotation.y
            )

        );


        movementDirection.multiplyScalar(

            speed *
            delta *
            direction

        );


        model.position.add(
            movementDirection
        );

    }

}


// ============================================================
// CÁMARA SIGUIENDO AL PERSONAJE
// ============================================================

const previousModelPosition =
    new THREE.Vector3();


function updateCameraFollow() {

    if (!model)
        return;


    // Cuánto se desplazó el personaje
    const movement =

        model.position
            .clone()
            .sub(
                previousModelPosition
            );


    // Mover cámara junto al personaje
    camera.position.add(
        movement
    );


    // El OrbitControls mira al personaje
    controls.target.set(

        model.position.x,

        model.position.y + 1,

        model.position.z

    );


    previousModelPosition.copy(
        model.position
    );

}


// ============================================================
// PISO "INFINITO"
// ============================================================

function updateInfiniteFloor() {

    if (!model)
        return;


    /*
        El piso y la cuadrícula se colocan
        constantemente debajo del personaje.

        De esta manera el usuario nunca
        llega visualmente al borde.
    */


    floor.position.x =
        model.position.x;

    floor.position.z =
        model.position.z;


    grid.position.x =
        model.position.x;

    grid.position.z =
        model.position.z;


    // --------------------------------------------------------
    // La luz también sigue al personaje
    // --------------------------------------------------------

    mainLight.position.set(

        model.position.x + 5,

        10,

        model.position.z + 6

    );


    mainLight.target.position.set(

        model.position.x,

        0,

        model.position.z

    );


    scene.add(
        mainLight.target
    );

}


// ============================================================
// ANIMACIÓN PRINCIPAL
// ============================================================

function animate() {

    const delta =
        Math.min(
            clock.getDelta(),
            0.1
        );


    // Animaciones FBX
    if (mixer) {

        mixer.update(
            delta
        );

    }


    // Movimiento con teclado
    updateCharacterMovement(
        delta
    );


    // Piso infinito
    updateInfiniteFloor();


    // Cámara siguiendo personaje
    updateCameraFollow();


    // OrbitControls
    controls.update();


    // Renderizar
    renderer.render(
        scene,
        camera
    );

}


// ============================================================
// LOOP
// ============================================================

renderer.setAnimationLoop(
    animate
);


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    'resize',
    () => {

        camera.aspect =

            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(

            window.innerWidth,

            window.innerHeight

        );

    }
);