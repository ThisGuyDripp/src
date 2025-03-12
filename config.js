// config.js

const CONFIG = {
    // Scene Configuration
    SCENE: {
        BACKGROUND_COLOR: 0x121212,
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        CAMERA_POSITION: { x: 2, y: 2, z: 2 },
        CONTROLS: {
            enableDamping: true,
            dampingFactor: 0.05,
            rotateSpeed: 0.5,
            maxDistance: 10,
            minDistance: 1,
            enablePan: true,
            enableZoom: true
        },
        LIGHTING: {
            ambient: {
                color: 0xffffff,
                intensity: 0.8
            },
            point: {
                color: 0xffffff,
                intensity: 1,
                position: { x: 2, y: 3, z: 4 }
            }
        }
    },

    // Axis Configuration
    AXIS: {
        LENGTH: 2,
        LABEL_SIZE: 0.15,
        COLORS: {
            B_AXIS: 0xff0000,  // x-axis (red)
            C_AXIS: 0x00ff00,  // y-axis (green)
            A_AXIS: 0x0000ff   // z-axis (blue)
        },
        GRID_DIVISIONS: 10,
        GRID_SIZE: 2,
        LABELS: {
            OFFSET: 0.2,
            SIZE: 0.1,
            SPRITE: {
                fontSize: 48,
                borderThickness: 4,
                borderColor: { r:0, g:0, b:0, a:1.0 },
                backgroundColor: { r:0, g:0, b:0, a:0.3 }
            }
        }
    },

    // Plane Configuration
    PLANE: {
        COLOR: 0xFF5722,
        OPACITY: 0.7,
        DEFAULT_SIZE: 3,
        MAX_SIZE: 10,
        STYLES: {
            wireframe: false,
            transparent: true,
            side: 'double',  // Will be converted to THREE.DoubleSide
            shininess: 30
        },
        HOVER: {
            highlightColor: 0xFF7F50,
            transitionSpeed: 0.3
        }
    },

    // Visual Helpers
    HELPERS: {
        INTERSECTION_POINT: {
            SIZE: 0.05,
            COLOR: 0xffff00,
            SEGMENTS: 16
        },
        ORIGIN_POINT: {
            SIZE: 0.08,
            COLOR: 0xffffff,
            SEGMENTS: 16
        },
        GRID: {
            COLOR: 0x444444,
            DIVISIONS: 10,
            SIZE: 10
        }
    },

    // Visual Feedback
    FEEDBACK: {
        SUCCESS: {
            color: 0x4CAF50,
            duration: 500
        },
        ERROR: {
            color: 0xff4444,
            duration: 500
        },
        WARNING: {
            color: 0xFFC107,
            duration: 500
        }
    },

    // Text Rendering
    TEXT: {
        SPRITE: {
            fontFace: 'Arial',
            fontSize: 24,
            borderThickness: 4,
            borderColor: { r:0, g:0, b:0, a:1.0 },
            backgroundColor: { r:0, g:0, b:0, a:0.8 }
        },
        LABELS: {
            size: 0.1,
            height: 0.02,
            curveSegments: 4,
            bevelEnabled: false
        }
    },

    // Input Validation
    VALIDATION: {
        MIN_VALUE: -99,
        MAX_VALUE: 99,
        ALLOWED_KEYS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab']
    },

    // Animation
    ANIMATION: {
        DURATION: 1000,
        EASING: 'easeInOutCubic',
        FRAMES_PER_SECOND: 60,
        TRANSITION: {
            enter: 300,
            exit: 200
        }
    },

    // Performance
    PERFORMANCE: {
        antialiasing: true,
        shadowsEnabled: false,
        maxFPS: 60,
        pixelRatio: window.devicePixelRatio,
        autoRotate: false,
        throttleMS: 16  // ~60fps
    },

    // Debug
    DEBUG: {
        enabled: false,
        showHelpers: false,
        logLevel: 'warn', // 'error', 'warn', 'info', 'debug'
        showStats: false,
        showAxesHelper: true,
        showGridHelper: true
    }
};

const CONFIG_UTILS = {
    validateInput: function(value) {
        // Type checking
        if (typeof value !== 'number') {
            throw new Error('Input must be a number');
        }
        
        // NaN checking
        if (isNaN(value)) {
            throw new Error('Input cannot be NaN');
        }

        // Range checking
        if (value < CONFIG.VALIDATION.MIN_VALUE || value > CONFIG.VALIDATION.MAX_VALUE) {
            throw new Error(`Value must be between ${CONFIG.VALIDATION.MIN_VALUE} and ${CONFIG.VALIDATION.MAX_VALUE}`);
        }

        return true;
    },

    getAxisColor: function(axis) {
        const color = CONFIG.AXIS.COLORS[`${axis}_AXIS`];
        if (!color) {
            throw new Error(`Invalid axis: ${axis}`);
        }
        return color;
    },

    calculatePlaneSize: function(size) {
        return Math.min(Math.max(size, CONFIG.PLANE.DEFAULT_SIZE), CONFIG.PLANE.MAX_SIZE);
    },

    validateKeyInput: function(event) {
        return CONFIG.VALIDATION.ALLOWED_KEYS.includes(event.key);
    },

    debug: function(message, level = 'info') {
        if (CONFIG.DEBUG.enabled) {
            switch(level) {
                case 'error':
                    console.error(message);
                    break;
                case 'warn':
                    console.warn(message);
                    break;
                case 'info':
                    console.info(message);
                    break;
                case 'debug':
                    console.debug(message);
                    break;
                default:
                    console.log(message);
            }
        }
    }
};

// Prevent configuration modification after initialization
Object.freeze(CONFIG);
Object.freeze(CONFIG_UTILS);

// Make configs available globally
window.CONFIG = CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS;
