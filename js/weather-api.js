// ═══════════════════════════════════════════
// ClimaStyle — Weather API
// Open-Meteo forecast & data normalization
// ═══════════════════════════════════════════

import { setCachedWeather, getCachedWeather, getCachedWeatherForce } from './storage.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch weather data from Open-Meteo.
 * Returns normalized data structure.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {boolean} forceRefresh - bypass cache
 * @returns {Promise<WeatherData>}
 *
 * @typedef {Object} WeatherData
 * @property {CurrentWeather} current
 * @property {HourlyData[]} hourly
 * @property {DailyData[]} daily
 */
export async function fetchWeather(lat, lon, forceRefresh = false) {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedWeather();
    if (cached && cached._lat === lat && cached._lon === lon) {
      return cached;
    }
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'wind_speed_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'uv_index',
      'wind_speed_10m',
      'wind_gusts_10m',
      'is_day'
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max',
      'weather_code'
    ].join(','),
    timezone: 'auto',
    forecast_days: 7
  });

  const url = `${BASE_URL}?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const raw = await response.json();
    const data = normalizeData(raw, lat, lon);

    // Cache the result
    setCachedWeather(data);

    return data;
  } catch (error) {
    console.warn('Weather fetch error:', error);

    // Try to return stale cache
    const stale = getCachedWeatherForce();
    if (stale) {
      stale._offline = true;
      return stale;
    }

    throw new Error('No se pudo obtener el clima. Verifica tu conexión.');
  }
}

/**
 * Normalize raw Open-Meteo response into a clean structure.
 */
function normalizeData(raw, lat, lon) {
  const { current, hourly, daily, timezone } = raw;

  // ── Current weather ──
  const currentData = {
    temp: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    precip: current.precipitation,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    isDay: current.is_day === 1
  };

  // ── Hourly (flatten arrays into objects) ──
  const hourlyData = hourly.time.map((time, i) => ({
    time,
    temp: hourly.temperature_2m[i],
    feelsLike: hourly.apparent_temperature[i],
    humidity: hourly.relative_humidity_2m[i],
    precipProb: hourly.precipitation_probability[i],
    precip: hourly.precipitation[i],
    weatherCode: hourly.weather_code[i],
    uvIndex: hourly.uv_index[i],
    windSpeed: hourly.wind_speed_10m[i],
    windGusts: hourly.wind_gusts_10m[i],
    isDay: hourly.is_day[i] === 1
  }));

  // ── Daily ──
  const dailyData = daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
    uvMax: daily.uv_index_max[i],
    precipProbMax: daily.precipitation_probability_max[i],
    weatherCode: daily.weather_code[i]
  }));

  return {
    current: currentData,
    hourly: hourlyData,
    daily: dailyData,
    timezone,
    _lat: lat,
    _lon: lon,
    _fetchedAt: Date.now(),
    _offline: false
  };
}

/**
 * Get hourly data for a specific date.
 * @param {WeatherData} data
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {HourlyData[]}
 */
export function getHourlyForDate(data, dateStr) {
  return data.hourly.filter(h => h.time.startsWith(dateStr));
}

/**
 * Get hourly data for a specific time range on a specific date.
 * @param {WeatherData} data
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} startHour - 0-23
 * @param {number} endHour - 0-23
 * @returns {HourlyData[]}
 */
export function getHourlyRangeForDate(data, dateStr, startHour, endHour) {
  const selectedDateObj = new Date(dateStr + 'T12:00:00');
  const nextDateObj = new Date(selectedDateObj.getTime() + 86400000);
  const nextDateStr = nextDateObj.getFullYear() + '-' + String(nextDateObj.getMonth()+1).padStart(2,'0') + '-' + String(nextDateObj.getDate()).padStart(2,'0');

  return data.hourly.filter(h => {
    const hDate = h.time.split('T')[0];
    const hHour = parseInt(h.time.split('T')[1].split(':')[0], 10);

    if (startHour <= endHour) {
      // Same day range (e.g., 8 to 18)
      return hDate === dateStr && hHour >= startHour && hHour <= endHour;
    } else {
      // Overnight range (e.g., 22 to 6)
      return (hDate === dateStr && hHour >= startHour) ||
             (hDate === nextDateStr && hHour <= endHour);
    }
  });
}

