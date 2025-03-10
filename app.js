// Mineral Database Handler
let minerals = [];

fetch('./src/minerals.json')
  .then(response => response.json())
  .then(data => {
    minerals = data;
    const select = document.getElementById('mineralSelect');
    select.innerHTML = data.map(m => `<option value="${m.name}">${m.name} (${m.formula})</option>`).join('');
  })
  .catch(error => console.error('Error loading minerals:', error));

// Miller Indices Calculator
document.getElementById('calculateBtn').addEventListener('click', () => {
  showLoader();
  
  const x = parseFloat(document.getElementById('x').value);
  const y = parseFloat(document.getElementById('y').value);
  const z = parseFloat(document.getElementById('z').value);

  try {
    if ([x, y, z].some(n => n === 0)) throw new Error('Intercepts cannot be zero');
    
    const [h, k, l] = calculateMillerIndices(x, y, z);
    document.getElementById('result').innerHTML = `
      <div class="alert alert-success">
        <strong>Miller Indices:</strong> (${h}${k}${l})<br>
        <small>Reciprocals: (1/${x}, 1/${y}, 1/${z}) → Simplified</small>
      </div>
    `;
    
    update3DPlane(h, k, l);
  } catch (error) {
    document.getElementById('result').innerHTML = `
      <div class="alert alert-danger">${error.message}</div>
    `;
  } finally {
    hideLoader();
  }
});

function calculateMillerIndices(x, y, z) {
  const reciprocals = [1/x, 1/y, 1/z];
  const lcm = Math.max(...reciprocals.map(n => 1/n));
  return reciprocals.map(n => Math.round(n * lcm));
}

// Tutorial System
document.getElementById('startTutorial').addEventListener('click', () => {
  new bootstrap.Modal(document.getElementById('tutorialStep1')).show();
});

document.querySelectorAll('.next-step').forEach(button => {
  button.addEventListener('click', function() {
    const currentModal = bootstrap.Modal.getInstance(this.closest('.modal'));
    currentModal.hide();
    new bootstrap.Modal(document.querySelector(this.dataset.target)).show();
  });
});

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const icon = document.querySelector('#darkModeToggle i');
  icon.classList.toggle('fa-moon');
  icon.classList.toggle('fa-sun');
});

// Utility Functions
function showLoader() {
  document.getElementById('loader').classList.add('active');
}

function hideLoader() {
  document.getElementById('loader').classList.remove('active');
}
