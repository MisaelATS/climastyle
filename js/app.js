// ═══════════════════════════════════════════
// ClimaStyle — Main Application Logic
// ═══════════════════════════════════════════

import { fetchWeather, getHourlyForDate, getHourlyRangeForDate } from './weather-api.js';
import { getRecommendation } from './recommendations.js';
import { getCurrentPosition, searchCities } from './geolocation.js';
import { parseTimeToHour, debounce, getLocalTodayString } from './utils.js';
import {
  getPreferences, savePreferences,
  getLastCity, setLastCity,
  getSavedCities, addSavedCity, removeSavedCity,
  getCachedWeatherForce
} from './storage.js';
import {
  initUI,
  renderCurrentWeather, renderCityName,
  renderDaySelector, renderTimeline, renderRecommendation, hideRecommendation,
  renderForecast, renderSearchResults, clearSearchResults,
  renderSavedCities, showView, showLoading, hideLoading,
  showToast, syncSettingsUI
} from './ui.js';

// ── App State ──
let state = {
  weatherData: null,
  currentCity: null,
  prefs: getPreferences(),
  selectedDate: getLocalTodayString() // Defaults to local today
};

// ════════════════════════════════════════
// Initialization & Core
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  syncSettingsUI(state.prefs);
  bindEvents();
  await loadInitialWeather();
});

async function fetchGPSLocation(silent = false) {
  try {
    const pos = await getCurrentPosition();
    state.currentCity = {
      name: '📍 Ubicación Actual',
      lat: pos.lat,
      lon: pos.lon,
      country: '',
      region: '',
      countryCode: ''
    };
    setLastCity(state.currentCity);
    renderCityName(state.currentCity);
    
    if (silent) {
      state.weatherData = await fetchWeather(pos.lat, pos.lon, true);
      renderAll();
    } else {
      await loadWeather(pos.lat, pos.lon, true);
    }
    return true;
  } catch (gpsError) {
    return false;
  }
}

async function loadInitialWeather() {
  const cachedWeather = getCachedWeatherForce();
  const lastCity = getLastCity();

  // Optimistic Render (Stale-while-revalidate)
  if (cachedWeather && lastCity) {
    state.currentCity = lastCity;
    state.weatherData = cachedWeather;
    renderCityName(lastCity);
    renderAll();
    
    // Silently fetch GPS and update data in background
    fetchGPSLocation(true);
    return;
  }

  showLoading();

  try {
    const success = await fetchGPSLocation();
    
    if (!success) {
      if (lastCity) {
        state.currentCity = lastCity;
        renderCityName(lastCity);
        showToast('GPS denegado. Mostrando última ciudad.');
        await loadWeather(lastCity.lat, lastCity.lon);
      } else {
        state.currentCity = {
          name: 'Santiago',
          lat: -33.4489,
          lon: -70.6693,
          country: 'Chile',
          region: 'Región Metropolitana',
          countryCode: 'CL'
        };
        renderCityName(state.currentCity);
        showToast('Ubicación denegada. Mostrando Santiago por defecto.');
        await loadWeather(-33.4489, -70.6693);
      }
    }
  } catch (error) {
    hideLoading();
    showToast('Error: ' + (error.message || 'No se pudo cargar el clima'));
  }
}

function getPresetHours() {
  const activeChip = document.querySelector('#time-presets .chip.selected')
    || document.querySelector('#time-presets .chip');
  if (!activeChip) return { startH: 0, endH: 23 };
  return {
    startH: parseInt(activeChip.dataset.start, 10),
    endH: parseInt(activeChip.dataset.end, 10)
  };
}

function renderAll() {
  if (!state.weatherData) return;
  renderCurrentWeather(state.weatherData, state.prefs.unit);
  renderDaySelector(state.weatherData.daily, state.selectedDate, handleDaySelect, state.prefs.unit);

  const dayHourly = getHourlyForDate(state.weatherData, state.selectedDate);
  const { startH, endH } = getPresetHours();
  renderTimeline(dayHourly, state.selectedDate, state.prefs.unit, startH, endH);

  renderForecast(state.weatherData.daily, state.prefs.unit);
  
  hideLoading();
  generateRecommendation();
}

async function loadWeather(lat, lon, forceRefresh = false) {
  try {
    state.weatherData = await fetchWeather(lat, lon, forceRefresh);
    renderAll();
    
    if (state.weatherData._offline) {
      showToast('📡 Sin conexión. Mostrando datos guardados.');
    }
  } catch (error) {
    hideLoading();
    showToast('Error al cargar el clima: ' + error.message);
  }
}

function handleDaySelect(dateStr) {
  state.selectedDate = dateStr;
  updateTimelineHighlight();
  generateRecommendation(); 
}

// ════════════════════════════════════════
// Event Binding
// ════════════════════════════════════════

function bindEvents() {
  // Bottom Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
    });
  });

  // Refresh
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    const btn = document.getElementById('btn-refresh');
    btn.querySelector('span').classList.add('refreshing');

    const success = await fetchGPSLocation();

    if (success) {
      showToast('📍 Ubicación actualizada');
    } else {
      if (state.currentCity) {
        await loadWeather(state.currentCity.lat, state.currentCity.lon, true);
        showToast('🔄 Sin GPS, actualizando ciudad actual');
      }
    }

    btn.querySelector('span').classList.remove('refreshing');
  });

  // Location button -> open modal
  document.getElementById('btn-location').addEventListener('click', () => {
    openSearchModal();
  });

  // Close modal
  document.getElementById('btn-close-modal').addEventListener('click', closeSearchModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeSearchModal);

  // City search input
  const searchInput = document.getElementById('search-input');
  const debouncedSearch = debounce(async (query) => {
    if (query.length < 2) {
      clearSearchResults();
      return;
    }
    const results = await searchCities(query);
    renderSearchResults(results, selectCity);
  }, 350);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Time Presets chips
  document.querySelectorAll('#time-presets .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#time-presets .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ timePreset: chip.dataset.preset });
      updateTimelineHighlight();
      generateRecommendation();
    });
  });

  // Occasion chips
  document.querySelectorAll('#occasion-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#occasion-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ occasion: chip.dataset.occasion });
      generateRecommendation();
    });
  });

  // Gender chips
  document.querySelectorAll('#gender-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#gender-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ gender: chip.dataset.gender });
      showToast(`Género: ${chip.textContent.trim()}`);
    });
  });

  // Unit chips
  document.querySelectorAll('#unit-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#unit-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ unit: chip.dataset.unit });

      if (state.weatherData) {
        renderAll();
      }

      showToast(`Unidades: ${chip.textContent.trim()}`);
    });
  });
}

// ════════════════════════════════════════
// City Selection
// ════════════════════════════════════════

function openSearchModal() {
  const modal = document.getElementById('modal-search');
  modal.classList.remove('hidden');

  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  clearSearchResults();

  const saved = getSavedCities();
  renderSavedCities(saved, selectCity, handleRemoveSavedCity);
}

function closeSearchModal() {
  document.getElementById('modal-search').classList.add('hidden');
}

async function selectCity(city) {
  closeSearchModal();
  showLoading();

  state.currentCity = city;
  setLastCity(city);
  addSavedCity(city);
  renderCityName(city);

  await loadWeather(city.lat, city.lon, true);
  hideRecommendation();

  showToast(`📍 ${city.name}`);
}

function handleRemoveSavedCity(city) {
  removeSavedCity(city.lat, city.lon);
  const saved = getSavedCities();
  renderSavedCities(saved, selectCity, handleRemoveSavedCity);
  showToast(`Eliminada: ${city.name}`);
}

// ════════════════════════════════════════
// Recommendation & Highlights
// ════════════════════════════════════════

function generateRecommendation() {
  if (!state.weatherData) return;

  const { startH: startHour, endH: endHour } = getPresetHours();
  const occasion = state.prefs.occasion;
  const gender = state.prefs.gender;

  const hourlyRange = getHourlyRangeForDate(state.weatherData, state.selectedDate, startHour, endHour);

  if (hourlyRange.length === 0) {
    showToast('No hay datos para ese rango horario. Prueba con otro.');
    return;
  }

  const rec = getRecommendation(hourlyRange, occasion, gender);
  renderRecommendation(rec, state.prefs.unit);
}

function updateTimelineHighlight() {
  if (!state.weatherData) return;
  const dayHourly = getHourlyForDate(state.weatherData, state.selectedDate);
  const { startH, endH } = getPresetHours();
  renderTimeline(dayHourly, state.selectedDate, state.prefs.unit, startH, endH);
}
