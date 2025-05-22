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
            const { system } = params; // system is correctly destructured here from input
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
        const { h, k, l, system } = params; // Destructure system here as well

        const interceptA = this._calculateSingleIntercept(h);
        const interceptB = this._calculateSingleIntercept(k);
        const interceptC = this._calculateSingleIntercept(l);

        const intersections = {
            x: interceptB === Infinity ? null : new THREE.Vector3(interceptB, 0, 0),
            y: interceptC === Infinity ? null : new THREE.Vector3(0, interceptC, 0),
            z: interceptA === Infinity ? null : new THREE.Vector3(0, 0, interceptA)
        };

        const normal = this._calculateCubicPlaneNormal(h, k, l);
        const center = this._calculatePlaneCenter(Object.values(intersections));
        const size = this._calculatePlaneSize(Object.values(intersections));

        return {
            intersections,
            normal,
            center,
            size,
            parameters: { h, k, l, system: system }, // Ensure system is included
            intercepts: { a: interceptA, b: interceptB, c: interceptC }
        };
    }

     _calculateCubicPlaneNormal(h_for_a, k_for_b, l_for_c) {
        const normal = new THREE.Vector3(k_for_b, l_for_c, h_for_a);
        if (normal.lengthSq() === 0) {
            window.CONFIG_UTILS.debug('Cannot calculate normal for zero vector (cubic)', 'warn');
            return new THREE.Vector3(0, 0, 1);
        }
        return normal.normalize();
    }


    // --- Hexagonal Calculations ---

    _calculateHexagonalIntercepts(params) {
         const { h, k, i, l, system } = params; // Destructure system here as well

         const interceptA1 = this._calculateSingleIntercept(h);
         const interceptA2 = this._calculateSingleIntercept(k);
         const interceptA3 = this._calculateSingleIntercept(i);
         const interceptC = this._calculateSingleIntercept(l);

         const intersections = {
             a1: interceptA1 === Infinity ? null : new THREE.Vector3(interceptA1, 0, 0),
             a2: interceptA2 === Infinity ? null : new THREE.Vector3(interceptA2 * -0.5, interceptA2 * this.SQRT3 / 2, 0),
             a3: interceptA3 === Infinity ? null : new THREE.Vector3(interceptA3 * -0.5, interceptA3 * -this.SQRT3 / 2, 0),
             c: interceptC === Infinity ? null : new THREE.Vector3(0, 0, interceptC)
         };

         const normal = this._calculateHexagonalPlaneNormal(h, k, l);
         const center = this._calculatePlaneCenter(Object.values(intersections));
         const size = this._calculatePlaneSize(Object.values(intersections));

         return {
            intersections,
            normal,
            center,
            size,
            parameters: { h, k, i, l, system: system }, // Ensure system is included
            intercepts: { a1: interceptA1, a2: interceptA2, a3: interceptA3, c: interceptC }
         };
    }

     _calculateHexagonalPlaneNormal(h, k, l) {
         const nx = h - k / 2;
         const ny = k * this.SQRT3 / 2;
         const nz = l;
         const normal = new THREE.Vector3(nx, ny, nz);
         if (normal.lengthSq() < 1e-10) {
             if (h === 0 && k === 0 && l !== 0) return new THREE.Vector3(0, 0, Math.sign(l));
             window.CONFIG_UTILS.debug('Cannot calculate normal for zero vector (hexagonal)', 'warn');
             return new THREE.Vector3(0, 0, 1);
         }
         return normal.normalize();
     }


    // --- Common Helper Methods ---
    _calculateSingleIntercept(index) {
        const numIndex = Number(index);
        if (!Number.isFinite(numIndex) || Math.abs(numIndex) < 1e-10) {
             return Infinity;
        }
        return 1 / numIndex;
    }

    _calculatePlaneCenter(intersectionPointsList) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length === 0) {
            window.CONFIG_UTILS.debug('No valid intersection points for center calculation', 'warn');
            return new THREE.Vector3(0, 0, 0);
        }
        const center = new THREE.Vector3();
        validPoints.forEach(point => center.add(point));
        center.divideScalar(validPoints.length);
        if (center.lengthSq() < 1e-10) {
            return new THREE.Vector3(0, 0, 0);
        }
        return center;
    }

    _calculatePlaneSize(intersectionPointsList) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length <= 1) {
             return this.config.PLANE.DEFAULT_SIZE * 1.5;
        }
        this._boundingBox.makeEmpty();
        this._boundingBox.expandByPoint(new THREE.Vector3(0, 0, 0));
        validPoints.forEach(point => this._boundingBox.expandByPoint(point));
        const sizeVec = new THREE.Vector3();
        this._boundingBox.getSize(sizeVec);
        const maxDimension = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const calculatedSize = Math.max(maxDimension, 0.5) * 1.5;
        return Math.min(calculatedSize, this.config.PLANE.MAX_SIZE);
    }

    // --- Validation ---
    validateIndices(params) {
        const { system } = params;
        try {
            if (system === 'cubic') {
                const { h, k, l } = params;
                const indices = [h, k, l].map(Number); // Convert to number for validation
                if (indices.every(val => val === 0)) throw new Error('All indices cannot be zero');
                if (indices.some(val => !Number.isInteger(val))) throw new Error('Cubic indices must be integers');
                if (indices.some(val => !Number.isFinite(val))) throw new Error('Invalid cubic index value (NaN or Infinity)');
            } else if (system === 'hexagonal') {
                const { h, k, i, l } = params;
                const hkil_indices = [h, k, i, l].map(Number); // Convert to number
                const hki_indices = [h, k, i].map(Number);

                if (hkil_indices.every(val => val === 0)) throw new Error('All indices cannot be zero');
                if (hkil_indices.some(val => !Number.isInteger(val))) throw new Error('Hexagonal indices must be integers');
                if (hkil_indices.some(val => !Number.isFinite(val))) throw new Error('Invalid hexagonal index value (NaN or Infinity)');
                if (hki_indices.reduce((sum, val) => sum + val, 0) !== 0) { // Sum of h, k, i must be 0
                    throw new Error('Hexagonal indices must satisfy h + k + i = 0.');
                }
            } else {
                throw new Error(`Unsupported crystal system for validation: ${system}`);
            }
            return true;
        } catch (error) {
            window.CONFIG_UTILS.debug(`Index validation error: ${error.message}`, 'error');
            throw error;
        }
    }

    // --- Solution Steps ---
    getSolutionSteps(params_input) { // Renamed to avoid conflict with internal 'params'
        const { system } = params_input;
        try {
             let indicesDisplay;
             let interceptFormula;
             let calculatedInterceptsData = {};

             // Use the input params for display and initial calculation values
             const h_in = params_input.h;
             const k_in = params_input.k;
             const l_in = params_input.l;
             const i_in = params_input.i; // Will be undefined for cubic

             if (system === 'cubic') {
                 const interceptA_val = this._calculateSingleIntercept(h_in);
                 const interceptB_val = this._calculateSingleIntercept(k_in);
                 const interceptC_val = this._calculateSingleIntercept(l_in);
                 indicesDisplay = `(${h_in}, ${k_in}, ${l_in})`;
                 interceptFormula = `\\text{Intercepts (Weiss Parameters): } \\\\
                                     \\text{On a-axis (visual Z, Miller h): } \\frac{1}{${h_in}} = ${UTILS.formatValue(interceptA_val)} \\\\
                                     \\text{On b-axis (visual X, Miller k): } \\frac{1}{${k_in}} = ${UTILS.formatValue(interceptB_val)} \\\\
                                     \\text{On c-axis (visual Y, Miller l): } \\frac{1}{${l_in}} = ${UTILS.formatValue(interceptC_val)}`;
                calculatedInterceptsData = {
                    'Intercept on a-axis (visual Z, Miller h)': UTILS.formatValue(interceptA_val),
                    'Intercept on b-axis (visual X, Miller k)': UTILS.formatValue(interceptB_val),
                    'Intercept on c-axis (visual Y, Miller l)': UTILS.formatValue(interceptC_val)
                };
             } else if (system === 'hexagonal') {
                 const interceptA1_val = this._calculateSingleIntercept(h_in);
                 const interceptA2_val = this._calculateSingleIntercept(k_in);
                 const interceptA3_val = this._calculateSingleIntercept(i_in);
                 const interceptC_val = this._calculateSingleIntercept(l_in);
                 indicesDisplay = `(${h_in}, ${k_in}, ${i_in}, ${l_in})`;
                 interceptFormula = `\\text{Intercepts (Weiss Parameters): } \\\\
                                     \\text{On } a_1\\text{-axis (Miller h): } \\frac{1}{${h_in}} = ${UTILS.formatValue(interceptA1_val)} \\\\
                                     \\text{On } a_2\\text{-axis (Miller k): } \\frac{1}{${k_in}} = ${UTILS.formatValue(interceptA2_val)} \\\\
                                     \\text{On } a_3\\text{-axis (Miller i): } \\frac{1}{${i_in}} = ${UTILS.formatValue(interceptA3_val)} \\\\
                                     \\text{On c-axis (Miller l): } \\frac{1}{${l_in}} = ${UTILS.formatValue(interceptC_val)}`;
                calculatedInterceptsData = {
                    'Intercept on a1-axis (Miller h)': UTILS.formatValue(interceptA1_val),
                    'Intercept on a2-axis (Miller k)': UTILS.formatValue(interceptA2_val),
                    'Intercept on a3-axis (Miller i)': UTILS.formatValue(interceptA3_val),
                    'Intercept on c-axis (Miller l)': UTILS.formatValue(interceptC_val)
                };
             } else {
                 return [{ step: 1, description: 'Unsupported system', math: '', values: {} }];
             }

            return [
                {
                    step: 1,
                    description: `Miller Indices (${system === 'hexagonal' ? 'Miller-Bravais' : 'Miller'}) input:`,
                    math: `(${system === 'hexagonal' ? 'hkil' : 'hkl'}) = ${indicesDisplay}`,
                    values: params_input // Show original input params
                },
                {
                    step: 2,
                    description: 'Calculate axis intercepts (reciprocals of Miller indices define the Weiss Parameters):',
                    math: interceptFormula,
                    values: calculatedInterceptsData
                }
            ];
        } catch (error) {
            window.CONFIG_UTILS.debug(`Solution steps generation error: ${error.message}`, 'error');
            return [{ step: 1, description: 'Error generating solution steps', math: error.message, values: {} }];
        }
    }

    // --- Cache Management ---
    clearCache() {
        this._cache.clear();
        window.CONFIG_UTILS.debug('Intercept calculator cache cleared', 'info');
    }
    _getCacheKey(params) {
         const { system } = params;
         if (system === 'cubic') {
             return `cubic-${params.h},${params.k},${params.l}`;
         } else if (system === 'hexagonal') {
             return `hex-${params.h},${params.k},${params.i},${params.l}`;
         }
         return `unknown-${JSON.stringify(params)}`;
    }
}

window.InterceptCalculator = InterceptCalculator;
