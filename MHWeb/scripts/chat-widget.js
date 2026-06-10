// ── chat-widget.js ───────────────────────────────────────
// Widget flotante de IA para MH Bestiary
// Usa la API de Anthropic (claude-sonnet-4-20250514)
// El system prompt se enriquece dinámicamente con search-index.json
// ─────────────────────────────────────────────────────────

(function () {

  const BASE_PROMPT = `Eres el Archivista del Gremio, un experto absoluto en Monster Hunter World: Iceborne y en el MH Bestiary, una web de referencia sobre esta saga.

Tu conocimiento cubre:
- Todos los monstruos: debilidades elementales, partes rompibles, comportamiento, habitat, lore
- Todas las armas: tipos, mecánicas de combate, árboles de mejora, estilos de juego recomendados
- Mecánicas del juego: sistema de daño, elementos, estados alterados, mantos, Palicos, Tailriders
- Consejos de caza: builds, estrategias, preparación, consumibles
- Progresión: rangos Bajo, Alto y Maestro, historia, misiones clave

Responde siempre en español, de forma concisa y útil. Puedes usar negrita (**texto**) para destacar nombres importantes. Mantén un tono épico pero claro, como un veterano del gremio hablando con un cazador. Si no sabes algo con certeza, dilo honestamente.`;

  // ── Calcular ruta al JSON (igual que searchbar.js) ───
  function getIndexPath() {
    const path = window.location.pathname;
    const base = path.includes('/MHWeb/')
      ? path.split('/MHWeb/')[0] + '/MHWeb/'
      : '/';
    return base + 'data/search-index.json';
  }

  // ── Cargar índice y construir system prompt ──────────
  async function buildSystemPrompt() {
    try {
      const res  = await fetch(getIndexPath());
      const data = await res.json();

      // Agrupar por categoría
      const groups = {};
      data.forEach(item => {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item.title);
      });

      const webContent = Object.entries(groups)
        .map(([cat, titles]) => `${cat}s disponibles en la web: ${titles.join(', ')}`)
        .join('\n');

      return `${BASE_PROMPT}

Además, esta es la lista exacta de contenido disponible en MH Bestiary:
${webContent}

Cuando el usuario pregunte por algo de esta lista, puedes indicarle que existe una página dedicada en la web.`;

    } catch {
      return BASE_PROMPT;
    }
  }

  // ── Crear HTML del widget ────────────────────────────
  function createWidget() {
    const trigger = document.createElement('button');
    trigger.className = 'mh-chat-trigger';
    trigger.setAttribute('aria-label', 'Abrir asistente del gremio');
    trigger.innerHTML = '⚔';

    const panel = document.createElement('div');
    panel.className = 'mh-chat-panel';
    panel.innerHTML = `
      <div class="mh-chat-header">
        <span class="mh-chat-header__icon">🐉</span>
        <span class="mh-chat-header__title">Archivista del Gremio</span>
        <span class="mh-chat-header__sub">IA experta</span>
      </div>
      <div class="mh-chat-messages" id="mh-messages">
        <div class="mh-msg mh-msg--ai">
          <div class="mh-msg__bubble">
            Saludos, cazador. Soy el Archivista del Gremio. Pregúntame sobre monstruos, armas, mecánicas o cualquier detalle de <strong>Monster Hunter World: Iceborne</strong>.
          </div>
        </div>
      </div>
      <div class="mh-chat-input-area">
        <textarea class="mh-chat-input" id="mh-input" placeholder="Pregunta al gremio..." rows="1"></textarea>
        <button class="mh-chat-send" id="mh-send" aria-label="Enviar">›</button>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(panel);
    return { trigger, panel };
  }

  // ── Init ─────────────────────────────────────────────
  async function initWidget() {
    // Cargar el system prompt enriquecido en paralelo con el DOM
    const systemPromptPromise = buildSystemPrompt();

    const { trigger, panel } = createWidget();
    const messagesEl = document.getElementById('mh-messages');
    const inputEl    = document.getElementById('mh-input');
    const sendBtn    = document.getElementById('mh-send');

    let isOpen    = false;
    let isLoading = false;
    let SYSTEM_PROMPT = BASE_PROMPT; // fallback hasta que cargue
    const history = [];

    // Actualizar con el prompt enriquecido cuando esté listo
    systemPromptPromise.then(prompt => { SYSTEM_PROMPT = prompt; });

    trigger.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('mh-chat-panel--open', isOpen);
      trigger.classList.toggle('mh-chat-trigger--open', isOpen);
      trigger.innerHTML = isOpen ? '✕' : '⚔';
      if (isOpen) setTimeout(() => inputEl.focus(), 250);
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    });

    // Enter envía, Shift+Enter nueva línea
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    sendBtn.addEventListener('click', sendMessage);

    // ── Añadir burbuja ────────────────────────────────
    function addMessage(role, text) {
      const msg = document.createElement('div');
      msg.className = `mh-msg mh-msg--${role === 'user' ? 'user' : 'ai'}`;
      msg.innerHTML = `<div class="mh-msg__bubble">${formatText(text)}</div>`;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return msg;
    }

    function formatText(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    function showTyping() {
      const msg = document.createElement('div');
      msg.className = 'mh-msg mh-msg--ai mh-msg--typing';
      msg.id = 'mh-typing';
      msg.innerHTML = `<div class="mh-msg__bubble">
        <span class="mh-typing-dot"></span>
        <span class="mh-typing-dot"></span>
        <span class="mh-typing-dot"></span>
      </div>`;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
      const t = document.getElementById('mh-typing');
      if (t) t.remove();
    }

    // ── Enviar mensaje ────────────────────────────────
    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isLoading) return;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      addMessage('user', text);
      history.push({ role: 'user', content: text });

      isLoading = true;
      sendBtn.disabled = true;
      inputEl.disabled = true;
      showTyping();

      try {
        // Asegurarse de que el system prompt esté listo
        SYSTEM_PROMPT = await systemPromptPromise;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: history
          })
        });

        const data  = await response.json();
        const reply = data.content?.[0]?.text || 'No he podido obtener una respuesta. Inténtalo de nuevo.';

        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(0, 2);

        hideTyping();
        addMessage('ai', reply);

      } catch (err) {
        hideTyping();
        addMessage('ai', 'Ha ocurrido un error al contactar con el gremio. Comprueba tu conexión e inténtalo de nuevo.');
        console.error('Chat error:', err);
      } finally {
        isLoading = false;
        sendBtn.disabled = false;
        inputEl.disabled = false;
        inputEl.focus();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
