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

/* ═══════════════════════════════════════════════════════════════
   RENDER: BARRA DE PROGRESO
═══════════════════════════════════════════════════════════════ */

function renderProgressBar(stats) {
  try {
    const fill    = document.getElementById('progress-fill');
    const pctEl   = document.getElementById('progress-pct');
    const descEl  = document.getElementById('progress-desc');

    if (fill)   fill.style.width = `${stats.pctLeido}%`;
    if (pctEl)  pctEl.textContent = `${stats.pctLeido}%`;
    if (descEl) descEl.textContent =
      `${stats.porEstado.leido} de ${stats.total} libro${stats.total !== 1 ? 's' : ''} leído${stats.porEstado.leido !== 1 ? 's' : ''}`;
  } catch (error) {
    console.error('[dashboard] Error renderizando barra de progreso:', error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: GRÁFICO DE GÉNEROS (barra CSS)
═══════════════════════════════════════════════════════════════ */

/**
 * Genera las barras CSS proporcionales al conteo por género.
 * @param {Object.<string, number>} porGenero
 */
function renderGeneroChart(porGenero) {
  try {
    const container = document.getElementById('genero-chart');
    if (!container) return;

    container.innerHTML = '';

    const entries = Object.entries(porGenero).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      container.innerHTML = '<p class="chart-empty">Sin datos de géneros aún.</p>';
      return;
    }

    const maxCount = entries[0][1];

    entries.forEach(([genre, count]) => {
      const pct  = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'bar-item';
      item.innerHTML = `
        <span class="bar-label" title="${escapeHtml(genre)}">${escapeHtml(genre)}</span>
        <div class="bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="bar-count">${count}</span>
      `;
      container.appendChild(item);
    });
  } catch (error) {
    console.error('[dashboard] Error renderizando gráfico de géneros:', error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: TOP 5 MEJOR CALIFICADOS
═══════════════════════════════════════════════════════════════ */

/**
 * @param {Array} books  Hasta 5 libros mejor calificados
 */
function renderTopRated(books) {
  try {
    const list = document.getElementById('top-rated-list');
    if (!list) return;

    list.innerHTML = '';

    if (!books || books.length === 0) {
      list.innerHTML = '<li class="top-empty">Sin libros calificados aún.</li>';
      return;
    }

    books.forEach((book, i) => {
      const li = document.createElement('li');
      li.className = 'top-item';
      li.innerHTML = `
        <div class="top-item-info">
          <span class="top-item-title">${i + 1}. ${escapeHtml(book.titulo)}</span>
          <span class="top-item-author">${escapeHtml(book.autor)} · ${book.anio}</span>
        </div>
        <span class="top-item-stars" aria-label="${book.calificacion} estrellas">
          ${renderStars(book.calificacion)}
        </span>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error('[dashboard] Error renderizando top calificados:', error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SESIÓN
═══════════════════════════════════════════════════════════════ */

/**
 * Calcula el tiempo transcurrido desde el inicio de sesión (SessionStorage)
 * y actualiza #session-info.
 */
function updateSessionInfo() {
  try {
    const el = document.getElementById('session-info');
    if (!el) return;

    const start   = new Date(getSessionStart());
    const now     = new Date();
    const diffMs  = now - start;
    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);

    let elapsed;
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      elapsed = `${h}h ${m}m`;
    } else {
      elapsed = `${diffMin}m ${diffSec}s`;
    }

    el.textContent =
      `🕐 Sesión iniciada: ${start.toLocaleTimeString('es-ES')}  ·  Tiempo activo: ${elapsed}`;
  } catch (error) {
    console.error('[dashboard] Error actualizando info de sesión:', error);
  }
}

/* ═══════════════════════════════════════════════════════════════
   API PÚBLICA
═══════════════════════════════════════════════════════════════ */

/**
 * Actualiza el dashboard en background tras cualquier cambio CRUD.
 * Llamado desde crud.js.
 */
function refreshDashboard() {
  requestStats();
}