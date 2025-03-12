// AxisSystem.js

class AxisSystem {
    constructor(scene) {
        this.scene = scene;
        this.config = window.CONFIG.AXIS;
        this.axesGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.gridGroup = new THREE.Group();
        
        // Store references for cleanup
        this.objects = {
            axes: [],
            labels: [],
            grids: [],
            helpers: []
        };

        this.init();
    }

    /**
     * Initialize the axis system
     */
    init() {
        try {
            this.createAxes();
            this.createLabels();
            this.createGrid();
            this.createOrigin();
            this.createUnitMarkers();

            // Add groups to scene
            this.scene.add(this.axesGroup);
            this.scene.add(this.labelsGroup);
            this.scene.add(this.gridGroup);

        } catch (error) {
            window.CONFIG_UTILS.debug('Axis system initialization error: ' + error.message, 'error');
        }
    }

    /**
     * Create the main coordinate axes
     */
    createAxes() {
        const axisLength = this.config.LENGTH;
        
        // Create axes with different colors
        const axes = [
            { name: 'b', dir: new THREE.Vector3(1, 0, 0), color: this.config.COLORS.B_AXIS },  // x-axis
            { name: 'c', dir: new THREE.Vector3(0, 1, 0), color: this.config.COLORS.C_AXIS },  // y-axis
            { name: 'a', dir: new THREE.Vector3(0, 0, 1), color: this.config.COLORS.A_AXIS }   // z-axis
        ];

        axes.forEach(axis => {
            // Positive direction
            const posGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                axis.dir.clone().multiplyScalar(axisLength)
            ]);
            const posMaterial = new THREE.LineBasicMaterial({ color: axis.color });
            const posLine = new THREE.Line(posGeometry, posMaterial);

            // Negative direction (dashed)
            const negGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                axis.dir.clone().multiplyScalar(-axisLength)
            ]);
            const negMaterial = new THREE.LineDashedMaterial({
                color: axis.color,
                dashSize: 0.1,
                gapSize: 0.05
            });
            const negLine = new THREE.Line(negGeometry, negMaterial);
            negLine.computeLineDistances();

            this.axesGroup.add(posLine);
            this.axesGroup.add(negLine);
            this.objects.axes.push(posLine, negLine);

            // Add arrow heads
            this.createArrowHead(axis.dir.clone().multiplyScalar(axisLength), axis.dir, axis.color);
        });
    }

    /**
     * Create arrow heads for axes
     */
    createArrowHead(position, direction, color) {
        const coneGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
        const coneMaterial = new THREE.MeshBasicMaterial({ color });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        
        cone.position.copy(position);
        cone.setRotationFromQuaternion(
            new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction
            )
        );
        
        this.axesGroup.add(cone);
        this.objects.axes.push(cone);
    }

    /**
     * Create axis labels
     */
    createLabels() {
        const labelOffset = this.config.LENGTH + this.config.LABELS.OFFSET;
        const labelPositions = [
            { pos: new THREE.Vector3(labelOffset, 0, 0), text: 'b' },
            { pos: new THREE.Vector3(0, labelOffset, 0), text: 'c' },
            { pos: new THREE.Vector3(0, 0, labelOffset), text: 'a' }
        ];

        labelPositions.forEach(label => {
            const sprite = this.createTextSprite(
                label.text,
                label.pos,
                this.config.LABELS.SPRITE
            );
            this.labelsGroup.add(sprite);
            this.objects.labels.push(sprite);
        });
    }

    /**
     * Create text sprite for labels
     */
    createTextSprite(text, position, spriteConfig) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;

        // Background
        context.fillStyle = `rgba(${spriteConfig.backgroundColor.r * 255},
                                 ${spriteConfig.backgroundColor.g * 255},
                                 ${spriteConfig.backgroundColor.b * 255},
                                 ${spriteConfig.backgroundColor.a})`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Text
        context.font = `bold ${spriteConfig.fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Border
        context.strokeStyle = `rgba(${spriteConfig.borderColor.r * 255},
                                   ${spriteConfig.borderColor.g * 255},
                                   ${spriteConfig.borderColor.b * 255},
                                   ${spriteConfig.borderColor.a})`;
        context.lineWidth = spriteConfig.borderThickness;
        context.strokeText(text, canvas.width/2, canvas.height/2);
        
        // Fill
        context.fillStyle = 'white';
        context.fillText(text, canvas.width/2, canvas.height/2);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.copy(position);
        sprite.scale.set(this.config.LABELS.SIZE, this.config.LABELS.SIZE, 1);

        return sprite;
    }

    /**
     * Create coordinate grid
     */
    createGrid() {
        const gridSize = this.config.GRID_SIZE;
        const divisions = this.config.GRID_DIVISIONS;

        // XY grid
        const gridXY = new THREE.GridHelper(gridSize, divisions, 
            this.config.COLORS.B_AXIS, this.config.COLORS.C_AXIS);
        gridXY.rotation.x = Math.PI/2;
        this.gridGroup.add(gridXY);

        // XZ grid
        const gridXZ = new THREE.GridHelper(gridSize, divisions,
            this.config.COLORS.B_AXIS, this.config.COLORS.A_AXIS);
        this.gridGroup.add(gridXZ);

        // YZ grid
        const gridYZ = new THREE.GridHelper(gridSize, divisions,
            this.config.COLORS.C_AXIS, this.config.COLORS.A_AXIS);
        gridYZ.rotation.z = Math.PI/2;
        this.gridGroup.add(gridYZ);

        this.objects.grids.push(gridXY, gridXZ, gridYZ);

        // Set grid opacity
        this.objects.grids.forEach(grid => {
            grid.material.opacity = 0.1;
            grid.material.transparent = true;
        });
    }

    /**
     * Create origin point
     */
    createOrigin() {
        const originGeometry = new THREE.SphereGeometry(
            window.CONFIG.HELPERS.ORIGIN_POINT.SIZE,
            window.CONFIG.HELPERS.ORIGIN_POINT.SEGMENTS,
            window.CONFIG.HELPERS.ORIGIN_POINT.SEGMENTS
        );
        const originMaterial = new THREE.MeshBasicMaterial({ 
            color: window.CONFIG.HELPERS.ORIGIN_POINT.COLOR 
        });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        
        this.axesGroup.add(origin);
        this.objects.helpers.push(origin);
    }

    /**
     * Create unit markers on axes
     */
    createUnitMarkers() {
        const markerSize = 0.03;
        const axisLength = this.config.LENGTH;

        [-axisLength, -1, 1, axisLength].forEach(position => {
            ['x', 'y', 'z'].forEach(axis => {
                const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: this.config.COLORS[`${axis.toUpperCase()}_AXIS`]
                });
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);

                switch(axis) {
                    case 'x': marker.position.set(position, 0, 0); break;
                    case 'y': marker.position.set(0, position, 0); break;
                    case 'z': marker.position.set(0, 0, position); break;
                }

                this.axesGroup.add(marker);
                this.objects.helpers.push(marker);
            });
        });
    }

    /**
     * Update axis system visibility
     */
    setVisibility(visible) {
        this.axesGroup.visible = visible;
        this.labelsGroup.visible = visible;
        this.gridGroup.visible = visible;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Dispose geometries and materials
        Object.values(this.objects).flat().forEach(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
            }
        });

        // Remove from scene
        this.scene.remove(this.axesGroup);
        this.scene.remove(this.labelsGroup);
        this.scene.remove(this.gridGroup);
    }

    /**
     * Update axis system
     */
    update(camera) {
        // Update labels to face camera
        this.labelsGroup.children.forEach(sprite => {
            sprite.lookAt(camera.position);
        });
    }
}

// Make available globally
window.AxisSystem = AxisSystem;
