/**
 * api.js — Consumo de API REST moderna
 * Geolocalización → Nominatim (ciudad) → Open-Meteo (clima)
 *
 * APIs utilizadas (gratuitas, sin clave):
 *   Nominatim:   https://nominatim.openstreetmap.org/reverse
 *   Open-Meteo:  https://api.open-meteo.com/v1/forecast
 */

/* Mapa de códigos WMO → descripción en español */
const WMO_CODES = {
  0: 'Cielos despejados',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  77: 'Granizo',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve ligeros',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta eléctrica',
  96: 'Tormenta con granizo leve',
  99: 'Tormenta con granizo intenso'
};

/**
 * Punto de entrada: solicita geolocalización y desencadena la cadena de APIs.
 * Llamado desde app.js al cambiar al Dashboard.
 */
function initWeatherWidget() {
  const cityEl = document.getElementById('weather-city');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');

  if (cityEl) cityEl.textContent = '⏳ Obteniendo ubicación…';
  if (tempEl) tempEl.textContent = '';
  if (descEl) descEl.textContent = '';

  if (!navigator.geolocation) {
    showWeatherError('Geolocalización no disponible en este navegador.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    onGeoSuccess,
    onGeoError,
    { timeout: 10000, maximumAge: 300000 }
  );
}

/**
 * Callback de éxito: recibe coordenadas y dispara ambas peticiones en paralelo.
 * @param {GeolocationPosition} position
 */
async function onGeoSuccess(position) {
  try {
    const { latitude: lat, longitude: lon } = position.coords;

    const [city, weather] = await Promise.all([
      getCityName(lat, lon),
      getWeather(lat, lon)
    ]);

    const cityEl = document.getElementById('weather-city');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');

    if (cityEl) cityEl.textContent = `📍 ${city}`;
    if (tempEl) tempEl.textContent = `🌡️ ${weather.temperature}°C  ·  💨 ${weather.windspeed} km/h`;
    if (descEl) descEl.textContent = weatherCodeToDesc(weather.weathercode);

  } catch (error) {
    console.error('[api] Error obteniendo clima:', error);
    showWeatherError('No se pudo obtener la información del clima.');
  }
}

/**
 * Obtiene el nombre de la ciudad usando Nominatim (OpenStreetMap).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function getCityName(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LibroLog/1.0 (university project)' }
    });

    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

    const data = await response.json();
    return (
      data.address.city    ||
      data.address.town    ||
      data.address.village ||
      data.address.county  ||
      data.address.state   ||
      'Ubicación desconocida'
    );
  } catch (error) {
    console.error('[api] Error en Nominatim:', error);
    return 'Ubicación desconocida';
  }
}

/**
 * Obtiene el clima actual usando Open-Meteo (sin API key).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ temperature: number, windspeed: number, weathercode: number }>}
 */
async function getWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

  const data = await response.json();
  return data.current_weather;
}

/**
 * Convierte un código WMO a descripción legible en español.
 * @param {number} code
 * @returns {string}
 */
function weatherCodeToDesc(code) {
  return WMO_CODES[code] || 'Condiciones variables';
}

/**
 * Callback de error de geolocalización.
 * @param {GeolocationPositionError} err
 */
function onGeoError(err) {
  const msgs = {
    1: 'Permiso de ubicación denegado.',
    2: 'Ubicación no disponible.',
    3: 'Tiempo de espera agotado al obtener ubicación.'
  };
  showWeatherError(msgs[err.code] || 'Error al obtener la ubicación.');
}

/**
 * Muestra un mensaje de error en el widget de clima.
 * @param {string} msg
 */
function showWeatherError(msg) {
  const cityEl = document.getElementById('weather-city');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');

  if (cityEl) cityEl.textContent = `⚠️ ${msg}`;
  if (tempEl) tempEl.textContent = '';
  if (descEl) descEl.textContent = '';
}