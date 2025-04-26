// MillerVisualizer.js

class MillerVisualizer {
    constructor(containerId) {
        if (!window.THREE || !window.CONFIG || !window.InterceptCalculator || !window.AxisSystem) {
            throw new Error('MillerVisualizer: Missing required dependencies.');
        }

        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error('Container not found: ' + containerId);
        }

        this.config = window.CONFIG;

        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // System components
        this.axisSystem = null; // Will be initialized in init()
        this.calculator = new window.InterceptCalculator();

        // Visualization elements
        this.plane = null;
        this.intersectionPointMeshes = []; // Renamed for clarity

        // Animation
        this.animationFrame = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the visualization system
     */
    init() {
        try {
            window.CONFIG_UTILS.debug('Initializing visualizer...', 'info');
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupControls();

            // Initialize AxisSystem with default (cubic)
            // Assuming the UI defaults to cubic
            this.axisSystem = new window.AxisSystem(this.scene, 'cubic');

            this.setupEventListeners();
            this.animate();
            window.CONFIG_UTILS.debug('Visualizer initialized successfully', 'info');
        } catch (error) {
            console.error('Visualization initialization error:', error);
            window.CONFIG_UTILS.debug('Visualization initialization error: ' + error.message, 'error');
            // Clean up partially initialized state if necessary
            this.dispose();
            throw error; // Re-throw for the App level
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
            this.config.SCENE.FOV, aspect, this.config.SCENE.NEAR, this.config.SCENE.FAR
        );
        this.resetCameraPosition(); // Use a method to set initial position
    }

    /**
     * Set up the renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.PERFORMANCE.antialiasing,
            alpha: true // For potential transparency effects
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.PERFORMANCE.maxPixelRatio || 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Set up scene lighting
     */
    setupLighting() {
        const ambientConfig = this.config.SCENE.LIGHTING.ambient;
        const pointConfig = this.config.SCENE.LIGHTING.point;

        const ambientLight = new THREE.AmbientLight(ambientConfig.color, ambientConfig.intensity);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(pointConfig.color, pointConfig.intensity);
        pointLight.position.set(pointConfig.position.x, pointConfig.position.y, pointConfig.position.z);
        this.scene.add(pointLight);
    }

    /**
     * Set up orbit controls
     */
    setupControls() {
        if (!window.OrbitControls) {
            throw new Error('OrbitControls not loaded');
        }
        this.controls = new window.OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(this.controls, this.config.SCENE.CONTROLS); // Apply settings from config
        this.controls.update();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Use ResizeObserver for more robust resize handling if available, fallback to window resize
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => this.handleResize());
            resizeObserver.observe(this.container);
             // Store observer for later disconnection in dispose()
             this.resizeObserver = resizeObserver;
        } else {
            window.addEventListener('resize', this.handleResize.bind(this));
             this.useWindowResizeListener = true; // Flag for removal in dispose()
        }
    }


    /**
     * Handle container resize
     */
    handleResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width === 0 || height === 0) return; // Avoid issues when container is hidden

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        // Check if disposed
        if (!this.renderer || !this.scene || !this.camera) return;

        this.animationFrame = requestAnimationFrame(this.animate.bind(this));

        if (this.controls) {
            this.controls.update(); // Only required if enableDamping or autoRotate are set.
        }

        if (this.axisSystem) {
            this.axisSystem.update(this.camera); // Update labels to face camera
        }

        // Optional auto-rotation (example)
        if (this.config.PERFORMANCE.autoRotate && this.plane) { // Rotate only if plane exists?
            this.scene.rotation.y += 0.001;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Visualize Miller indices based on parameters object
     * @param {Object} params - Calculation parameters ({h, k, l, system} or {h, k, i, l, system})
     */
    visualize(params) {
        try {
            window.CONFIG_UTILS.debug(`Visualizing indices for system: ${params.system}`, 'info');

            // Update Axis System if needed
            if (this.axisSystem && this.axisSystem.system !== params.system) {
                this.axisSystem.setSystem(params.system);
            }

            // Clear previous visualization elements (plane, points)
            this.clearVisualizationElements();

            // Calculate intercepts and plane parameters using updated calculator
            const result = this.calculator.calculateIntercepts(params);

            // Create plane mesh
            this.createPlane(result);

            // Create intersection point markers
            this.createIntersectionPoints(result.intersections);

            window.CONFIG_UTILS.debug('Visualization complete', 'info');
            return true; // Indicate success

        } catch (error) {
            console.error('Visualization error:', error);
            window.CONFIG_UTILS.debug('Visualization error: ' + error.message, 'error');
            this.clearVisualizationElements(); // Clear potentially partially drawn elements on error
            return false; // Indicate failure
        }
    }

    /**
     * Create lattice plane mesh
     */
    createPlane(result) {
        if (!result || !result.center || !result.normal || !result.size) {
             window.CONFIG_UTILS.debug('Cannot create plane: Invalid calculation result.', 'error');
             return;
        }
        const planeConfig = this.config.PLANE;
        const geometry = new THREE.PlaneGeometry(result.size, result.size);
        const material = new THREE.MeshPhongMaterial({
            color: planeConfig.COLOR,
            opacity: planeConfig.OPACITY,
            transparent: planeConfig.STYLES.transparent !== false, // Default true if not specified
            side: THREE.DoubleSide, // Make sure both sides are visible
            shininess: planeConfig.STYLES.shininess || 30,
             // wireframe: planeConfig.STYLES.wireframe || false // Optional wireframe
        });

        this.plane = new THREE.Mesh(geometry, material);

        // Position and orient plane
        // PlaneGeometry is in XY plane by default. We need to align its normal (0,0,1) with the calculated normal.
        this.plane.position.copy(result.center);

         // Align plane normal (initially +Z) to calculated normal vector
         const targetNormal = result.normal.clone().normalize();
         const up = (Math.abs(targetNormal.z) < 0.999) ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0); // Avoid issues if normal is close to Z
         this.plane.lookAt(result.center.clone().add(targetNormal));


        this.scene.add(this.plane);
    }

    /**
     * Create intersection points visualization markers
     * @param {Object} intersections - Dictionary of intersection points (e.g., {x: V3, y: V3, ...} or {a1: V3, ...})
     */
    createIntersectionPoints(intersections) {
        if (!intersections) return;

        const pointConfig = this.config.HELPERS.INTERSECTION_POINT;
        const geometry = new THREE.SphereGeometry(pointConfig.SIZE, pointConfig.SEGMENTS, pointConfig.SEGMENTS);
        const material = new THREE.MeshBasicMaterial({ color: pointConfig.COLOR });

        // Iterate through the calculated intersection points
        Object.values(intersections).forEach(point => {
            // Check if the value is a valid THREE.Vector3
            if (point instanceof THREE.Vector3) {
                const sphere = new THREE.Mesh(geometry.clone(), material.clone()); // Use clones for multiple points
                sphere.position.copy(point);
                this.scene.add(sphere);
                this.intersectionPointMeshes.push(sphere); // Store reference for clearing
            }
        });
         // Dispose of the template geometry/material after loop if cloned
         // geometry.dispose();
         // material.dispose();
         // Note: THREE.js might handle template disposal implicitly, but explicit is safer if memory is critical.
         // For simplicity here, we don't dispose the template used in the loop.
    }


    /**
     * Clear current plane and intersection points visualization elements
     */
    clearVisualizationElements() {
        // Remove and dispose plane
        if (this.plane) {
            this.scene.remove(this.plane);
            if (this.plane.geometry) this.plane.geometry.dispose();
            if (this.plane.material) this.plane.material.dispose();
            this.plane = null;
        }

        // Remove and dispose intersection points
        this.intersectionPointMeshes.forEach(pointMesh => {
            this.scene.remove(pointMesh);
            if (pointMesh.geometry) pointMesh.geometry.dispose();
            if (pointMesh.material) pointMesh.material.dispose();
        });
        this.intersectionPointMeshes = []; // Clear the array
    }

    /**
     * Reset camera position and controls to default
     */
    resetCameraPosition() {
         const pos = this.config.SCENE.CAMERA_POSITION;
         this.camera.position.set(pos.x, pos.y, pos.z);
         this.camera.lookAt(0, 0, 0);
         if (this.controls) {
             this.controls.target.set(0, 0, 0); // Reset look-at target
             this.controls.update(); // Apply changes
             // controls.reset() might be too aggressive if called frequently
         }
    }


    /**
     * Clean up all resources used by the visualizer
     */
    dispose() {
        window.CONFIG_UTILS.debug('Disposing visualizer...', 'info');
        // Stop animation loop
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Remove event listeners
         if (this.resizeObserver) {
             this.resizeObserver.disconnect();
         } else if (this.useWindowResizeListener) {
             window.removeEventListener('resize', this.handleResize.bind(this)); // Might need stored bound function
         }


        // Dispose of axis system
        if (this.axisSystem) {
            this.axisSystem.dispose();
            this.axisSystem = null;
        }

        // Clear plane and intersection points
        this.clearVisualizationElements();

         // Dispose of calculator? If it holds significant state/cache maybe, but likely not needed.
         // if (this.calculator.dispose) this.calculator.dispose();


        // Dispose of controls
         if (this.controls) {
             this.controls.dispose();
             this.controls = null;
         }


        // Dispose of renderer and remove from DOM
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }

        // Dispose of scene resources (lights, etc. - THREE.js might handle children disposal)
        // Explicitly remove lights?
        if (this.scene) {
             // Traverse and dispose materials/geometries if needed, though clearVis/axisSystem handle most custom objects
            this.scene = null;
        }


        this.camera = null;
        this.container = null;
        this.config = null; // Release config reference
    }
}

// Make available globally
window.MillerVisualizer = MillerVisualizer;