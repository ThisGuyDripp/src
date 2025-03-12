// Constants and Utilities
const AXIS_CONFIG = {
    LENGTH: 2,
    LABEL_SIZE: 0.15,
    COLORS: {
        B_AXIS: 0xff0000, // x-axis (red)
        C_AXIS: 0x00ff00, // y-axis (green)
        A_AXIS: 0x0000ff  // z-axis (blue)
    }
};

class MillerIndicesVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        this.createAxisSystem();
        this.animate();
        this.setupResizeHandler();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth/2, window.innerHeight * 0.7);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth/2/window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(2, 3, 4);
        this.scene.add(ambientLight, pointLight);
    }

    createAxisSystem() {
        // Create unit cell
        const cellGeometry = new THREE.BoxGeometry(1, 1, 1);
        const edges = new THREE.EdgesGeometry(cellGeometry);
        const line = new THREE.LineSegments(edges, 
            new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        this.scene.add(line);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);

        // Create axis labels
        this.createAxisLabel('b', new THREE.Vector3(AXIS_CONFIG.LENGTH, 0, 0), AXIS_CONFIG.COLORS.B_AXIS);
        this.createAxisLabel('c', new THREE.Vector3(0, AXIS_CONFIG.LENGTH, 0), AXIS_CONFIG.COLORS.C_AXIS);
        this.createAxisLabel('a', new THREE.Vector3(0, 0, AXIS_CONFIG.LENGTH), AXIS_CONFIG.COLORS.A_AXIS);
    }

    createAxisLabel(text, position, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(AXIS_CONFIG.LABEL_SIZE, AXIS_CONFIG.LABEL_SIZE, 1);
        
        this.scene.add(sprite);
    }

    createMillerPlane(h, k, l) {
        // Remove existing planes
        this.scene.children = this.scene.children.filter(
            obj => obj.type !== 'Mesh' || obj.geometry.type !== 'PlaneGeometry'
        );

        // Calculate intercepts
        const interceptA = InterceptCalculator.calculateIntercept(l); // z-axis
        const interceptB = InterceptCalculator.calculateIntercept(h); // x-axis
        const interceptC = InterceptCalculator.calculateIntercept(k); // y-axis

        // Calculate plane size
        const planeSize = InterceptCalculator.getPlaneSize(h, k, l);

        // Create plane
        const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF5722,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });

        const plane = new THREE.Mesh(planeGeometry, planeMaterial);

        // Calculate normal vector
        const normal = new THREE.Vector3(h, k, l).normalize();
        plane.lookAt(normal);

        // Position plane based on intercepts
        if (interceptA !== Infinity && interceptB !== Infinity && interceptC !== Infinity) {
            const position = new THREE.Vector3(
                interceptB / 2,
                interceptC / 2,
                interceptA / 2
            );
            plane.position.copy(position);
        } else {
            // Handle special cases (parallel planes)
            plane.position.copy(normal.multiplyScalar(0.5));
        }

        this.scene.add(plane);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = (window.innerWidth/2) / (window.innerHeight * 0.7);
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth/2, window.innerHeight * 0.7);
        });
    }
}

// Utility for intercept calculations
const InterceptCalculator = {
    calculateIntercept: function(index) {
        if (index === 0) return Infinity;
        return 1 / index;
    },

    getPlaneSize: function(h, k, l) {
        const interceptA = Math.abs(this.calculateIntercept(l));
        const interceptB = Math.abs(this.calculateIntercept(h));
        const interceptC = Math.abs(this.calculateIntercept(k));
        
        const maxIntercept = Math.max(
            interceptA === Infinity ? 0 : interceptA,
            interceptB === Infinity ? 0 : interceptB,
            interceptC === Infinity ? 0 : interceptC
        );
        
        return maxIntercept === 0 ? 3 : maxIntercept * 4;
    }
};

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

function handleGenerate() {
    const h = parseInt(document.getElementById('h').value) || 0;
    const k = parseInt(document.getElementById('k').value) || 0;
    const l = parseInt(document.getElementById('l').value) || 0;
    const errorDiv = document.getElementById('error');
    
    errorDiv.style.display = 'none';

    if([h,k,l].every(v => v === 0)) {
        errorDiv.textContent = "Error: All indices cannot be zero";
        errorDiv.style.display = 'block';
        return;
    }

    visualizer.createMillerPlane(h, k, l);
    document.getElementById('steps').innerHTML = generateSolution(h, k, l);
    renderMath();
}

// Initialize application
const visualizer = new MillerIndicesVisualizer('scene-container');
