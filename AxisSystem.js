// AxisSystem.js

class AxisSystem {
    constructor(scene, initialSystem = 'cubic') {
        if (!scene || !window.CONFIG || !window.THREE || !window.CONFIG_UTILS) {
            throw new Error("AxisSystem: Missing required dependencies (Scene, CONFIG, THREE, CONFIG_UTILS).");
        }
        this.scene = scene;
        this.axisConfig = window.CONFIG.AXIS;
        this.system = initialSystem;
        this.currentSystemConfig = null;

        this.axesGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.gridGroup = new THREE.Group();
        this.helpersGroup = new THREE.Group();
        this.shapeGroup = new THREE.Group();

        this.objects = {
            axesLines: [], arrowHeads: [], labels: [], grids: [],
            markers: [], origin: null, shape: null
        };

        this.scene.add(this.axesGroup);
        this.scene.add(this.labelsGroup);
        this.scene.add(this.gridGroup);
        this.scene.add(this.helpersGroup);
        this.scene.add(this.shapeGroup);

        this.SQRT3 = Math.sqrt(3);
        this.init();
    }

    init() {
        this.clear();
        this.currentSystemConfig = CONFIG_UTILS.getAxisConfig(this.system);
        const shapeConfig = CONFIG_UTILS.getShapeConfig(this.system);

        if (!this.currentSystemConfig || !shapeConfig) {
             window.CONFIG_UTILS.debug(`AxisSystem init error: Config not found for system '${this.system}'`, 'error');
             return;
        }

        if (this.system === 'cubic') {
            this.createCubicAxes();
            this.createCubicLabels();
            if (shapeConfig.enabled) {
                this.createCubicShape(shapeConfig); // Will now use EdgesGeometry
            }
        } else if (this.system === 'hexagonal') {
            this.createHexagonalAxes();
            this.createHexagonalLabels();
             if (shapeConfig.enabled) {
                this.createHexagonalShape_Custom(shapeConfig); // Will now use EdgesGeometry
            }
        }

        this.createGrid();
        this.createOrigin();
        this.createUnitMarkers();
    }

    setSystem(systemType) {
        if (systemType !== this.system && (systemType === 'cubic' || systemType === 'hexagonal')) {
            window.CONFIG_UTILS.debug(`AxisSystem: Setting system to: ${systemType}`, 'info');
            this.system = systemType;
            this.init();
        }
    }

    createCubicAxes() {
        const axisLength = this.axisConfig.LENGTH;
        const colors = this.currentSystemConfig.COLORS;
        const axesData = [
            { name: 'b', dir: new THREE.Vector3(1, 0, 0), color: colors.B_AXIS },
            { name: 'c', dir: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS },
            { name: 'a', dir: new THREE.Vector3(0, 0, 1), color: colors.A_AXIS }
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

    /**
     * Creates a cleaner outline of a cube using EdgesGeometry.
     */
     createCubicShape(shapeConfig) {
        const size = this.axisConfig.LENGTH * (shapeConfig.sizeFactor || 1.0);
        const boxGeometry = new THREE.BoxGeometry(size, size, size);
        
        if (shapeConfig.wireframe) {
            const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: shapeConfig.color,
                opacity: shapeConfig.opacity, // Opacity for lines
                transparent: shapeConfig.opacity < 1.0
            });
            const cubeEdges = new THREE.LineSegments(edgesGeometry, lineMaterial);
            this.shapeGroup.add(cubeEdges);
            this.objects.shape = cubeEdges; // Store reference to the LineSegments
            // Store original geometry for potential disposal if EdgesGeometry is also stored
            this.objects.originalShapeGeometry = boxGeometry; 
        } else { // Solid shape
            const material = new THREE.MeshBasicMaterial({
                color: shapeConfig.color,
                opacity: shapeConfig.opacity,
                transparent: shapeConfig.opacity < 1.0,
                depthWrite: shapeConfig.opacity === 1.0
            });
            const cubeMesh = new THREE.Mesh(boxGeometry, material);
            this.shapeGroup.add(cubeMesh);
            this.objects.shape = cubeMesh;
        }
    }

    createHexagonalAxes() {
        const axisLength = this.axisConfig.LENGTH;
        const colors = this.currentSystemConfig.COLORS;
        const hexAxesData = [
            { name: 'c',  dir: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS },
            { name: 'a1', dir: new THREE.Vector3(1, 0, 0), color: colors.A1_AXIS },
            { name: 'a2', dir: new THREE.Vector3(-0.5, 0, this.SQRT3 / 2), color: colors.A2_AXIS },
            { name: 'a3', dir: new THREE.Vector3(-0.5, 0, -this.SQRT3 / 2), color: colors.A3_AXIS }
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
             { text: labelsText.c,  pos: new THREE.Vector3(0, labelOffset, 0), color: colors.C_AXIS },
             { text: labelsText.a1, pos: new THREE.Vector3(labelOffset, 0, 0), color: colors.A1_AXIS },
             { text: labelsText.a2, pos: new THREE.Vector3(labelOffset * -0.5, 0, labelOffset * this.SQRT3 / 2), color: colors.A2_AXIS },
             { text: labelsText.a3, pos: new THREE.Vector3(labelOffset * -0.5, 0, labelOffset * -this.SQRT3 / 2), color: colors.A3_AXIS }
         ];
         hexLabelsData.forEach(label => {
             const sprite = this.createTextSprite( label.text, label.pos, spriteConfig, label.color);
             this.labelsGroup.add(sprite); this.objects.labels.push(sprite);
         });
     }

    /**
     * Creates a cleaner outline of a hexagonal bipyramid (prism with caps) using EdgesGeometry.
     */
    createHexagonalShape_Custom(shapeConfig) {
        const radius = this.axisConfig.LENGTH * (shapeConfig.radiusFactor || 1.0);
        const prismBodyHeightFactor = (shapeConfig.heightFactor || 1.0) * 0.6; // For prism part
        const prismBodyHeight = this.axisConfig.LENGTH * prismBodyHeightFactor;
        const pyramidHeight = radius * 0.75; // For caps
        const halfPrismBodyHeight = prismBodyHeight / 2;

        const vertices = [];
        for (let i = 0; i < 6; i++) { // Prism body vertices
            const angle = (Math.PI / 3) * i;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            vertices.push(x, halfPrismBodyHeight, z);  // Top of prism body
            vertices.push(x, -halfPrismBodyHeight, z); // Bottom of prism body
        }
        vertices.push(0, halfPrismBodyHeight + pyramidHeight, 0); // Top apex (Y-up)
        vertices.push(0, -halfPrismBodyHeight - pyramidHeight, 0); // Bottom apex (Y-up)

        const indices = [];
        for (let i = 0; i < 6; i++) { // Prism sides
            const top1 = i * 2; const bottom1 = i * 2 + 1;
            const top2 = ((i + 1) % 6) * 2; const bottom2 = ((i + 1) % 6) * 2 + 1;
            indices.push(top1, bottom1, top2); indices.push(bottom1, bottom2, top2);
        }
        const topApexIndex = 12;
        for (let i = 0; i < 6; i++) { // Top pyramid
            indices.push(i * 2, ((i + 1) % 6) * 2, topApexIndex);
        }
        const bottomApexIndex = 13;
        for (let i = 0; i < 6; i++) { // Bottom pyramid
            indices.push(((i + 1) % 6) * 2 + 1, i * 2 + 1, bottomApexIndex);
        }

        const hexGeometry = new THREE.BufferGeometry();
        hexGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        hexGeometry.setIndex(indices);
        // No need to compute normals if only rendering edges

        if (shapeConfig.wireframe) {
            const edgesGeometry = new THREE.EdgesGeometry(hexGeometry);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: shapeConfig.color,
                opacity: shapeConfig.opacity,
                transparent: shapeConfig.opacity < 1.0
            });
            const hexEdges = new THREE.LineSegments(edgesGeometry, lineMaterial);
            this.shapeGroup.add(hexEdges);
            this.objects.shape = hexEdges;
            this.objects.originalShapeGeometry = hexGeometry; // Store original for disposal
        } else { // Solid shape
            hexGeometry.computeVertexNormals(); // Normals needed for solid rendering
            const material = new THREE.MeshBasicMaterial({
                color: shapeConfig.color,
                opacity: shapeConfig.opacity,
                transparent: shapeConfig.opacity < 1.0,
                depthWrite: shapeConfig.opacity === 1.0,
                side: THREE.DoubleSide
            });
            const hexMesh = new THREE.Mesh(hexGeometry, material);
            this.shapeGroup.add(hexMesh);
            this.objects.shape = hexMesh;
        }
    }

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
            negLine.computeLineDistances();
            this.axesGroup.add(negLine);
            this.objects.axesLines.push(negLine);
        }
    }

    createArrowHead(positionAtEndOfAxis, directionOfAxis, color) {
        const headLength = 0.15;
        const headWidth = 0.07;
        const normalizedDir = directionOfAxis.clone().normalize();
        const arrow = new THREE.ArrowHelper(normalizedDir, positionAtEndOfAxis, 0, color, headLength, headWidth);
        if (arrow.line && arrow.line.material) arrow.line.material.linewidth = 2;
        this.axesGroup.add(arrow); this.objects.arrowHeads.push(arrow);
    }

    createTextSprite(text, position, spriteConfig, textColor = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontFace = spriteConfig.fontFace || 'Arial';
        const fontSize = spriteConfig.fontSize || 48;
        canvas.width = spriteConfig.canvasWidth || 256;
        canvas.height = spriteConfig.canvasHeight || 128;
        context.font = `Bold ${fontSize}px ${fontFace}`;
        const bgColor = spriteConfig.backgroundColor;
        const ctxBackgroundColor = `rgba(${Math.round(bgColor.r * 255)}, ${Math.round(bgColor.g * 255)}, ${Math.round(bgColor.b * 255)}, ${bgColor.a})`;
        context.fillStyle = ctxBackgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        if (spriteConfig.borderThickness > 0) {
             const borderColor = spriteConfig.borderColor;
             const ctxBorderColor = `rgba(${Math.round(borderColor.r * 255)}, ${Math.round(borderColor.g * 255)}, ${Math.round(borderColor.b * 255)}, ${borderColor.a})`;
             context.lineWidth = spriteConfig.borderThickness;
             context.strokeStyle = ctxBorderColor;
        }
        context.fillStyle = new THREE.Color(textColor).getStyle();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.1 });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        const spriteScale = this.axisConfig.LABEL_SIZE || 0.15;
        sprite.scale.set(spriteScale * (canvas.width / canvas.height), spriteScale, 1.0);
        return sprite;
    }

    createGrid() {
        const gridSize = this.axisConfig.GRID_SIZE;
        const divisions = this.axisConfig.GRID_DIVISIONS;
        const gridColor = window.CONFIG.HELPERS.GRID.COLOR || 0x444444;
        const gridXZ = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
        gridXZ.material.opacity = 0.2;
        gridXZ.material.transparent = true;
        this.gridGroup.add(gridXZ); this.objects.grids.push(gridXZ);
        if (this.system === 'hexagonal' && (CONFIG.DEBUG.showPerpendicularGridForHexagonal)) {
             const gridXY = new THREE.GridHelper(gridSize, divisions, gridColor, gridColor);
             gridXY.rotation.z = Math.PI / 2;
             gridXY.material.opacity = 0.10;
             gridXY.material.transparent = true;
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
            const cubicAxesInfo = [
                 { pos: new THREE.Vector3(1,0,0), color: colors.B_AXIS },
                 { pos: new THREE.Vector3(0,1,0), color: colors.C_AXIS },
                 { pos: new THREE.Vector3(0,0,1), color: colors.A_AXIS }
            ];
            const markerPositions = [-axisLength, -1, 1, axisLength].filter(p => p !== 0);
            markerPositions.forEach(position => {
                 cubicAxesInfo.forEach(axisInfo => {
                     const marker = new THREE.Mesh(
                        new THREE.SphereGeometry(markerSize, 8, 8),
                        new THREE.MeshBasicMaterial({ color: axisInfo.color })
                     );
                     marker.position.copy(axisInfo.pos).multiplyScalar(position);
                     this.helpersGroup.add(marker); this.objects.markers.push(marker);
                 });
             });
        } else if (this.system === 'hexagonal') {
             const hexAxesInfo = [
                 { vec: new THREE.Vector3(0, 1, 0), color: colors.C_AXIS },
                 { vec: new THREE.Vector3(1, 0, 0), color: colors.A1_AXIS },
                 { vec: new THREE.Vector3(-0.5, 0, this.SQRT3 / 2), color: colors.A2_AXIS },
                 { vec: new THREE.Vector3(-0.5, 0, -this.SQRT3 / 2), color: colors.A3_AXIS }
             ];
              [-1, 1].forEach(position => {
                 hexAxesInfo.forEach(axis => {
                     const marker = new THREE.Mesh(
                        new THREE.SphereGeometry(markerSize, 8, 8),
                        new THREE.MeshBasicMaterial({ color: axis.color })
                     );
                     marker.position.copy(axis.vec).multiplyScalar(position);
                     this.helpersGroup.add(marker); this.objects.markers.push(marker);
                 });
             });
        }
    }

    clear() {
         this.objects.axesLines.forEach(obj => this.axesGroup.remove(obj));
         this.objects.arrowHeads.forEach(obj => this.axesGroup.remove(obj));
         this.objects.labels.forEach(obj => this.labelsGroup.remove(obj));
         this.objects.grids.forEach(obj => this.gridGroup.remove(obj));
         this.objects.markers.forEach(obj => this.helpersGroup.remove(obj));
         if (this.objects.origin) this.helpersGroup.remove(this.objects.origin);
         
         if (this.objects.shape) {
            this.shapeGroup.remove(this.objects.shape);
            // Dispose geometry and material of the shape
            if (this.objects.shape.geometry) this.objects.shape.geometry.dispose();
            if (this.objects.shape.material) {
                 const materials = Array.isArray(this.objects.shape.material) ? this.objects.shape.material : [this.objects.shape.material];
                 materials.forEach(m => m.dispose());
            }
            // If EdgesGeometry was used, the original geometry also needs disposal
            if (this.objects.originalShapeGeometry) {
                this.objects.originalShapeGeometry.dispose();
                this.objects.originalShapeGeometry = null;
            }
         }

         // General disposal for other items (though mostly covered by shape disposal)
         Object.values(this.objects).flat().forEach(object => {
             if (!object || object === this.objects.shape) return; // Skip already handled shape
             if (object.geometry) object.geometry.dispose();
             if (object.material) {
                 const materials = Array.isArray(object.material) ? object.material : [object.material];
                 materials.forEach(m => {
                     if (m.map) m.map.dispose();
                     m.dispose();
                 });
             }
         });

         this.objects = {
             axesLines: [], arrowHeads: [], labels: [], grids: [],
             markers: [], origin: null, shape: null, originalShapeGeometry: null
         };
    }

    setVisibility(visible) {
        this.axesGroup.visible = visible;
        this.labelsGroup.visible = visible;
        this.gridGroup.visible = visible;
        this.helpersGroup.visible = visible;
        this.shapeGroup.visible = visible;
    }

    dispose() {
        this.clear();
        if (this.scene) {
            if (this.axesGroup.parent === this.scene) this.scene.remove(this.axesGroup);
            if (this.labelsGroup.parent === this.scene) this.scene.remove(this.labelsGroup);
            if (this.gridGroup.parent === this.scene) this.scene.remove(this.gridGroup);
            if (this.helpersGroup.parent === this.scene) this.scene.remove(this.helpersGroup);
            if (this.shapeGroup.parent === this.scene) this.scene.remove(this.shapeGroup);
        }
        this.scene = null; this.axisConfig = null; this.currentSystemConfig = null;
        this.axesGroup = null; this.labelsGroup = null; this.gridGroup = null;
        this.helpersGroup = null; this.shapeGroup = null; this.objects = null;
        window.CONFIG_UTILS.debug("AxisSystem disposed.", "info");
    }

    update(camera) {
        // Sprites auto-orient.
    }
}

window.AxisSystem = AxisSystem;
