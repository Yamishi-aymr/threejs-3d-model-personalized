import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

const MODEL_SCALE = 0.01;

// Velocidad usada si no podemos obtenerla automáticamente
// desde la animación Walk.
const DEFAULT_WALK_SPEED = 1.2;

// Velocidad al usar WASD.
const MANUAL_MOVE_SPEED = 2.2;

// Rapidez con la que el personaje gira hacia la dirección
// en la que se está desplazando.
const ROTATION_SMOOTHNESS = 10;

// ============================================================
// ESCENA
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(
    0x07111f
);

// ============================================================
// CÁMARA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

camera.position.set(
    5,
    3.5,
    7
);

// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
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
    .appendChild(
        renderer.domElement
    );

// ============================================================
// ORBIT CONTROLS
// ============================================================

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.08;

controls.target.set(
    0,
    1,
    0
);

controls.minDistance = 3;

controls.maxDistance = 15;

// ============================================================
// ILUMINACIÓN
// ============================================================

const hemiLight =
    new THREE.HemisphereLight(
        0xffffff,
        0x223344,
        1.8
    );

scene.add(
    hemiLight
);

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

mainLight.shadow.camera.left = -20;
mainLight.shadow.camera.right = 20;
mainLight.shadow.camera.top = 20;
mainLight.shadow.camera.bottom = -20;

scene.add(
    mainLight
);

scene.add(
    mainLight.target
);

// ============================================================
// PISO
// ============================================================

const floorSize = 100;

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

scene.add(
    floor
);

// ============================================================
// CUADRÍCULA
// ============================================================

const grid = new THREE.GridHelper(
    floorSize,
    100,
    0x7dd3fc,
    0x475569
);

grid.position.y = 0.002;

scene.add(
    grid
);

// ============================================================
// LOADER Y RELOJ
// ============================================================

const loader =
    new FBXLoader();

const clock =
    new THREE.Clock();

// ============================================================
// VARIABLES
// ============================================================

const actions = {};

let model;
let mixer;

let currentAction = null;
let currentActionName = null;

// Velocidad calculada a partir de Walk.fbx
let walkAnimationSpeed =
    DEFAULT_WALK_SPEED;

// ============================================================
// ARCHIVOS DE ANIMACIÓN
// ============================================================

const animationFiles = {

    Walk:
        './assets/models/animations/Walk.fbx',

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
// BUSCAR TRACK DE POSICIÓN DEL HUESO RAÍZ
// ============================================================

function findRootPositionTrack(
    clip
) {

    return clip.tracks.find(
        (track) => {

            const name =
                track.name.toLowerCase();

            return (
                name.endsWith('.position') &&
                (
                    name.includes('hips') ||
                    name.includes('root') ||
                    name.includes('pelvis')
                )
            );
        }
    );
}

// ============================================================
// EXTRAER ROOT MOTION
// ============================================================
//
// Walk.fbx probablemente desplaza el hueso Hips/Root.
//
// Eso provoca:
//
//      inicio -----> final
//
// y al repetirse:
//
//      final -----> inicio
//
// visualmente parece que el personaje se devuelve.
//
// Aquí hacemos dos cosas:
//
// 1. Calculamos cuánto avanza realmente el FBX.
// 2. Quitamos X/Z de la animación.
//
// Después nosotros aplicamos ese desplazamiento a:
//
//      model.position
//
// Por eso el personaje conserva su posición al terminar
// cada ciclo.
//
// ============================================================

function prepareAnimation(
    name,
    clip
) {

    const rootTrack =
        findRootPositionTrack(
            clip
        );

    if (
        !rootTrack
    ) {

        console.warn(
            `No se encontró Hips/Root en ${name}`
        );

        return clip;
    }

    const values =
        rootTrack.values;

    if (
        values.length < 6
    ) {
        return clip;
    }

    // ========================================================
    // POSICIÓN INICIAL
    // ========================================================

    const startX =
        values[0];

    const startZ =
        values[2];

    // ========================================================
    // POSICIÓN FINAL
    // ========================================================

    const lastIndex =
        values.length - 3;

    const endX =
        values[lastIndex];

    const endZ =
        values[lastIndex + 2];

    // ========================================================
    // DISTANCIA TOTAL DEL CLIP
    // ========================================================

    const deltaX =
        endX - startX;

    const deltaZ =
        endZ - startZ;

    const animationDistance =
        Math.sqrt(
            deltaX * deltaX +
            deltaZ * deltaZ
        ) * MODEL_SCALE;

    // ========================================================
    // VELOCIDAD REAL DEL WALK
    // ========================================================

    if (
        name === 'Walk' &&
        animationDistance > 0.01 &&
        clip.duration > 0
    ) {

        walkAnimationSpeed =
            animationDistance /
            clip.duration;

        // Evitamos velocidades absurdamente
        // pequeñas o grandes.
        walkAnimationSpeed =
            THREE.MathUtils.clamp(
                walkAnimationSpeed,
                0.5,
                3
            );

        console.log(
            'Velocidad Walk detectada:',
            walkAnimationSpeed
        );
    }

    // ========================================================
    // CONVERTIR ANIMACIÓN A IN-PLACE
    // ========================================================
    //
    // Conservamos Y porque caminar, saltar o bailar
    // puede necesitar movimiento vertical.
    //
    // Únicamente bloqueamos X y Z.
    //
    // ========================================================

    for (
        let i = 0;
        i < values.length;
        i += 3
    ) {

        values[i] =
            startX;

        // values[i + 1] = Y
        // Se conserva.

        values[i + 2] =
            startZ;
    }

    return clip;
}

// ============================================================
// CARGAR ANIMACIÓN
// ============================================================

function loadAnimation(
    name,
    url
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            loader.load(

                url,

                (fbx) => {

                    let clip =
                        fbx.animations[0];

                    if (
                        !clip
                    ) {

                        console.warn(
                            `${name} no contiene animación.`
                        );

                        resolve();

                        return;
                    }

                    clip =
                        prepareAnimation(
                            name,
                            clip
                        );

                    const action =
                        mixer.clipAction(
                            clip
                        );

                    action.setLoop(
                        THREE.LoopRepeat,
                        Infinity
                    );

                    action.clampWhenFinished =
                        false;

                    actions[name] =
                        action;

                    resolve();
                },

                undefined,

                (error) => {

                    console.error(
                        `Error cargando ${name}:`,
                        error
                    );

                    reject(
                        error
                    );
                }
            );
        }
    );
}

// ============================================================
// CAMBIAR ANIMACIÓN
// ============================================================

function playAction(
    name
) {

    const nextAction =
        actions[name];

    if (
        !nextAction
    ) {

        console.warn(
            `No existe la animación ${name}`
        );

        return;
    }

    if (
        currentAction === nextAction
    ) {
        return;
    }

    const previousAction =
        currentAction;

    nextAction.reset();

    nextAction.enabled =
        true;

    nextAction.setEffectiveTimeScale(
        1
    );

    nextAction.setEffectiveWeight(
        1
    );

    nextAction.play();

    if (
        previousAction
    ) {

        previousAction.crossFadeTo(
            nextAction,
            0.3,
            false
        );

    } else {

        nextAction.fadeIn(
            0.3
        );
    }

    currentAction =
        nextAction;

    currentActionName =
        name;

    const animationName =
        document.getElementById(
            'animation-name'
        );

    if (
        animationName
    ) {

        animationName.textContent =
            name.toUpperCase();
    }
}

// ============================================================
// CARGAR PERSONAJE
// ============================================================

loader.load(

    './assets/models/character.fbx',

    async (fbx) => {

        model =
            fbx;

        model.scale.setScalar(
            MODEL_SCALE
        );

        model.position.set(
            0,
            0,
            0
        );

        model.rotation.set(
            0,
            0,
            0
        );

        model.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;
                }
            }
        );

        scene.add(
            model
        );

        mixer =
            new THREE.AnimationMixer(
                model
            );

        try {

            await Promise.all(

                Object.entries(
                    animationFiles
                ).map(
                    ([name, url]) =>
                        loadAnimation(
                            name,
                            url
                        )
                )
            );

            // =================================================
            // EMPEZAR CAMINANDO
            // =================================================
            //
            // En tu código original aparecía:
            //
            // playAction('idle');
            //
            // pero no existe una animación llamada idle.
            //
            // =================================================

            playAction(
                'Walk'
            );

        } catch (
        error
        ) {

            console.error(
                'Error cargando animaciones:',
                error
            );
        }
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
// TECLADO WASD
// ============================================================

const keys = {

    forward: false,
    backward: false,
    left: false,
    right: false
};

// ============================================================
// KEYDOWN
// ============================================================

window.addEventListener(

    'keydown',

    (event) => {

        // ====================================================
        // MOVIMIENTO
        // ====================================================

        switch (
        event.code
        ) {

            case 'KeyW':

                keys.forward =
                    true;

                break;

            case 'KeyS':

                keys.backward =
                    true;

                break;

            case 'KeyA':

                keys.left =
                    true;

                break;

            case 'KeyD':

                keys.right =
                    true;

                break;
        }

        // ====================================================
        // CAMBIO DE ANIMACIÓN
        // ====================================================

        const keyboard = {

            Digit1:
                'Walk',

            Digit2:
                'BreakDance',

            Digit3:
                'Jump',

            Digit4:
                'NortherSoul',

            Digit5:
                'SillyDancing',

            Digit6:
                'RumbaDancing',

            Digit7:
                'Ballet',
        };

        if (
            keyboard[event.code] &&
            !event.repeat
        ) {

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

        switch (
        event.code
        ) {

            case 'KeyW':

                keys.forward =
                    false;

                break;

            case 'KeyS':

                keys.backward =
                    false;

                break;

            case 'KeyA':

                keys.left =
                    false;

                break;

            case 'KeyD':

                keys.right =
                    false;

                break;
        }
    }
);

// ============================================================
// EVITAR TECLAS PEGADAS
// ============================================================

window.addEventListener(

    'blur',

    () => {

        keys.forward =
            false;

        keys.backward =
            false;

        keys.left =
            false;

        keys.right =
            false;
    }
);

// ============================================================
// VECTORES DE MOVIMIENTO
// ============================================================

const moveDirection =
    new THREE.Vector3();

const cameraForward =
    new THREE.Vector3();

const cameraRight =
    new THREE.Vector3();

const previousModelPosition =
    new THREE.Vector3();

const modelMovement =
    new THREE.Vector3();

let cameraFollowInitialized =
    false;

// ============================================================
// ROTACIÓN SUAVE
// ============================================================

function rotateCharacterTowards(
    direction,
    delta
) {

    if (
        !model ||
        direction.lengthSq() === 0
    ) {
        return;
    }

    const targetAngle =
        Math.atan2(
            direction.x,
            direction.z
        );

    let difference =
        targetAngle -
        model.rotation.y;

    difference =
        Math.atan2(
            Math.sin(
                difference
            ),
            Math.cos(
                difference
            )
        );

    model.rotation.y +=
        difference *
        Math.min(
            ROTATION_SMOOTHNESS *
            delta,
            1
        );
}

// ============================================================
// MOVIMIENTO DEL PERSONAJE
// ============================================================

function updateCharacterMovement(
    delta
) {

    if (
        !model
    ) {
        return;
    }

    // ========================================================
    // COMPROBAR WASD
    // ========================================================

    const horizontal =
        (
            keys.right
                ? 1
                : 0
        ) -
        (
            keys.left
                ? 1
                : 0
        );

    const vertical =
        (
            keys.forward
                ? 1
                : 0
        ) -
        (
            keys.backward
                ? 1
                : 0
        );

    const usingKeyboard =
        horizontal !== 0 ||
        vertical !== 0;

    // ========================================================
    // MOVIMIENTO CON WASD
    // ========================================================

    if (
        usingKeyboard
    ) {

        // ----------------------------------------------------
        // DIRECCIÓN HACIA DELANTE DE LA CÁMARA
        // ----------------------------------------------------

        camera.getWorldDirection(
            cameraForward
        );

        cameraForward.y =
            0;

        cameraForward.normalize();

        // ----------------------------------------------------
        // DIRECCIÓN DERECHA DE LA CÁMARA
        // ----------------------------------------------------

        cameraRight.crossVectors(
            cameraForward,
            camera.up
        );

        cameraRight.normalize();

        // ----------------------------------------------------
        // COMBINAR WASD
        // ----------------------------------------------------

        moveDirection
            .set(
                0,
                0,
                0
            )
            .addScaledVector(
                cameraForward,
                vertical
            )
            .addScaledVector(
                cameraRight,
                horizontal
            );

        if (
            moveDirection.lengthSq() >
            0
        ) {

            moveDirection.normalize();

            // Girar hacia donde se mueve
            rotateCharacterTowards(
                moveDirection,
                delta
            );

            // Desplazamiento real
            model.position.addScaledVector(
                moveDirection,
                MANUAL_MOVE_SPEED *
                delta
            );
        }

        return;
    }

    // ========================================================
    // MOVIMIENTO AUTOMÁTICO DE WALK
    // ========================================================
    //
    // Si no estamos pulsando WASD y está activa Walk,
    // el personaje sigue avanzando.
    //
    // Cuando Walk llega al final del ciclo el modelo NO
    // vuelve atrás, porque la posición real pertenece al
    // objeto model y no al hueso Hips.
    //
    // ========================================================

    // ========================================================
    // MOVIMIENTO AUTOMÁTICO DE WALK Y BALLET
    // ========================================================

    if (
        currentActionName === 'Walk' ||
        currentActionName === 'Ballet' ||
        currentActionName === 'BreakDance' ||
        currentActionName === 'Jump' ||
        currentActionName === 'NortherSoul' ||
        currentActionName === 'SillyDancing' ||
        currentActionName === 'RumbaDancing'
    ) {

        moveDirection.set(
            Math.sin(
                model.rotation.y
            ),
            0,
            Math.cos(
                model.rotation.y
            )
        );

        moveDirection.normalize();

        model.position.addScaledVector(
            moveDirection,
            walkAnimationSpeed *
            delta
        );
    }
}

// ============================================================
// CÁMARA SIGUIENDO AL PERSONAJE
// ============================================================

function updateCameraFollow() {

    if (
        !model
    ) {
        return;
    }

    if (
        !cameraFollowInitialized
    ) {

        previousModelPosition.copy(
            model.position
        );

        cameraFollowInitialized =
            true;

        return;
    }

    modelMovement.subVectors(
        model.position,
        previousModelPosition
    );

    // ========================================================
    // MOVER CÁMARA LA MISMA DISTANCIA
    // ========================================================

    camera.position.add(
        modelMovement
    );

    // ========================================================
    // MANTENER OBJETIVO SOBRE PERSONAJE
    // ========================================================

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
// MANTENER ILUMINACIÓN CERCA DEL PERSONAJE
// ============================================================

function updateLight() {

    if (
        !model
    ) {
        return;
    }

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

    mainLight.target.updateMatrixWorld();
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function animate() {

    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );

    // Primero actualizamos el esqueleto.
    if (
        mixer
    ) {

        mixer.update(
            delta
        );
    }

    // Después movemos el objeto global.
    updateCharacterMovement(
        delta
    );

    updateCameraFollow();

    updateLight();

    controls.update();

    renderer.render(
        scene,
        camera
    );
}

// ============================================================
// INICIAR
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