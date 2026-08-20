'use strict';

/* ==========================================================================
   Config
   ========================================================================== */
const API_URL = 'https://mental-health-score-predictor-1-uma2.onrender.com/predict';
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 94; // r=94, matches SVG
const MAX_SCORE_FOR_GAUGE = 10; // score assumed on a 0–10 scale for the visual ring

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Mexico', 'Turkey', 'Brazil', 'Spain', 'Italy', 'Netherlands',
  'Japan', 'South Korea', 'China', 'Indonesia', 'Pakistan', 'Bangladesh',
  'Nigeria', 'South Africa', 'Egypt', 'Saudi Arabia', 'UAE', 'Singapore',
  'Malaysia', 'Philippines', 'Vietnam', 'Thailand', 'Russia', 'Poland',
  'Sweden', 'Norway', 'Denmark', 'Ireland', 'Portugal', 'Argentina', 'Chile',
  'Colombia', 'New Zealand', 'Switzerland', 'Austria', 'Belgium', 'Greece',
  'Israel', 'Kenya', 'Ukraine', 'Other'
];

/* ==========================================================================
   Element references
   ========================================================================== */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const startAssessmentBtn = document.getElementById('startAssessmentBtn');
const countryList = document.getElementById('countryList');
const form = document.getElementById('assessmentForm');
const submitBtn = document.getElementById('submitBtn');
const serverError = document.getElementById('serverError');
const assessmentCard = document.getElementById('assessmentCard');
const resultSection = document.getElementById('resultSection');
const resultName = document.getElementById('resultName');
const resultScore = document.getElementById('resultScore');
const gaugeFill = document.getElementById('gaugeFill');
const retakeBtn = document.getElementById('retakeBtn');

const FIELD_IDS = [
  'name', 'age', 'gender', 'country', 'academic_level', 'most_used_platform',
  'purpose_of_use', 'avg_daily_usage_hours', 'daily_unlocks', 'study_hours',
  'physical_activity_hours', 'sleep_hours_per_night', 'stress_level'
];

/* ==========================================================================
   Init
   ========================================================================== */
function init() {
  populateCountryList();
  bindNavigation();
  bindForm();
}

function populateCountryList() {
  const countryInput = document.getElementById('country');
  countryInput.addEventListener('input', () => {
    const val = countryInput.value.toLowerCase();
    if (val.length === 0) {
      countryList.innerHTML = '';
      return;
    }
    const filtered = COUNTRIES.filter(c => c.toLowerCase().startsWith(val));
    countryList.innerHTML = filtered
      .map((c) => `<option value="${c}"></option>`)
      .join('');
  });
}

function bindNavigation() {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('.navbar__link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  startAssessmentBtn.addEventListener('click', () => {
    document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => document.getElementById('name').focus(), 500);
  });
}

function bindForm() {
  form.addEventListener('submit', submitAssessment);
  retakeBtn.addEventListener('click', resetAssessment);

  // Clear a field's error state as soon as the user edits it.
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => clearFieldError(id));
    el.addEventListener('change', () => clearFieldError(id));
  });
}

/* ==========================================================================
   Validation
   ========================================================================== */
const VALIDATORS = {
  name: (v) => (v.trim().length > 0 ? null : 'Please enter your name.'),
  age: (v) => {
    if (v === '') return 'Age is required.';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Age must be a number.';
    if (n < 10 || n > 100) return 'Age must be between 10 and 100.';
    return null;
  },
  gender: (v) => (v ? null : 'Please select a gender.'),
  country: (v) => (v.trim().length > 0 ? null : 'Please select your country.'),
  academic_level: (v) => (v ? null : 'Please select an academic level.'),
  most_used_platform: (v) => (v ? null : 'Please select a platform.'),
  purpose_of_use: (v) => (v ? null : 'Please select a purpose of use.'),
  avg_daily_usage_hours: (v) => {
    if (v === '') return 'Average daily usage is required.';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a valid number of hours.';
    if (n < 0 || n > 24) return 'Daily usage cannot exceed 24 hours.';
    return null;
  },
  daily_unlocks: (v) => {
    if (v === '') return 'Daily unlocks is required.';
    const n = Number(v);
    if (!Number.isInteger(n)) return 'Daily unlocks must be a whole number.';
    if (n < 0) return 'Daily unlocks cannot be negative.';
    return null;
  },
  study_hours: (v) => rangeError(v, 0, 24, 'Study hours'),
  physical_activity_hours: (v) => rangeError(v, 0, 24, 'Physical activity hours'),
  sleep_hours_per_night: (v) => rangeError(v, 0, 24, 'Sleep hours'),
  stress_level: (v) => (v ? null : 'Please select a stress level.'),
};

function rangeError(v, min, max, label) {
  if (v === '') return `${label} is required.`;
  const n = Number(v);
  if (!Number.isFinite(n)) return `Enter a valid number for ${label.toLowerCase()}.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}

function validateForm() {
  let isValid = true;
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    const message = VALIDATORS[id](el.value);
    if (message) {
      setFieldError(id, message);
      isValid = false;
    } else {
      clearFieldError(id);
    }
  });

  if (isValid) {
    const study = Number(document.getElementById('study_hours').value) || 0;
    const physical = Number(document.getElementById('physical_activity_hours').value) || 0;
    const sleep = Number(document.getElementById('sleep_hours_per_night').value) || 0;
    if (study + physical + sleep > 24) {
      setFieldError('sleep_hours_per_night', 'Total study, physical, and sleep hours cannot exceed 24.');
      isValid = false;
    }
  }

  return isValid;
}

function setFieldError(id, message) {
  const el = document.getElementById(id);
  const wrapper = el.closest('.field');
  const errorEl = document.getElementById(`err-${id}`);
  wrapper.classList.add('has-error');
  errorEl.textContent = message;
  el.setAttribute('aria-invalid', 'true');
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  const wrapper = el.closest('.field');
  const errorEl = document.getElementById(`err-${id}`);
  wrapper.classList.remove('has-error');
  errorEl.textContent = '';
  el.removeAttribute('aria-invalid');
}

/* ==========================================================================
   Data collection
   ========================================================================== */
function getFormData() {
  return {
    name: document.getElementById('name').value.trim(),
    age: Number(document.getElementById('age').value),
    gender: document.getElementById('gender').value,
    country: document.getElementById('country').value.trim(),
    academic_level: document.getElementById('academic_level').value,
    most_used_platform: document.getElementById('most_used_platform').value,
    purpose_of_use: document.getElementById('purpose_of_use').value,
    avg_daily_usage_hours: Number(document.getElementById('avg_daily_usage_hours').value),
    daily_unlocks: Number(document.getElementById('daily_unlocks').value),
    study_hours: Number(document.getElementById('study_hours').value),
    physical_activity_hours: Number(document.getElementById('physical_activity_hours').value),
    sleep_hours_per_night: Number(document.getElementById('sleep_hours_per_night').value),
    stress_level: document.getElementById('stress_level').value,
  };
}

/* ==========================================================================
   Submission
   ========================================================================== */
async function submitAssessment(event) {
  event.preventDefault();
  hideServerError();

  if (!validateForm()) {
    const firstError = form.querySelector('.has-error input, .has-error select');
    if (firstError) firstError.focus();
    return;
  }

  const payload = getFormData();
  setSubmitting(true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = 'The prediction server returned an error. Please check your details and try again.';
      try {
        const errBody = await response.json();
        if (errBody && errBody.detail) {
          detail = typeof errBody.detail === 'string'
            ? errBody.detail
            : 'Some of the submitted values were invalid. Please review the form and try again.';
        }
      } catch (_) {
        /* response had no JSON body; keep default message */
      }
      showServerError(detail);
      return;
    }

    const result = await response.json();
    displayResult(result);
  } catch (err) {
    showServerError('Unable to connect to the prediction server. Please make sure the FastAPI backend is running.');
  } finally {
    setSubmitting(false);
  }
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.classList.toggle('btn--loading', isSubmitting);
}

function showServerError(message) {
  serverError.textContent = message;
  serverError.hidden = false;
  serverError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideServerError() {
  serverError.hidden = true;
  serverError.textContent = '';
}

/* ==========================================================================
   Result display
   ========================================================================== */
function displayResult(result) {
  resultName.textContent = result.name;

  assessmentCard.hidden = true;
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  animateGauge(result.predicted_mental_health_score);
  animateScoreCountUp(result.predicted_mental_health_score);
}

function animateGauge(score) {
  const clamped = Math.max(0, Math.min(MAX_SCORE_FOR_GAUGE, score));
  const fraction = clamped / MAX_SCORE_FOR_GAUGE;
  const offset = GAUGE_CIRCUMFERENCE * (1 - fraction);

  gaugeFill.style.strokeDasharray = String(GAUGE_CIRCUMFERENCE);
  gaugeFill.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);
  // Force reflow so the transition reliably runs from full to target offset.
  // eslint-disable-next-line no-unused-expressions
  gaugeFill.getBoundingClientRect();
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = String(offset);
  });
}

function animateScoreCountUp(target) {
  const duration = 1200;
  const start = performance.now();
  const decimals = Number.isInteger(target) ? 0 : 2;

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    resultScore.textContent = current.toFixed(decimals);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      resultScore.textContent = target.toFixed(decimals);
    }
  }
  requestAnimationFrame(tick);
}

/* ==========================================================================
   Reset
   ========================================================================== */
function resetAssessment() {
  form.reset();
  FIELD_IDS.forEach(clearFieldError);
  hideServerError();

  resultSection.hidden = true;
  assessmentCard.hidden = false;
  gaugeFill.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);
  resultScore.textContent = '0';

  document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' });
}

init();
