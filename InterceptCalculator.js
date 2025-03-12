// InterceptCalculator.js

class InterceptCalculator {
    constructor() {
        this.config = window.CONFIG;
        this._cache = new Map();
        this._boundingBox = new THREE.Box3();
    }

    /**
     * Calculate intercepts for given Miller indices
     * @param {number} h - First Miller index
     * @param {number} k - Second Miller index
     * @param {number} l - Third Miller index
     * @returns {Object} Intercept points and plane parameters
     */
    calculateIntercepts(h, k, l) {
        try {
            // Check cache first
            const cacheKey = this._getCacheKey(h, k, l);
            if (this._cache.has(cacheKey)) {
                return this._cache.get(cacheKey);
            }

            // Validate inputs
            if (!this.validateIndices(h, k, l)) {
                throw new Error('Invalid Miller indices');
            }

            // Calculate basic intercepts
            const interceptB = this._calculateSingleIntercept(h); // x-axis
            const interceptC = this._calculateSingleIntercept(k); // y-axis
            const interceptA = this._calculateSingleIntercept(l); // z-axis

            // Calculate intersection points
            const intersections = this._calculateIntersectionPoints(interceptB, interceptC, interceptA);

            // Calculate plane parameters
            const normal = this._calculatePlaneNormal(h, k, l);
            const center = this._calculatePlaneCenter(intersections);
            const size = this._calculatePlaneSize(intersections);

            const result = {
                intersections,
                normal,
                center,
                size,
                parameters: { h, k, l },
                intercepts: { a: interceptA, b: interceptB, c: interceptC }
            };

            // Cache the result
            this._cache.set(cacheKey, result);
            return result;

        } catch (error) {
            window.CONFIG_UTILS.debug(`Intercept calculation error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Calculate single intercept value with special case handling
     * @private
     */
    _calculateSingleIntercept(index) {
        if (index === 0) return Infinity;
        if (!Number.isFinite(index)) return 0;
        if (Math.abs(index) < 1e-10) return Infinity; // Handle very small numbers
        return 1 / index;
    }

    /**
     * Calculate intersection points with axes
     * @private
     */
    _calculateIntersectionPoints(b, c, a) {
        const points = {
            b: b === Infinity ? null : new THREE.Vector3(b, 0, 0),
            c: c === Infinity ? null : new THREE.Vector3(0, c, 0),
            a: a === Infinity ? null : new THREE.Vector3(0, 0, a)
        };

        // Validate points
        Object.entries(points).forEach(([key, point]) => {
            if (point && !point.isVector3) {
                window.CONFIG_UTILS.debug(`Invalid intersection point for ${key}-axis`, 'error');
                points[key] = null;
            }
        });

        return points;
    }

    /**
     * Calculate plane normal vector
     * @private
     */
    _calculatePlaneNormal(h, k, l) {
        const normal = new THREE.Vector3(h, k, l);
        if (normal.lengthSq() === 0) {
            throw new Error('Cannot calculate normal vector for zero vector');
        }
        return normal.normalize();
    }

    /**
     * Calculate plane center point
     * @private
     */
    _calculatePlaneCenter(intersections) {
        const points = Object.values(intersections).filter(p => p !== null);
        if (points.length === 0) {
            throw new Error('No valid intersection points found');
        }

        const center = new THREE.Vector3();
        points.forEach(point => center.add(point));
        return center.divideScalar(points.length);
    }

    /**
     * Calculate appropriate plane size
     * @private
     */
    _calculatePlaneSize(intersections) {
        const points = Object.values(intersections).filter(p => p !== null);
        if (points.length === 0) return this.config.PLANE.DEFAULT_SIZE;

        // Calculate bounding box
        this._boundingBox.makeEmpty();
        points.forEach(point => this._boundingBox.expandByPoint(point));
        
        const size = new THREE.Vector3();
        this._boundingBox.getSize(size);
        
        const maxDimension = Math.max(size.x, size.y, size.z);
        return Math.max(
            maxDimension * 1.5,
            this.config.PLANE.DEFAULT_SIZE
        );
    }

    /**
     * Get solution steps with KaTeX formatting
     */
    getSolutionSteps(h, k, l) {
        try {
            const intercepts = {
                a: this._calculateSingleIntercept(l),
                b: this._calculateSingleIntercept(h),
                c: this._calculateSingleIntercept(k)
            };

            return [
                {
                    step: 1,
                    description: 'Calculate intercepts',
                    math: `\\text{Intercepts: }\\frac{1}{${h}}a, \\frac{1}{${k}}b, \\frac{1}{${l}}c`,
                    values: intercepts
                },
                {
                    step: 2,
                    description: 'Miller indices representation',
                    math: `\\text{Miller indices: }(${h}, ${k}, ${l})`,
                    values: { h, k, l }
                }
            ];
        } catch (error) {
            window.CONFIG_UTILS.debug(`Solution steps generation error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Validate Miller indices
     */
    validateIndices(h, k, l) {
        try {
            // Check if all indices are zero
            if (h === 0 && k === 0 && l === 0) {
                throw new Error('All indices cannot be zero');
            }

            // Check for non-integer values
            if (!Number.isInteger(h) || !Number.isInteger(k) || !Number.isInteger(l)) {
                throw new Error('Indices must be integers');
            }

            // Check for overflow
            if ([h, k, l].some(val => Math.abs(val) > Number.MAX_SAFE_INTEGER)) {
                throw new Error('Index value too large');
            }

            // Check for NaN or Infinity
            if ([h, k, l].some(val => !Number.isFinite(val))) {
                throw new Error('Invalid index value');
            }

            // Validate range
            [h, k, l].forEach(value => window.CONFIG_UTILS.validateInput(value));

            return true;
        } catch (error) {
            window.CONFIG_UTILS.debug(`Index validation error: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Clear calculation cache
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Get cache key for given indices
     * @private
     */
    _getCacheKey(h, k, l) {
        return `${h},${k},${l}`;
    }
}

// Make calculator available globally
window.InterceptCalculator = InterceptCalculator;
