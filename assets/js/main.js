import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(5, 3.5, 7);


const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('scene-container').appendChild(renderer.domElement);


const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

controls.target.set(0, 1, 0);


const hemiLight = new THREE.HemisphereLight(0xffffff, 0x223344, 1.8);

scene.add(hemiLight);


const mainLight = new THREE.DirectionalLight(0xffffff, 3);

mainLight.position.set(5, 10, 6);

mainLight.castShadow = true;

mainLight.shadow.mapSize.set(2048, 2048);

scene.add(mainLight);


const floor = new THREE.Mesh(

    new THREE.PlaneGeometry(20, 20),

    new THREE.MeshStandardMaterial({ color: 0x263445, roughness: 0.9 })

);

floor.rotation.x = -Math.PI / 2;

floor.receiveShadow = true;

scene.add(floor);

scene.add(new THREE.GridHelper(20, 20, 0x7dd3fc, 0x475569));


const loader = new FBXLoader();

const clock = new THREE.Clock();

const actions = {};

let model;

let mixer;

let currentAction;


const animationFiles = {

    HipHop: './assets/models/animations/HipHopDancing.fbx',
    BreakDance: './assets/models/animations/BreakdanceFreezeVar2.fbx',
    Jump: './assets/models/animations/JoyfulJump.fbx',
    NortherSoul: './assets/models/animations/NorthernSoulSpin.fbx',
    SillyDancing: './assets/models/animations/SillyDancing.fbx',
    RumbaDancing: './assets/models/animations/RumbaDancing.fbx'
};


function loadAnimation(name, url) {

    return new Promise((resolve, reject) => {

        loader.load(url, (fbx) => {

            const clip = fbx.animations[0];

            actions[name] = mixer.clipAction(clip);

            resolve();

        }, undefined, reject);

    });

}


function playAction(name) {

    const nextAction = actions[name];

    if (!nextAction || nextAction === currentAction) return;


    if (currentAction) currentAction.fadeOut(0.25);


    nextAction

        .reset()

        .setEffectiveTimeScale(1)

        .setEffectiveWeight(1)

        .fadeIn(0.25)

        .play();


    currentAction = nextAction;

    document.getElementById('animation-name').textContent = name.toUpperCase();

}


loader.load('./assets/models/character.fbx', async (fbx) => {

    model = fbx;

    model.scale.setScalar(0.01);

    model.position.set(0, 0, 0);


    model.traverse((child) => {

        if (child.isMesh) {

            child.castShadow = true;

            child.receiveShadow = true;

        }

    });


    scene.add(model);

    mixer = new THREE.AnimationMixer(model);


    await Promise.all(

        Object.entries(animationFiles).map(([name, url]) => loadAnimation(name, url))

    );


    playAction('idle');

}, undefined, (error) => console.error('Error al cargar el modelo:', error));


window.addEventListener('keydown', (event) => {

    const keyboard = {

        Digit1: 'HipHop',

        Digit2: 'BreakDance',

        Digit3: 'Jump',

        Digit4: 'NortherSoul',

        Digit5: 'SillyDancing',

        Digit6: 'RumbaDancing'

    };


    if (keyboard[event.code]) playAction(keyboard[event.code]);

});


function animate() {

    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    controls.update();

    renderer.render(scene, camera);

}


renderer.setAnimationLoop(animate);


window.addEventListener('resize', () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}); s