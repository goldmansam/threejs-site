let scene, camera, renderer;
let controls = { forward: false, backward: false, left: false, right: false, shift: false, space: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let portals = [];
let terrain, sky, clouds;
let currentRoom = 'reality';
let isPointerLocked = false;
let playerHeight = 2;
let isFloating = false;
let floatVelocity = 0;
let time = 0;

// Enhanced movement settings
const MOVE_SPEED = 0.5;
const RUN_SPEED = 1.2;
const LOOK_SPEED = 0.002;
const FLOAT_FORCE = 0.4;
const GRAVITY = 0.02;

function init() {
    // Scene with enhanced fog
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 20, 200);

    // Camera with wider FOV for immersion
    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 0);

    // Enhanced renderer settings
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('reality-canvas'),
        antialias: true,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    createBlissLandscape();
    createSurrealSky();
    createFloatingElements();
    createPortals();
    createEnhancedLighting();
    createAtmosphericEffects();

    setupEventListeners();
    animate();

    // Enhanced loading sequence
    setTimeout(() => {
        document.querySelector('.loading-progress').style.width = '100%';
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 1500);
        }, 1000);
    }, 3000);
}

function createBlissLandscape() {
    // Create Windows XP Bliss-inspired terrain
    const geometry = new THREE.PlaneGeometry(300, 300, 150, 150);
    const vertices = geometry.attributes.position.array;
    
    // Generate rolling hills like Bliss wallpaper
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Create smooth rolling hills
        let height = 0;
        height += Math.sin(x * 0.01) * 15;
        height += Math.cos(z * 0.01) * 15;
        height += Math.sin(x * 0.03) * 8;
        height += Math.cos(z * 0.03) * 8;
        height += Math.sin(x * 0.05) * 4;
        height += Math.cos(z * 0.05) * 4;
        
        // Add some randomness for realism
        height += (Math.random() - 0.5) * 2;
        
        vertices[i + 1] = height;
    }
    
    geometry.computeVertexNormals();
    
    // Create vibrant green grass material
    const grassMaterial = new THREE.MeshLambertMaterial({
        color: 0x4CBB17, // Vibrant green
        transparent: false
    });
    
    terrain = new THREE.Mesh(geometry, grassMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Add some trees for realism
    createTrees();
}

function createTrees() {
    for (let i = 0; i < 20; i++) {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.SphereGeometry(4, 8, 8);
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 10;
        foliage.castShadow = true;
        treeGroup.add(foliage);
        
        // Random positioning
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const terrainHeight = getTerrainHeight(x, z);
        
        treeGroup.position.set(x, terrainHeight, z);
        scene.add(treeGroup);
    }
}

function createSurrealSky() {
    // Create gradient sky like Windows XP
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            topColor: { value: new THREE.Color(0x0077BE) },
            bottomColor: { value: new THREE.Color(0x87CEEB) },
            cloudColor: { value: new THREE.Color(0xFFFFFF) }
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
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform vec3 cloudColor;
            uniform float time;
            varying vec3 vWorldPosition;
            
            void main() {
                float h = normalize(vWorldPosition).y;
                float ramp = max(h, 0.0);
                
                vec3 color = mix(bottomColor, topColor, ramp);
                
                // Add moving clouds
                float cloudNoise = sin(vWorldPosition.x * 0.01 + time * 0.1) * 
                                  cos(vWorldPosition.z * 0.01 + time * 0.05);
                cloudNoise = smoothstep(0.3, 0.7, cloudNoise);
                
                color = mix(color, cloudColor, cloudNoise * 0.3 * ramp);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createFloatingElements() {
    // Create surreal floating objects
    for (let i = 0; i < 15; i++) {
        const floatingGroup = new THREE.Group();
        
        // Random geometric shapes
        let geometry, material;
        const shapeType = Math.floor(Math.random() * 4);
        
        switch (shapeType) {
            case 0:
                geometry = new THREE.OctahedronGeometry(2 + Math.random() * 3);
                material = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                    transparent: true,
                    opacity: 0.8
                });
                break;
            case 1:
                geometry = new THREE.TorusGeometry(3, 1, 8, 16);
                material = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.7),
                    wireframe: Math.random() > 0.5
                });
                break;
            case 2:
                geometry = new THREE.DodecahedronGeometry(2 + Math.random() * 2);
                material = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.9, 0.5),
                    transparent: true,
                    opacity: 0.7
                });
                break;
            case 3:
                geometry = new THREE.TetrahedronGeometry(3 + Math.random() * 2);
                material = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.6, 0.8)
                });
                break;
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        floatingGroup.add(mesh);
        
        // Position in sky
        floatingGroup.position.set(
            (Math.random() - 0.5) * 300,
            20 + Math.random() * 40,
            (Math.random() - 0.5) * 300
        );
        
        // Store animation data
        floatingGroup.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            floatSpeed: Math.random() * 0.01 + 0.005,
            floatRange: 5 + Math.random() * 10,
            originalY: floatingGroup.position.y
        };
        
        scene.add(floatingGroup);
    }
}

function createPortals() {
    const portalData = [
        { position: [40, 0, -60], section: 'about', name: 'ABOUT PORTAL', color: 0xFF6B6B },
        { position: [-70, 0, 30], section: 'work', name: 'WORK PORTAL', color: 0x4ECDC4 },
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
    
    // Get terrain height
    const terrainHeight = getTerrainHeight(position[0], position[2]);
    
    // Portal ring
    const ringGeometry = new THREE.TorusGeometry(5, 0.5, 8, 16);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 8;
    ring.castShadow = true;
    portalGroup.add(ring);
    
    // Portal energy field
    const fieldGeometry = new THREE.RingGeometry(2, 4.5, 16);
    const fieldMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(color) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center);
                
                float ripple = sin(dist * 20.0 - time * 5.0) * 0.5 + 0.5;
                float fade = 1.0 - smoothstep(0.0, 0.5, dist);
                
                float alpha = ripple * fade * 0.6;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.position.y = 8;
    portalGroup.add(field);
    
    // Portal base
    const baseGeometry = new THREE.CylinderGeometry(6, 8, 2);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.8
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = terrainHeight + 1;
    base.castShadow = true;
    portalGroup.add(base);
    
    portalGroup.position.set(position[0], terrainHeight, position[2]);
    
    return portalGroup;
}

function getTerrainHeight(x, z) {
    let height = 0;
    height += Math.sin(x * 0.01) * 15;
    height += Math.cos(z * 0.01) * 15;
    height += Math.sin(x * 0.03) * 8;
    height += Math.cos(z * 0.03) * 8;
    height += Math.sin(x * 0.05) * 4;
    height += Math.cos(z * 0.05) * 4;
    return height;
}

function createEnhancedLighting() {
    // Bright sun like in Bliss
    const sun = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    sun.position.set(100, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);
    
    // Ambient light for realistic fill
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
    scene.add(ambientLight);
    
    // Hemisphere light for sky contribution
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4CBB17, 0.8);
    scene.add(hemisphereLight);
}

function createAtmosphericEffects() {
    // Floating particles for magic feel
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = Math.random() * 100 + 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
        
        const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.8);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
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
            if (!isFloating) {
                controls.space = true;
                isFloating = true;
                floatVelocity = FLOAT_FORCE;
            }
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
    
    // Handle floating/gravity
    if (isFloating) {
        camera.position.y += floatVelocity;
        floatVelocity -= GRAVITY;
        const groundHeight = getTerrainHeight(camera.position.x, camera.position.z) + playerHeight;
        if (camera.position.y <= groundHeight) {
            camera.position.y = groundHeight;
            isFloating = false;
            floatVelocity = 0;
        }
    } else {
        camera.position.y = getTerrainHeight(camera.position.x, camera.position.z) + playerHeight;
    }
    camera.position.x = Math.max(-140, Math.min(140, camera.position.x));
    camera.position.z = Math.max(-140, Math.min(140, camera.position.z));
}

function checkPortalProximity() {
    if (currentRoom !== 'reality') return;
    let nearPortal = null;
    portals.forEach(portal => {
        if (camera.position.distanceTo(portal.position) < 20) {
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

    // Animate sky
    if (sky) {
        sky.material.uniforms.time.value = time;
    }

    // Animate floating objects
    scene.children.forEach(child => {
        if (child.userData.floatSpeed) {
            child.rotation.x += child.userData.rotationSpeed;
            child.rotation.y += child.userData.rotationSpeed * 0.7;
            child.position.y = child.userData.originalY + 
                Math.sin(time * child.userData.floatSpeed) * child.userData.floatRange;
        }
    });

    // Animate portals
    portals.forEach(portal => {
        portal.children.forEach(child => {
            if (child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value = time;
            }
        });
        portal.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

window.addEventListener('load', init);