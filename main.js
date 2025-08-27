// Three.js Scene Setup
let scene, camera, renderer;
let controls = { forward: false, backward: false, left: false, right: false, shift: false, space: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let houses = [];
let terrain, sky, clouds;
let currentRoom = 'landscape';
let isPointerLocked = false;
let playerHeight = 1.8;
let isJumping = false;
let jumpVelocity = 0;

const MOVE_SPEED = 0.4;
const RUN_SPEED = 0.8;
const LOOK_SPEED = 0.002;
const JUMP_FORCE = 0.3;
const GRAVITY = 0.015;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 50, 300);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('surreal-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);

    createTerrain();
    createSky();
    createHouses();
    createLighting();
    setupEventListeners();
    animate();

    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1000);
    }, 2000);
}

function createTerrain() {
    const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    const vertices = geometry.attributes.position.array;
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        let height = Math.sin(x * 0.02) * 8 + Math.cos(z * 0.02) * 8;
        height += Math.sin(x * 0.05) * 4 + Math.cos(z * 0.05) * 4;
        vertices[i + 1] = height;
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

function createSky() {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB,
        side: THREE.BackSide 
    });
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createHouses() {
    const houseData = [
        { position: [30, 0, -40], section: 'about', name: 'Memory House' },
        { position: [-50, 0, 20], section: 'work', name: 'Workshop' },
        { position: [60, 0, 60], section: 'contact', name: 'Communication Hub' }
    ];

    houseData.forEach(data => {
        const house = createStrangeHouse(data.position);
        house.userData = { section: data.section, name: data.name };
        houses.push(house);
        scene.add(house);
    });
}

function createStrangeHouse(position) {
    const houseGroup = new THREE.Group();
    
    const geometry = new THREE.BoxGeometry(12, 12, 12);
    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
        roughness: 0.3,
        metalness: 0.7
    });
    
    const base = new THREE.Mesh(geometry, material);
    base.position.y = 8;
    base.castShadow = true;
    houseGroup.add(base);
    
    const terrainHeight = getTerrainHeight(position[0], position[2]);
    houseGroup.position.set(position[0], terrainHeight, position[2]);
    
    return houseGroup;
}

function getTerrainHeight(x, z) {
    let height = Math.sin(x * 0.02) * 8 + Math.cos(z * 0.02) * 8;
    height += Math.sin(x * 0.05) * 4 + Math.cos(z * 0.05) * 4;
    return height;
}

function createLighting() {
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 100, 50);
    sun.castShadow = true;
    scene.add(sun);
    
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.4);
    scene.add(ambientLight);
}

function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onMouseClick);
    
    document.addEventListener('click', () => {
        if (!isPointerLocked && currentRoom === 'landscape') {
            document.body.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === document.body;
    });

    window.addEventListener('resize', onWindowResize);
    document.getElementById('back-btn').addEventListener('click', exitHouse);
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
            if (!isJumping) {
                isJumping = true;
                jumpVelocity = JUMP_FORCE;
            }
            break;
        case 'Escape': 
            if (currentRoom !== 'landscape') {
                exitHouse();
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
    if (!isPointerLocked) return;
    camera.rotation.y -= (event.movementX || 0) * LOOK_SPEED;
    camera.rotation.x -= (event.movementY || 0) * LOOK_SPEED;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
}

function onMouseClick() {
    if (currentRoom !== 'landscape') return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(houses, true);
    if (intersects.length > 0) {
        let house = intersects[0].object;
        while (house.parent && !house.userData.section) {
            house = house.parent;
        }
        if (house.userData.section) {
            enterHouse(house.userData.section);
        }
    }
}

function enterHouse(section) {
    currentRoom = section;
    document.getElementById('surreal-canvas').style.display = 'none';
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('content-overlay').classList.remove('hidden');
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(section + '-content').style.display = 'block';
    document.exitPointerLock();
}

function exitHouse() {
    currentRoom = 'landscape';
    document.getElementById('surreal-canvas').style.display = 'block';
    document.getElementById('ui-overlay').style.display = 'block';
    document.getElementById('content-overlay').classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMovement() {
    if (currentRoom !== 'landscape') return;

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
    
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;
        const groundHeight = getTerrainHeight(camera.position.x, camera.position.z) + playerHeight;
        if (camera.position.y <= groundHeight) {
            camera.position.y = groundHeight;
            isJumping = false;
            jumpVelocity = 0;
        }
    } else {
        camera.position.y = getTerrainHeight(camera.position.x, camera.position.z) + playerHeight;
    }

    camera.position.x = Math.max(-90, Math.min(90, camera.position.x));
    camera.position.z = Math.max(-90, Math.min(90, camera.position.z));
}

function checkHouseProximity() {
    if (currentRoom !== 'landscape') return;
    let nearHouse = null;
    houses.forEach(house => {
        if (camera.position.distanceTo(house.position) < 15) {
            nearHouse = house;
        }
    });
    const houseInfo = document.getElementById('house-info');
    if (nearHouse) {
        document.getElementById('house-name').textContent = nearHouse.userData.name;
        houseInfo.classList.remove('hidden');
    } else {
        houseInfo.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    checkHouseProximity();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);