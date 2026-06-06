/**
 * worker.js — Web Worker
 * Ejecuta en un hilo separado al principal.
 * Recibe:  { type: "COMPUTE_STATS", books: Book[] }
 * Envía:   { type: "STATS_RESULT",  stats: StatsObject }
 *          { type: "WORKER_ERROR",  message: string }
 */

onmessage = function (event) {
  try {
    const { type, books } = event.data;

    if (type === 'COMPUTE_STATS') {
      const stats = computeStats(books);
      postMessage({ type: 'STATS_RESULT', stats });
    }
  } catch (error) {
    postMessage({ type: 'WORKER_ERROR', message: error.message });
  }
};

/**
 * Calcula todas las métricas del dashboard.
 * @param {Array} books
 * @returns {Object} stats
 */
function computeStats(books) {
  const total = books.length;

  /* Conteo por estado */
  const porEstado = { leido: 0, leyendo: 0, 'no-leido': 0 };
  books.forEach(b => {
    if (Object.prototype.hasOwnProperty.call(porEstado, b.estado)) {
      porEstado[b.estado]++;
    }
  });

  /* Calificación promedio (solo libros con rating > 0) */
  const conRating = books.filter(b => b.calificacion > 0);
  const sumRating  = conRating.reduce((sum, b) => sum + b.calificacion, 0);
  const promedioCalificacion = conRating.length > 0
    ? Math.round((sumRating / conRating.length) * 10) / 10
    : 0;

  /* Distribución por género */
  const porGenero = {};
  books.forEach(b => {
    if (b.genero) {
      porGenero[b.genero] = (porGenero[b.genero] || 0) + 1;
    }
  });

  /* Género con más libros */
  const generoFavorito = Object.keys(porGenero).length > 0
    ? Object.entries(porGenero).sort((a, b) => b[1] - a[1])[0][0]
    : '–';

  /* Top 5 mejor calificados (desc por rating, luego por fecha de creación desc) */
  const topRated = [...books]
    .filter(b => b.calificacion > 0)
    .sort((a, b) => {
      if (b.calificacion !== a.calificacion) return b.calificacion - a.calificacion;
      return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
    })
    .slice(0, 5);

  /* Porcentaje leído */
  const pctLeido = total > 0
    ? Math.round((porEstado.leido / total) * 100)
    : 0;

  /* Libros con notas */
  const totalConNotas = books.filter(b => b.notas && b.notas.trim()).length;

  return {
    total,
    porEstado,
    promedioCalificacion,
    porGenero,
    generoFavorito,
    topRated,
    pctLeido,
    totalConNotas
  };
}