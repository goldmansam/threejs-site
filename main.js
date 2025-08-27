// Three.js Scene Setup
let scene, camera, renderer, controls;
let player, playerMixer;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let portals = [];
let terrain;
let currentRoom = 'reality';
let isPointerLocked = false;
let time = 0;

// Third-person camera settings
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;
const MOVE_SPEED = 0.3;
const RUN_SPEED = 0.6;
const LOOK_SPEED = 0.003;

// Movement controls
const keys = { forward: false, backward: false, left: false, right: false, shift: false };

function init() {
    // Scene with enhanced settings
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 30, 150);

    // Third-person camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);

    // Enhanced renderer for hyperrealism
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('reality-canvas'),
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8; // Oversaturated for dreamlike effect
    renderer.physicallyCorrectLights = true;

    createHyperrealisticTerrain();
    createHDRSky();
    createEeriePlayer();
    createPortals();
    createHDRLighting();
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

function createHyperrealisticTerrain() {
    const size = 300;
    const segments = 128;
    
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array;
    
    // Create realistic rolling hills
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        
        let height = 0;
        // Large rolling hills
        height += Math.sin(x * 0.015) * 12;
        height += Math.cos(z * 0.015) * 12;
        // Medium undulations
        height += Math.sin(x * 0.04) * 6;
        height += Math.cos(z * 0.04) * 6;
        // Fine detail
        height += Math.sin(x * 0.1) * 2;
        height += Math.cos(z * 0.1) * 2;
        // Noise for realism
        height += (Math.noise2D(x * 0.05, z * 0.05) || Math.random() - 0.5) * 1.5;
        
        vertices[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    
    // Create procedural grass texture
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 512;
    grassCanvas.height = 512;
    const ctx = grassCanvas.getContext('2d');
    
    // Base grass color
    ctx.fillStyle = '#4CBB17';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grass blade details
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = 0.7 + Math.random() * 0.6;
        const green = Math.floor(76 * shade + 100);
        const red = Math.floor(76 * shade * 0.3);
        ctx.fillStyle = `rgb(${red}, ${green}, ${Math.floor(23 * shade)})`;
        ctx.fillRect(x, y, 1 + Math.random(), 2 + Math.random() * 3);
    }
    
    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(32, 32);
    
    // Hyperrealistic grass material
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0x4CBB17,
        roughness: 0.8,
        metalness: 0.0,
        normalScale: new THREE.Vector2(0.5, 0.5)
    });
    
    terrain = new THREE.Mesh(geometry, grassMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

function createHDRSky() {
    // Create realistic sky gradient
    const skyGeometry = new THREE.SphereGeometry(400, 64, 32);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            sunPosition: { value: new THREE.Vector3(100, 100, 50) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 sunPosition;
            uniform float time;
            varying vec3 vWorldPosition;
            
            void main() {
                vec3 direction = normalize(vWorldPosition);
                float elevation = direction.y;
                
                // Sky gradient
                vec3 skyColor = mix(
                    vec3(0.5, 0.7, 1.0), // Horizon blue
                    vec3(0.1, 0.3, 0.8), // Zenith blue
                    smoothstep(0.0, 0.4, elevation)
                );
                
                // Sun effect
                vec3 sunDir = normalize(sunPosition);
                float sunDot = max(dot(direction, sunDir), 0.0);
                vec3 sunColor = vec3(1.0, 0.9, 0.7) * pow(sunDot, 256.0) * 2.0;
                
                // Atmospheric scattering
                float atmosphere = 1.0 - abs(elevation);
                skyColor += vec3(1.0, 0.8, 0.6) * atmosphere * 0.3;
                
                // Oversaturate for dreamlike effect
                skyColor = pow(skyColor + sunColor, vec3(0.8));
                
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createEeriePlayer() {
    player = new THREE.Group();
    
    // Create eerie humanoid figure
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.6, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    player.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    player.add(head);
    
    // Glowing eyes for eerie effect
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 2.25, 0.25);
    player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 2.25, 0.25);
    player.add(rightEye);
    
    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.15, 1.2, 4, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 1.2, 0);
    leftArm.castShadow = true;
    player.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 1.2, 0);
    rightArm.castShadow = true;
    player.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.2, 1.4, 4, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.25, -0.4, 0);
    leftLeg.castShadow = true;
    player.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.25, -0.4, 0);
    rightLeg.castShadow = true;
    player.add(rightLeg);
    
    // Position player on terrain
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
    
    // Portal base
    const baseGeometry = new THREE.CylinderGeometry(8, 10, 4);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.3,
        metalness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = terrainHeight + 2;
    base.castShadow = true;
    base.receiveShadow = true;
    portalGroup.add(base);
    
    // Portal ring with enhanced materials
    const ringGeometry = new THREE.TorusGeometry(6, 1, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = terrainHeight + 10;
    ring.castShadow = true;
    portalGroup.add(ring);
    
    // Energy field
    const fieldGeometry = new THREE.RingGeometry(3, 5.5, 32);
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

function createHDRLighting() {
    // Intense HDR sun
    const sun = new THREE.DirectionalLight(0xFFFFFF, 3.0);
    sun.position.set(100, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    
    // Ambient light for realism
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.8);
    scene.add(ambientLight);
    
    // Hemisphere light for sky contribution
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4CBB17, 1.2);
    scene.add(hemisphereLight);
}

function addEnvironmentDetails() {
    // Add realistic trees
    for (let i = 0; i < 25; i++) {
        const treeGroup = new THREE.Group();
        
        // Tree trunk with realistic material
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 1.0, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.SphereGeometry(4, 16, 16);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.0
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 9;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        treeGroup.add(foliage);
        
        // Position on terrain
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const terrainHeight = getTerrainHeight(x, z);
        
        treeGroup.position.set(x, terrainHeight, z);
        scene.add(treeGroup);
    }
    
    // Add some rocks for detail
    for (let i = 0; i < 15; i++) {
        const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2);
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        const terrainHeight = getTerrainHeight(x, z);
        
        rock.position.set(x, terrainHeight + 1, z);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}

function getTerrainHeight(x, z) {
    let height = 0;
    height += Math.sin(x * 0.015) * 12;
    height += Math.cos(z * 0.015) * 12;
    height += Math.sin(x * 0.04) * 6;
    height += Math.cos(z * 0.04) * 6;
    height += Math.sin(x * 0.1) * 2;
    height += Math.cos(z * 0.1) * 2;
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
    document.getElementById('back-btn').addEventListener('click', exitPortal);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': keys.forward = true; break;
        case 'KeyS': keys.backward = true; break;
        case 'KeyA': keys.left = true; break;
        case 'KeyD': keys.right = true; break;
        case 'ShiftLeft': keys.shift = true; break;
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
        case 'KeyW': keys.forward = false; break;
        case 'KeyS': keys.backward = false; break;
        case 'KeyA': keys.left = false; break;
        case 'KeyD': keys.right = false; break;
        case 'ShiftLeft': keys.shift = false; break;
    }
}

function onMouseMove(event) {
    if (!isPointerLocked || !player) return;
    
    // Rotate player based on mouse movement
    player.rotation.y -= (event.movementX || 0) * LOOK_SPEED;
}

function onMouseClick() {
    if (currentRoom !== 'reality') return;
    
    // Check for portal interaction
    const playerPosition = player.position;
    portals.forEach(portal => {
        const distance = playerPosition.distanceTo(portal.position);
        if (distance < 20) {
            enterPortal(portal.userData.section);
        }
    });
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
    if (currentRoom !== 'reality' || !player) return;

    direction.set(0, 0, 0);
    if (keys.forward) direction.z -= 1;
    if (keys.backward) direction.z += 1;
    if (keys.left) direction.x -= 1;
    if (keys.right) direction.x += 1;

    if (direction.length() > 0) {
        direction.normalize();
        direction.applyQuaternion(player.quaternion);
        
        const speed = keys.shift ? RUN_SPEED : MOVE_SPEED;
        velocity.copy(direction).multiplyScalar(speed);
        player.position.add(velocity);
        
        // Simple walking animation
        const walkCycle = Math.sin(time * 8) * 0.1;
        player.children[0].rotation.z = walkCycle * 0.1; // Body sway
        player.children[3].rotation.x = walkCycle; // Left arm
        player.children[4].rotation.x = -walkCycle; // Right arm
        player.children[5].rotation.x = -walkCycle * 0.5; // Left leg
        player.children[6].rotation.x = walkCycle * 0.5; // Right leg
    }
    
    // Keep player on terrain - NO FLOATING
    const terrainHeight = getTerrainHeight(player.position.x, player.position.z);
    player.position.y = terrainHeight;
    
    // Boundaries
    player.position.x = Math.max(-140, Math.min(140, player.position.x));
    player.position.z = Math.max(-140, Math.min(140, player.position.z));
}

function updateCamera() {
    if (!player) return;
    
    // Third-person camera follows player
    const idealOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    idealOffset.applyQuaternion(player.quaternion);
    
    const idealPosition = player.position.clone().add(idealOffset);
    const idealLookAt = player.position.clone();
    idealLookAt.y += 1.5;
    
    // Smooth camera movement
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
    if (nearPortal) {
        document.getElementById('portal-name').textContent = nearPortal.userData.name;
        portalInfo.classList.remove('hidden');
    } else {
        portalInfo.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.016; // 60fps timing

    updateMovement();
    updateCamera();
    checkPortalProximity();

    // Animate portals
    portals.forEach(portal => {
        portal.rotation.y += 0.01;
        // Pulsing energy field
        if (portal.children[2]) {
            portal.children[2].material.opacity = 0.3 + Math.sin(time * 3) * 0.2;
        }
    });

    // Animate player eyes glow
    if (player && player.children[1] && player.children[2]) {
        const glowIntensity = 0.6 + Math.sin(time * 2) * 0.4;
        player.children[1].material.opacity = glowIntensity;
        player.children[2].material.opacity = glowIntensity;
    }

    renderer.render(scene, camera);
}

window.addEventListener('load', init);