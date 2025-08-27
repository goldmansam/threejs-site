// Three.js Scene Setup
let scene, camera, renderer;
let controls = { forward: false, backward: false, left: false, right: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let doors = [];
let currentRoom = 'corridor';
let isPointerLocked = false;

// Movement settings
const MOVE_SPEED = 0.3;
const LOOK_SPEED = 0.002;

// Initialize the liminal space
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf5f5dc, 10, 100);

    // Camera (first person)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Eye level height

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('liminal-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xf5f5dc); // Beige background

    // Create liminal environment
    createLiminalSpace();
    createLighting();
    createDoors();

    // Event listeners
    setupEventListeners();

    // Start animation
    animate();

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1000);
    }, 2000);
}

// Create the liminal space environment
function createLiminalSpace() {
    // Floor - yellow carpet texture
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xdaa520,
        transparent: true,
        opacity: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(100, 100);
    const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Walls - create a maze-like corridor system
    createWalls();
    
    // Add liminal details
    createFluorescentLights();
    createVentilationGrilles();
    createExitSigns();
}

// Create walls for the corridor system
function createWalls() {
    const wallMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xf5f5dc,
        transparent: true,
        opacity: 0.95
    });

    // Main corridor walls
    const wallHeight = 4;
    const wallThickness = 0.2;

    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 50);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-10, wallHeight/2, 0);
    leftWall.castShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 50);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(10, wallHeight/2, 0);
    rightWall.castShadow = true;
    scene.add(rightWall);

    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(20, wallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight/2, -25);
    backWall.castShadow = true;
    scene.add(backWall);

    // Front wall with opening
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(6, wallHeight, wallThickness), wallMaterial);
    frontWallLeft.position.set(-7, wallHeight/2, 25);
    frontWallLeft.castShadow = true;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(6, wallHeight, wallThickness), wallMaterial);
    frontWallRight.position.set(7, wallHeight/2, 25);
    frontWallRight.castShadow = true;
    scene.add(frontWallRight);

    // Side corridors
    createSideCorridor(-10, -15, 'left');
    createSideCorridor(10, -15, 'right');
    createSideCorridor(0, 25, 'front');
}

// Create side corridors
function createSideCorridor(x, z, direction) {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    const wallHeight = 4;
    const wallThickness = 0.2;

    if (direction === 'left' || direction === 'right') {
        // Corridor extending left/right
        const corridorLength = 15;
        const wall1 = new THREE.Mesh(new THREE.BoxGeometry(corridorLength, wallHeight, wallThickness), wallMaterial);
        wall1.position.set(x + (direction === 'left' ? -corridorLength/2 : corridorLength/2), wallHeight/2, z - 2.5);
        wall1.castShadow = true;
        scene.add(wall1);

        const wall2 = new THREE.Mesh(new THREE.BoxGeometry(corridorLength, wallHeight, wallThickness), wallMaterial);
        wall2.position.set(x + (direction === 'left' ? -corridorLength/2 : corridorLength/2), wallHeight/2, z + 2.5);
        wall2.castShadow = true;
        scene.add(wall2);
    } else if (direction === 'front') {
        // Corridor extending forward
        const corridorLength = 15;
        const wall1 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, corridorLength), wallMaterial);
        wall1.position.set(x - 2.5, wallHeight/2, z + corridorLength/2);
        wall1.castShadow = true;
        scene.add(wall1);

        const wall2 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, corridorLength), wallMaterial);
        wall2.position.set(x + 2.5, wallHeight/2, z + corridorLength/2);
        wall2.castShadow = true;
        scene.add(wall2);
    }
}

// Create fluorescent lighting
function createFluorescentLights() {
    for (let i = 0; i < 8; i++) {
        const lightFixture = new THREE.Group();
        
        // Light housing
        const housingGeometry = new THREE.BoxGeometry(4, 0.3, 0.8);
        const housingMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        lightFixture.add(housing);

        // Light tubes
        const tubeGeometry = new THREE.BoxGeometry(3.8, 0.1, 0.3);
        const tubeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const tube1 = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube1.position.y = -0.1;
        tube1.position.z = -0.2;
        lightFixture.add(tube1);

        const tube2 = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube2.position.y = -0.1;
        tube2.position.z = 0.2;
        lightFixture.add(tube2);

        lightFixture.position.set(0, 3.7, -20 + i * 5);
        scene.add(lightFixture);
    }
}

// Create ventilation grilles
function createVentilationGrilles() {
    for (let i = 0; i < 4; i++) {
        const grilleGeometry = new THREE.PlaneGeometry(1.5, 1);
        const grilleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666,
            transparent: true,
            opacity: 0.8
        });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(-9.9, 3, -15 + i * 10);
        grille.rotation.y = Math.PI / 2;
        scene.add(grille);
    }
}

// Create exit signs
function createExitSigns() {
    const signGeometry = new THREE.PlaneGeometry(2, 0.8);
    const signMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.9
    });
    
    const exitSign = new THREE.Mesh(signGeometry, signMaterial);
    exitSign.position.set(0, 3.2, 24.8);
    scene.add(exitSign);
}

// Create interactive doors
function createDoors() {
    const doorData = [
        { position: [-8, 0, -15], section: 'about', name: 'ABOUT' },
        { position: [8, 0, -15], section: 'work', name: 'WORK' },
        { position: [0, 0, 32], section: 'contact', name: 'CONTACT' }
    ];

    doorData.forEach(data => {
        const door = createDoor(data.position, data.name);
        door.userData = { section: data.section, name: data.name };
        doors.push(door);
        scene.add(door);
    });
}

// Create individual door
function createDoor(position, label) {
    const doorGroup = new THREE.Group();

    // Door frame
    const frameGeometry = new THREE.BoxGeometry(2.2, 2.8, 0.3);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    doorGroup.add(frame);

    // Door
    const doorGeometry = new THREE.BoxGeometry(1.8, 2.4, 0.2);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0xa0522d });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.z = 0.05;
    doorGroup.add(door);

    // Door handle
    const handleGeometry = new THREE.SphereGeometry(0.05);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.7, 0, 0.15);
    doorGroup.add(handle);

    // Door label
    const labelGeometry = new THREE.PlaneGeometry(1.5, 0.3);
    const labelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.8
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(0, 0.8, 0.11);
    doorGroup.add(labelMesh);

    doorGroup.position.set(position[0], position[1] + 1.4, position[2]);
    doorGroup.castShadow = true;

    return doorGroup;
}

// Create lighting
function createLighting() {
    // Ambient light (dim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Fluorescent lights
    for (let i = 0; i < 8; i++) {
        const light = new THREE.RectAreaLight(0xffffff, 2, 4, 1);
        light.position.set(0, 3.5, -20 + i * 5);
        light.rotation.x = -Math.PI / 2;
        scene.add(light);
    }

    // Point lights for doors
    doors.forEach(door => {
        const doorLight = new THREE.PointLight(0xffffff, 0.5, 5);
        doorLight.position.copy(door.position);
        doorLight.position.y += 1;
        doorLight.position.z += 1;
        scene.add(doorLight);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Mouse controls
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onMouseClick);
    
    // Pointer lock
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            document.body.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === document.body;
    });

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Back button
    document.getElementById('back-btn').addEventListener('click', exitContentMode);
}

// Keyboard event handlers
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': controls.forward = true; break;
        case 'KeyS': controls.backward = true; break;
        case 'KeyA': controls.left = true; break;
        case 'KeyD': controls.right = true; break;
        case 'Escape': 
            if (currentRoom !== 'corridor') {
                exitContentMode();
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
    }
}

// Mouse movement for looking around
function onMouseMove(event) {
    if (!isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    camera.rotation.y -= movementX * LOOK_SPEED;
    camera.rotation.x -= movementY * LOOK_SPEED;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
}

// Mouse click for door interaction
function onMouseClick() {
    if (currentRoom !== 'corridor') return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(doors);

    if (intersects.length > 0) {
        const door = intersects[0].object.parent;
        enterRoom(door.userData.section);
    }
}

// Enter a room (show content)
function enterRoom(section) {
    currentRoom = section;
    
    // Hide 3D scene
    document.getElementById('liminal-canvas').style.display = 'none';
    document.getElementById('ui-overlay').style.display = 'none';
    
    // Show content
    document.getElementById('content-overlay').classList.remove('hidden');
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(section + '-content').style.display = 'block';
    
    // Update room indicator
    document.getElementById('current-room').textContent = section.toUpperCase();
    
    // Release pointer lock
    document.exitPointerLock();
}

// Exit content mode back to corridor
function exitContentMode() {
    currentRoom = 'corridor';
    
    // Show 3D scene
    document.getElementById('liminal-canvas').style.display = 'block';
    document.getElementById('ui-overlay').style.display = 'block';
    
    // Hide content
    document.getElementById('content-overlay').classList.add('hidden');
    
    // Update room indicator
    document.getElementById('current-room').textContent = 'MAIN CORRIDOR';
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update movement
function updateMovement() {
    if (currentRoom !== 'corridor') return;

    direction.set(0, 0, 0);

    if (controls.forward) direction.z -= 1;
    if (controls.backward) direction.z += 1;
    if (controls.left) direction.x -= 1;
    if (controls.right) direction.x += 1;

    direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0; // Keep movement horizontal

    velocity.copy(direction).multiplyScalar(MOVE_SPEED);
    camera.position.add(velocity);

    // Boundary checks
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-24, Math.min(31, camera.position.z));
    camera.position.y = 1.6; // Keep at eye level
}

// Check for door proximity
function checkDoorProximity() {
    if (currentRoom !== 'corridor') return;

    let nearDoor = null;
    const playerPosition = camera.position;

    doors.forEach(door => {
        const distance = playerPosition.distanceTo(door.position);
        if (distance < 3) {
            nearDoor = door;
        }
    });

    const doorInfo = document.getElementById('door-info');
    if (nearDoor) {
        document.getElementById('door-name').textContent = nearDoor.userData.name;
        doorInfo.classList.remove('hidden');
    } else {
        doorInfo.classList.add('hidden');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    updateMovement();
    checkDoorProximity();

    // Subtle camera sway for liminal feel
    if (currentRoom === 'corridor') {
        const time = Date.now() * 0.001;
        camera.position.y = 1.6 + Math.sin(time * 0.5) * 0.01;
    }

    renderer.render(scene, camera);
}

// Initialize when page loads
window.addEventListener('load', init);