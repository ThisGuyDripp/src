// InterceptCalculator.js

class InterceptCalculator {
    constructor() {
        this.config = window.CONFIG;
        this._cache = new Map();
        this._boundingBox = new THREE.Box3(); // Reusable bounding box

        // Constants for hexagonal calculations
        this.SQRT3 = Math.sqrt(3);
    }

    /**
     * Calculate intercepts for given Miller indices and crystal system
     * @param {Object} params - Calculation parameters ({h, k, l, system} or {h, k, i, l, system})
     * @returns {Object} Intercept points and plane parameters
     */
    calculateIntercepts(params) {
        try {
            const { system } = params;
            const cacheKey = this._getCacheKey(params);
            if (this._cache.has(cacheKey)) {
                return this._cache.get(cacheKey);
            }

            if (!this.validateIndices(params)) {
                throw new Error('Invalid Miller indices for the selected system.');
            }

            let result;
            if (system === 'cubic') {
                result = this._calculateCubicIntercepts(params);
            } else if (system === 'hexagonal') {
                result = this._calculateHexagonalIntercepts(params);
            } else {
                throw new Error(`Unsupported crystal system: ${system}`);
            }

            this._cache.set(cacheKey, result);
            return result;

        } catch (error) {
            window.CONFIG_UTILS.debug(`Intercept calculation error: ${error.message}`, 'error');
            throw error; // Re-throw for main.js to catch
        }
    }

    // --- Cubic Calculations ---

    _calculateCubicIntercepts(params) {
        const { h, k, l } = params;

        // Note: Mapping in AxisSystem is b->x, c->y, a->z
        // So intercepts are calculated based on (h, k, l) corresponding to (x, y, z) axes
        const interceptX = this._calculateSingleIntercept(h); // Intercept on b-axis (x)
        const interceptY = this._calculateSingleIntercept(k); // Intercept on c-axis (y)
        const interceptZ = this._calculateSingleIntercept(l); // Intercept on a-axis (z)

        const intersections = {
            x: interceptX === Infinity ? null : new THREE.Vector3(interceptX, 0, 0),
            y: interceptY === Infinity ? null : new THREE.Vector3(0, interceptY, 0),
            z: interceptZ === Infinity ? null : new THREE.Vector3(0, 0, interceptZ)
        };

        const normal = this._calculateCubicPlaneNormal(h, k, l);
        const center = this._calculatePlaneCenter(Object.values(intersections));
        const size = this._calculatePlaneSize(Object.values(intersections));

        return {
            intersections,
            normal,
            center,
            size,
            parameters: { h, k, l },
            intercepts: { x: interceptX, y: interceptY, z: interceptZ } // Store intercepts by axis name
        };
    }

     _calculateCubicPlaneNormal(h, k, l) {
        // Normal vector corresponds directly to (h, k, l) in the (x, y, z) space
        // given the axis setup (b->x, c->y, a->z)
        const normal = new THREE.Vector3(h, k, l);
        if (normal.lengthSq() === 0) {
            // This case should be caught by validateIndices, but safeguard here
            window.CONFIG_UTILS.debug('Cannot calculate normal for zero vector (cubic)', 'warn');
            return new THREE.Vector3(0, 0, 1); // Default normal
        }
        return normal.normalize();
    }


    // --- Hexagonal Calculations ---

    _calculateHexagonalIntercepts(params) {
         const { h, k, i, l } = params; // i is available

         // Intercepts related to a1, a2, a3, c axes
         const interceptA1 = this._calculateSingleIntercept(h);
         const interceptA2 = this._calculateSingleIntercept(k);
         const interceptA3 = this._calculateSingleIntercept(i);
         const interceptC = this._calculateSingleIntercept(l); // Intercept on c-axis (z)

         // Calculate intersection points in 3D space (assuming standard hexagonal axis setup)
         // a1 along +x
         // a2 at 120 deg in xy plane
         // a3 at 240 deg in xy plane (-120 deg)
         // c along +z
         const intersections = {
             a1: interceptA1 === Infinity ? null : new THREE.Vector3(interceptA1, 0, 0),
             a2: interceptA2 === Infinity ? null : new THREE.Vector3(interceptA2 * -0.5, interceptA2 * this.SQRT3 / 2, 0), // cos(120), sin(120)
             a3: interceptA3 === Infinity ? null : new THREE.Vector3(interceptA3 * -0.5, interceptA3 * -this.SQRT3 / 2, 0), // cos(240), sin(240)
             c: interceptC === Infinity ? null : new THREE.Vector3(0, 0, interceptC)
         };

         const normal = this._calculateHexagonalPlaneNormal(h, k, l); // Use h, k, l for normal
         const center = this._calculatePlaneCenter(Object.values(intersections));
         const size = this._calculatePlaneSize(Object.values(intersections));

         return {
            intersections, // Contains points for a1, a2, a3, c
            normal,
            center,
            size,
            parameters: { h, k, i, l },
            // Store intercepts by axis name (a1, a2, a3, c)
            intercepts: { a1: interceptA1, a2: interceptA2, a3: interceptA3, c: interceptC }
         };
    }

     _calculateHexagonalPlaneNormal(h, k, l) {
         // Normal calculation based on reciprocal lattice vectors.
         // N proportional to h*b1 + k*b2 + l*b3
         // In Cartesian coordinates (a1 along x, c along z):
         // Nx ~ h - k/2
         // Ny ~ k * sqrt(3)/2
         // Nz ~ l * (some factor depending on c/a ratio)
         // For visualization without specific c/a, we can use a simplified normal.
         // Let's assume a geometric normal suitable for visualization, potentially
         // omitting the c/a scaling factor for Nz initially.
         // Ref: https://math.stackexchange.com/questions/117969/finding-the-normal-vector-to-a-plane-given-by-miller-indices-for-a-hexagonal-sy

         const nx = h - k / 2;
         const ny = k * this.SQRT3 / 2;
         const nz = l; // Simplified: Assumes effective c/a ratio leads to this form for normal direction.
                      // For accurate crystallography, nz should be proportional to l * (a/c)^2 * (3/2) or similar.

         const normal = new THREE.Vector3(nx, ny, nz);
         if (normal.lengthSq() < 1e-10) {
             // Handle cases like (000l) which should be normal to z-axis
             if (h === 0 && k === 0 && l !== 0) return new THREE.Vector3(0, 0, Math.sign(l));
             // Other zero cases should be caught by validation
             window.CONFIG_UTILS.debug('Cannot calculate normal for zero vector (hexagonal)', 'warn');
             return new THREE.Vector3(0, 0, 1); // Default fallback
         }
         return normal.normalize();
     }


    // --- Common Helper Methods ---

    /**
     * Calculate single intercept value (reciprocal)
     * @private
     */
    _calculateSingleIntercept(index) {
        // Ensure index is treated as a number
        const numIndex = Number(index);
        if (!Number.isFinite(numIndex) || Math.abs(numIndex) < 1e-10) {
             return Infinity; // Handle 0, NaN, non-finite numbers
        }
        return 1 / numIndex;
    }

    /**
     * Calculate plane center point from valid intersection points
     * @private
     */
    _calculatePlaneCenter(intersectionPointsList) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length === 0) {
            // Should not happen if validation passes, but good safeguard
            window.CONFIG_UTILS.debug('No valid intersection points for center calculation', 'warn');
            return new THREE.Vector3(0, 0, 0); // Default center
        }

        const center = new THREE.Vector3();
        validPoints.forEach(point => center.add(point));
        center.divideScalar(validPoints.length);

        // If center is extremely close to origin, snap it to origin
        if (center.lengthSq() < 1e-10) {
            return new THREE.Vector3(0, 0, 0);
        }
        return center;
    }

    /**
     * Calculate appropriate plane size based on bounding box of valid intersection points
     * @private
     */
    _calculatePlaneSize(intersectionPointsList) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length <= 1) { // Need at least 2 points to define a size
            // If only one intersection point (e.g., (100)), size needs context.
            // If zero points (plane through origin like (000)?), also need context.
             // Fallback to default size for now.
             return this.config.PLANE.DEFAULT_SIZE * 1.5; // Use a slightly larger default
        }

        this._boundingBox.makeEmpty();
        // Include origin to ensure plane size is reasonable if points are close to origin
        this._boundingBox.expandByPoint(new THREE.Vector3(0, 0, 0));
        validPoints.forEach(point => this._boundingBox.expandByPoint(point));

        const sizeVec = new THREE.Vector3();
        this._boundingBox.getSize(sizeVec);

        // Use the diagonal of the bounding box projected onto the plane,
        // or simply use the max dimension as a heuristic. Max dimension is simpler.
        const maxDimension = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);

        // Ensure a minimum size and apply a scaling factor
        const calculatedSize = Math.max(maxDimension, 0.5) * 1.5; // Added minimum dimension check

        // Clamp to configured max size if needed
        return Math.min(calculatedSize, this.config.PLANE.MAX_SIZE);
    }


    // --- Validation ---

    /**
     * Validate Miller indices based on crystal system
     * @param {Object} params - Calculation parameters
     * @returns {boolean}
     */
    validateIndices(params) {
        const { system } = params;
        try {
            if (system === 'cubic') {
                const { h, k, l } = params;
                const indices = [h, k, l];
                if (indices.every(val => val === 0)) throw new Error('All indices cannot be zero');
                if (indices.some(val => !Number.isInteger(val))) throw new Error('Cubic indices must be integers');
                if (indices.some(val => !Number.isFinite(val))) throw new Error('Invalid index value (NaN or Infinity)');
                // Add range checks if needed from config (currently done in UI validation)

            } else if (system === 'hexagonal') {
                const { h, k, i, l } = params;
                const indices = [h, k, i, l];
                 if (indices.every(val => val === 0)) throw new Error('All indices cannot be zero');
                if (indices.some(val => !Number.isInteger(val))) throw new Error('Hexagonal indices must be integers');
                if (indices.some(val => !Number.isFinite(val))) throw new Error('Invalid index value (NaN or Infinity)');
                if (h + k + i !== 0) throw new Error('Hexagonal indices must satisfy h + k + i = 0');
                 // Add range checks if needed

            } else {
                throw new Error(`Unsupported crystal system for validation: ${system}`);
            }
            return true;
        } catch (error) {
            window.CONFIG_UTILS.debug(`Index validation error: ${error.message}`, 'error');
            // Optionally, re-throw or return false depending on desired handling in caller
            // Rethrowing seems appropriate here so calculateIntercepts catches it.
            throw error;
        }
    }


    // --- Solution Steps ---

    /**
     * Get solution steps with KaTeX formatting based on system
     * @param {Object} params - Calculation parameters
     * @returns {Array} Steps array
     */
    getSolutionSteps(params) {
        const { system } = params;
        try {
             // Recalculate results to ensure consistency, or get from cache if needed
             // For simplicity, recalculate intercepts here based on params
             let interceptsData;
             let indicesDisplay;
             let interceptFormula;

             if (system === 'cubic') {
                 const { h, k, l } = params;
                 const interceptX = this._calculateSingleIntercept(h);
                 const interceptY = this._calculateSingleIntercept(k);
                 const interceptZ = this._calculateSingleIntercept(l);
                 interceptsData = { x: interceptX, y: interceptY, z: interceptZ };
                 indicesDisplay = `(${h}, ${k}, ${l})`;
                 // Using axis names b, c, a as per AxisSystem
                 interceptFormula = `\\text{Intercepts: } \\frac{1}{${h}} \\text{ on b (x)}, \\quad \\frac{1}{${k}} \\text{ on c (y)}, \\quad \\frac{1}{${l}} \\text{ on a (z)}`;
             } else if (system === 'hexagonal') {
                 const { h, k, i, l } = params;
                 const interceptA1 = this._calculateSingleIntercept(h);
                 const interceptA2 = this._calculateSingleIntercept(k);
                 const interceptA3 = this._calculateSingleIntercept(i);
                 const interceptC = this._calculateSingleIntercept(l);
                 interceptsData = { a1: interceptA1, a2: interceptA2, a3: interceptA3, c: interceptC };
                 indicesDisplay = `(${h}, ${k}, ${i}, ${l})`;
                 interceptFormula = `\\text{Intercepts: } \\frac{1}{${h}} \\text{ on } a_1, \\quad \\frac{1}{${k}} \\text{ on } a_2, \\quad \\frac{1}{${i}} \\text{ on } a_3, \\quad \\frac{1}{${l}} \\text{ on } c`;
             } else {
                 return [{ step: 1, description: 'Unsupported system', math: '', values: {} }];
             }

            return [
                {
                    step: 1,
                    description: `Miller indices (${system})`,
                    math: `\\text{Indices: } ${indicesDisplay}`,
                    values: params // Show input params
                },
                {
                    step: 2,
                    description: 'Calculate axis intercepts (reciprocals)',
                    math: interceptFormula,
                    values: interceptsData // Show calculated intercepts
                }
                 // Add more steps if needed (e.g., plane normal calculation)
            ];
        } catch (error) {
            window.CONFIG_UTILS.debug(`Solution steps generation error: ${error.message}`, 'error');
            // Return error step or throw
            return [{ step: 1, description: 'Error generating steps', math: error.message, values: {} }];
        }
    }


    // --- Cache Management ---

    /**
     * Clear calculation cache
     */
    clearCache() {
        this._cache.clear();
        window.CONFIG_UTILS.debug('Intercept calculator cache cleared', 'info');
    }

    /**
     * Get cache key for given parameters
     * @private
     */
    _getCacheKey(params) {
         const { system } = params;
         if (system === 'cubic') {
             return `cubic-${params.h},${params.k},${params.l}`;
         } else if (system === 'hexagonal') {
             return `hex-${params.h},${params.k},${params.i},${params.l}`;
         }
         return `unknown-${JSON.stringify(params)}`; // Fallback
    }
}

// Make calculator available globally
window.InterceptCalculator = InterceptCalculator;