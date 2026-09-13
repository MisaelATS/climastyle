// ═══════════════════════════════════════════
// ClimaStyle — Storage
// localStorage wrapper for preferences & cache
// ═══════════════════════════════════════════

const KEYS = {
  PREFERENCES: 'climastyle_prefs',
  WEATHER_CACHE: 'climastyle_weather',
  SAVED_CITIES: 'climastyle_cities',
  LAST_CITY: 'climastyle_last_city'
};

/** Default preferences */
const DEFAULT_PREFS = {
  unit: 'celsius',        // 'celsius' | 'fahrenheit'
  gender: 'masculino',    // 'masculino' | 'femenino' | 'neutro'
  timeStart: '08:00',
  timeEnd: '18:00',
  occasion: 'trabajo'     // 'trabajo' | 'estudio' | 'salida' | 'especial'
  occasion: 'trabajo',     // 'trabajo' | 'estudio' | 'salida' | 'especial'
  styles: ['casual']
};

// ── Preferences ──

export function getPreferences() {
  try {
    const stored = localStorage.getItem(KEYS.PREFERENCES);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Error reading preferences:', e);
  }
  return { ...DEFAULT_PREFS };
}

export function savePreferences(prefs) {
  try {
    const current = getPreferences();
    const merged = { ...current, ...prefs };
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('Error saving preferences:', e);
    return prefs;
  }
}

// ── Weather Cache ──

/**
 * Get cached weather data if still fresh.
 * @param {number} maxAgeMs - max age in ms (default 15 minutes)
 * @returns {object|null} - { data, timestamp } or null
 */
export function getCachedWeather(maxAgeMs = 15 * 60 * 1000) {
  try {
    const stored = localStorage.getItem(KEYS.WEATHER_CACHE);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const age = Date.now() - parsed.timestamp;
    if (age < maxAgeMs) {
      return parsed.data;
    }
    return null;
  } catch (e) {
    console.warn('Error reading weather cache:', e);
    return null;
  }
}

/**
 * Get cached weather data regardless of age (for offline).
 */
export function getCachedWeatherForce() {
  try {
    const stored = localStorage.getItem(KEYS.WEATHER_CACHE);
    if (!stored) return null;
    return JSON.parse(stored).data;
  } catch (e) {
    return null;
  }
}

export function setCachedWeather(data) {
  try {
    localStorage.setItem(KEYS.WEATHER_CACHE, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Error caching weather:', e);
  }
}

// ── Saved Cities ──

/**
 * @returns {Array<{name: string, lat: number, lon: number, country: string, region: string}>}
 */
export function getSavedCities() {
  try {
    const stored = localStorage.getItem(KEYS.SAVED_CITIES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export function addSavedCity(city) {
  const cities = getSavedCities();
  // Avoid duplicates (by lat/lon proximity)
  const exists = cities.some(c =>
    Math.abs(c.lat - city.lat) < 0.01 && Math.abs(c.lon - city.lon) < 0.01
  );
  if (!exists) {
    cities.unshift(city);
    // Keep max 10 cities
    if (cities.length > 10) cities.pop();
    localStorage.setItem(KEYS.SAVED_CITIES, JSON.stringify(cities));
  }
}

export function removeSavedCity(lat, lon) {
  let cities = getSavedCities();
  cities = cities.filter(c =>
    !(Math.abs(c.lat - lat) < 0.01 && Math.abs(c.lon - lon) < 0.01)
  );
  localStorage.setItem(KEYS.SAVED_CITIES, JSON.stringify(cities));
}

// ── Last City ──

/**
 * @returns {{name: string, lat: number, lon: number, country: string, region: string}|null}
 */
export function getLastCity() {
  try {
    const stored = localStorage.getItem(KEYS.LAST_CITY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function setLastCity(city) {
  try {
    localStorage.setItem(KEYS.LAST_CITY, JSON.stringify(city));
  } catch (e) {
    console.warn('Error saving last city:', e);
  }
}

