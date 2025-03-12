// utils.js

const UTILS = {
    /**
     * Format Miller indices for display
     * @param {number} h - First Miller index
     * @param {number} k - Second Miller index
     * @param {number} l - Third Miller index
     * @returns {string} Formatted indices
     */
    formatMillerIndices: function(h, k, l) {
        return `(${h}, ${k}, ${l})`;
    },

    /**
     * Render mathematical expressions using KaTeX
     * @param {string} expression - Math expression
     * @param {HTMLElement} element - Target element
     */
    renderMath: function(expression, element) {
        try {
            katex.render(expression, element, {
                throwOnError: false,
                displayMode: true
            });
        } catch (error) {
            window.CONFIG_UTILS.debug('Math rendering error: ' + error.message, 'error');
            element.textContent = expression;
        }
    },

    /**
     * Generate solution steps HTML
     * @param {Array} steps - Solution steps
     * @param {HTMLElement} container - Container element
     */
    renderSolutionSteps: function(steps, container) {
        try {
            container.innerHTML = '';
            steps.forEach(step => {
                const stepElement = document.createElement('div');
                stepElement.className = 'step';

                const description = document.createElement('p');
                description.textContent = step.description;
                stepElement.appendChild(description);

                const mathElement = document.createElement('div');
                mathElement.className = 'math';
                this.renderMath(step.math, mathElement);
                stepElement.appendChild(mathElement);

                if (step.values) {
                    const values = document.createElement('div');
                    values.className = 'values';
                    for (const [key, value] of Object.entries(step.values)) {
                        const valueText = document.createElement('span');
                        valueText.textContent = `${key} = ${this.formatValue(value)}`;
                        values.appendChild(valueText);
                    }
                    stepElement.appendChild(values);
                }

                container.appendChild(stepElement);
            });
        } catch (error) {
            window.CONFIG_UTILS.debug('Solution rendering error: ' + error.message, 'error');
            container.innerHTML = '<p class="error">Error rendering solution steps</p>';
        }
    },

    /**
     * Format numeric values for display
     * @param {number} value - Numeric value
     * @returns {string} Formatted value
     */
    formatValue: function(value) {
        if (!Number.isFinite(value)) return '∞';
        if (Math.abs(value) < 1e-10) return '0';
        if (Math.abs(value) > 1e5) return value.toExponential(2);
        return value.toFixed(3);
    },

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} type - Error type ('error', 'warning', 'info')
     */
    showMessage: function(message, type = 'error') {
        const errorElement = document.getElementById('error');
        if (!errorElement) return;

        errorElement.textContent = message;
        errorElement.className = `error-message ${type}`;
        errorElement.style.display = 'block';

        // Auto-hide after duration from config
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, window.CONFIG.FEEDBACK[type.toUpperCase()].duration);
    },

    /**
     * Validate input field
     * @param {HTMLInputElement} input - Input element
     * @returns {boolean} Validation result
     */
    validateInput: function(input) {
        const value = parseInt(input.value);
        const validationElement = document.getElementById(`${input.id}-validation`);

        try {
            if (input.value.trim() === '') {
                throw new Error('This field is required');
            }
            if (!Number.isInteger(value)) {
                throw new Error('Must be an integer');
            }
            if (value < window.CONFIG.VALIDATION.MIN_VALUE || 
                value > window.CONFIG.VALIDATION.MAX_VALUE) {
                throw new Error(`Must be between ${window.CONFIG.VALIDATION.MIN_VALUE} and ${window.CONFIG.VALIDATION.MAX_VALUE}`);
            }

            input.classList.remove('invalid');
            input.classList.add('valid');
            if (validationElement) {
                validationElement.textContent = '';
            }
            return true;

        } catch (error) {
            input.classList.remove('valid');
            input.classList.add('invalid');
            if (validationElement) {
                validationElement.textContent = error.message;
            }
            return false;
        }
    },

    /**
     * Handle input key press
     * @param {Event} event - Keyboard event
     * @returns {boolean} Whether to allow the key press
     */
    handleKeyPress: function(event) {
        return window.CONFIG_UTILS.validateKeyInput(event);
    },

    /**
     * Show loading state
     * @param {boolean} isLoading - Loading state
     */
    setLoading: function(isLoading) {
        const loadingOverlay = document.getElementById('loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        }
    },

    /**
     * Reset all input fields
     */
    resetInputs: function() {
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('valid', 'invalid');
            const validationElement = document.getElementById(`${input.id}-validation`);
            if (validationElement) {
                validationElement.textContent = '';
            }
        });

        // Clear error message
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        // Clear solution steps
        const stepsContainer = document.getElementById('steps');
        if (stepsContainer) {
            stepsContainer.innerHTML = '';
        }
    },

    /**
     * Initialize event listeners
     */
    initEventListeners: function() {
        // Input validation
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('keydown', this.handleKeyPress);
        });

        // Reset button
        const resetButton = document.querySelector('.secondary-btn');
        if (resetButton) {
            resetButton.addEventListener('click', this.resetInputs.bind(this));
        }
    },

    /**
     * Document ready handler
     * @param {Function} callback - Function to execute when document is ready
     */
    onReady: function(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
};

// Make utils available globally
window.UTILS = UTILS;

// Initialize utils when document is ready
UTILS.onReady(() => {
    UTILS.initEventListeners();
});
