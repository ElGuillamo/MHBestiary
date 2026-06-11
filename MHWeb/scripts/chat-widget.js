// ── chat-widget.js ───────────────────────────────────────
// Asistente local para MH Bestiary
// Sin API externa — responde con datos de wiki-data.json
// ─────────────────────────────────────────────────────────

(function () {

  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
  }

  function getDataPath() {
    const path = window.location.pathname;
    const base = path.includes('/MHWeb/')
      ? path.split('/MHWeb/')[0] + '/MHWeb/'
      : '/';
    return base + 'data/wiki-data.json';
  }

  function resolveUrl(url) {
    const path = window.location.pathname;
    const base = path.includes('/MHWeb/')
      ? path.split('/MHWeb/')[0] + '/MHWeb/'
      : '/';
    return base + url;
  }

  // ── Motor de respuestas ──────────────────────────────
  function buildResponse(query, data) {
    const q     = normalize(query);
    const words = q.split(/\s+/).filter(w => w.length > 1);

    const monsters = data.filter(d => d.category === 'Monstruo');
    const weapons  = data.filter(d => d.category === 'Arma');
    const cats     = data.filter(d => d.category === 'Categoría');

    // ── Listar todos los monstruos ───────────────────────
    if (/(?:que|cuales|lista|todos)\s+(?:monstruos?|bichos?|criaturas?)/.test(q) || q === 'monstruos') {
      return `Monstruos en el bestiario:\n${monsters.map(m => `**${m.title}**`).join(', ')}`;
    }

    // ── Listar todas las armas ───────────────────────────
    if (/(?:que|cuales|lista|todas)\s+(?:armas?)|^armas?$/.test(q)) {
      return `Armas disponibles:\n${weapons.map(w => `**${w.title}**`).join(', ')}`;
    }

    // ── Listar categorías ────────────────────────────────
    if (/(?:que|cuales|lista|todas)\s+(?:categorias?|tipos?)/.test(q)) {
      return `Categorías disponibles:\n${cats.map(c => `**${c.title}**`).join(', ')}`;
    }

    // ── Monstruos débiles a X ────────────────────────────
    const weakToMatch = q.match(/(?:monstruos?\s+)?d[eé]biles?\s+(?:al?|contra|al\s+elemento)?\s*(\w+)/);
    if (weakToMatch) {
      const elem = weakToMatch[1];
      const found = monsters.filter(m => m.weakness && m.weakness.some(w => normalize(w).includes(elem)));
      if (found.length) return `Monstruos débiles a **${elem}**:\n${found.map(m => `**${m.title}**`).join(', ')}`;
    }

    // ── Monstruos de tipo X ──────────────────────────────
    const typeListMatch = q.match(/(?:monstruos?\s+)?(?:de\s+tipo|tipo)\s+(.+)/);
    if (typeListMatch) {
      const tipo = typeListMatch[1].trim();
      const found = monsters.filter(m => m.type && normalize(m.type).includes(tipo));
      if (found.length) return `Monstruos de tipo **${found[0].type}**:\n${found.map(m => `**${m.title}**`).join(', ')}`;
    }

    // ── Monstruos con elemento X ─────────────────────────
    const elemListMatch = q.match(/(?:monstruos?\s+)?(?:con\s+elemento|de\s+elemento|elemento)\s+(\w+)/);
    if (elemListMatch) {
      const elem = elemListMatch[1];
      const found = monsters.filter(m => m.element && normalize(m.element).includes(elem));
      if (found.length) return `Monstruos con elemento **${found[0].element}**:\n${found.map(m => `**${m.title}**`).join(', ')}`;
    }

    // ── Buscar entidad concreta ──────────────────────────
    let target = null;
    let bestScore = 0;

    data.forEach(item => {
      let score = 0;
      const itemNorm = normalize(item.title);
      if (q.includes(itemNorm)) score += 10;
      itemNorm.split(' ').forEach(w => { if (w.length > 2 && q.includes(w)) score += 3; });
      if (item.keywords) {
        item.keywords.forEach(kw => {
          if (words.some(w => normalize(kw).includes(w) || w.includes(normalize(kw)))) score += 1;
        });
      }
      if (score > bestScore) { bestScore = score; target = item; }
    });

    if (target && bestScore >= 3) {
      // Debilidad
      if (/debil|weak/.test(q)) {
        if (target.weakness?.length) return `**${target.title}** es débil a: **${target.weakness.join('** y **')}**.`;
        return `No tengo datos de debilidades para **${target.title}**.`;
      }
      // Tipo
      if (/tipo|clase|especie/.test(q)) {
        if (target.type) return `**${target.title}** es de tipo **${target.type}**.`;
        return `**${target.title}** pertenece a la categoría **${target.category}**.`;
      }
      // Elemento
      if (/elemento/.test(q)) {
        if (target.category === 'Monstruo') {
          return target.element
            ? `**${target.title}** usa el elemento **${target.element}**.`
            : `**${target.title}** no tiene elemento asociado.`;
        }
      }
      // Dónde / página
      if (/donde|pagina|enlace|link|url/.test(q)) {
        return `Página de **${target.title}**: <a href="${resolveUrl(target.url)}">${target.title}</a>`;
      }
      // Respuesta general
      let resp = `**${target.title}**`;
      if (target.type)            resp += ` · Tipo: **${target.type}**`;
      if (target.element)         resp += ` · Elemento: **${target.element}**`;
      if (target.weakness?.length) resp += ` · Débil a: **${target.weakness.join(', ')}**`;
      if (target.weaponType)      resp += ` · Categoría: **${target.weaponType}**`;
      if (target.url)             resp += `\nPágina: <a href="${resolveUrl(target.url)}">${target.title}</a>`;
      return resp;
    }

    // Sin resultados — sugerir similares
    const suggestions = data
      .filter(d => words.some(w => w.length > 2 && normalize(d.title).includes(w)))
      .slice(0, 3).map(d => `**${d.title}**`).join(', ');

    return suggestions
      ? `No he encontrado una respuesta exacta. ¿Te refieres a: ${suggestions}?`
      : `No tengo información sobre eso. Prueba preguntando por un monstruo, arma o categoría concreta.`;
  }

  // ── Widget HTML ──────────────────────────────────────
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
        <span class="mh-chat-header__sub">Asistente local</span>
      </div>
      <div class="mh-chat-messages" id="mh-messages">
        <div class="mh-msg mh-msg--ai">
          <div class="mh-msg__bubble">
            Saludos, cazador.
            Soy el Archivista del Gremio, tu asistente profesional del bestiario.
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
    let wikiData = [];
    try {
      const res = await fetch(getDataPath());
      wikiData = await res.json();
    } catch { console.warn('wiki-data.json no encontrado'); }

    const { trigger, panel } = createWidget();
    const messagesEl = document.getElementById('mh-messages');
    const inputEl    = document.getElementById('mh-input');
    const sendBtn    = document.getElementById('mh-send');
    let isOpen = false;

    trigger.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('mh-chat-panel--open', isOpen);
      trigger.classList.toggle('mh-chat-trigger--open', isOpen);
      trigger.innerHTML = isOpen ? '✕' : '⚔';
      if (isOpen) setTimeout(() => inputEl.focus(), 250);
    });

    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    });

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    sendBtn.addEventListener('click', sendMessage);

    function addMessage(role, html) {
      const msg = document.createElement('div');
      msg.className = `mh-msg mh-msg--${role === 'user' ? 'user' : 'ai'}`;
      msg.innerHTML = `<div class="mh-msg__bubble">${html}</div>`;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function formatText(text) {
      return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      addMessage('user', text);
      setTimeout(() => {
        addMessage('ai', formatText(buildResponse(text, wikiData)));
      }, 180);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
