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
        LENGTH: 2, // Base length for axes and related shapes
        LABEL_SIZE: 0.15,
        GRID_DIVISIONS: 10,
        GRID_SIZE: 2,
        CUBIC: {
            COLORS: { B_AXIS: 0xff0000, C_AXIS: 0x00ff00, A_AXIS: 0x0000ff },
            LABELS: {
                OFFSET: 0.2, TEXT: { a: 'a', b: 'b', c: 'c' },
                SPRITE: { fontSize: 48, borderThickness: 0, borderColor: { r:0, g:0, b:0, a:0 }, backgroundColor: { r:0, g:0, b:0, a:0.0 } }
            }
        },
        HEXAGONAL: {
            COLORS: { A1_AXIS: 0xff0000, A2_AXIS: 0x00ff00, A3_AXIS: 0x0000ff, C_AXIS: 0xff00ff },
            LABELS: {
                OFFSET: 0.2, TEXT: { a1: 'a₁', a2: 'a₂', a3: 'a₃', c: 'c' },
                SPRITE: { fontSize: 48, borderThickness: 0, borderColor: { r:0, g:0, b:0, a:0 }, backgroundColor: { r:0, g:0, b:0, a:0.0 } }
            }
        }
    },

    // *** NEW SECTION for Default Crystal Shape ***
    DEFAULT_SHAPE: {
        CUBIC: {
            enabled: true, // Show by default?
            wireframe: true,
            color: 0xaaaaaa, // Light grey
            opacity: 0.15,
            // Size will be AXIS.LENGTH * sizeFactor in each dimension
            sizeFactor: 1.0 // Makes cube edge length equal to axis length
        },
        HEXAGONAL: {
            enabled: true, // Show by default?
            wireframe: true,
            color: 0xaaaaaa, // Light grey
            opacity: 0.15,
            // Height will be AXIS.LENGTH * heightFactor
            // Radius relates to the 'a' axes length (AXIS.LENGTH) * radiusFactor
            heightFactor: 1.0, // Makes prism height equal to c-axis length shown
            radiusFactor: 1.0 // Makes prism radius match a-axis length shown
        }
    },
    // *** END NEW SECTION ***

    // Plane Configuration
    PLANE: {
        COLOR: 0xFF5722, OPACITY: 0.7, DEFAULT_SIZE: 3, MAX_SIZE: 10,
        STYLES: { wireframe: false, transparent: true, side: 'double', shininess: 30 },
        HOVER: { highlightColor: 0xFF7F50, transitionSpeed: 0.3 }
    },

    // Visual Helpers
    HELPERS: {
        INTERSECTION_POINT: { SIZE: 0.05, COLOR: 0xffff00, SEGMENTS: 16 },
        ORIGIN_POINT: { SIZE: 0.08, COLOR: 0xffffff, SEGMENTS: 16 },
        GRID: { COLOR: 0x444444, DIVISIONS: 10, SIZE: 10 }
    },

    // Visual Feedback (Used by UTILS.showMessage)
    FEEDBACK: {
        SUCCESS: { color: 0x4CAF50, duration: 3000 },
        ERROR: { color: 0xff4444, duration: 5000 },
        WARNING: { color: 0xFFC107, duration: 4000 },
        INFO: { color: 0x2196f3, duration: 2000 }
    },

    // Text Rendering (Config for potential THREE.TextGeometry)
    TEXT: {
         LABELS: { size: 0.1, height: 0.02, curveSegments: 4, bevelEnabled: false }
    },


    // Input Validation
    VALIDATION: {
        MIN_VALUE: -99, MAX_VALUE: 99,
        ALLOWED_KEYS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'Delete']
    },

    // Animation
    ANIMATION: { DURATION: 1000, EASING: 'easeInOutCubic', FPS: 60, TRANSITION: { enter: 300, exit: 200 } },

    // Performance
    PERFORMANCE: { antialiasing: true, shadowsEnabled: false, maxFPS: 60, pixelRatio: window.devicePixelRatio, maxPixelRatio: 2, autoRotate: false, throttleMS: 16 },

    // Debug
    DEBUG: { enabled: true, showHelpers: false, logLevel: 'info', showStats: false, showAxesHelper: false, showGridHelper: true } // Disabled redundant helpers
};

// --- Config Utilities ---
const CONFIG_UTILS = {
    validateInput: function(value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
             if (String(value).trim() !== '') { throw new Error('Input must be a valid number'); }
             return false;
        }
        if (!Number.isInteger(numValue)) { throw new Error('Input must be an integer'); }
        if (numValue < CONFIG.VALIDATION.MIN_VALUE || numValue > CONFIG.VALIDATION.MAX_VALUE) {
            throw new Error(`Value must be between ${CONFIG.VALIDATION.MIN_VALUE} and ${CONFIG.VALIDATION.MAX_VALUE}`);
        }
        return true;
    },
    getAxisConfig: function(system) {
        return CONFIG.AXIS[(system || 'cubic').toUpperCase()] || CONFIG.AXIS.CUBIC;
    },
    getAxisColor: function(axisName, system) {
         const systemConfig = this.getAxisConfig(system);
         if (systemConfig && systemConfig.COLORS) {
             const key = `${axisName.toUpperCase()}_AXIS`;
             return systemConfig.COLORS[key];
         }
         return 0xffffff;
     },
    // *** NEW UTILITY for Shape Config ***
    getShapeConfig: function(system) {
        return CONFIG.DEFAULT_SHAPE[(system || 'cubic').toUpperCase()] || CONFIG.DEFAULT_SHAPE.CUBIC;
    },
    // *** END NEW UTILITY ***
    calculatePlaneSize: function(size) { // Deprecated? Calculator handles this now.
        return Math.min(Math.max(size, CONFIG.PLANE.DEFAULT_SIZE), CONFIG.PLANE.MAX_SIZE);
    },
    validateKeyInput: function(event) {
        if (event.ctrlKey || event.metaKey) { return true; }
        return CONFIG.VALIDATION.ALLOWED_KEYS.includes(event.key);
    },
    debug: function(message, level = 'info') {
        if (!CONFIG.DEBUG.enabled) return;
        const levelMap = { 'debug': 4, 'info': 3, 'warn': 2, 'error': 1 };
        const configLevel = levelMap[CONFIG.DEBUG.logLevel] || 3;
        const messageLevel = levelMap[level] || 3;
        if (messageLevel <= configLevel) {
            switch(level) {
                case 'error': console.error(message); break;
                case 'warn': console.warn(message); break;
                case 'info': console.info(message); break;
                case 'debug': console.debug(message); break;
                default: console.log(message);
            }
        }
    }
};

// --- Freezing Config Objects ---
// Function to recursively freeze objects (optional, for deeper immutability)
function deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

// Freeze the main config and potentially nested objects
deepFreeze(CONFIG); // Use deepFreeze for nested objects
Object.freeze(CONFIG_UTILS); // Utils object

// Make configs available globally
window.CONFIG = CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS;