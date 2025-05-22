// config.js

const CONFIG = {
    // Scene Configuration
    SCENE: {
        BACKGROUND_COLOR: 0x121212,
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        CAMERA_POSITION: { x: 2.5, y: 2, z: 3 }, // Adjusted for potentially vertical hexagonal view
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
        GRID_DIVISIONS: 10,
        GRID_SIZE: 2, 
        CUBIC: {
            COLORS: { B_AXIS: 0xff0000, C_AXIS: 0x00ff00, A_AXIS: 0x0000ff }, 
            LABELS: {
                OFFSET: 0.2, TEXT: { a: 'a', b: 'b', c: 'c' },
                SPRITE: {
                    fontFace: 'Arial', fontSize: 48, borderThickness: 0,
                    borderColor: { r:0, g:0, b:0, a:0 }, 
                    backgroundColor: { r:0, g:0, b:0, a:0.0 }, 
                    canvasWidth: 128, canvasHeight: 64 
                }
            }
        },
        HEXAGONAL: {
            COLORS: { A1_AXIS: 0xff0000, A2_AXIS: 0x00ff00, A3_AXIS: 0x0000ff, C_AXIS: 0xff00ff }, 
            LABELS: {
                OFFSET: 0.2, TEXT: { a1: 'a₁', a2: 'a₂', a3: 'a₃', c: 'c' },
                SPRITE: {
                    fontFace: 'Arial', fontSize: 48, borderThickness: 0,
                    borderColor: { r:0, g:0, b:0, a:0 },
                    backgroundColor: { r:0, g:0, b:0, a:0.0 },
                    canvasWidth: 128, canvasHeight: 64 
                }
            }
        }
    },

    DEFAULT_SHAPE: {
        CUBIC: {
            enabled: true,
            wireframe: true,
            color: 0xaaaaaa, 
            opacity: 0.15,
            sizeFactor: 1.0 
        },
        HEXAGONAL: {
            enabled: true,
            wireframe: true,
            color: 0xaaaaaa, 
            opacity: 0.15,
            heightFactor: 1.5, 
            radiusFactor: 0.6   
        }
    },

    PLANE: {
        COLOR: 0xaaaaaa, 
        OPACITY: 0.9,   
        DEFAULT_SIZE: 3, 
        MAX_SIZE: 10,    
        STYLES: {
            wireframe: false, 
            transparent: true, 
            side: 'double', 
            shininess: 10 
        },
        HOVER: { 
            highlightColor: 0xFF7F50, 
            transitionSpeed: 0.3
        }
    },

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
        }
    },

    FEEDBACK: {
        SUCCESS: { color: '#4CAF50', duration: 3000 }, 
        ERROR:   { color: '#ff4444', duration: 5000 }, 
        WARNING: { color: '#FFC107', duration: 4000 }, 
        INFO:    { color: '#2196f3', duration: 2000 }  
    },

    TEXT: {
         LABELS: { 
            size: 0.1, height: 0.02, curveSegments: 4, bevelEnabled: false
         }
    },

    VALIDATION: {
        MIN_VALUE: -99,
        MAX_VALUE: 99,
        ALLOWED_KEYS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'Delete', '.'] 
    },

    ANIMATION: {
        DURATION: 1000, 
        EASING: 'easeInOutCubic', 
        FPS: 60, 
        TRANSITION: { enter: 300, exit: 200 } 
    },

    PERFORMANCE: {
        antialiasing: true,
        shadowsEnabled: false, 
        maxFPS: 60, 
        pixelRatio: window.devicePixelRatio, 
        maxPixelRatio: 2, 
        autoRotate: false, 
        throttleMS: 16 
    },

    DEBUG: {
        enabled: true,        
        showHelpers: false,    
        logLevel: 'info',     
        showStats: false,      
        showAxesHelper: false, 
        showGridHelper: true,  
        showXYGridForHexagonal: true, 
        showPerpendicularGridForHexagonal: false // Added this from a previous version for clarity
    }
};

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
    getShapeConfig: function(system) { 
        return CONFIG.DEFAULT_SHAPE[(system || 'cubic').toUpperCase()] || CONFIG.DEFAULT_SHAPE.CUBIC;
    },
    validateKeyInput: function(event) { 
        if (event.ctrlKey || event.metaKey || event.altKey) { return true; } 
        return CONFIG.VALIDATION.ALLOWED_KEYS.includes(event.key);
    },
    /**
     * Centralized debug logger.
     * @param {string} message - The main message to log.
     * @param {string} [level='info'] - The log level ('debug', 'info', 'warn', 'error').
     * @param {any} [data=null] - Optional additional data to log.
     */
    debug: function(message, level = 'info', data = null) {
        if (!CONFIG.DEBUG.enabled) return;

        // Ensure 'level' is a string; default to 'info' if it's not or if it's an object passed mistakenly.
        const levelString = (typeof level === 'string') ? level.toLowerCase() : 'info';
        
        // If the original 'level' was an object (meaning data was passed as the second arg),
        // and 'data' is still null, assign that object to 'data'.
        if (typeof level === 'object' && level !== null && data === null) {
            data = level;
        }

        const levelMap = { 'debug': 4, 'info': 3, 'warn': 2, 'error': 1 };
        const configLevel = levelMap[CONFIG.DEBUG.logLevel.toLowerCase()] || 3; // Default to info if logLevel is invalid
        const messageLevel = levelMap[levelString] || 3; // Default to info if provided level string is invalid

        if (messageLevel <= configLevel) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}][${levelString.toUpperCase()}]`;
            
            const logArgs = [`${prefix} ${message}`];
            if (data !== null) {
                logArgs.push(data); // Add data as a separate argument for better console object inspection
            }

            switch(levelString) {
                case 'error': console.error(...logArgs); break;
                case 'warn':  console.warn(...logArgs); break;
                case 'info':  console.info(...logArgs); break;
                case 'debug': console.debug(...logArgs); break;
                default:      console.log(...logArgs);
            }
        }
    }
};

function deepFreeze(object) {
  Object.keys(object).forEach(name => {
    const value = object[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  });
  return Object.freeze(object);
}

window.CONFIG = CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS;
