// MillerVisualizer.js

class MillerVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.config = window.CONFIG;
        
        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // System components
        this.axisSystem = null;
        this.calculator = new window.InterceptCalculator();
        
        // Visualization elements
        this.plane = null;
        this.intersectionPoints = [];
        
        // Animation
        this.animationFrame = null;

        this.init();
    }

    /**
     * Initialize the visualization system
     */
    init() {
        try {
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupControls();
            this.setupAxisSystem();
            this.setupEventListeners();
            this.animate();
        } catch (error) {
            window.CONFIG_UTILS.debug('Visualization initialization error: ' + error.message, 'error');
            throw error;
        }
    }

    /**
     * Set up the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.SCENE.BACKGROUND_COLOR);
    }

    /**
     * Set up the camera
     */
    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            this.config.SCENE.FOV,
            aspect,
            this.config.SCENE.NEAR,
            this.config.SCENE.FAR
        );
        this.camera.position.copy(new THREE.Vector3().fromArray(
            Object.values(this.config.SCENE.CAMERA_POSITION)
        ));
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Set up the renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.PERFORMANCE.antialiasing
        });
        this.renderer.setPixelRatio(this.config.PERFORMANCE.pixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(
            this.config.SCENE.LIGHTING.ambient.color,
            this.config.SCENE.LIGHTING.ambient.intensity
        );
        this.scene.add(ambientLight);

        // Point light
        const pointLight = new THREE.PointLight(
            this.config.SCENE.LIGHTING.point.color,
            this.config.SCENE.LIGHTING.point.intensity
        );
        pointLight.position.copy(new THREE.Vector3().fromArray(
            Object.values(this.config.SCENE.LIGHTING.point.position)
        ));
        this.scene.add(pointLight);
    }

    /**
     * Set up orbit controls
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(this.controls, this.config.SCENE.CONTROLS);
        this.controls.update();
    }

    /**
     * Set up axis system
     */
    setupAxisSystem() {
        this.axisSystem = new window.AxisSystem(this.scene);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Visualization animation loop
     */
    animate() {
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
        
        this.controls.update();
        this.axisSystem.update(this.camera);
        
        if (this.config.PERFORMANCE.autoRotate) {
            this.scene.rotation.y += 0.001;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Visualize Miller indices
     */
    visualize(h, k, l) {
        try {
            // Clear previous visualization
            this.clearPlane();
            
            // Calculate intercepts
            const result = this.calculator.calculateIntercepts(h, k, l);
            
            // Create plane
            this.createPlane(result);
            
            // Create intersection points
            this.createIntersectionPoints(result.intersections);
            
            return true;
        } catch (error) {
            window.CONFIG_UTILS.debug('Visualization error: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Create lattice plane
     */
    createPlane(result) {
        const geometry = new THREE.PlaneGeometry(result.size, result.size);
        const material = new THREE.MeshPhongMaterial({
            color: this.config.PLANE.COLOR,
            opacity: this.config.PLANE.OPACITY,
            transparent: this.config.PLANE.STYLES.transparent,
            side: THREE.DoubleSide,
            shininess: this.config.PLANE.STYLES.shininess
        });

        this.plane = new THREE.Mesh(geometry, material);
        
        // Position and orient plane
        this.plane.position.copy(result.center);
        this.plane.lookAt(result.center.clone().add(result.normal));
        
        this.scene.add(this.plane);
    }

    /**
     * Create intersection points visualization
     */
    createIntersectionPoints(intersections) {
        Object.values(intersections).forEach(point => {
            if (point) {
                const geometry = new THREE.SphereGeometry(
                    this.config.HELPERS.INTERSECTION_POINT.SIZE,
                    this.config.HELPERS.INTERSECTION_POINT.SEGMENTS,
                    this.config.HELPERS.INTERSECTION_POINT.SEGMENTS
                );
                const material = new THREE.MeshBasicMaterial({
                    color: this.config.HELPERS.INTERSECTION_POINT.COLOR
                });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(point);
                
                this.scene.add(sphere);
                this.intersectionPoints.push(sphere);
            }
        });
    }

    /**
     * Clear current plane visualization
     */
    clearPlane() {
        if (this.plane) {
            this.scene.remove(this.plane);
            this.plane.geometry.dispose();
            this.plane.material.dispose();
            this.plane = null;
        }

        this.intersectionPoints.forEach(point => {
            this.scene.remove(point);
            point.geometry.dispose();
            point.material.dispose();
        });
        this.intersectionPoints = [];
    }

    /**
     * Reset camera position
     */
    resetCamera() {
        this.camera.position.copy(new THREE.Vector3().fromArray(
            Object.values(this.config.SCENE.CAMERA_POSITION)
        ));
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Stop animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));

        // Dispose of axis system
        if (this.axisSystem) {
            this.axisSystem.dispose();
        }

        // Clear plane and intersection points
        this.clearPlane();

        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }

        // Clear reference to container
        this.container = null;
    }
}

// Make available globally
window.MillerVisualizer = MillerVisualizer;
