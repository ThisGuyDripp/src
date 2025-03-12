// main.js

class MillerIndicesApp {
    constructor() {
        this.visualizer = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        try {
            // Initialize visualizer
            this.visualizer = new MillerVisualizer('scene-container');
            
            // Bind event handlers
            this.bindEvents();
            
            // Remove loading indicator
            window.UTILS.setLoading(false);
        } catch (error) {
            window.CONFIG_UTILS.debug('App initialization error: ' + error.message, 'error');
            window.UTILS.showMessage('Failed to initialize application', 'error');
        }
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Generate button
        document.querySelector('.primary-btn').addEventListener('click', 
            this.handleGenerate.bind(this));

        // Reset button
        document.querySelector('.secondary-btn').addEventListener('click', 
            this.handleReset.bind(this));

        // Input validation
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => window.UTILS.validateInput(input));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleGenerate();
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Handle generate button click
     */
    handleGenerate() {
        try {
            // Show loading state
            window.UTILS.setLoading(true);

            // Get input values
            const h = parseInt(document.getElementById('h').value);
            const k = parseInt(document.getElementById('k').value);
            const l = parseInt(document.getElementById('l').value);

            // Validate inputs
            if (!this.validateAllInputs()) {
                throw new Error('Please correct the input errors');
            }

            // Calculate and visualize
            const calculator = new InterceptCalculator();
            if (!calculator.validateIndices(h, k, l)) {
                throw new Error('Invalid Miller indices');
            }

            // Visualize the plane
            const success = this.visualizer.visualize(h, k, l);
            if (!success) {
                throw new Error('Failed to visualize plane');
            }

            // Generate and display solution steps
            const steps = calculator.getSolutionSteps(h, k, l);
            window.UTILS.renderSolutionSteps(steps, document.getElementById('steps'));

            // Show success message
            window.UTILS.showMessage('Visualization complete', 'success');

        } catch (error) {
            window.CONFIG_UTILS.debug('Generation error: ' + error.message, 'error');
            window.UTILS.showMessage(error.message, 'error');
        } finally {
            window.UTILS.setLoading(false);
        }
    }

    /**
     * Handle reset button click
     */
    handleReset() {
        try {
            // Reset inputs
            window.UTILS.resetInputs();

            // Reset visualization
            if (this.visualizer) {
                this.visualizer.clearPlane();
                this.visualizer.resetCamera();
            }

            // Clear solution steps
            const stepsContainer = document.getElementById('steps');
            if (stepsContainer) {
                stepsContainer.innerHTML = '';
            }

            window.UTILS.showMessage('Reset complete', 'info');
        } catch (error) {
            window.CONFIG_UTILS.debug('Reset error: ' + error.message, 'error');
            window.UTILS.showMessage('Failed to reset', 'error');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.visualizer) {
            this.visualizer.handleResize();
        }
    }

    /**
     * Validate all input fields
     * @returns {boolean} Whether all inputs are valid
     */
    validateAllInputs() {
        const inputs = ['h', 'k', 'l'].map(id => document.getElementById(id));
        return inputs.every(input => window.UTILS.validateInput(input));
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.visualizer) {
            this.visualizer.dispose();
            this.visualizer = null;
        }
    }
}

// Initialize app when document is ready
window.UTILS.onReady(() => {
    try {
        window.app = new MillerIndicesApp();
    } catch (error) {
        window.CONFIG_UTILS.debug('App creation error: ' + error.message, 'error');
        window.UTILS.showMessage('Failed to start application', 'error');
    }
});

// Global handlers for buttons (used in HTML)
window.handleGenerate = function() {
    if (window.app) {
        window.app.handleGenerate();
    }
};

window.handleReset = function() {
    if (window.app) {
        window.app.handleReset();
    }
};
