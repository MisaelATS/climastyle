// ═══════════════════════════════════════════
// ClimaStyle — UI Renderer
// DOM rendering for all components
// ═══════════════════════════════════════════

import {
  getWeatherEmoji,
  getWeatherDescription,
  formatTemp,
  formatTime,
  formatDate,
  getUVLevel,
  getTempColor,
  escapeHtml
} from './utils.js';
import { getCountryFlag } from './geolocation.js';

// ── Cached DOM elements ──
let elements = {};

export function initUI() {
  elements = {
    loadingScreen: document.getElementById('loading-screen'),
    cityName: document.getElementById('city-name'),
    currentIcon: document.getElementById('current-icon'),
    currentTemp: document.getElementById('current-temp'),
    currentDesc: document.getElementById('current-desc'),
    todayMax: document.getElementById('today-max'),
    todayMin: document.getElementById('today-min'),
    detailFeels: document.getElementById('detail-feels'),
    detailHumidity: document.getElementById('detail-humidity'),
    detailWind: document.getElementById('detail-wind'),
    detailUV: document.getElementById('detail-uv'),
    timeline: document.getElementById('hourly-timeline'),
    timelineTitle: document.getElementById('timeline-title'),
    daySelector: document.getElementById('day-selector'),
    recResult: document.getElementById('recommendation-result'),
    recContent: document.getElementById('rec-content'),
    forecastList: document.getElementById('forecast-list'),
    searchResults: document.getElementById('search-results'),
    modalSavedList: document.getElementById('modal-saved-list'),
    savedCitiesList: document.getElementById('saved-cities-list'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg')
  };
}

// ════════════════════════════════════════
// Current Weather
// ════════════════════════════════════════

export function renderCurrentWeather(weatherData, unit = 'celsius') {
  const { current, daily } = weatherData;
  const today = daily[0];

  elements.currentIcon.textContent = getWeatherEmoji(current.weatherCode, current.isDay);
  elements.currentTemp.textContent = formatTemp(current.temp, unit);
  elements.currentDesc.textContent = getWeatherDescription(current.weatherCode);

  elements.todayMax.textContent = formatTemp(today.tempMax, unit);
  elements.todayMin.textContent = formatTemp(today.tempMin, unit);

  elements.detailFeels.textContent = formatTemp(current.feelsLike, unit);
  elements.detailHumidity.textContent = `${current.humidity}%`;
  elements.detailWind.textContent = `${Math.round(current.windSpeed)} km/h`;

  const uv = getUVLevel(today.uvMax);
  elements.detailUV.textContent = `${today.uvMax}`;
  elements.detailUV.style.color = uv.color;
  elements.detailUV.title = uv.label;
}

export function renderCityName(city) {
  if (city) {
    const display = city.region
      ? `${city.name}, ${city.region}`
      : city.name;
    elements.cityName.textContent = display;
  } else {
    elements.cityName.textContent = 'Ubicación desconocida';
  }
}

// ════════════════════════════════════════
// Day Selector
// ════════════════════════════════════════

export function renderDaySelector(dailyData, selectedDateStr, onSelect, unit = 'celsius') {
  if (!dailyData || dailyData.length === 0) return;

  const todayStr = new Date().toISOString().split('T')[0];

  elements.daySelector.innerHTML = dailyData.map(day => {
    const isToday = day.date === todayStr;
    const isSelected = day.date === selectedDateStr;
    const dateObj = new Date(day.date + 'T12:00:00');
    const dayName = isToday ? 'Hoy' : dateObj.toLocaleDateString('es-CL', { weekday: 'short' });
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return `
      <div class="day-chip ${isSelected ? 'selected' : ''}" data-date="${day.date}">
        <span class="day-name">${dayNameCap}</span>
        <span class="day-icon">${getWeatherEmoji(day.weatherCode, true)}</span>
        <span class="day-temp">${formatTemp(day.tempMax, unit)}</span>
      </div>
    `;
  }).join('');

  // Add click events
  elements.daySelector.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Remove selected from all
      elements.daySelector.querySelectorAll('.day-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      
      const rect = chip.getBoundingClientRect();
      const parentRect = elements.daySelector.getBoundingClientRect();
      if (rect.left < parentRect.left || rect.right > parentRect.right) {
         chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      onSelect(chip.dataset.date);
    });
  });
}


// ════════════════════════════════════════
// Hourly Timeline
// ════════════════════════════════════════

export function renderTimeline(hourlyData, selectedDateStr, unit = 'celsius', startHour = -1, endHour = -1) {
  if (!hourlyData || hourlyData.length === 0) {
    elements.timeline.innerHTML = '<p class="empty-msg">Sin datos horarios</p>';
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];
  
  if (selectedDateStr === todayStr) {
      elements.timelineTitle.textContent = "⏰ Próximas horas";
  } else {
      const dateObj = new Date(selectedDateStr + 'T12:00:00');
      const dayName = dateObj.toLocaleDateString('es-CL', { weekday: 'long' });
      elements.timelineTitle.textContent = `⏰ El clima para el ${dayName}`;
  }

  elements.timeline.innerHTML = hourlyData.map(h => {
    const hHour = parseInt(h.time.split('T')[1].split(':')[0], 10);
    const hDate = h.time.split('T')[0];
    const isNow = hDate === todayStr && hHour === currentHour;
    
    // Only show from current hour onwards if viewing today
    if (selectedDateStr === todayStr && hDate === todayStr && hHour < currentHour) {
        return '';
    }

    // Check if this hour is in the selected range
    let inRange = false;
    if (startHour >= 0 && endHour >= 0) {
      if (startHour <= endHour) {
        inRange = hDate === selectedDateStr && hHour >= startHour && hHour <= endHour;
      } else {
        const nextDateObj = new Date(new Date(selectedDateStr + 'T12:00:00').getTime() + 86400000);
        const nextDateStr = nextDateObj.toISOString().split('T')[0];
        inRange = (hDate === selectedDateStr && hHour >= startHour) || 
                  (hDate === nextDateStr && hHour <= endHour);
      }
    }

    const classes = ['hour-item'];
    if (isNow) classes.push('now');
    else if (inRange) classes.push('in-range');

    const precip = h.precipProb > 0
      ? `<span class="hour-precip">💧${h.precipProb}%</span>`
      : '';

    return `
      <div class="${classes.join(' ')}">
        <span class="hour-time">${isNow ? 'Ahora' : formatTime(h.time)}</span>
        <span class="hour-icon">${getWeatherEmoji(h.weatherCode, h.isDay)}</span>
        <span class="hour-temp" style="color: ${getTempColor(h.temp)}">${formatTemp(h.temp, unit)}</span>
        ${precip}
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════
// Recommendation Card
// ════════════════════════════════════════

export function renderRecommendation(rec, unit = 'celsius') {
  if (!rec) {
    elements.recResult.classList.add('hidden');
    return;
  }

  const { outfit, accessories, tips, summary, conditions } = rec;

  let html = '';

  // Header
  html += `
    <div class="rec-header">
      <span class="rec-header-icon">👔</span>
      <div class="rec-header-text">
        <h3>Recomendación del día</h3>
        <p>${escapeHtml(summary)}</p>
      </div>
    </div>
  `;

  // Weather summary for range
  if (conditions) {
    html += `
      <div class="rec-weather-summary">
        <span>🌡️ ${formatTemp(conditions.tempMin, unit)} a ${formatTemp(conditions.tempMax, unit)}</span>
        <span>🤒 Sensación ${formatTemp(conditions.feelsMin, unit)}</span>
        ${conditions.hasRain ? `<span>🌧️ ${conditions.maxPrecipProb}% lluvia</span>` : ''}
        ${conditions.maxUV > 0 ? `<span>☀️ UV ${conditions.maxUV}</span>` : ''}
        ${conditions.maxWind > 20 ? `<span>💨 ${conditions.maxWind} km/h</span>` : ''}
      </div>
    `;
  }

  // Outfit
  html += '<div class="rec-outfit-list">';
  outfit.forEach(item => {
    html += `
      <div class="rec-outfit-item">
        <span class="item-emoji">${item.emoji}</span>
        <div class="item-text">
          <span class="item-type">${escapeHtml(item.description)}</span>
        </div>
      </div>
    `;
  });
  html += '</div>';

  // Accessories
  if (accessories.length > 0) {
    html += '<p class="rec-outfit-title">🎒 Accesorios extra</p>';
    html += '<div class="rec-outfit-list">';
    accessories.forEach(item => {
      html += `
        <div class="rec-outfit-item">
          <span class="item-emoji">${item.emoji}</span>
          <div class="item-text">
            <span class="item-type">${escapeHtml(item.description)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  // Tips
  if (tips.length > 0) {
    html += '<p class="rec-outfit-title">💡 Tips</p>';
    html += '<div class="rec-tips">';
    tips.forEach(tip => {
      const icon = tip.substring(0, 2);
      const text = tip.substring(2).trim();
      html += `
        <div class="rec-tip">
          <span class="tip-icon">${icon}</span>
          <span>${escapeHtml(text)}</span>
        </div>
      `;
    });
    html += '</div>';
  }

  elements.recContent.innerHTML = html;
  elements.recResult.classList.remove('hidden');

  // Scroll to recommendation
  elements.recResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function hideRecommendation() {
  elements.recResult.classList.add('hidden');
}

// ════════════════════════════════════════
// 7-Day Forecast
// ════════════════════════════════════════

export function renderForecast(dailyData, unit = 'celsius') {
  if (!dailyData || dailyData.length === 0) {
    elements.forecastList.innerHTML = '<p class="empty-msg">Sin datos de pronóstico</p>';
    return;
  }

  // Find overall min/max for bar scaling
  const allMin = Math.min(...dailyData.map(d => d.tempMin));
  const allMax = Math.max(...dailyData.map(d => d.tempMax));
  const range = allMax - allMin || 1;

  const todayStr = new Date().toISOString().split('T')[0];

  elements.forecastList.innerHTML = dailyData.map(day => {
    const isToday = day.date === todayStr;
    const barLeft = ((day.tempMin - allMin) / range) * 100;
    const barWidth = ((day.tempMax - day.tempMin) / range) * 100;

    // Gradient color based on temps
    const colorMin = getTempColor(day.tempMin);
    const colorMax = getTempColor(day.tempMax);

    const precip = day.precipProbMax > 0
      ? `<span class="forecast-precip">💧${day.precipProbMax}%</span>`
      : '<span class="forecast-precip"></span>';

    return `
      <div class="forecast-day ${isToday ? 'today' : ''}">
        <div class="forecast-name">
          ${isToday ? 'Hoy' : formatDate(day.date)}
          ${!isToday ? `<span class="forecast-date">${new Date(day.date + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>` : ''}
        </div>
        <span class="forecast-icon">${getWeatherEmoji(day.weatherCode, true)}</span>
        ${precip}
        <div class="forecast-temps">
          <span class="forecast-temp-min">${formatTemp(day.tempMin, unit)}</span>
          <div class="forecast-bar-container">
            <div class="forecast-bar" style="left: ${barLeft}%; width: ${Math.max(barWidth, 4)}%; background: linear-gradient(90deg, ${colorMin}, ${colorMax});"></div>
          </div>
          <span class="forecast-temp-max">${formatTemp(day.tempMax, unit)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════
// City Search Results
// ════════════════════════════════════════

export function renderSearchResults(cities, onSelect) {
  if (!cities || cities.length === 0) {
    elements.searchResults.innerHTML = '<p class="empty-msg">Sin resultados</p>';
    return;
  }

  elements.searchResults.innerHTML = cities.map((city, i) => `
    <div class="search-item" data-index="${i}">
      <span class="search-item-icon">${getCountryFlag(city.countryCode)}</span>
      <div class="search-item-info">
        <span class="search-item-name">${escapeHtml(city.name)}</span>
        <span class="search-item-region">${escapeHtml([city.region, city.country].filter(Boolean).join(', '))}</span>
      </div>
    </div>
  `).join('');

  // Click handlers
  elements.searchResults.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index, 10);
      onSelect(cities[index]);
    });
  });
}

export function clearSearchResults() {
  elements.searchResults.innerHTML = '';
}

// ════════════════════════════════════════
// Saved Cities
// ════════════════════════════════════════

export function renderSavedCities(cities, onSelect, onRemove) {
  const renderList = (container, showRemove) => {
    if (!cities || cities.length === 0) {
      container.innerHTML = '<p class="empty-msg">Sin ciudades guardadas</p>';
      return;
    }

    container.innerHTML = cities.map((city, i) => `
      <div class="search-item saved-city-item" data-index="${i}">
        <span class="search-item-icon">${getCountryFlag(city.countryCode)}</span>
        <div class="search-item-info">
          <span class="search-item-name">${escapeHtml(city.name)}</span>
          <span class="search-item-region">${escapeHtml([city.region, city.country].filter(Boolean).join(', '))}</span>
        </div>
        ${showRemove ? `<button class="saved-city-remove" data-index="${i}" aria-label="Eliminar">✕</button>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-city-remove')) return;
        const index = parseInt(item.dataset.index, 10);
        onSelect(cities[index]);
      });
    });

    if (showRemove) {
      container.querySelectorAll('.saved-city-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index, 10);
          onRemove(cities[index]);
        });
      });
    }
  };

  // Render in both modal and settings
  renderList(elements.modalSavedList, false);
  renderList(elements.savedCitiesList, true);
}

// ════════════════════════════════════════
// View Management
// ════════════════════════════════════════

export function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
}

// ════════════════════════════════════════
// Loading & Toast
// ════════════════════════════════════════

export function showLoading() {
  elements.loadingScreen.classList.remove('hidden');
}

export function hideLoading() {
  elements.loadingScreen.classList.add('hidden');
}

let toastTimer = null;

export function showToast(message, duration = 3000) {
  elements.toastMsg.textContent = message;
  elements.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, duration);
}

// ════════════════════════════════════════
// Settings Chips Sync
// ════════════════════════════════════════

export function syncSettingsUI(prefs) {
  // Style chips (multi-select)
  const userStyles = prefs.styles || [];
  document.querySelectorAll('#style-chips .chip').forEach(chip => {
    chip.classList.toggle('selected', userStyles.includes(chip.dataset.style));
  });

  // Gender chips
  document.querySelectorAll('#gender-chips .chip').forEach(chip => {
    chip.classList.toggle('selected', chip.dataset.gender === prefs.gender);
  });

  // Unit chips
  document.querySelectorAll('#unit-chips .chip').forEach(chip => {
    chip.classList.toggle('selected', chip.dataset.unit === prefs.unit);
  });

  // Occasion chips
  document.querySelectorAll('#occasion-chips .chip').forEach(chip => {
    chip.classList.toggle('selected', chip.dataset.occasion === prefs.occasion);
  });

  // Time presets
  const activePreset = prefs.timePreset || 'all-day';
  document.querySelectorAll('#time-presets .chip').forEach(chip => {
    chip.classList.toggle('selected', chip.dataset.preset === activePreset);
  });
}

