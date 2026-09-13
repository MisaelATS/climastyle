// ═══════════════════════════════════════════
// ClimaStyle — Geolocation
// GPS position & city search via Open-Meteo
// ═══════════════════════════════════════════

/**
 * Get user's current GPS position.
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Math.round(position.coords.latitude * 10000) / 10000,
          lon: Math.round(position.coords.longitude * 10000) / 10000
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Permiso de ubicación denegado. Busca tu ciudad manualmente.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Ubicación no disponible. Busca tu ciudad manualmente.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Tiempo de espera agotado. Busca tu ciudad manualmente.'));
            break;
          default:
            reject(new Error('Error de ubicación. Busca tu ciudad manualmente.'));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000 // 5 min cache
      }
    );
  });
}

/**
 * Search cities by name using Open-Meteo Geocoding API.
 * @param {string} query - City name to search
 * @returns {Promise<Array<{name: string, lat: number, lon: number, country: string, region: string}>>}
 */
export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=es&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error en búsqueda');

    const data = await response.json();

    if (!data.results || data.results.length === 0) return [];

    return data.results.map(r => ({
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      country: r.country ?? '',
      region: r.admin1 ?? '',
      countryCode: r.country_code ?? ''
    }));
  } catch (error) {
    console.warn('City search error:', error);
    return [];
  }
}

/**
 * Get the country flag emoji from a country code.
 * @param {string} code - ISO 3166-1 alpha-2 country code
 * @returns {string} Flag emoji or 📍
 */
export function getCountryFlag(code) {
  if (!code || code.length !== 2) return '📍';
  const offset = 127397;
  const chars = [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + offset));
  return chars.join('');
}

