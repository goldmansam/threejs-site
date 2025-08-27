// Three.js Scene Setup
let scene, camera, renderer, controls;
let planets = [];
let sun, particleSystem;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let isAutoRotating = true;

// Initialize the 3D scene
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000011, 1, 1000);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('three-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create solar system
    createSun();
    createPlanets();
    createParticleField();
    createLights();

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

// Create the central sun
function createSun() {
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
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
            varying vec2 vUv;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center);
                
                float pulse = sin(time * 3.0) * 0.1 + 0.9;
                float intensity = (1.0 - dist) * pulse;
                
                vec3 color1 = vec3(1.0, 0.3, 0.0); // Orange
                vec3 color2 = vec3(1.0, 0.8, 0.0); // Yellow
                vec3 color3 = vec3(0.8, 0.0, 1.0); // Purple (alien touch)
                
                vec3 finalColor = mix(color1, color2, sin(time + dist * 10.0) * 0.5 + 0.5);
                finalColor = mix(finalColor, color3, sin(time * 2.0 + dist * 5.0) * 0.3 + 0.3);
                
                gl_FragColor = vec4(finalColor * intensity, 1.0);
            }
        `
    });

    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Sun glow effect
    const glowGeometry = new THREE.SphereGeometry(12, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vNormal;
            
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                vec3 glow = vec3(1.0, 0.5, 0.0) * intensity;
                gl_FragColor = vec4(glow, intensity * 0.3);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(sunGlow);
}

// Create orbiting planets
function createPlanets() {
    const planetData = [
        { radius: 2, distance: 20, speed: 0.02, color: 0x00ff88, name: "Project Alpha" },
        { radius: 1.5, distance: 30, speed: 0.015, color: 0xff0088, name: "Project Beta" },
        { radius: 2.5, distance: 40, speed: 0.01, color: 0x8800ff, name: "Project Gamma" }
    ];

    planetData.forEach((data, index) => {
        const planetGeometry = new THREE.SphereGeometry(data.radius, 16, 16);
        const planetMaterial = new THREE.MeshPhongMaterial({
            color: data.color,
            emissive: data.color,
            emissiveIntensity: 0.3,
            shininess: 100
        });

        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.position.x = data.distance;
        planet.userData = {
            distance: data.distance,
            speed: data.speed,
            angle: (index * Math.PI * 2) / planetData.length,
            name: data.name,
            index: index
        };

        // Add planet rings for alien effect
        const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 1.8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);

        planets.push(planet);
        scene.add(planet);
    });
}

// Create particle field for space effect
function createParticleField() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

        // Alien colors
        const colorChoice = Math.random();
        if (colorChoice < 0.33) {
            colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0.8; // Cyan
        } else if (colorChoice < 0.66) {
            colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 0.8; // Magenta
        } else {
            colors[i * 3] = 0.8; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 1; // Purple
        }
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

// Create lighting
function createLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = true;
    scene.add(pointLight);
}

// Setup event listeners
function setupEventListeners() {
    // Mouse movement
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);

    // UI Controls
    document.getElementById('auto-rotate').addEventListener('click', toggleAutoRotate);
    document.getElementById('reset-camera').addEventListener('click', resetCamera);
    document.getElementById('explore-btn').addEventListener('click', () => {
        showSection('projects');
    });

    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(e.target.dataset.section);
        });
    });
}

// Mouse movement handler
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Subtle camera movement based on mouse
    if (camera) {
        camera.position.x += (mouse.x * 5 - camera.position.x) * 0.05;
        camera.position.y += (-mouse.y * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
    }
}

// Mouse click handler for planet interaction
function onMouseClick(event) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
        const clickedPlanet = intersects[0].object;
        const planetIndex = clickedPlanet.userData.index;
        
        // Animate camera to planet
        gsap.to(camera.position, {
            duration: 2,
            x: clickedPlanet.position.x * 1.5,
            y: clickedPlanet.position.y * 1.5,
            z: clickedPlanet.position.z + 10,
            ease: "power2.inOut"
        });

        // Show project info
        showProjectInfo(planetIndex);
        showSection('projects');
    }
}

// Show project information
function showProjectInfo(index) {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, i) => {
        if (i === index) {
            card.style.transform = 'scale(1.1)';
            card.style.boxShadow = '0 0 30px rgba(255, 0, 136, 0.8)';
        } else {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        }
    });
}

// Show content section
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
}

// Toggle auto rotation
function toggleAutoRotate() {
    isAutoRotating = !isAutoRotating;
    document.getElementById('auto-rotate').textContent = isAutoRotating ? 'Stop Rotation' : 'Auto Rotate';
}

// Reset camera position
function resetCamera() {
    gsap.to(camera.position, {
        duration: 2,
        x: 0,
        y: 0,
        z: 50,
        ease: "power2.inOut"
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Animate sun
    if (sun) {
        sun.material.uniforms.time.value = time;
        sun.rotation.y += 0.01;
    }

    // Animate planets
    planets.forEach(planet => {
        if (isAutoRotating) {
            planet.userData.angle += planet.userData.speed;
        }
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += 0.02;
    });

    // Animate particles
    if (particleSystem) {
        particleSystem.rotation.y += 0.001;
        particleSystem.rotation.x += 0.0005;
    }

    renderer.render(scene, camera);
}

// Initialize when page loads
window.addEventListener('load', init);