// MillerVisualizer.js

class MillerVisualizer {
    constructor(containerId) {
        if (!window.THREE || !window.CONFIG || !window.InterceptCalculator || !window.AxisSystem) {
            throw new Error('MillerVisualizer: Missing required dependencies (THREE, CONFIG, InterceptCalculator, AxisSystem).');
        }
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error('MillerVisualizer: Container not found: ' + containerId);
        }
        this.config = window.CONFIG;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.axisSystem = null;
        this.calculator = new window.InterceptCalculator();
        this.planeMesh = null;
        this.intersectionPointMeshes = [];
        this.animationFrame = null;
        this.init();
    }

    init() {
        try {
            window.CONFIG_UTILS.debug('MillerVisualizer: Initializing...', 'info');
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupControls();
            this.axisSystem = new window.AxisSystem(this.scene, 'cubic');
            this.setupEventListeners();
            this.animate();
            window.CONFIG_UTILS.debug('MillerVisualizer: Initialized successfully.', 'info');
        } catch (error) {
            console.error('MillerVisualizer: Initialization error:', error);
            window.CONFIG_UTILS.debug('MillerVisualizer: Initialization error - ' + error.message, 'error');
            this.dispose();
            throw error;
        }
    }

    setupScene() { /* ... same as before ... */
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.SCENE.BACKGROUND_COLOR);
    }
    setupCamera() { /* ... same as before ... */
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            this.config.SCENE.FOV, aspect, this.config.SCENE.NEAR, this.config.SCENE.FAR
        );
        this.resetCameraPosition();
    }
    setupRenderer() { /* ... same as before ... */
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.PERFORMANCE.antialiasing,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.config.PERFORMANCE.maxPixelRatio || 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
    }
    setupLighting() { /* ... same as before ... */
        const ambientLight = new THREE.AmbientLight(this.config.SCENE.LIGHTING.ambient.color, this.config.SCENE.LIGHTING.ambient.intensity);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(this.config.SCENE.LIGHTING.point.color, this.config.SCENE.LIGHTING.point.intensity);
        pointLight.position.set(this.config.SCENE.LIGHTING.point.position.x, this.config.SCENE.LIGHTING.point.position.y, this.config.SCENE.LIGHTING.point.position.z);
        this.scene.add(pointLight);
    }
    setupControls() { /* ... same as before ... */
        if (!window.OrbitControls) {
            throw new Error('OrbitControls not available.');
        }
        this.controls = new window.OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(this.controls, this.config.SCENE.CONTROLS);
        this.controls.update();
    }
    setupEventListeners() { /* ... same as before ... */
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(this.container);
        } else {
            this.boundResizeHandler = this.handleResize.bind(this);
            window.addEventListener('resize', this.boundResizeHandler);
        }
    }
    handleResize() { /* ... same as before ... */
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    animate() { /* ... same as before ... */
        if (!this.renderer) return;
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
        if (this.controls) this.controls.update();
        if (this.axisSystem) this.axisSystem.update(this.camera);
        if (this.config.PERFORMANCE.autoRotate && this.axisSystem && this.axisSystem.shapeGroup.children.length > 0) {
             this.axisSystem.shapeGroup.rotation.y += 0.001;
        }
        this.renderer.render(this.scene, this.camera);
    }

    visualize(params) {
        try {
            window.CONFIG_UTILS.debug(`MillerVisualizer: Visualizing for system: ${params.system}, params: (${params.h},${params.k},${params.i || ''},${params.l})`, 'info');
            if (this.axisSystem && this.axisSystem.system !== params.system) {
                this.axisSystem.setSystem(params.system);
            }
            this.clearVisualizationElements();

            const rawResult = this.calculator.calculateIntercepts(params);
            let visualResult = rawResult;

            if (params.system === 'hexagonal' && this.axisSystem.system === 'hexagonal') {
                const tIntersects = {};
                if (rawResult.intersections.c) tIntersects.c = new THREE.Vector3(0, rawResult.intersections.c.z, 0);
                if (rawResult.intersections.a1) tIntersects.a1 = new THREE.Vector3(rawResult.intersections.a1.x, 0, 0);
                if (rawResult.intersections.a2) tIntersects.a2 = new THREE.Vector3(rawResult.intersections.a2.x, 0, rawResult.intersections.a2.y);
                if (rawResult.intersections.a3) tIntersects.a3 = new THREE.Vector3(rawResult.intersections.a3.x, 0, rawResult.intersections.a3.y);

                const tNormal = new THREE.Vector3(rawResult.normal.x, rawResult.normal.z, rawResult.normal.y).normalize();
                const validTIntersects = Object.values(tIntersects).filter(p => p instanceof THREE.Vector3);
                const tCenter = new THREE.Vector3();
                if (validTIntersects.length > 0) {
                    validTIntersects.forEach(p => tCenter.add(p));
                    tCenter.divideScalar(validTIntersects.length);
                } else if (rawResult.center) { // Fallback if no valid transformed intercepts for center
                    tCenter.set(rawResult.center.x, rawResult.center.z, rawResult.center.y);
                }


                visualResult = { ...rawResult, intersections: tIntersects, normal: tNormal, center: tCenter };
                window.CONFIG_UTILS.debug('Transformed Hexagonal Intercepts (Visual Coords):', JSON.stringify(tIntersects));
                window.CONFIG_UTILS.debug('Transformed Hexagonal Normal (Visual Coords):', JSON.stringify(tNormal.toArray()));
            }

            this.createPlane(visualResult);
            this.createIntersectionPoints(visualResult.intersections);
            window.CONFIG_UTILS.debug('MillerVisualizer: Visualization complete.', 'info');
            return true;
        } catch (error) {
            console.error('MillerVisualizer: Visualization error:', error);
            window.CONFIG_UTILS.debug('MillerVisualizer: Visualization error - ' + error.message, 'error');
            this.clearVisualizationElements();
            return false;
        }
    }

    createPlane(result) {
        if (!result || !result.normal) {
             window.CONFIG_UTILS.debug('MillerVisualizer: Cannot create plane - invalid calculation result.', 'error');
             return;
        }

        const planeConfig = this.config.PLANE;
        const axisLength = this.config.AXIS.LENGTH;
        const hexShapeConfig = this.config.DEFAULT_SHAPE.HEXAGONAL;
        const hexRadius = axisLength * (hexShapeConfig.radiusFactor || 1.0);
        const hexHeight = axisLength * (hexShapeConfig.heightFactor || 1.0);
        const halfHexHeight = hexHeight / 2;

        let geometry;
        const params = result.parameters; // h, k, l, (i), system
        // Use result.intersections which are already in VISUAL coordinates for hexagonal
        const visualIntersects = result.intersections;

        window.CONFIG_UTILS.debug(`Creating plane for system: ${params.system}, indices: (${params.h},${params.k},${params.i || ''},${params.l})`, 'info');
        window.CONFIG_UTILS.debug('Visual Intercepts for plane creation:', JSON.stringify(visualIntersects));


        if (params.system === 'cubic') {
            const validCubicIntersects = Object.values(visualIntersects).filter(p => p instanceof THREE.Vector3);
            if (validCubicIntersects.length === 3) {
                geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array(validCubicIntersects.flatMap(v => v.toArray()));
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                geometry.setIndex([0, 1, 2]);
            } else if (validCubicIntersects.length === 1 && (params.h === 0 || params.k === 0 || params.l === 0)) {
                geometry = new THREE.PlaneGeometry(axisLength, axisLength);
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.copy(validCubicIntersects[0]);
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            } else {
                geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.copy(result.center);
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            }
        } else if (params.system === 'hexagonal') {
            const cPoint = visualIntersects.c;
            const a1Point = visualIntersects.a1;
            const a2Point = visualIntersects.a2;
            const a3Point = visualIntersects.a3;
            const finiteAIntersects = [a1Point, a2Point, a3Point].filter(p => p instanceof THREE.Vector3);

            if (params.h === 0 && params.k === 0 && params.i === 0 && params.l !== 0 && cPoint) { // Basal (000l)
                window.CONFIG_UTILS.debug('Hex Plane: Basal (000l)', 'info');
                const shape = new THREE.Shape();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = hexRadius * Math.cos(angle);
                    const z = hexRadius * Math.sin(angle);
                    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
                }
                shape.closePath();
                geometry = new THREE.ShapeGeometry(shape);
                this.planeMesh = new THREE.Mesh(geometry, null);
                this.planeMesh.position.set(0, cPoint.y, 0); // Positioned at c-intercept height
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());

            } else if (params.l === 0 && finiteAIntersects.length >= 2) { // Prism face (hki0)
                window.CONFIG_UTILS.debug('Hex Plane: Prism (hki0)', 'info');
                // Select two distinct finite 'a' intercepts. This needs to be robust.
                // For (10-10), a1 and a3 are finite. For (11-20), a1 and a2 are finite.
                let p1 = null, p2 = null;
                if (params.h !== 0 && params.i !== 0 && a1Point && a3Point) { p1 = a1Point; p2 = a3Point; } // e.g. (10-10)
                else if (params.h !== 0 && params.k !== 0 && a1Point && a2Point) { p1 = a1Point; p2 = a2Point; } // e.g. (11-20)
                else if (params.k !== 0 && params.i !== 0 && a2Point && a3Point) { p1 = a2Point; p2 = a3Point; } // e.g. (01-10)
                else { // Fallback if specific pairs not found, just take first two available
                    if(finiteAIntersects.length >= 2) {p1 = finiteAIntersects[0]; p2 = finiteAIntersects[1];}
                }

                if (p1 && p2 && !p1.equals(p2)) {
                    geometry = new THREE.BufferGeometry();
                    const rectVertices = new Float32Array([
                        p1.x,  halfHexHeight, p1.z, p1.x, -halfHexHeight, p1.z,
                        p2.x,  halfHexHeight, p2.z, p2.x, -halfHexHeight, p2.z
                    ]);
                    geometry.setAttribute('position', new THREE.BufferAttribute(rectVertices, 3));
                    geometry.setIndex([0, 1, 2, 1, 3, 2]); // Ensure correct winding for a vertical plane
                } else {
                    window.CONFIG_UTILS.debug('Hex Prism: Not enough distinct finite a-intercepts, fallback.', 'warn');
                    geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                    this.planeMesh = new THREE.Mesh(geometry, null);
                }

            } else if (params.l !== 0 && cPoint && finiteAIntersects.length >= 2) { // Pyramidal/General (hkil)
                 window.CONFIG_UTILS.debug('Hex Plane: Pyramidal/General (hkil)', 'info');
                 // Form a triangle with cPoint and two distinct finite a-intercepts.
                 let p_a_1 = null, p_a_2 = null;
                 if (params.h !== 0 && a1Point) p_a_1 = a1Point;
                 if (params.k !== 0 && a2Point) {
                    if (!p_a_1) p_a_1 = a2Point; else if (!a2Point.equals(p_a_1)) p_a_2 = a2Point;
                 }
                 if (params.i !== 0 && a3Point) {
                    if (!p_a_1) p_a_1 = a3Point; else if (!p_a_2 && !a3Point.equals(p_a_1)) p_a_2 = a3Point;
                 }
                 // If still don't have two, try from the list
                 if (!p_a_1 && finiteAIntersects.length > 0) p_a_1 = finiteAIntersects[0];
                 if (!p_a_2 && finiteAIntersects.length > 1 && !finiteAIntersects[1].equals(p_a_1)) p_a_2 = finiteAIntersects[1];


                if (p_a_1 && p_a_2) {
                    window.CONFIG_UTILS.debug('Hex Pyramidal Vertices:', {v0:cPoint.toArray(), v1:p_a_1.toArray(), v2:p_a_2.toArray()});
                    geometry = new THREE.BufferGeometry();
                    const triVertices = new Float32Array([
                        cPoint.x, cPoint.y, cPoint.z,
                        p_a_1.x, p_a_1.y, p_a_1.z,
                        p_a_2.x, p_a_2.y, p_a_2.z,
                    ]);
                    geometry.setAttribute('position', new THREE.BufferAttribute(triVertices, 3));
                    geometry.setIndex([0, 1, 2]);
                } else {
                     window.CONFIG_UTILS.debug('Hex Pyramidal: Not enough distinct a-intercepts for triangle, fallback.', 'warn');
                     geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                     this.planeMesh = new THREE.Mesh(geometry, null);
                }
            } else { // Fallback
                window.CONFIG_UTILS.debug('Hex Plane: Fallback', 'info');
                geometry = new THREE.PlaneGeometry(result.size || planeConfig.DEFAULT_SIZE, result.size || planeConfig.DEFAULT_SIZE);
                this.planeMesh = new THREE.Mesh(geometry, null);
            }

            if (this.planeMesh && (geometry instanceof THREE.PlaneGeometry || (geometry instanceof THREE.ShapeGeometry && !(params.h === 0 && params.k === 0 && params.i === 0 && params.l !== 0)))) {
                this.planeMesh.position.copy(result.center);
                this.planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), result.normal.clone().normalize());
            }
        } else {
            geometry = new THREE.PlaneGeometry(planeConfig.DEFAULT_SIZE, planeConfig.DEFAULT_SIZE);
            this.planeMesh = new THREE.Mesh(geometry, null);
        }

        if (geometry && !geometry.attributes.normal && !(geometry instanceof THREE.PlaneGeometry)) { // PlaneGeometry has normals
            geometry.computeVertexNormals();
        }

        const material = new THREE.MeshPhongMaterial({
            color: planeConfig.COLOR, opacity: planeConfig.OPACITY,
            transparent: planeConfig.OPACITY < 1.0, side: THREE.DoubleSide,
            shininess: planeConfig.STYLES.shininess || 30, wireframe: planeConfig.STYLES.wireframe || false
        });

        if (!this.planeMesh) { this.planeMesh = new THREE.Mesh(geometry, material); }
        else {
            if(this.planeMesh.geometry && this.planeMesh.geometry !== geometry) this.planeMesh.geometry.dispose();
            this.planeMesh.geometry = geometry;
            this.planeMesh.material = material;
        }
        this.scene.add(this.planeMesh);
    }

    createIntersectionPoints(intersections) { /* ... same as before ... */
        if (!intersections) return;
        const pointConfig = this.config.HELPERS.INTERSECTION_POINT;
        const sphereGeometry = new THREE.SphereGeometry(pointConfig.SIZE, pointConfig.SEGMENTS, pointConfig.SEGMENTS);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: pointConfig.COLOR });

        Object.values(intersections).forEach(point => {
            if (point instanceof THREE.Vector3) {
                const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial); // Re-use geo & mat
                sphereMesh.position.copy(point);
                this.scene.add(sphereMesh);
                this.intersectionPointMeshes.push(sphereMesh);
            }
        });
    }
    clearVisualizationElements() { /* ... same as before ... */
        if (this.planeMesh) {
            this.scene.remove(this.planeMesh);
            if (this.planeMesh.geometry) this.planeMesh.geometry.dispose();
            if (this.planeMesh.material) {
                const materials = Array.isArray(this.planeMesh.material) ? this.planeMesh.material : [this.planeMesh.material];
                materials.forEach(m => m.dispose());
            }
            this.planeMesh = null;
        }
        this.intersectionPointMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.intersectionPointMeshes = [];
    }
    resetCameraPosition() { /* ... same as before ... */
         const pos = this.config.SCENE.CAMERA_POSITION;
         this.camera.position.set(pos.x, pos.y, pos.z);
         this.camera.lookAt(0, 0, 0);
         if (this.controls) {
             this.controls.target.set(0, 0, 0);
             this.controls.update();
         }
    }
    dispose() { /* ... same as before ... */
        window.CONFIG_UTILS.debug('MillerVisualizer: Disposing...', 'info');
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        else if (this.boundResizeHandler) window.removeEventListener('resize', this.boundResizeHandler);

        if (this.axisSystem) this.axisSystem.dispose();
        this.clearVisualizationElements();

        if (this.controls) this.controls.dispose();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) this.container.removeChild(this.renderer.domElement);
        }
        this.scene = null; this.camera = null; this.renderer = null; this.controls = null;
        this.axisSystem = null; this.config = null;
        window.CONFIG_UTILS.debug('MillerVisualizer: Disposed successfully.', 'info');
    }
}
window.MillerVisualizer = MillerVisualizer;
