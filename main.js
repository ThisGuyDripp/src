// main.js

class MillerIndicesApp {
    constructor() {
        this.visualizer = null;
        // Get references to UI elements - Check immediately if they exist
        this.crystalSystemSelect = document.getElementById('crystal-system');
        this.hInput = document.getElementById('h');
        this.kInput = document.getElementById('k');
        this.iInput = document.getElementById('i');
        this.lInput = document.getElementById('l');
        // Check iInput before calling closest
        this.iInputField = this.iInput ? this.iInput.closest('.input-field') : null;
        this.generateButton = document.querySelector('.primary-btn');
        this.resetButton = document.querySelector('.secondary-btn');
        // Get reference here
        this.stepsContainer = document.getElementById('steps');

        // Validate essential elements are found
        if (!this.crystalSystemSelect || !this.hInput || !this.kInput || !this.iInput || !this.lInput || !this.iInputField || !this.generateButton || !this.resetButton || !this.stepsContainer) {
            console.error("MillerIndicesApp Error: One or more required UI elements not found in the DOM.");
            // Optionally throw an error to halt execution clearly
            throw new Error("Missing required UI elements. Check HTML IDs and structure.");
        }

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        try {
            // Initialize visualizer
            this.visualizer = new MillerVisualizer('scene-container');

            // Bind event handlers (elements are confirmed to exist by constructor check)
            this.bindEvents();

            // Initial UI setup based on default selection (Cubic)
            this.updateUIForCrystalSystem();

            // Remove loading indicator
            window.UTILS.setLoading(false);
        } catch (error) {
            // Log error caught during initialization (e.g., from MillerVisualizer)
            console.error("App Initialization Error:", error);
            window.CONFIG_UTILS.debug('App initialization error: ' + error.message, 'error');
            window.UTILS.showMessage(`Failed to initialize application: ${error.message}`, 'error');
            window.UTILS.setLoading(false); // Ensure loading is hidden on error
        }
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Elements are checked in constructor, safe to add listeners

        // Generate button
        this.generateButton.addEventListener('click', this.handleGenerate.bind(this));

        // Reset button
        this.resetButton.addEventListener('click', this.handleReset.bind(this));

        // Crystal system change
        this.crystalSystemSelect.addEventListener('change', this.updateUIForCrystalSystem.bind(this));

        // Input validation and 'i' calculation for h and k
        this.hInput.addEventListener('input', () => {
            window.UTILS.validateInput(this.hInput);
            this.updateIIndex();
        });
        this.kInput.addEventListener('input', () => {
            window.UTILS.validateInput(this.kInput);
            this.updateIIndex();
        });
        // Basic validation for l
        this.lInput.addEventListener('input', () => window.UTILS.validateInput(this.lInput));


        // Enter key listener for all relevant inputs
        [this.hInput, this.kInput, this.lInput].forEach(input => {
             input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // Prevent default form submission if inputs are inside a form
                    e.preventDefault();
                    this.handleGenerate();
                }
            });
        });


        // Handle window resize - Consider debouncing/throttling if needed
        // Store bound reference if manual removal in dispose is needed
        this.boundResizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
    }

    /**
     * Update visibility of 'i' index based on selected system
     */
    updateUIForCrystalSystem() {
        const selectedSystem = this.crystalSystemSelect.value;
        // *** FIX STARTS HERE ***
        // Get the validation element reference *outside* the if/else if it's needed in both
        // Or get it specifically where needed. Let's get it specifically where needed.

        if (selectedSystem === 'hexagonal') {
            this.iInputField.style.display = 'flex'; // Show 'i' field container
            this.updateIIndex(); // Calculate 'i' immediately
        } else { // cubic or other
            this.iInputField.style.display = 'none'; // Hide 'i' field container
            this.iInput.value = ''; // Clear 'i' value
            this.iInput.classList.remove('valid', 'invalid');
            // Get the specific validation element for 'i' here before trying to clear it
            const iValidationElement = document.getElementById('i-validation');
             if (iValidationElement) {
                 iValidationElement.textContent = ''; // Clear validation message
             }
        }
        // *** FIX ENDS HERE ***
    }

    /**
     * Calculate and update the 'i' index field if hexagonal system is selected
     */
    updateIIndex() {
        // Only proceed if hexagonal system is selected
        if (this.crystalSystemSelect.value !== 'hexagonal') {
            return;
        }

        const hVal = parseInt(this.hInput.value);
        const kVal = parseInt(this.kInput.value);
        const iValidationElement = document.getElementById('i-validation');

        if (Number.isInteger(hVal) && Number.isInteger(kVal)) {
            const iVal = -(hVal + kVal);
            this.iInput.value = iVal;
            // Basic validation for the calculated 'i' range
             if (iValidationElement) {
                 if (iVal < window.CONFIG.VALIDATION.MIN_VALUE || iVal > window.CONFIG.VALIDATION.MAX_VALUE) {
                     iValidationElement.textContent = `Calc. 'i' (${iVal}) out of range`;
                     this.iInput.classList.add('invalid');
                     this.iInput.classList.remove('valid'); // Ensure valid class is removed
                 } else {
                    iValidationElement.textContent = '';
                     this.iInput.classList.remove('invalid');
                     // Optionally add 'valid' class, though maybe not needed for disabled field
                     // this.iInput.classList.add('valid');
                 }
             }

        } else {
            // Clear 'i' if h or k are not valid integers
            this.iInput.value = '';
            this.iInput.classList.remove('valid', 'invalid');
             if (iValidationElement) {
                 iValidationElement.textContent = ''; // Clear validation message
             }
        }
    }


    /**
     * Handle generate button click
     */
    handleGenerate() {
        try {
            window.UTILS.setLoading(true);

            const h = parseInt(this.hInput.value);
            const k = parseInt(this.kInput.value);
            const l = parseInt(this.lInput.value);
            const crystalSystem = this.crystalSystemSelect.value;

            // Validate user-entered fields first
            if (!this.validateAllInputs()) {
                throw new Error('Please correct the errors in the input fields.');
            }

            let i = null;
            let calculationParams;

            if (crystalSystem === 'hexagonal') {
                i = parseInt(this.iInput.value); // Read calculated 'i'

                // Check the h+k+i = 0 rule (redundant with calculation but good sanity check)
                 if (!Number.isInteger(h) || !Number.isInteger(k) || !Number.isInteger(i) || (h + k + i !== 0)) {
                    let errorMsg = `Hexagonal indices error: h+k+i = ${h}+${k}+${i} = ${h+k+i}, but must be 0.`;
                     if (!Number.isInteger(h) || !Number.isInteger(k)) {
                        errorMsg = 'Hexagonal indices error: h and k must be valid integers.';
                     }
                    throw new Error(errorMsg);
                 }
                 // Check if calculated 'i' is within allowed range (optional blocking)
                 if (i < window.CONFIG.VALIDATION.MIN_VALUE || i > window.CONFIG.VALIDATION.MAX_VALUE) {
                    // Optionally block generation if calculated i is out of range
                    // throw new Error(`Calculated index 'i' (${i}) is outside the allowed range (${window.CONFIG.VALIDATION.MIN_VALUE} to ${window.CONFIG.VALIDATION.MAX_VALUE}).`);
                    window.UTILS.showMessage(`Warning: Calculated 'i' (${i}) is out of range.`, 'warning');
                 }

                 calculationParams = { h, k, i, l, system: 'hexagonal' };

            } else { // Cubic system
                 // Validation already done by validateAllInputs for h, k, l
                calculationParams = { h, k, l, system: 'cubic' };
            }

            // Zero check (all indices) - InterceptCalculator validation handles this too
            if (h === 0 && k === 0 && l === 0 && (crystalSystem === 'cubic' || i === 0)) {
                 throw new Error('All Miller indices cannot simultaneously be zero.');
            }

            // Instantiate calculator (could be member variable `this.calculator`)
            const calculator = new InterceptCalculator();

            // Visualize the plane - visualizer handles errors internally
            const success = this.visualizer.visualize(calculationParams);
            if (!success) {
                // Specific error should have been logged by visualizer/calculator
                throw new Error('Failed to visualize plane. Check console for details.');
            }

            // Generate and display solution steps
            const steps = calculator.getSolutionSteps(calculationParams);
            window.UTILS.renderSolutionSteps(steps, this.stepsContainer);

            // Show success message
            window.UTILS.showMessage('Visualization generated successfully!', 'success');

        } catch (error) {
            // Catch errors from validation or visualization steps
            console.error("Generation Error:", error); // Log the full error
            window.CONFIG_UTILS.debug('Generation error: ' + error.message, 'error');
            // Show user-friendly error message
            window.UTILS.showMessage(error.message, 'error');
        } finally {
            // Ensure loading indicator is always hidden
            window.UTILS.setLoading(false);
        }
    }

    /**
     * Handle reset button click
     */
    handleReset() {
        try {
            // Reset inputs (h, k, l) and their validation messages using UTILS
            window.UTILS.resetInputs();

            // Reset crystal system dropdown to default ('cubic')
            this.crystalSystemSelect.value = 'cubic';

            // Manually reset 'i' field state and hide its container
            this.iInput.value = '';
            this.iInput.classList.remove('valid', 'invalid');
            this.iInputField.style.display = 'none'; // Hide 'i' field container
            const iValidationElement = document.getElementById('i-validation');
            if (iValidationElement) {
                iValidationElement.textContent = '';
            }

            // Reset visualization
            if (this.visualizer) {
                this.visualizer.clearVisualizationElements();
                // Reset axis system to cubic if it exists and was changed
                if (this.visualizer.axisSystem && this.visualizer.axisSystem.system !== 'cubic') {
                     this.visualizer.axisSystem.setSystem('cubic');
                }
                // Reset camera position/view
                this.visualizer.resetCameraPosition();
            }

            // Clear solution steps container
            if (this.stepsContainer) {
                this.stepsContainer.innerHTML = '';
            }

            // Clear general error message display
             const errorElement = document.getElementById('error');
             if (errorElement) {
                 errorElement.style.display = 'none';
                 errorElement.textContent = ''; // Clear text content too
             }

            // Provide feedback
            window.UTILS.showMessage('Inputs and visualization reset.', 'info');

        } catch (error) {
            console.error("Reset Error:", error);
            window.CONFIG_UTILS.debug('Reset error: ' + error.message, 'error');
            window.UTILS.showMessage('Failed to reset application state.', 'error');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Add debounce/throttle here if resize events cause performance issues
        if (this.visualizer) {
            this.visualizer.handleResize();
        }
    }

    /**
     * Validate all relevant, user-editable input fields based on crystal system
     * @returns {boolean} Whether all relevant inputs are valid
     */
    validateAllInputs() {
        // Only validate user-editable fields: h, k, l
        let inputsToValidate = [this.hInput, this.kInput, this.lInput];
        let allValid = inputsToValidate.every(input => window.UTILS.validateInput(input));
        return allValid;
    }


    /**
     * Clean up resources, remove listeners
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundResizeHandler);
        // Potentially remove other listeners if they weren't automatically cleaned up

        if (this.visualizer) {
            this.visualizer.dispose();
            this.visualizer = null;
        }
         window.CONFIG_UTILS.debug('MillerIndicesApp disposed.', 'info');
    }
}

// Initialize app when document is ready using UTILS.onReady
window.UTILS.onReady(() => {
    try {
        // Ensure core classes are available (simple check)
        if (!window.THREE || !window.OrbitControls || !window.InterceptCalculator || !window.AxisSystem || !window.MillerVisualizer || !window.CONFIG || !window.UTILS) {
             console.error("Initialization Error: Core components missing.", {
                 THREE: !!window.THREE, OrbitControls: !!window.OrbitControls,
                 InterceptCalculator: !!window.InterceptCalculator, AxisSystem: !!window.AxisSystem,
                 MillerVisualizer: !!window.MillerVisualizer, CONFIG: !!window.CONFIG, UTILS: !!window.UTILS
             });
             throw new Error("One or more core components failed to load. Check script loading order and console.");
        }
        // Instantiate the app
        window.app = new MillerIndicesApp();
         window.CONFIG_UTILS.debug('Application successfully initialized by main.js.', 'info');

    } catch (error) {
        // Log detailed error
        console.error('App Creation Error:', error);
        window.CONFIG_UTILS.debug('App creation error: ' + error.message, 'error');

        // Display user-friendly message
        const errorElement = document.getElementById('error');
        const loadingElement = document.getElementById('script-loading');
        if (errorElement) {
             errorElement.textContent = `Failed to start application: ${error.message}. Check console for details.`;
             errorElement.style.display = 'block';
        }
        if (loadingElement) {
            loadingElement.style.display = 'none'; // Hide loading indicator
        }
    }
});

// Global handlers are no longer needed as listeners are added internally