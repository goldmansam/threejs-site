// Three.js Scene Setup
let scene, camera, renderer;
let player;
let controls = { forward: false, backward: false, left: false, right: false, shift: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let portals = [];
let terrain;
let currentRoom = 'reality';
let isPointerLocked = false;
let time = 0;

// Settings
const MOVE_SPEED = 0.3;
const RUN_SPEED = 0.6;
const LOOK_SPEED = 0.003;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 30, 150);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('reality-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    createTerrain();
    createPlayer();
    createPortals();
    createLighting();
    addTrees();

    setupEventListeners();
    animate();

    // Loading screen
    setTimeout(() => {
        const progressBar = document.querySelector('.loading-progress');
        if (progressBar) progressBar.style.width = '100%';
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 1000);
            }
        }, 1000);
    }, 2000);
}

function createTerrain() {
    const size = 200;
    const segments = 64;
    
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array;
    
    // Create hills
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        
        let height = 0;
        height += Math.sin(x * 0.02) * 10;
        height += Math.cos(z * 0.02) * 10;
        height += Math.sin(x * 0.05) * 5;
        height += Math.cos(z * 0.05) * 5;
        
        vertices[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    
    const grassMaterial = new THREE.MeshLambertMaterial({
        color: 0x4CBB17
    });
    
    terrain = new THREE.Mesh(geometry, grassMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

function createPlayer() {
    player = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.6);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: 0x2c2c2c,
        transparent: true,
        opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    player.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3);
    const headMaterial = new THREE.MeshLambertMaterial({
        color: 0x1a1a1a,
        transparent: true,
        opacity: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    player.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05);
    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 2.25, 0.25);
    player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 2.25, 0.25);
    player.add(rightEye);
    
    // Position on terrain
    const terrainHeight = getTerrainHeight(0, 0);
    player.position.set(0, terrainHeight, 0);
    
    scene.add(player);
}

function createPortals() {
    const portalData = [
        { position: [40, 0, -60], section: 'about', name: 'ABOUT PORTAL', color: 0xFF6B6B },
        { position: [-70, 0, 40], section: 'work', name: 'WORK PORTAL', color: 0x4ECDC4 },
        { position: [80, 0, 80], section: 'contact', name: 'CONTACT PORTAL', color: 0xFFE66D }
    ];

    portalData.forEach(data => {
        const portal = createPortal(data.position, data.color);
        portal.userData = { section: data.section, name: data.name };
        portals.push(portal);
        scene.add(portal);
    });
}

function createPortal(position, color) {
    const portalGroup = new THREE.Group();
    const terrainHeight = getTerrainHeight(position[0], position[2]);
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(8, 10, 4);
    const baseMaterial = new THREE.MeshLambertMaterial({
        color: 0x444444
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = terrainHeight + 2;
    base.castShadow = true;
    base.receiveShadow = true;
    portalGroup.add(base);
    
    // Ring
    const ringGeometry = new THREE.TorusGeometry(6, 1);
    const ringMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = terrainHeight + 10;
    ring.castShadow = true;
    portalGroup.add(ring);
    
    // Energy field
    const fieldGeometry = new THREE.RingGeometry(3, 5.5);
    const fieldMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.position.y = terrainHeight + 10;
    portalGroup.add(field);
    
    portalGroup.position.set(position[0], 0, position[2]);
    return portalGroup;
}

function createLighting() {
    // Sun
    const sun = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    sun.position.set(50, 50, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
    scene.add(ambientLight);
}

function addTrees() {
    for (let i = 0; i < 15; i++) {
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Foliage
        const foliageGeometry = new THREE.SphereGeometry(3);
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 7;
        foliage.castShadow = true;
        treeGroup.add(foliage);
        
        // Position
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;
        const terrainHeight = getTerrainHeight(x, z);
        
        treeGroup.position.set(x, terrainHeight, z);
        scene.add(treeGroup);
    }
}

function getTerrainHeight(x, z) {
    let height = 0;
    height += Math.sin(x * 0.02) * 10;
    height += Math.cos(z * 0.02) * 10;
    height += Math.sin(x * 0.05) * 5;
    height += Math.cos(z * 0.05) * 5;
    return height;
}

function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onMouseClick);
    
    document.addEventListener('click', () => {
        if (!isPointerLocked && currentRoom === 'reality') {
            document.body.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === document.body;
    });

    window.addEventListener('resize', onWindowResize);
    
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', exitPortal);
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': controls.forward = true; break;
        case 'KeyS': controls.backward = true; break;
        case 'KeyA': controls.left = true; break;
        case 'KeyD': controls.right = true; break;
        case 'ShiftLeft': controls.shift = true; break;
        case 'Escape': 
            if (currentRoom !== 'reality') {
                exitPortal();
            } else {
                document.exitPointerLock();
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': controls.forward = false; break;
        case 'KeyS': controls.backward = false; break;
        case 'KeyA': controls.left = false; break;
        case 'KeyD': controls.right = false; break;
        case 'ShiftLeft': controls.shift = false; break;
    }
}

function onMouseMove(event) {
    if (!isPointerLocked || !player) return;
    player.rotation.y -= (event.movementX || 0) * LOOK_SPEED;
}

function onMouseClick() {
    if (currentRoom !== 'reality' || !player) return;
    
    portals.forEach(portal => {
        const distance = player.position.distanceTo(portal.position);
        if (distance < 20) {
            enterPortal(portal.userData.section);
        }
    });
}

function enterPortal(section) {
    currentRoom = section;
    
    const canvas = document.getElementById('reality-canvas');
    const overlay = document.getElementById('ui-overlay');
    const content = document.getElementById('content-overlay');
    
    if (canvas) canvas.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (content) content.classList.remove('hidden');
    
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const sectionElement = document.getElementById(section + '-content');
    if (sectionElement) sectionElement.style.display = 'block';
    
    document.exitPointerLock();
}

function exitPortal() {
    currentRoom = 'reality';
    
    const canvas = document.getElementById('reality-canvas');
    const overlay = document.getElementById('ui-overlay');
    const content = document.getElementById('content-overlay');
    
    if (canvas) canvas.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    if (content) content.classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMovement() {
    if (currentRoom !== 'reality' || !player) return;

    direction.set(0, 0, 0);
    if (controls.forward) direction.z -= 1;
    if (controls.backward) direction.z += 1;
    if (controls.left) direction.x -= 1;
    if (controls.right) direction.x += 1;

    if (direction.length() > 0) {
        direction.normalize();
        direction.applyQuaternion(player.quaternion);
        
        const speed = controls.shift ? RUN_SPEED : MOVE_SPEED;
        velocity.copy(direction).multiplyScalar(speed);
        player.position.add(velocity);
    }
    
    // Keep on terrain
    const terrainHeight = getTerrainHeight(player.position.x, player.position.z);
    player.position.y = terrainHeight;
    
    // Boundaries
    player.position.x = Math.max(-90, Math.min(90, player.position.x));
    player.position.z = Math.max(-90, Math.min(90, player.position.z));
}

function updateCamera() {
    if (!player) return;
    
    // Third-person camera
    const idealOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    idealOffset.applyQuaternion(player.quaternion);
    
    const idealPosition = player.position.clone().add(idealOffset);
    const idealLookAt = player.position.clone();
    idealLookAt.y += 1.5;
    
    camera.position.lerp(idealPosition, 0.1);
    camera.lookAt(idealLookAt);
}

function checkPortalProximity() {
    if (currentRoom !== 'reality' || !player) return;
    
    let nearPortal = null;
    portals.forEach(portal => {
        if (player.position.distanceTo(portal.position) < 25) {
            nearPortal = portal;
        }
    });
    
    const portalInfo = document.getElementById('portal-info');
    const portalName = document.getElementById('portal-name');
    
    if (nearPortal && portalInfo && portalName) {
        portalName.textContent = nearPortal.userData.name;
        portalInfo.classList.remove('hidden');
    } else if (portalInfo) {
        portalInfo.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    updateMovement();
    updateCamera();
    checkPortalProximity();

    // Animate portals
    portals.forEach(portal => {
        portal.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

// Start when page loads
window.addEventListener('load', init);