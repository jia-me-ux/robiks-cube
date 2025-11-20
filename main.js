import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RubiksCube } from './src/RubiksCube.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
backLight.position.set(-10, -10, -10);
scene.add(backLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Rubik's Cube
const rubiksCube = new RubiksCube(scene);

// UI Event Listeners
document.getElementById('btn-shuffle').addEventListener('click', () => {
    rubiksCube.shuffle();
});

document.getElementById('btn-solve').addEventListener('click', () => {
    rubiksCube.solve();
});

document.getElementById('btn-reset').addEventListener('click', () => {
    rubiksCube.reset();
});

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    rubiksCube.update();
    renderer.render(scene, camera);
}

animate();
