// ═══════════════════════════════════════════
// ClimaStyle — Utils
// WMO weather codes, formatters, helpers
// ═══════════════════════════════════════════

/**
 * WMO Weather Code → emoji + description in Spanish
 * @see https://open-meteo.com/en/docs#weathervariables
 */
const WMO_CODES = {
  0:  { emoji: '☀️', desc: 'Despejado' },
  1:  { emoji: '🌤️', desc: 'Mayormente despejado' },
  2:  { emoji: '⛅', desc: 'Parcialmente nublado' },
  3:  { emoji: '☁️', desc: 'Nublado' },
  45: { emoji: '🌫️', desc: 'Neblina' },
  48: { emoji: '🌫️', desc: 'Niebla helada' },
  51: { emoji: '🌦️', desc: 'Llovizna ligera' },
  53: { emoji: '🌦️', desc: 'Llovizna moderada' },
  55: { emoji: '🌦️', desc: 'Llovizna densa' },
  56: { emoji: '🌧️', desc: 'Llovizna helada ligera' },
  57: { emoji: '🌧️', desc: 'Llovizna helada densa' },
  61: { emoji: '🌧️', desc: 'Lluvia ligera' },
  63: { emoji: '🌧️', desc: 'Lluvia moderada' },
  65: { emoji: '🌧️', desc: 'Lluvia fuerte' },
  66: { emoji: '🌧️', desc: 'Lluvia helada ligera' },
  67: { emoji: '🌧️', desc: 'Lluvia helada fuerte' },
  71: { emoji: '🌨️', desc: 'Nevada ligera' },
  73: { emoji: '🌨️', desc: 'Nevada moderada' },
  75: { emoji: '❄️', desc: 'Nevada fuerte' },
  77: { emoji: '🌨️', desc: 'Granizo fino' },
  80: { emoji: '🌦️', desc: 'Chubascos ligeros' },
  81: { emoji: '🌧️', desc: 'Chubascos moderados' },
  82: { emoji: '⛈️', desc: 'Chubascos fuertes' },
  85: { emoji: '🌨️', desc: 'Chubascos de nieve ligeros' },
  86: { emoji: '❄️', desc: 'Chubascos de nieve fuertes' },
  95: { emoji: '⛈️', desc: 'Tormenta eléctrica' },
  96: { emoji: '⛈️', desc: 'Tormenta con granizo ligero' },
  99: { emoji: '⛈️', desc: 'Tormenta con granizo fuerte' }
};

/**
 * Get weather emoji for a WMO code.
 * Uses night variants for codes 0-2 when isDay is false.
 */
export function getWeatherEmoji(code, isDay = true) {
  if (!isDay) {
    if (code === 0) return '🌙';
    if (code === 1) return '🌙';
    if (code === 2) return '☁️';
  }
  return WMO_CODES[code]?.emoji ?? '🌡️';
}

/**
 * Get weather description in Spanish for a WMO code.
 */
export function getWeatherDescription(code) {
  return WMO_CODES[code]?.desc ?? 'Desconocido';
}

/**
 * Format temperature with unit.
 * @param {number} tempC - Temperature in Celsius
 * @param {'celsius'|'fahrenheit'} unit
 * @returns {string}
 */
export function formatTemp(tempC, unit = 'celsius') {
  if (tempC == null || isNaN(tempC)) return '--°';
  const value = unit === 'fahrenheit' ? (tempC * 9 / 5) + 32 : tempC;
  return `${Math.round(value)}°`;
}

/**
 * Format an ISO time string to HH:MM.
 * @param {string} isoString - e.g. "2024-01-15T14:00"
 * @returns {string} e.g. "14:00"
 */
export function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format an ISO date string for display.
 * @param {string} isoString - e.g. "2024-01-15"
 * @returns {string} e.g. "Lun 15"
 */
export function formatDate(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString + 'T12:00:00');
  const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' });
  const dayNum = date.getDate();
  return `${capitalize(dayName)} ${dayNum}`;
}

/**
 * Format a full date for display.
 * @param {string} isoString
 * @returns {string} e.g. "Lunes 15 de enero"
 */
export function formatDateFull(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString + 'T12:00:00');
  return date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Get UV level classification.
 * @param {number} uv
 * @returns {{ level: string, color: string, label: string }}
 */
export function getUVLevel(uv) {
  if (uv == null || isNaN(uv)) return { level: 'unknown', color: 'var(--text-muted)', label: '--' };
  if (uv <= 2) return { level: 'low', color: 'var(--success)', label: 'Bajo' };
  if (uv <= 5) return { level: 'moderate', color: 'var(--warning)', label: 'Moderado' };
  if (uv <= 7) return { level: 'high', color: '#fb923c', label: 'Alto' };
  if (uv <= 10) return { level: 'very-high', color: 'var(--danger)', label: 'Muy alto' };
  return { level: 'extreme', color: '#c026d3', label: 'Extremo' };
}

/**
 * Get wind level classification.
 * @param {number} speed - km/h
 * @returns {{ level: string, label: string }}
 */
export function getWindLevel(speed) {
  if (speed == null || isNaN(speed)) return { level: 'unknown', label: '--' };
  if (speed < 12) return { level: 'calm', label: 'Calmo' };
  if (speed < 20) return { level: 'light', label: 'Leve' };
  if (speed < 30) return { level: 'moderate', label: 'Moderado' };
  if (speed < 50) return { level: 'strong', label: 'Fuerte' };
  return { level: 'very-strong', label: 'Muy fuerte' };
}

/**
 * Get the current hour (0-23).
 */
export function getCurrentHour() {
  return new Date().getHours();
}

/**
 * Parse "HH:MM" string to hour number.
 * @param {string} timeStr - e.g. "14:30"
 * @returns {number} - e.g. 14
 */
export function parseTimeToHour(timeStr) {
  if (!timeStr) return 0;
  const [h] = timeStr.split(':').map(Number);
  return h;
}

/**
 * Check if an hour is within a range (handles overnight ranges).
 * @param {number} hour
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
export function isHourInRange(hour, start, end) {
  if (start <= end) {
    return hour >= start && hour <= end;
  }
  // Overnight range (e.g., 22 to 6)
  return hour >= start || hour <= end;
}

/**
 * Get a color for a temperature value.
 * @param {number} temp - Celsius
 * @returns {string} CSS color
 */
export function getTempColor(temp) {
  if (temp == null) return 'var(--text-primary)';
  if (temp < 5) return 'var(--temp-cold)';
  if (temp < 15) return 'var(--temp-cool)';
  if (temp < 25) return 'var(--temp-mild)';
  if (temp < 30) return 'var(--temp-warm)';
  return 'var(--temp-hot)';
}

/**
 * Capitalize first letter.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sanitize string for safe HTML insertion.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce function for search input.
 * @param {Function} fn
 * @param {number} delay - ms
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Check if it's currently daytime based on sunrise/sunset.
 * @param {string} sunrise - ISO time string
 * @param {string} sunset - ISO time string
 * @returns {boolean}
 */
export function isDaytime(sunrise, sunset) {
  if (!sunrise || !sunset) return true;
  const now = Date.now();
  const rise = new Date(sunrise).getTime();
  const set = new Date(sunset).getTime();
  return now >= rise && now <= set;
}

