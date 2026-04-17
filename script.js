// ============================================================
// CONFIG — paste your deployed Apps Script Web App URL here
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzk6_1U7tEnRjB3RcOpQkHOfNpQ6MeDQsCGtiJq4WSXKXH1nEZ7-3Zg01TlwSviKkz9CQ/exec';

// ============================================================
// Department cards — toggle selection + show/hide sections
// ============================================================
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const dept = card.dataset.dept;
    const isPressed = card.getAttribute('aria-pressed') === 'true';
    card.setAttribute('aria-pressed', String(!isPressed));

    const section = document.querySelector(`[data-dept-section="${dept}"]`);
    if (section) section.hidden = isPressed;
  });
});

// ============================================================
// Car make/model dropdowns — free NHTSA vPIC API (no key)
// ============================================================
const makeSelect = document.getElementById('carMake');
const modelSelect = document.getElementById('carModel');

async function loadMakes() {
  try {
    const res = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json'
    );
    const data = await res.json();
    const makes = data.Results
      .map(m => m.MakeName)
      .sort((a, b) => a.localeCompare(b));
    makeSelect.innerHTML =
      '<option value="">Select make</option>' +
      makes.map(m => `<option value="${m}">${m}</option>`).join('');
  } catch (e) {
    makeSelect.innerHTML = '<option value="">(could not load makes)</option>';
  }
}

async function loadModels(make) {
  modelSelect.disabled = true;
  modelSelect.innerHTML = '<option value="">Loading...</option>';
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`
    );
    const data = await res.json();
    const models = Array.from(new Set(data.Results.map(m => m.Model_Name))).sort();
    modelSelect.innerHTML =
      '<option value="">Select model</option>' +
      models.map(m => `<option value="${m}">${m}</option>`).join('');
    modelSelect.disabled = false;
  } catch (e) {
    modelSelect.innerHTML = '<option value="">(could not load models)</option>';
  }
}

if (makeSelect) {
  loadMakes();
  makeSelect.addEventListener('change', e => {
    if (e.target.value) {
      loadModels(e.target.value);
    } else {
      modelSelect.innerHTML = '<option value="">Select make first</option>';
      modelSelect.disabled = true;
    }
  });
}

// ============================================================
// Helpers
// ============================================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(el => el.value);
}

function getSelectedDepartments() {
  return Array.from(document.querySelectorAll('.card[aria-pressed="true"]'))
    .map(el => el.dataset.dept);
}

// ============================================================
// Form references
// ============================================================
const form = document.getElementById('volunteer-form');
const statusEl = document.getElementById('status');

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

// ============================================================
// Per-step validation
// ============================================================
function validateStep1() {
  const fd = new FormData(form);
  const requiredTop = ['legalFirstName', 'legalLastName', 'yiddishFirstName', 'yiddishLastName', 'address'];
  for (const key of requiredTop) {
    if (!String(fd.get(key) || '').trim()) {
      return 'Please fill in all required personal information fields.';
    }
  }
  return null;
}

function validateStep2() {
  const fd = new FormData(form);
  const departments = getSelectedDepartments();
  if (departments.length === 0) {
    return 'Please select at least one department.';
  }

  const deptRequiredFields = {
    'chaim-vchesed': { field: 'chaimVchesed_whatCanYouDo', label: 'Chaim V\'chesed' },
    'gemach-refuah': { field: 'gemachRefuah_whatCanYouDo', label: 'Gemach refuah' },
    'mesamchim':     { field: 'mesamchim_skills',          label: 'Mesamchim' }
  };
  for (const dept of departments) {
    const cfg = deptRequiredFields[dept];
    if (cfg && !String(fd.get(cfg.field) || '').trim()) {
      return `Please fill in the required field under "${cfg.label}".`;
    }
  }

  if (departments.includes('chesed-on-the-go')) {
    const cotgRequired = ['cotg_licenseId', 'cotg_carMake', 'cotg_carModel', 'cotg_carYear', 'cotg_seats', 'cotg_licensePlate'];
    for (const key of cotgRequired) {
      if (!String(fd.get(key) || '').trim()) {
        return 'Please complete all "Chesed on the go" fields.';
      }
    }
    const file = fd.get('cotg_licenseFile');
    if (!file || file.size === 0) {
      return 'Please upload your driver\'s license.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Driver\'s license file is too large (max 10MB).';
    }
  }
  return null;
}

function validateStep3() {
  if (getCheckedValues('days').length === 0) {
    return 'Please select at least one day.';
  }
  if (getCheckedValues('times').length === 0) {
    return 'Please select at least one time of day.';
  }
  return null;
}

const stepValidators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 };

// ============================================================
// Step navigation
// ============================================================
const steps = document.querySelectorAll('.step');
const indicators = document.querySelectorAll('.step-dot');
const indicatorLines = document.querySelectorAll('.step-line');
let currentStep = 1;
const TOTAL_STEPS = steps.length;

function showStep(n) {
  steps.forEach(s => {
    s.hidden = Number(s.dataset.step) !== n;
  });
  indicators.forEach(d => {
    const i = Number(d.dataset.indicator);
    d.classList.toggle('is-active', i === n);
    d.classList.toggle('is-complete', i < n);
  });
  indicatorLines.forEach((line, idx) => {
    line.classList.toggle('is-complete', idx + 1 < n);
  });
  currentStep = n;
  setStatus('', '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-next]').forEach(btn => {
  btn.addEventListener('click', () => {
    const err = stepValidators[currentStep]?.();
    if (err) { setStatus(err, 'error'); return; }
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  });
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });
});

// ============================================================
// Submit
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('', '');

  // Re-validate every step before submitting.
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const err = stepValidators[i]?.();
    if (err) {
      showStep(i);
      setStatus(err, 'error');
      return;
    }
  }

  const fd = new FormData(form);
  const departments = getSelectedDepartments();

  // --- Build payload ---
  const payload = {
    legalFirstName: fd.get('legalFirstName') || '',
    legalLastName: fd.get('legalLastName') || '',
    yiddishFirstName: fd.get('yiddishFirstName') || '',
    yiddishLastName: fd.get('yiddishLastName') || '',
    address: fd.get('address') || '',
    departments: departments.join(', '),
    days: getCheckedValues('days').join(', '),
    times: getCheckedValues('times').join(', '),
    chaimVchesed_whatCanYouDo: fd.get('chaimVchesed_whatCanYouDo') || '',
    gemachRefuah_whatCanYouDo: fd.get('gemachRefuah_whatCanYouDo') || '',
    mesamchim_skills: fd.get('mesamchim_skills') || '',
    cotg_licenseId: fd.get('cotg_licenseId') || '',
    cotg_carMake: fd.get('cotg_carMake') || '',
    cotg_carModel: fd.get('cotg_carModel') || '',
    cotg_carYear: fd.get('cotg_carYear') || '',
    cotg_seats: fd.get('cotg_seats') || '',
    cotg_licensePlate: fd.get('cotg_licensePlate') || '',
    fileName: '',
    mimeType: '',
    fileData: ''
  };

  const file = fd.get('cotg_licenseFile');
  if (file && file.size > 0) {
    payload.fileName = file.name;
    payload.mimeType = file.type;
    payload.fileData = await fileToBase64(file);
  }

  // --- Send ---
  const btn = form.querySelector('.submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  setStatus('Submitting...', '');

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      // text/plain avoids a CORS preflight that Apps Script can't answer
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await res.json();
    if (result.status === 'ok') {
      form.reset();
      document.querySelectorAll('.card[aria-pressed="true"]').forEach(c => c.setAttribute('aria-pressed', 'false'));
      document.querySelectorAll('.dept-section').forEach(s => s.hidden = true);
      // reset model dropdown
      if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Select make first</option>';
        modelSelect.disabled = true;
      }
      showStep(1);
      setStatus('Thank you! Your submission was received.', 'success');
    } else {
      throw new Error(result.message || 'Unknown error');
    }
  } catch (err) {
    setStatus('Submission failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
});
