import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer;
let forestObjects = [];
const scrollable = document.querySelector('.content');

// Initialize the scene and all elements
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d162a);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('container').appendChild(renderer.domElement);

    // Edward Hopper-inspired lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xfff5e6, 200, 500);
    pointLight.position.set(0, 100, -250);
    scene.add(pointLight);

    // Add post-processing for surreal bloom effect
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    composer.addPass(bloomPass);

    // Create the scene's objects
    createForest();
    createOrbs();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    scrollable.addEventListener('scroll', onScroll, false);

    // Start the animation loop
    animate();
}

// Function to create a forest of trees
function createForest() {
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x6a0dad }); // Deep purple color
    const trunkGeometry = new THREE.CylinderGeometry(1, 1, 20, 8);
    
    for (let i = 0; i < 30; i++) {
        const tree = new THREE.Mesh(trunkGeometry, treeMaterial);
        tree.position.x = (Math.random() - 0.5) * 100;
        tree.position.y = -10;
        tree.position.z = -Math.random() * 200 - 50;
        tree.scale.y = 1 + Math.random() * 0.5;
        forestObjects.push(tree);
        scene.add(tree);
    }
}

// Function to create floating orbs
function createOrbs() {
    const orbGeometry = new THREE.SphereGeometry(3, 32, 32);
    const orbMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x7fffd4, // Aquamarine color
        transmission: 1,
        roughness: 0,
        metalness: 0,
        ior: 1.5,
        iridescence: 1
    });

    for (let i = 0; i < 15; i++) {
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.x = (Math.random() - 0.5) * 60;
        orb.position.y = (Math.random() - 0.5) * 30;
        orb.position.z = -Math.random() * 150;
        orb.userData.originalY = orb.position.y;
        forestObjects.push(orb);
        scene.add(orb);
    }
}

// Handle scroll event
function onScroll() {
    const scrollPercent = scrollable.scrollTop / (scrollable.scrollHeight - window.innerHeight);
    const cameraStartZ = 50;
    const cameraEndZ = -200; 

    // Move the camera forward based on scroll
    camera.position.z = cameraStartZ + scrollPercent * (cameraEndZ - cameraStartZ);

    // Make the clearing UI appear as you approach
    const clearingOverlay = document.getElementById('clearing-overlay');
    if (scrollPercent > 0.6) {
        clearingOverlay.style.opacity = '1';
    } else {
        clearingOverlay.style.opacity = '0';
    }

    // Parallax effect for the trees and orbs
    forestObjects.forEach(obj => {
        // Adjust the multiplier for different parallax speeds
        const initialZ = obj.position.z;
        obj.position.z = initialZ + scrollable.scrollTop * 0.1; 
    });
}

// Handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Simple floating animation for orbs
    const time = Date.now() * 0.001;
    scene.traverse(obj => {
        if (obj.isMesh && obj.userData.originalY !== undefined) {
            obj.position.y = obj.userData.originalY + Math.sin(time * 0.5 + obj.position.x * 0.1) * 2;
        }
    });

    // Render the scene with the post-processing effects
    composer.render();
}

init();