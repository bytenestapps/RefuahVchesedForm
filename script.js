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
// Yiddish name fields — allow any typing, but flag red if it isn't Hebrew
// ============================================================
// Allowed: Hebrew letters (א–ת), Yiddish ligatures (װ–ײ), spaces, hyphens, apostrophes
const HEBREW_ONLY_PATTERN  = /^[\u05D0-\u05EA\u05F0-\u05F2\s\'\-\u05F3\u05F4]+$/;

document.querySelectorAll('input[name="yiddishFirstName"], input[name="yiddishLastName"]').forEach(input => {
  const check = () => {
    const val = input.value;
    const invalid = val !== '' && !HEBREW_ONLY_PATTERN.test(val);
    input.classList.toggle('is-invalid', invalid);
  };
  input.addEventListener('input', check);
  input.addEventListener('blur', check);
});

// ============================================================
// Chesed on the go — show vehicle-details only when "own vehicle" is picked
// ============================================================
const vehicleDetailsEl = document.querySelector('.cotg-vehicle-details');
function updateVehicleDetailsVisibility() {
  const ownVehicle = document.querySelector('input[name="cotg_options"][data-show-vehicle]');
  if (vehicleDetailsEl) vehicleDetailsEl.hidden = !(ownVehicle && ownVehicle.checked);
}
document.querySelectorAll('input[name="cotg_options"]').forEach(cb => {
  cb.addEventListener('change', updateVehicleDetailsVisibility);
});

// ============================================================
// Step 4 — "Are you involved in any other organisation?" toggle
// ============================================================
const involvedOtherCb = document.getElementById('involvedOtherCheckbox');
const otherOrgField = document.querySelector('.other-org-field');
function updateOtherOrgVisibility() {
  if (otherOrgField) otherOrgField.hidden = !(involvedOtherCb && involvedOtherCb.checked);
}
if (involvedOtherCb) {
  involvedOtherCb.addEventListener('change', updateOtherOrgVisibility);
}

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
  // Yiddish fields must contain only Hebrew letters (+ space / hyphen / apostrophe).
  const yFirst = String(fd.get('yiddishFirstName') || '').trim();
  const yLast  = String(fd.get('yiddishLastName')  || '').trim();
  if (!HEBREW_ONLY_PATTERN.test(yFirst)) {
    return 'The Yiddish first name must contain Hebrew letters only.';
  }
  if (!HEBREW_ONLY_PATTERN.test(yLast)) {
    return 'The Yiddish last name must contain Hebrew letters only.';
  }
  return null;
}

function validateStep2() {
  const fd = new FormData(form);
  const departments = getSelectedDepartments();
  if (departments.length === 0) {
    return 'Please select at least one department.';
  }

  // Chaim V'chesed: at least one task checkbox
  if (departments.includes('chaim-vchesed')) {
    if (getCheckedValues('chaimVchesed_tasks').length === 0) {
      return 'Please select at least one option under "Chaim V\'chesed".';
    }
  }

  // Chesed on the go: at least one option + driver's license fields
  if (departments.includes('chesed-on-the-go')) {
    const cotgOptions = getCheckedValues('cotg_options');
    if (cotgOptions.length === 0) {
      return 'Please select at least one option under "Chesed on the go".';
    }
    if (!String(fd.get('cotg_licenseId') || '').trim()) {
      return 'Please enter your driver\'s license ID number.';
    }
    const file = fd.get('cotg_licenseFile');
    if (!file || file.size === 0) {
      return 'Please upload your driver\'s license.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Driver\'s license file is too large (max 10MB).';
    }
    // Vehicle details only required when "own vehicle" is selected
    if (cotgOptions.includes('Make trips with your own vehicle')) {
      const vehicleRequired = ['cotg_carMake', 'cotg_carModel', 'cotg_carYear', 'cotg_seats', 'cotg_licensePlate'];
      for (const key of vehicleRequired) {
        if (!String(fd.get(key) || '').trim()) {
          return 'Please complete all vehicle detail fields.';
        }
      }
    }
  }

  // Gemach Medical Equipment: info-only, no validation.
  // Mesamchim: skills textarea is optional.
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

function validateStep4() {
  const fd = new FormData(form);
  if (involvedOtherCb && involvedOtherCb.checked) {
    if (!String(fd.get('otherOrgName') || '').trim()) {
      return 'Please specify which other organisation.';
    }
  }
  if (!String(fd.get('referenceName') || '').trim()) {
    return 'Please enter a reference name.';
  }
  if (!String(fd.get('referencePhone') || '').trim()) {
    return 'Please enter a reference phone number.';
  }
  return null;
}

const stepValidators = { 1: validateStep1, 2: validateStep2, 3: validateStep3, 4: validateStep4 };

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
    phoneNumber: fd.get('Phonenumber') || '',
    emailAddress: fd.get('emailAddress') || '',
    yiddishFirstName: fd.get('yiddishFirstName') || '',
    yiddishLastName: fd.get('yiddishLastName') || '',
    address: fd.get('address') || '',
    departments: departments.join(', '),
    days: getCheckedValues('days').join(', '),
    times: getCheckedValues('times').join(', '),
    chaimVchesed_tasks: getCheckedValues('chaimVchesed_tasks').join('; '),
    cotg_options: getCheckedValues('cotg_options').join('; '),
    cotg_licenseId: fd.get('cotg_licenseId') || '',
    cotg_carMake: fd.get('cotg_carMake') || '',
    cotg_carModel: fd.get('cotg_carModel') || '',
    cotg_carYear: fd.get('cotg_carYear') || '',
    cotg_seats: fd.get('cotg_seats') || '',
    cotg_licensePlate: fd.get('cotg_licensePlate') || '',
    mesamchim_skills: fd.get('mesamchim_skills') || '',
    involvedOther: (involvedOtherCb && involvedOtherCb.checked) ? 'Yes' : 'No',
    otherOrgName: fd.get('otherOrgName') || '',
    referenceName: fd.get('referenceName') || '',
    referencePhone: fd.get('referencePhone') || '',
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
    if (!res.ok) throw new Error('Server error (HTTP ' + res.status + ')');
    let result;
    try {
      result = await res.json();
    } catch {
      throw new Error('Server returned an unexpected response (not JSON). The deployment URL may need to be updated.');
    }
    if (result.status === 'ok') {
      form.reset();
      document.querySelectorAll('.card[aria-pressed="true"]').forEach(c => c.setAttribute('aria-pressed', 'false'));
      document.querySelectorAll('.dept-section').forEach(s => s.hidden = true);
      // reset model dropdown
      if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Select make first</option>';
        modelSelect.disabled = true;
      }
      // hide vehicle details & other-org field again
      updateVehicleDetailsVisibility();
      updateOtherOrgVisibility();
      showStep(1);
      setStatus('Thank you! Your submission was received.', 'success');
    } else {
      throw new Error(result.message || 'Unknown error');
    }
  } catch (err) {
    setStatus('Submission failed: ' + ((err && err.message) || String(err)), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
});
//update footer year automatically
const yearSpan = document.getElementById('currentYear'); if (yearSpan) { yearSpan.textContent = new Date().getFullYear();
}
// --- toggle "which other organisation" field ---
const involvedOtherCheckbox = document.getElementById('involvedOtherCheckbox');
const otherOrgContainer = document.querySelector('.other-org-field');

if (involvedOtherCheckbox && otherOrgContainer) {
  involvedOtherCheckbox.addEventListener('change', function() {
    if (this.checked) {
      otherOrgContainer.classList.remove('hidden');
    } else {
      otherOrgContainer.classList.add('hidden');
      //Optional; clear the input if they uncheck it
      const input = otherOrgContainer.querySelector('input');
      if (input) input.value = '';
    }
  });
}