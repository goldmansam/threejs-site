// Three.js Scene Setup
let scene, camera, renderer;
let controls = { forward: false, backward: false, left: false, right: false, shift: false, space: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let portals = [];
let terrain;
let currentRoom = 'reality';
let isPointerLocked = false;
let playerHeight = 2;
let time = 0;

const MOVE_SPEED = 0.5;
const RUN_SPEED = 1.2;
const LOOK_SPEED = 0.002;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('reality-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    createTerrain();
    createSky();
    createPortals();
    createLighting();
    addEnvironmentDetails();

    setupEventListeners();
    animate();

    // Loading screen
    setTimeout(() => {
        document.querySelector('.loading-progress').style.width = '100%';
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 1000);
        }, 1000);
    }, 2000);
}

function createTerrain() {
    // Create a large flat plane first, then add height variation
    const size = 200;
    const segments = 64;
    
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array;
    
    // Add rolling hills
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1]; // Note: PlaneGeometry has z as the second component when rotated
        
        // Create smooth rolling hills
        let height = 0;
        height += Math.sin(x * 0.02) * 8;
        height += Math.cos(z * 0.02) * 8;
        height += Math.sin(x * 0.05) * 4;
        height += Math.cos(z * 0.05) * 4;
        height += Math.sin(x * 0.1) * 2;
        
        vertices[i + 2] = height; // Set the height (z-component after rotation)
    }
    
    geometry.computeVertexNormals();
    
    // Create grass material
    const grassMaterial = new THREE.MeshLambertMaterial({
        color: 0x4CBB17, // Bright grass green
        side: THREE.DoubleSide
    });
    
    terrain = new THREE.Mesh(geometry, grassMaterial);
    terrain.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    console.log('Terrain created and added to scene');
}

function createSky() {
    // Simple gradient sky
    const skyGeometry = new THREE.SphereGeometry(400, 32, 16);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createPortals() {
    const portalData = [
        { position: [30, 0, -40], section: 'about', name: 'ABOUT PORTAL', color: 0xFF6B6B },
        { position: [-50, 0, 30], section: 'work', name: 'WORK PORTAL', color: 0x4ECDC4 },
        { position: [60, 0, 60], section: 'contact', name: 'CONTACT PORTAL', color: 0xFFE66D }
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
    
    // Get terrain height at position
    const terrainHeight = getTerrainHeight(position[0], position[2]);
    
    // Portal base platform
    const baseGeometry = new THREE.CylinderGeometry(8, 10, 3);
    const baseMaterial = new THREE.MeshLambertMaterial({
        color: 0x666666
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = terrainHeight + 1.5;
    base.castShadow = true;
    base.receiveShadow = true;
    portalGroup.add(base);
    
    // Portal ring
    const ringGeometry = new THREE.TorusGeometry(5, 0.8, 8, 16);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = terrainHeight + 8;
    ring.castShadow = true;
    portalGroup.add(ring);
    
    // Portal energy field
    const fieldGeometry = new THREE.RingGeometry(2, 4.5, 16);
    const fieldMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.position.y = terrainHeight + 8;
    portalGroup.add(field);
    
    portalGroup.position.set(position[0], 0, position[2]);
    
    return portalGroup;
}

function getTerrainHeight(x, z) {
    // Calculate height based on the same formula used in terrain creation
    let height = 0;
    height += Math.sin(x * 0.02) * 8;
    height += Math.cos(z * 0.02) * 8;
    height += Math.sin(x * 0.05) * 4;
    height += Math.cos(z * 0.05) * 4;
    height += Math.sin(x * 0.1) * 2;
    return height;
}

function addEnvironmentDetails() {
    // Add some trees
    for (let i = 0; i < 15; i++) {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 7;
        foliage.castShadow = true;
        treeGroup.add(foliage);
        
        // Random positioning
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;
        const terrainHeight = getTerrainHeight(x, z);
        
        treeGroup.position.set(x, terrainHeight, z);
        scene.add(treeGroup);
    }
    
    // Add floating geometric objects for surreal effect
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.OctahedronGeometry(2 + Math.random() * 3);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 200,
            15 + Math.random() * 20,
            (Math.random() - 0.5) * 200
        );
        mesh.castShadow = true;
        
        // Store animation data
        mesh.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            floatSpeed: Math.random() * 0.01 + 0.005,
            originalY: mesh.position.y
        };
        
        scene.add(mesh);
    }
}

function createLighting() {
    // Bright directional light (sun)
    const sun = new THREE.DirectionalLight(0xFFFFFF, 1.2);
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
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.4);
    scene.add(ambientLight);
    
    // Hemisphere light for realistic sky lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4CBB17, 0.6);
    scene.add(hemisphereLight);
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
    document.getElementById('back-btn').addEventListener('click', exitPortal);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': controls.forward = true; break;
        case 'KeyS': controls.backward = true; break;
        case 'KeyA': controls.left = true; break;
        case 'KeyD': controls.right = true; break;
        case 'ShiftLeft': controls.shift = true; break;
        case 'Space': 
            event.preventDefault();
            controls.space = true;
            break;
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
        case 'Space': controls.space = false; break;
    }
}

function onMouseMove(event) {
    if (!isPointerLocked) return;
    camera.rotation.y -= (event.movementX || 0) * LOOK_SPEED;
    camera.rotation.x -= (event.movementY || 0) * LOOK_SPEED;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
}

function onMouseClick() {
    if (currentRoom !== 'reality') return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(portals, true);
    if (intersects.length > 0) {
        let portal = intersects[0].object;
        while (portal.parent && !portal.userData.section) {
            portal = portal.parent;
        }
        if (portal.userData.section) {
            enterPortal(portal.userData.section);
        }
    }
}

function enterPortal(section) {
    currentRoom = section;
    document.getElementById('reality-canvas').style.display = 'none';
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('content-overlay').classList.remove('hidden');
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(section + '-content').style.display = 'block';
    document.exitPointerLock();
}

function exitPortal() {
    currentRoom = 'reality';
    document.getElementById('reality-canvas').style.display = 'block';
    document.getElementById('ui-overlay').style.display = 'block';
    document.getElementById('content-overlay').classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMovement() {
    if (currentRoom !== 'reality') return;

    direction.set(0, 0, 0);
    if (controls.forward) direction.z -= 1;
    if (controls.backward) direction.z += 1;
    if (controls.left) direction.x -= 1;
    if (controls.right) direction.x += 1;

    direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;

    const speed = controls.shift ? RUN_SPEED : MOVE_SPEED;
    velocity.copy(direction).multiplyScalar(speed);
    camera.position.add(velocity);
    
    // Keep camera at proper height above terrain
    const groundHeight = getTerrainHeight(camera.position.x, camera.position.z) + playerHeight;
    camera.position.y = groundHeight;

    // Boundaries
    camera.position.x = Math.max(-90, Math.min(90, camera.position.x));
    camera.position.z = Math.max(-90, Math.min(90, camera.position.z));
}

function checkPortalProximity() {
    if (currentRoom !== 'reality') return;
    let nearPortal = null;
    portals.forEach(portal => {
        if (camera.position.distanceTo(portal.position) < 15) {
            nearPortal = portal;
        }
    });
    const portalInfo = document.getElementById('portal-info');
    if (nearPortal) {
        document.getElementById('portal-name').textContent = nearPortal.userData.name;
        portalInfo.classList.remove('hidden');
    } else {
        portalInfo.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    updateMovement();
    checkPortalProximity();

    // Animate floating objects
    scene.children.forEach(child => {
        if (child.userData && child.userData.floatSpeed) {
            child.rotation.x += child.userData.rotationSpeed;
            child.rotation.y += child.userData.rotationSpeed * 0.7;
            child.position.y = child.userData.originalY + Math.sin(time * child.userData.floatSpeed) * 3;
        }
    });

    // Animate portals
    portals.forEach(portal => {
        portal.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

window.addEventListener('load', init);