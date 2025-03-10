import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import DOMPurify from 'dompurify';

// Global State
let minerals = [];
let currentMineral = null;
let scene, camera, renderer, controls, planeMesh;
const latticeObjects = [];
const gcd = (a, b) => b ? gcd(b, a % b) : a;

// Mineral Data Initialization
export async function initializeMineralData() {
  try {
    const response = await fetch('./src/minerals.json');
    if (!response.ok) throw new Error('Network response failed');
    minerals = await response.json();
    
    const select = document.getElementById('mineralSelect');
    select.innerHTML = minerals.map(m => `
      <option value="${m.name}">
        ${DOMPurify.sanitize(m.name)} (${DOMPurify.sanitize(m.formula)})
      </option>
    `).join('');
  } catch (error) {
    showError(`Mineral data load failed: ${error.message}`);
  }
}

// Miller Indices Core Logic
export function calculateMillerIndices(x, y, z) {
  const processValue = (val) => {
    if (val === 0) return { numerator: 0, denominator: 1 };
    const reciprocal = 1 / val;
    const denominator = Math.round(1 / (reciprocal % 1)) || 1;
    const numerator = Math.round(reciprocal * denominator);
    const divisor = gcd(numerator, denominator);
    return { 
      numerator: numerator / divisor, 
      denominator: denominator / divisor 
    };
  };

  const [h, k, l] = [x, y, z].map(processValue);
  const denominators = [h.denominator, k.denominator, l.denominator];
  const lcd = denominators.reduce((a, b) => a * b / gcd(a, b));

  return [
    h.numerator * (lcd / h.denominator),
    k.numerator * (lcd / k.denominator),
    l.numerator * (lcd / l.denominator)
  ];
}

// UI Handlers
export function setupEventListeners() {
  document.getElementById('calculateBtn').addEventListener('click', handleCalculation);
  document.getElementById('mineralSelect').addEventListener('change', handleMineralChange);
  document.getElementById('darkModeToggle').addEventListener('click', updateMaterialsForTheme);
}

async function handleCalculation() {
  showLoader();
  try {
    const [x, y, z] = ['x', 'y', 'z'].map(id => {
      const val = parseFloat(document.getElementById(id).value);
      if (isNaN(val)) throw new Error('Invalid intercept values');
      return val;
    });

    const [h, k, l] = calculateMillerIndices(x, y, z);
    if (h === 0 && k === 0 && l === 0) throw new Error('(000) is invalid');

    updateResultDisplay(h, k, l, x, y, z);
    update3DPlane(h, k, l);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoader();
  }
}

function handleMineralChange(event) {
  currentMineral = minerals.find(m => m.name === event.target.value);
  if (!currentMineral) return;
  
  document.getElementById('currentSystem').textContent = 
    `${currentMineral.system} (${currentMineral.lattice.a}Å)`;
  createCrystalLattice(currentMineral);
}

// Visualization Updates
function updateResultDisplay(h, k, l, x, y, z) {
  document.getElementById('result').innerHTML = DOMPurify.sanitize(`
    <div class="alert alert-success" role="alert">
      <h2 class="miller-display">
        ${[h, k, l].map(n => `
          <span class="index-box">
            ${n < 0 ? `<span class="overline">${Math.abs(n)}</span>` : n}
          </span>
        `).join('')}
      </h2>
      <div class="text-muted">
        <small>Reciprocal: (1/${x.toFixed(2)}, 1/${y.toFixed(2)}, 1/${z.toFixed(2)})</small>
        ${currentMineral ? `<br><small>System: ${currentMineral.system}</small>` : ''}
      </div>
    </div>
  `);
}

// Error Handling
export function showError(message) {
  const container = document.getElementById('errorContainer');
  const messageEl = document.getElementById('errorMessage');
  container.setAttribute('role', 'alert');
  container.setAttribute('aria-live', 'assertive');
  messageEl.textContent = message;
  container.classList.remove('d-none');

  setTimeout(() => {
    container.classList.add('d-none');
  }, 5000);
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeMineralData();
  setupEventListeners();
  initializeThreeScene();
});
