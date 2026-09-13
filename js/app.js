// ═══════════════════════════════════════════
// ClimaStyle — App Entry Point
// Initialization, routing, event coordination
// ═══════════════════════════════════════════

import { fetchWeather, getHourlyForDate, getHourlyRangeForDate } from './weather-api.js';
import { getRecommendation } from './recommendations.js';
import { getCurrentPosition, searchCities } from './geolocation.js';
import { parseTimeToHour, debounce } from './utils.js';
import {
  getPreferences, savePreferences,
  getLastCity, setLastCity,
  getSavedCities, addSavedCity, removeSavedCity
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
  selectedDate: new Date().toISOString().split('T')[0] // Defaults to today
};

// ════════════════════════════════════════
// Initialization
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  syncSettingsUI(state.prefs);
  bindEvents();
  await loadInitialWeather();
});

async function loadInitialWeather() {
  showLoading();

  try {
    // Try last used city first
    const lastCity = getLastCity();

    if (lastCity) {
      state.currentCity = lastCity;
      renderCityName(lastCity);
      await loadWeather(lastCity.lat, lastCity.lon);
    } else {
      // Try GPS
      try {
        const pos = await getCurrentPosition();
        // Reverse geocode: use the coordinates as city
        state.currentCity = {
          name: 'Mi ubicación',
          lat: pos.lat,
          lon: pos.lon,
          country: '',
          region: '',
          countryCode: ''
        };
        renderCityName(state.currentCity);
        await loadWeather(pos.lat, pos.lon);

        // Try to get actual city name via search
        try {
          const results = await searchCities(`${pos.lat},${pos.lon}`);
          // This won't work well, but we keep the coords
        } catch (e) { /* ignore */ }

      } catch (gpsError) {
        // GPS failed, default to Santiago, Chile
        state.currentCity = {
          name: 'Santiago',
          lat: -33.4489,
          lon: -70.6693,
          country: 'Chile',
          region: 'Región Metropolitana',
          countryCode: 'CL'
        };
        renderCityName(state.currentCity);
        showToast(gpsError.message || 'Usando Santiago como ubicación por defecto');
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
  return {
    startH: parseInt(activeChip.dataset.start, 10),
    endH: parseInt(activeChip.dataset.end, 10)
  };
}

async function loadWeather(lat, lon, forceRefresh = false) {
  try {
    state.weatherData = await fetchWeather(lat, lon, forceRefresh);

    // Render all components
    renderCurrentWeather(state.weatherData, state.prefs.unit);
    renderDaySelector(state.weatherData.daily, state.selectedDate, handleDaySelect, state.prefs.unit);

    const dayHourly = getHourlyForDate(state.weatherData, state.selectedDate);
    const { startH, endH } = getPresetHours();
    renderTimeline(dayHourly, state.selectedDate, state.prefs.unit, startH, endH);

    renderForecast(state.weatherData.daily, state.prefs.unit);

    if (state.weatherData._offline) {
      showToast('📡 Sin conexión. Mostrando datos guardados.');
    }

    hideLoading();
    
    // Auto-generate outfit!
    generateRecommendation();
  } catch (error) {
    hideLoading();
    showToast('Error al cargar el clima: ' + error.message);
  }
}

function handleDaySelect(dateStr) {
  state.selectedDate = dateStr;
  updateTimelineHighlight();
  generateRecommendation(); // Auto-update outfit when day changes
}

// ════════════════════════════════════════
// Event Binding
// ════════════════════════════════════════

function bindEvents() {
  // ── Bottom Navigation ──
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
    });
  });

  // ── Refresh ──
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    if (!state.currentCity) return;
    const btn = document.getElementById('btn-refresh');
    btn.querySelector('span').classList.add('refreshing');
    await loadWeather(state.currentCity.lat, state.currentCity.lon, true);
    btn.querySelector('span').classList.remove('refreshing');
    showToast('✅ Clima actualizado');
  });

  // ── Location button → open modal ──
  document.getElementById('btn-location').addEventListener('click', () => {
    openSearchModal();
  });

  // ── Close modal ──
  document.getElementById('btn-close-modal').addEventListener('click', closeSearchModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeSearchModal);

  // ── City search input ──
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

  // ── Time Presets chips ──
  document.querySelectorAll('#time-presets .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#time-presets .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ timePreset: chip.dataset.preset });
      updateTimelineHighlight();
      generateRecommendation();
    });
  });

  // ── Occasion chips ──
  document.querySelectorAll('#occasion-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#occasion-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ occasion: chip.dataset.occasion });
      generateRecommendation();
    });
  });

  // ── Settings: Style chips (Multi-select) ──
  document.querySelectorAll('#style-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const style = chip.dataset.style;
      let currentStyles = state.prefs.styles || [];
      
      if (currentStyles.includes(style)) {
        currentStyles = currentStyles.filter(s => s !== style);
      } else {
        currentStyles.push(style);
      }
      
      chip.classList.toggle('selected');
      state.prefs = savePreferences({ styles: currentStyles });
    });
  });

  // ── Settings: Gender chips ──
  document.querySelectorAll('#gender-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#gender-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ gender: chip.dataset.gender });
      showToast(`Género: ${chip.textContent.trim()}`);
    });
  });

  // ── Settings: Unit chips ──
  document.querySelectorAll('#unit-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#unit-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.prefs = savePreferences({ unit: chip.dataset.unit });

      // Re-render with new units
      if (state.weatherData) {
        renderCurrentWeather(state.weatherData, state.prefs.unit);
        renderDaySelector(state.weatherData.daily, state.selectedDate, handleDaySelect, state.prefs.unit);
        const dayHourly = getHourlyForDate(state.weatherData, state.selectedDate);
        const startH = parseTimeToHour(state.prefs.timeStart);
        const endH = parseTimeToHour(state.prefs.timeEnd);
        renderTimeline(dayHourly, state.selectedDate, state.prefs.unit, startH, endH);
        renderForecast(state.weatherData.daily, state.prefs.unit);
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

  // Render saved cities
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
// Recommendation
// ════════════════════════════════════════

function generateRecommendation() {
  if (!state.weatherData) return;

  const { startH: startHour, endH: endHour } = getPresetHours();
  const occasion = state.prefs.occasion;
  const gender = state.prefs.gender;
  const styles = state.prefs.styles || [];

  // Get weather data for the selected time range
  const hourlyRange = getHourlyRangeForDate(state.weatherData, state.selectedDate, startHour, endHour);

  if (hourlyRange.length === 0) {
    showToast('No hay datos para ese rango horario. Prueba con otro.');
    return;
  }

  const rec = getRecommendation(hourlyRange, occasion, gender, styles);
  renderRecommendation(rec, state.prefs.unit);
}

// ════════════════════════════════════════
// Timeline Highlight Update
// ════════════════════════════════════════

function updateTimelineHighlight() {
  if (!state.weatherData) return;
  const dayHourly = getHourlyForDate(state.weatherData, state.selectedDate);
  const { startH, endH } = getPresetHours();
  renderTimeline(dayHourly, state.selectedDate, state.prefs.unit, startH, endH);
}

