// AxisSystem.js

class AxisSystem {
    constructor(scene, initialSystem = 'cubic') {
        if (!scene || !window.CONFIG || !window.THREE || !window.CONFIG_UTILS) { // Added CONFIG_UTILS check
            throw new Error("AxisSystem: Missing required dependencies.");
        }
        this.scene = scene;
        this.axisConfig = window.CONFIG.AXIS; // Store base axis config
        this.system = initialSystem;
        this.currentSystemConfig = null; // Will be set in init

        // Groups to hold objects for easier management
        this.axesGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.gridGroup = new THREE.Group();
        this.helpersGroup = new THREE.Group();
        this.shapeGroup = new THREE.Group(); // *** NEW Group for the default shape ***

        // Store references for cleanup
        this.objects = {
            axesLines: [],
            arrowHeads: [],
            labels: [],
            grids: [],
            markers: [],
            origin: null,
            shape: null // *** NEW property to hold the shape mesh ***
        };

        // Add main groups to the scene once
        this.scene.add(this.axesGroup);
        this.scene.add(this.labelsGroup);
        this.scene.add(this.gridGroup);
        this.scene.add(this.helpersGroup);
        this.scene.add(this.shapeGroup); // *** Add shape group to scene ***

        // Constants
        this.SQRT3 = Math.sqrt(3);

        this.init();
    }

    /**
     * Initialize the axis system based on the current system type.
     */
    init() {
        console.log(`AxisSystem: Clearing for system: ${this.system}`); // Add log
        this.clear();

        this.currentSystemConfig = CONFIG_UTILS.getAxisConfig(this.system); // Use util
        const shapeConfig = CONFIG_UTILS.getShapeConfig(this.system); // Get shape config

        if (!this.currentSystemConfig || !shapeConfig) {
             window.CONFIG_UTILS.debug(`Axis system initialization error: Config not found for system '${this.system}'`, 'error');
             return;
        }

        // Create Axes and Labels
        if (this.system === 'cubic') {
            console.log("AxisSystem: Calling createCubicAxes / Labels"); // Add log
            this.createCubicAxes();
            this.createCubicLabels();
            if (shapeConfig.enabled) {
                console.log("AxisSystem: Calling createCubicShape"); // Add log
                this.createCubicShape(shapeConfig);
            }
        } else if (this.system === 'hexagonal') {
            console.log("AxisSystem: Calling createHexagonalAxes / Labels"); // Add log
            this.createHexagonalAxes();
            this.createHexagonalLabels();
             if (shapeConfig.enabled) {
                console.log("AxisSystem: Calling createHexagonalShape_Custom"); // Add log
                this.createHexagonalShape_Custom(shapeConfig);
            }
        }

        // Common elements
        this.createGrid();
        this.createOrigin();
        this.createUnitMarkers();
        console.log("AxisSystem: Init complete."); // Add log
    }

    /**
     * Set the crystal system and rebuild the visuals.
     * @param {string} systemType - 'cubic' or 'hexagonal'
     */
    setSystem(systemType) {
        if (systemType !== this.system && (systemType === 'cubic' || systemType === 'hexagonal')) {
            window.CONFIG_UTILS.debug(`Setting axis system to: ${systemType}`, 'info');
            this.system = systemType;
            this.init(); // Re-initialize with the new system
        }
    }

    // --- Cubic Specific ---
    createCubicAxes() {
        const axisLength = this.axisConfig.LENGTH;
        const colors = this.currentSystemConfig.COLORS;
        const axesData = [
            { name: 'b', dir: new THREE.Vector3(1, 0, 0), color: colors.B_AXIS }, // x
            { name: 'c', dir: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS }, // y
            { name: 'a', dir: new THREE.Vector3(0, 0, 1), color: colors.A_AXIS }  // z
        ];
        axesData.forEach(axis => {
            this.createAxisLine(axis.dir, axisLength, axis.color, true);
            this.createArrowHead(axis.dir.clone().multiplyScalar(axisLength), axis.dir, axis.color);
        });
    }
    createCubicLabels() {
        const labelOffset = this.axisConfig.LENGTH + this.currentSystemConfig.LABELS.OFFSET;
        const colors = this.currentSystemConfig.COLORS;
        const labelsText = this.currentSystemConfig.LABELS.TEXT;
        const spriteConfig = this.currentSystemConfig.LABELS.SPRITE;
        const labelsData = [
            { text: labelsText.b, pos: new THREE.Vector3(labelOffset, 0, 0), color: colors.B_AXIS },
            { text: labelsText.c, pos: new THREE.Vector3(0, labelOffset, 0), color: colors.C_AXIS },
            { text: labelsText.a, pos: new THREE.Vector3(0, 0, labelOffset), color: colors.A_AXIS }
        ];
        labelsData.forEach(label => {
             const sprite = this.createTextSprite(label.text, label.pos, spriteConfig, label.color);
             this.labelsGroup.add(sprite); this.objects.labels.push(sprite);
         });
    }
     createCubicShape(shapeConfig) {
        console.log("AxisSystem: Inside createCubicShape"); // Add log
        const size = this.axisConfig.LENGTH * (shapeConfig.sizeFactor || 1.0);
        const geometry = new THREE.BoxGeometry(size, size, size);
        console.log("AxisSystem: Created Geometry Type:", geometry.type); // Add log - Should be BoxGeometry

        const material = new THREE.MeshBasicMaterial({
            color: shapeConfig.color, wireframe: shapeConfig.wireframe !== false,
            opacity: shapeConfig.opacity, transparent: shapeConfig.opacity < 1.0,
            depthWrite: !shapeConfig.wireframe && shapeConfig.opacity === 1.0
        });
        const cube = new THREE.Mesh(geometry, material);
        this.shapeGroup.add(cube);
        this.objects.shape = cube;
        console.log("AxisSystem: Added cube shape to group."); // Add log
    }

    // --- Hexagonal Specific ---
    createHexagonalAxes() {
        const axisLength = this.axisConfig.LENGTH;
        const colors = this.currentSystemConfig.COLORS;
        const hexAxesData = [
            { name: 'a1', dir: new THREE.Vector3(1, 0, 0), color: colors.A1_AXIS },
            { name: 'a2', dir: new THREE.Vector3(-0.5, this.SQRT3 / 2, 0), color: colors.A2_AXIS },
            { name: 'a3', dir: new THREE.Vector3(-0.5, -this.SQRT3 / 2, 0), color: colors.A3_AXIS },
            { name: 'c',  dir: new THREE.Vector3(0, 0, 1), color: colors.C_AXIS }
        ];
         hexAxesData.forEach(axis => {
             const showDashedNegative = (axis.name !== 'c');
             this.createAxisLine(axis.dir, axisLength, axis.color, showDashedNegative);
             this.createArrowHead(axis.dir.clone().multiplyScalar(axisLength), axis.dir, axis.color);
         });
    }
     createHexagonalLabels() {
         const labelOffset = this.axisConfig.LENGTH + this.currentSystemConfig.LABELS.OFFSET;
         const colors = this.currentSystemConfig.COLORS;
         const labelsText = this.currentSystemConfig.LABELS.TEXT;
         const spriteConfig = this.currentSystemConfig.LABELS.SPRITE;
         const hexLabelsData = [
             { text: labelsText.a1, pos: new THREE.Vector3(labelOffset, 0, 0), color: colors.A1_AXIS },
             { text: labelsText.a2, pos: new THREE.Vector3(labelOffset * -0.5, labelOffset * this.SQRT3 / 2, 0), color: colors.A2_AXIS },
             { text: labelsText.a3, pos: new THREE.Vector3(labelOffset * -0.5, labelOffset * -this.SQRT3 / 2, 0), color: colors.A3_AXIS },
             { text: labelsText.c,  pos: new THREE.Vector3(0, 0, labelOffset), color: colors.C_AXIS }
         ];
         hexLabelsData.forEach(label => {
             const sprite = this.createTextSprite( label.text, label.pos, spriteConfig, label.color);
             this.labelsGroup.add(sprite); this.objects.labels.push(sprite);
         });
     }
    createHexagonalShape_Custom(shapeConfig) {
        const radius = this.axisConfig.LENGTH * (shapeConfig.radiusFactor || 1.0);
        const prismHeightFactor = (shapeConfig.heightFactor || 1.0) * 0.6;
        const prismHeight = this.axisConfig.LENGTH * prismHeightFactor;
        const pyramidHeight = radius * 0.75;
        const vertices = [];
        const halfPrismHeight = prismHeight / 2;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = radius * Math.cos(angle); const y = radius * Math.sin(angle);
            vertices.push(x, y, halfPrismHeight); // Top vertices (0, 2, 4, 6, 8, 10) -> indices * 2
            vertices.push(x, y, -halfPrismHeight); // Bottom vertices (1, 3, 5, 7, 9, 11) -> indices * 2 + 1
        }
        vertices.push(0, 0, halfPrismHeight + pyramidHeight); // Top apex (12)
        vertices.push(0, 0, -halfPrismHeight - pyramidHeight); // Bottom apex (13)

        const indices = [];
        for (let i = 0; i < 6; i++) { // Prism sides
            const top1 = i * 2; const top2 = ((i + 1) % 6) * 2;
            const bottom1 = top1 + 1; const bottom2 = top2 + 1;
            indices.push(top1, bottom1, top2); indices.push(bottom1, bottom2, top2);
        }
        const topApexIndex = 12; // Vertex index 12
        for (let i = 0; i < 6; i++) { // Top pyramid
            const currentTop = i * 2; const nextTop = ((i + 1) % 6) * 2;
            indices.push(currentTop, nextTop, topApexIndex);
        }
        const bottomApexIndex = 13; // Vertex index 13
        for (let i = 0; i < 6; i++) { // Bottom pyramid
            const currentBottom = i * 2 + 1; const nextBottom = ((i + 1) % 6) * 2 + 1;
             indices.push(nextBottom, currentBottom, bottomApexIndex); // Correct winding order
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
            color: shapeConfig.color, wireframe: shapeConfig.wireframe !== false,
            opacity: shapeConfig.opacity, transparent: shapeConfig.opacity < 1.0,
            depthWrite: !shapeConfig.wireframe && shapeConfig.opacity === 1.0,
            side: THREE.DoubleSide
        });
        const crystalMesh = new THREE.Mesh(geometry, material);
        this.shapeGroup.add(crystalMesh); this.objects.shape = crystalMesh;
     }

    // --- Common Geometry Creation ---
    createAxisLine(direction, length, color, includeNegativeDashed) {
        const origin = new THREE.Vector3(0, 0, 0);
        const positiveEnd = direction.clone().multiplyScalar(length);
        const posGeometry = new THREE.BufferGeometry().setFromPoints([origin, positiveEnd]);
        const posMaterial = new THREE.LineBasicMaterial({ color: color });
        const posLine = new THREE.Line(posGeometry, posMaterial);
        this.axesGroup.add(posLine); this.objects.axesLines.push(posLine);
        if (includeNegativeDashed) {
            const negativeEnd = direction.clone().multiplyScalar(-length);
            const negGeometry = new THREE.BufferGeometry().setFromPoints([origin, negativeEnd]);
            const negMaterial = new THREE.LineDashedMaterial({ color: color, dashSize: 0.1, gapSize: 0.05, scale: 1 });
            const negLine = new THREE.Line(negGeometry, negMaterial);
            negLine.computeLineDistances(); this.axesGroup.add(negLine); this.objects.axesLines.push(negLine);
        }
    }
    createArrowHead(position, direction, color) {
        const headLength = 0.15; const headWidth = 0.07;
        const normDir = direction.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, position, headLength, color, headLength, headWidth);
        arrow.line.material.linewidth = 2; this.axesGroup.add(arrow); this.objects.arrowHeads.push(arrow);
    }
    createTextSprite(text, position, spriteConfig, textColor = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontFace = 'Arial'; const fontSize = spriteConfig.fontSize || 48;
        canvas.width = 256; canvas.height = 128; context.font = `Bold ${fontSize}px ${fontFace}`;
        const ctxBackgroundColor = `rgba(${spriteConfig.backgroundColor.r * 255}, ${spriteConfig.backgroundColor.g * 255}, ${spriteConfig.backgroundColor.b * 255}, ${spriteConfig.backgroundColor.a})`;
        const ctxBorderColor = `rgba(${spriteConfig.borderColor.r * 255}, ${spriteConfig.borderColor.g * 255}, ${spriteConfig.borderColor.b * 255}, ${spriteConfig.borderColor.a})`;
        const ctxTextColor = new THREE.Color(textColor).getStyle();
        context.fillStyle = ctxBackgroundColor; context.fillRect(0, 0, canvas.width, canvas.height);
        if (spriteConfig.borderThickness > 0) {
             context.lineWidth = spriteConfig.borderThickness; context.strokeStyle = ctxBorderColor;
             context.strokeText(text, canvas.width / 2, canvas.height / 2);
        }
        context.fillStyle = ctxTextColor; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial); sprite.position.copy(position);
        const spriteScale = this.axisConfig.LABEL_SIZE || 0.15;
        sprite.scale.set(spriteScale * (canvas.width/canvas.height), spriteScale, 1);
        return sprite;
    }
    createGrid() {
        const gridSize = this.axisConfig.GRID_SIZE; const divisions = this.axisConfig.GRID_DIVISIONS;
        const gridColor = window.CONFIG.HELPERS.GRID.COLOR || 0x444444;
        const gridXZ = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
        gridXZ.material.opacity = 0.2; gridXZ.material.transparent = true;
        this.gridGroup.add(gridXZ); this.objects.grids.push(gridXZ);
        if (this.system === 'hexagonal') {
             const gridXY = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
             gridXY.rotation.x = Math.PI / 2; gridXY.material.opacity = 0.1; gridXY.material.transparent = true;
             this.gridGroup.add(gridXY); this.objects.grids.push(gridXY);
        }
    }
    createOrigin() {
        const config = window.CONFIG.HELPERS.ORIGIN_POINT;
        const originGeometry = new THREE.SphereGeometry(config.SIZE, config.SEGMENTS, config.SEGMENTS);
        const originMaterial = new THREE.MeshBasicMaterial({ color: config.COLOR });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        this.helpersGroup.add(origin); this.objects.origin = origin;
    }
    createUnitMarkers() {
        const markerSize = 0.03;
        const axisLength = this.axisConfig.LENGTH;
        if (!this.currentSystemConfig) return;
        const colors = this.currentSystemConfig.COLORS;
        if (this.system === 'cubic') {
            const cubicAxes = [
                 { axis: 'x', pos: new THREE.Vector3(1,0,0), color: colors.B_AXIS },
                 { axis: 'y', pos: new THREE.Vector3(0,1,0), color: colors.C_AXIS },
                 { axis: 'z', pos: new THREE.Vector3(0,0,1), color: colors.A_AXIS }
            ];
            [-axisLength, -1, 1, axisLength].forEach(position => {
                 if (position === 0) return;
                 cubicAxes.forEach(axisInfo => {
                     const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
                     const markerMaterial = new THREE.MeshBasicMaterial({ color: axisInfo.color });
                     const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                     marker.position.copy(axisInfo.pos).multiplyScalar(position);
                     this.helpersGroup.add(marker); this.objects.markers.push(marker);
                 });
             });
        } else if (this.system === 'hexagonal') {
             const hexAxes = [
                 { name: 'a1', vec: new THREE.Vector3(1, 0, 0), color: colors.A1_AXIS },
                 { name: 'a2', vec: new THREE.Vector3(-0.5, this.SQRT3 / 2, 0), color: colors.A2_AXIS },
                 { name: 'a3', vec: new THREE.Vector3(-0.5, -this.SQRT3 / 2, 0), color: colors.A3_AXIS },
                 { name: 'c',  vec: new THREE.Vector3(0, 0, 1), color: colors.C_AXIS }
             ];
              [-1, 1].forEach(position => {
                 hexAxes.forEach(axis => {
                     const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
                     const markerMaterial = new THREE.MeshBasicMaterial({ color: axis.color });
                     const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                     marker.position.copy(axis.vec).multiplyScalar(position);
                     this.helpersGroup.add(marker); this.objects.markers.push(marker);
                 });
             });
        }
    }

    // --- Management ---
    clear() {
         console.log("AxisSystem: Clearing objects..."); // Add log
         // Remove objects from groups
         [...this.objects.axesLines, ...this.objects.arrowHeads].forEach(obj => this.axesGroup.remove(obj));
         this.objects.labels.forEach(obj => this.labelsGroup.remove(obj));
         this.objects.grids.forEach(obj => this.gridGroup.remove(obj));
         this.objects.markers.forEach(obj => this.helpersGroup.remove(obj));
         if (this.objects.origin) this.helpersGroup.remove(this.objects.origin);
         if (this.objects.shape) { // Check if shape exists before removing
            console.log("AxisSystem: Removing shape from group"); // Add log
            this.shapeGroup.remove(this.objects.shape);
         }

         // Dispose geometries and materials
         Object.entries(this.objects).forEach(([key, value]) => {
             const items = Array.isArray(value) ? value : [value]; // Handle single items and arrays
             items.forEach(object => {
                 if (!object) return; // Skip null items
                 // Log shape disposal
                 if (key === 'shape' && object.geometry) {
                     console.log("AxisSystem: Disposing shape geometry", object.geometry.type); // Log type
                 }
                 // Disposal logic
                 if (object instanceof THREE.ArrowHelper) {
                     if (object.line?.geometry) object.line.geometry.dispose();
                     if (object.line?.material) object.line.material.dispose();
                     if (object.cone?.geometry) object.cone.geometry.dispose();
                     if (object.cone?.material) object.cone.material.dispose();
                 } else if (object instanceof THREE.Object3D) { // Catches Meshes, Lines, Sprites
                     if (object.geometry) object.geometry.dispose();
                     if (object.material) {
                         const materials = Array.isArray(object.material) ? object.material : [object.material];
                         materials.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                     }
                 }
             });
         });

         // Clear internal arrays/references
         this.objects = {
             axesLines: [], arrowHeads: [], labels: [], grids: [],
             markers: [], origin: null, shape: null // Reset shape reference
         };
         console.log("AxisSystem: Clear complete."); // Add log
    }
    setVisibility(visible) {
        this.axesGroup.visible = visible;
        this.labelsGroup.visible = visible;
        this.gridGroup.visible = visible;
        this.helpersGroup.visible = visible;
        this.shapeGroup.visible = visible; // Toggle shape visibility
    }
    dispose() {
        this.clear();
        this.scene.remove(this.axesGroup);
        this.scene.remove(this.labelsGroup);
        this.scene.remove(this.gridGroup);
        this.scene.remove(this.helpersGroup);
        this.scene.remove(this.shapeGroup); // Remove shape group
        this.scene = null; this.axisConfig = null; this.currentSystemConfig = null; this.objects = null;
    }
    update(camera) {
        if (!camera || !this.labelsGroup || this.labelsGroup.children.length === 0) return;
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        this.labelsGroup.children.forEach(sprite => { sprite.lookAt(camPos); });
    }
}

window.AxisSystem = AxisSystem; // Make available globally