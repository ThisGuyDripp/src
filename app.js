class MillerVisualizer {
    constructor() {
        this.minerals = [];
        this.currentPlane = null;
        this.controls = null;
        
        this.initThreeJS();
        this.loadResources();
        this.setupEventListeners();
    }

    async loadResources() {
        try {
            const response = await fetch('minerals.json');
            this.minerals = await response.json();
            this.populateDropdown();
            document.getElementById('loading').remove();
            this.createPlane(1, 0, 0); // Initial plane
        } catch (error) {
            this.showError("Failed to load mineral data");
        }
    }

    initThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.querySelector('#sceneCanvas'),
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(ambientLight, directionalLight);

        // Coordinate system
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Camera controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Camera position
        this.camera.position.set(5, 5, 5);
        this.controls.update();
    }

    populateDropdown() {
        const select = document.getElementById('mineralSelect');
        this.minerals.forEach(mineral => {
            const option = document.createElement('option');
            option.value = mineral.name;
            option.textContent = mineral.name;
            select.appendChild(option);
        });
    }

    createPlane(h, k, l) {
        try {
            // Validate inputs
            if ([h, k, l].some(v => v < 0)) {
                throw new Error("Negative indices not allowed");
            }

            // Clear existing plane
            if (this.currentPlane) {
                this.scene.remove(this.currentPlane);
            }

            // Calculate normal vector
            const normal = new THREE.Vector3(h, k, l).normalize();
            
            // Create plane geometry
            const geometry = new THREE.PlaneGeometry(5, 5);
            const material = new THREE.MeshPhongMaterial({
                color: 0x2194ce,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });

            this.currentPlane = new THREE.Mesh(geometry, material);
            
            // Align plane to normal vector
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                normal
            );
            this.currentPlane.applyQuaternion(quaternion);
            
            this.scene.add(this.currentPlane);
        } catch (error) {
            this.showError(error.message);
        }
    }

    showError(message) {
        const toast = document.getElementById('errorToast');
        toast.textContent = message;
        toast.style.right = '20px';
        setTimeout(() => toast.style.right = '-300px', 3000);
    }

    setupEventListeners() {
        // Mineral selection
        document.getElementById('mineralSelect').addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                const mineral = this.minerals.find(m => m.name === e.target.value);
                document.getElementById('h').value = mineral.indices[0];
                document.getElementById('k').value = mineral.indices[1];
                document.getElementById('l').value = mineral.indices[2];
                this.createPlane(...mineral.indices);
            }
        });

        // Input changes
        document.querySelectorAll('.miller-input').forEach(input => {
            input.addEventListener('input', () => {
                document.getElementById('mineralSelect').value = 'custom';
                const values = [
                    parseInt(document.getElementById('h').value) || 0,
                    parseInt(document.getElementById('k').value) || 0,
                    parseInt(document.getElementById('l').value) || 0
                ];
                this.createPlane(...values);
            });
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize application
const visualizer = new MillerVisualizer();
visualizer.animate();
