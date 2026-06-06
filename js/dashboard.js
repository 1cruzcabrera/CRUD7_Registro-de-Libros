/**
 * dashboard.js — Dashboard y comunicación con el Web Worker
 * Depende de: storage.js (getAllBooks, getSessionStart)
 *             crud.js    (renderStars, escapeHtml, showToast)
 *             worker.js  (instanciado como Worker)
 */

/* Instancia única del Worker, creada la primera vez que se abre el dashboard */
let statsWorker = null;
let sessionTicker = null;

/* ═══════════════════════════════════════════════════════════════
   INICIALIZACIÓN
═══════════════════════════════════════════════════════════════ */

/**
 * Crea el Worker (si no existe) y solicita el cálculo de estadísticas.
 * Llamado desde app.js cada vez que se cambia a la vista Dashboard.
 */
function initDashboard() {
  try {
    if (!statsWorker) {
      statsWorker = new Worker('js/worker.js');
      statsWorker.onmessage = onWorkerMessage;
      statsWorker.onerror   = onWorkerError;
    }
    requestStats();
    // Actualiza inmediatamente y arranca el ticker para tiempo activo
    updateSessionInfo();
    startSessionTicker();
  } catch (error) {
    console.error('[dashboard] Error inicializando dashboard:', error);
  }
}

/**
 * Inicia el intervalo que actualiza el tiempo activo en la UI.
 */
function startSessionTicker() {
  try {
    if (sessionTicker) return; // ya iniciado
    sessionTicker = setInterval(() => {
      updateSessionInfo();
    }, 1000);
  } catch (error) {
    console.error('[dashboard] Error iniciando ticker de sesión:', error);
  }
}

/**
 * Detiene el ticker del tiempo activo (llamar al cambiar de vista).
 */
function stopSessionTicker() {
  try {
    if (sessionTicker) {
      clearInterval(sessionTicker);
      sessionTicker = null;
    }
  } catch (error) {
    console.error('[dashboard] Error deteniendo ticker de sesión:', error);
  }
}

/**
 * Envía los libros al Worker para que calcule las estadísticas.
 * También llamado desde crud.js (refreshDashboard) tras cambios CRUD.
 */
function requestStats() {
  try {
    if (!statsWorker) return;
    statsWorker.postMessage({ type: 'COMPUTE_STATS', books: getAllBooks() });
  } catch (error) {
    console.error('[dashboard] Error enviando datos al Worker:', error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   COMUNICACIÓN CON EL WORKER
═══════════════════════════════════════════════════════════════ */

/**
 * Recibe el resultado del Worker y actualiza el DOM.
 * @param {MessageEvent} event
 */
function onWorkerMessage(event) {
  try {
    const { type, stats, message } = event.data;

    if (type === 'STATS_RESULT') {
      renderStatCards(stats);
      renderProgressBar(stats);
      renderGeneroChart(stats.porGenero);
      renderTopRated(stats.topRated);
    }

    if (type === 'WORKER_ERROR') {
      console.error('[dashboard] Error en Worker:', message);
    }
  } catch (error) {
    console.error('[dashboard] Error procesando mensaje del Worker:', error);
  }
}

function onWorkerError(err) {
  console.error('[dashboard] Worker error:', err.message);
  showToast('Error en el cálculo de estadísticas.', 'error');
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: STAT CARDS
═══════════════════════════════════════════════════════════════ */

/**
 * Actualiza los números de las tarjetas de métricas.
 * @param {Object} stats  Resultado de computeStats()
 */
function renderStatCards(stats) {
  try {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('stat-total-val',   stats.total);
    set('stat-leidos-val',  stats.porEstado.leido);
    set('stat-leyendo-val', stats.porEstado.leyendo);
    set('stat-noleido-val', stats.porEstado['no-leido']);

    set('stat-promedio-val',
      stats.total > 0 && stats.promedioCalificacion > 0
        ? `${stats.promedioCalificacion} ★`
        : '–'
    );

    set('stat-genero-val', stats.total > 0 ? stats.generoFavorito : '–');
  } catch (error) {
    console.error('[dashboard] Error renderizando tarjetas:', error);
  }
}

