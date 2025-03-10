let scene, camera, renderer, controls;

function initThreeJS() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/2/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth/2, window.innerHeight * 0.7);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Camera and controls
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Unit cell
    const cellGeometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(cellGeometry);
    const line = new THREE.LineSegments(edges, 
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    scene.add(line);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = (window.innerWidth/2) / (window.innerHeight * 0.7);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth/2, window.innerHeight * 0.7);
}

function createMillerPlane(h, k, l) {
    const normal = new THREE.Vector3(h, k, l).normalize();
    const planeGeometry = new THREE.PlaneGeometry(3, 3);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF5722,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.lookAt(normal);
    plane.position.copy(normal.multiplyScalar(0.5));
    
    scene.add(plane);
    return plane;
}

function generateSolution(h, k, l) {
    const steps = [];
    
    steps.push(`1. Intercepts: 
        $\\frac{1}{${h}}a, \\frac{1}{${k}}b, \\frac{1}{${l}}c$`);

    steps.push(`2. Reciprocals: 
        $\\left(${h}, ${k}, ${l}\\right)$`);

    steps.push(`3. Miller Indices: 
        $\\boxed{(${h}${k}${l})}$`);

    return steps.map(step => `<div class="step">${step}</div>`).join('');
}

function handleGenerate() {
    const h = parseInt(document.getElementById('h').value) || 0;
    const k = parseInt(document.getElementById('k').value) || 0;
    const l = parseInt(document.getElementById('l').value) || 0;
    const errorDiv = document.getElementById('error');
    
    // Clear previous plane
    scene.children = scene.children.filter(obj => obj.type !== 'Mesh');
    errorDiv.style.display = 'none';

    // Validation
    if([h,k,l].every(v => v === 0)) {
        errorDiv.textContent = "Error: All indices cannot be zero";
        errorDiv.style.display = 'block';
        return;
    }

    createMillerPlane(h, k, l);
    document.getElementById('steps').innerHTML = generateSolution(h, k, l);
    renderMath();
}

function renderMath() {
    document.querySelectorAll('.katex').forEach(element => {
        const tex = element.textContent;
        try {
            katex.render(tex, element, { throwOnError: false });
        } catch(e) {
            console.error(e);
        }
    });
}

// Initialize application
initThreeJS();
