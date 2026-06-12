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
    const raw = query.trim();
    const q = normalize(raw);
    const words = q.split(/\s+/).filter(w => w.length > 1);

    const monsters = data.filter(d => d.category === 'Monstruo');
    const weapons = data.filter(d => d.category === 'Arma');
    const cats = data.filter(d => d.category === 'Categoría');

    function formatList(items) {
      return items.map(item => `**${item.title}**`).join(', ');
    }

    function normalizeKeywords(text) {
      return normalize(text).replace(/[^a-z0-9\s]/g, ' ').trim();
    }

    function findTargetByTerm(term) {
      const termNorm = normalizeKeywords(term);
      if (!termNorm) return null;

      const exact = data.find(item => normalize(item.title) === termNorm);
      if (exact) return exact;

      const partial = data.find(item => normalize(item.title).includes(termNorm) || item.keywords?.some(kw => normalize(kw) === termNorm));
      if (partial) return partial;

      return data.find(item => normalize(item.title).includes(termNorm) || item.keywords?.some(kw => normalize(kw).includes(termNorm)));
    }

    function guessTarget() {
      let target = null;
      let bestScore = 0;

      data.forEach(item => {
        let score = 0;
        const titleNorm = normalize(item.title);

        if (q.includes(titleNorm)) score += 12;
        titleNorm.split(' ').forEach(word => { if (word.length > 2 && q.includes(word)) score += 4; });

        if (item.keywords) {
          item.keywords.forEach(kw => {
            const kwNorm = normalize(kw);
            if (words.some(w => kwNorm.includes(w) || w.includes(kwNorm))) score += 2;
          });
        }

        if (item.category === 'Monstruo' && /(monstruo|wyvern|drag[oó]n|bestia)/.test(q)) score += 1;
        if (item.category === 'Arma' && /(arma|cuerpo a cuerpo|a distancia|bow|sword|hacha|espada|lanza|martillo|arco|ballesta)/.test(q)) score += 1;

        if (score > bestScore) { bestScore = score; target = item; }
      });

      return bestScore >= 6 ? target : null;
    }

    function describeMonster(item) {
      const parts = [];
      parts.push(`**${item.title}** es un ${item.type || 'monstruo'} del bestiario.`);
      if (item.element) {
        parts.push(`Está asociado al elemento **${item.element}**.`);
      } else {
        parts.push('No tiene un elemento principal definido.');
      }
      if (item.weakness?.length) {
        parts.push(`Sus principales debilidades son **${item.weakness.join('**, **')}**.`);
      }
      parts.push(`Puedes leer más en <a href="${resolveUrl(item.url)}">su página</a>.`);
      return parts.join(' ');
    }

    function describeWeapon(item) {
      const weaponType = item.weaponType || 'arma';
      const friendly = weaponType === 'A distancia' ? 'a distancia' : 'de cuerpo a cuerpo';
      return `La **${item.title}** es un arma ${friendly}. Más información en <a href="${resolveUrl(item.url)}">su página</a>.`;
    }

    function describeCategory(item) {
      return `La categoría **${item.title}** agrupa monstruos similares dentro del bestiario. Mira su página para descubrir quiénes pertenecen a ella: <a href="${resolveUrl(item.url)}">${item.title}</a>.`;
    }

    function describePage(item) {
      if (item.category === 'Cuenta') {
        return `Esta página te permite ${item.title.toLowerCase()}. Visítala aquí: <a href="${resolveUrl(item.url)}">${item.title}</a>.`;
      }
      return `Consulta la página de **${item.title}** en <a href="${resolveUrl(item.url)}">${item.title}</a>.`;
    }

    function answerMonster(item) {
      const isExplain = /(?:dime|cu[eé]ntame|explica|describe|qu[eé]\s+es|qu[eé]n|háblame|hablame)/.test(q);
      const isWeakness = /debil|weak/.test(q);
      const isElement = /elemento/.test(q);
      const isType = /tipo|clase|familia|especie/.test(q);
      const isPage = /donde|pagina|enlace|link|url/.test(q);
      const isBestWeapon = /(?:mejor arma|arma ideal|arma recomendada|arma para)/.test(q);

      if (isExplain) return describeMonster(item);
      if (isWeakness) {
        return item.weakness?.length
          ? `**${item.title}** es débil a **${item.weakness.join('**, **')}**.`
          : `No tengo datos de debilidades para **${item.title}**.`;
      }
      if (isElement) {
        return item.element
          ? `**${item.title}** está asociado al elemento **${item.element}**.`
          : `**${item.title}** no tiene un elemento principal definido.`;
      }
      if (isType) {
        return item.type
          ? `**${item.title}** es un ${item.type}.`
          : `**${item.title}** es un monstruo con categoría no especificada.`;
      }
      if (isBestWeapon) {
        if (item.weakness?.length) {
          return `Para enfrentar a **${item.title}**, prioriza armas que exploten su debilidad a **${item.weakness.join('**, **')}**. Un arma potente suele ser la mejor opción.`;
        }
        return `Para enfrentar a **${item.title}**, prioriza armas con alto daño y buena movilidad.`;
      }
      if (isPage) {
        return `Página de **${item.title}**: <a href="${resolveUrl(item.url)}">${item.title}</a>`;
      }
      return describeMonster(item);
    }

    function answerWeapon(item) {
      const isExplain = /(?:dime|cu[eé]ntame|explica|describe|qu[eé]\s+es|qu[eé]n|háblame|hablame)/.test(q);
      const isPage = /donde|pagina|enlace|link|url/.test(q);
      if (isExplain) return describeWeapon(item);
      if (isPage) {
        return `Página de **${item.title}**: <a href="${resolveUrl(item.url)}">${item.title}</a>`;
      }
      return describeWeapon(item);
    }

    function answerCategory(item) {
      if (/(?:dime|cu[eé]ntame|explica|describe|qu[eé]\s+es|qu[eé]n|háblame|hablame)/.test(q)) {
        return describeCategory(item);
      }
      return describeCategory(item);
    }

    function answerPage(item) {
      return describePage(item);
    }

    function listResults(label, items) {
      if (!items.length) return `No encontré resultados para ${label}.`;
      return `Aquí tienes ${items.length} ${label}: ${formatList(items)}.`;
    }

    const isGreeting = /^(hola|buenas|hey|saludos|buenos)/.test(q);
    if (isGreeting) {
      return 'Hola, cazador. Pregúntame por cualquier monstruo, arma o categoría del bestiario y te daré una respuesta detallada.';
    }

    const isThanks = /^(gracias|muchas gracias|gracia|buen[oa]s)$/.test(q);
    if (isThanks) {
      return 'De nada. Estoy aquí para ayudarte con el bestiario siempre que lo necesites.';
    }

    if (/(?:dime|mu[eé]strame|lista|muestra|qu[eé]es|qu[eé]\s+hay|quiero).*(?:monstruos|bichos|criaturas)/.test(q) || q === 'monstruos') {
      return listResults('monstruos del bestiario', monsters);
    }
    if (/(?:dime|mu[eé]strame|lista|muestra|qu[eé]es|qu[eé]\s+hay|quiero).*(?:armas?)/.test(q) || q === 'armas') {
      return listResults('armas disponibles', weapons);
    }
    if (/(?:dime|mu[eé]strame|lista|muestra|qu[eé]es|qu[eé]\s+hay|quiero).*(?:categor[ií]as?|tipos?)/.test(q)) {
      return listResults('categorías de monstruos', cats);
    }

    const weaknessMatch = q.match(/(?:monstruos?\s+)?d[eé]biles?\s+(?:al?|contra|al\s+elemento\s*)?(.+)/);
    if (weaknessMatch) {
      const elem = normalizeKeywords(weaknessMatch[1]);
      const found = monsters.filter(m => m.weakness && m.weakness.some(w => normalize(w).includes(elem)));
      if (found.length) {
        return `Los monstruos más vulnerables a **${weaknessMatch[1].trim()}** son: ${formatList(found)}.`;
      }
    }

    const typeMatch = q.match(/(?:monstruos?\s+)?(?:de\s+tipo|tipo)\s+(.+)/);
    if (typeMatch) {
      const tipo = normalizeKeywords(typeMatch[1]);
      const found = monsters.filter(m => m.type && normalize(m.type).includes(tipo));
      if (found.length) {
        return `Monstruos del tipo **${found[0].type}**: ${formatList(found)}.`;
      }
    }

    const elementMatch = q.match(/(?:monstruos?\s+)?(?:con\s+elemento|de\s+elemento|elemento)\s+(.+)/);
    if (elementMatch) {
      const elem = normalizeKeywords(elementMatch[1]);
      const found = monsters.filter(m => m.element && normalize(m.element).includes(elem));
      if (found.length) {
        return `Monstruos con elemento **${found[0].element}**: ${formatList(found)}.`;
      }
    }

    const target = guessTarget();
    if (target) {
      if (target.category === 'Monstruo') return answerMonster(target);
      if (target.category === 'Arma') return answerWeapon(target);
      if (target.category === 'Categoría') return answerCategory(target);
      return answerPage(target);
    }

    const altTarget = findTargetByTerm(raw);
    if (altTarget) {
      if (altTarget.category === 'Monstruo') return answerMonster(altTarget);
      if (altTarget.category === 'Arma') return answerWeapon(altTarget);
      if (altTarget.category === 'Categoría') return answerCategory(altTarget);
      return answerPage(altTarget);
    }

    const suggestions = data
      .filter(item => words.some(w => normalize(item.title).includes(w)))
      .slice(0, 4)
      .map(item => `**${item.title}**`);

    if (suggestions.length) {
      return `No encontré una respuesta exacta, pero puedo hablarte de: ${suggestions.join(', ')}.`;
    }

    return 'No tengo suficiente información para esa pregunta. Puedes pedirme información sobre monstruos, armas o categorías del bestiario.';
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
    const inputEl = document.getElementById('mh-input');
    const sendBtn = document.getElementById('mh-send');
    const storageKey = `mh-chat-history:${window.location.pathname}`;
    let isOpen = false;
    let chatHistory = [];

    function saveHistory() {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(chatHistory));
      } catch (error) {
        console.warn('No se pudo guardar el historial del chat:', error);
      }
    }

    function loadHistory() {
      try {
        const raw = sessionStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function renderHistory() {
      messagesEl.innerHTML = '';
      chatHistory.forEach(({ role, html }) => {
        const msg = document.createElement('div');
        msg.className = `mh-msg mh-msg--${role === 'user' ? 'user' : 'ai'}`;
        msg.innerHTML = `<div class="mh-msg__bubble">${html}</div>`;
        messagesEl.appendChild(msg);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addMessage(role, html) {
      const msg = document.createElement('div');
      msg.className = `mh-msg mh-msg--${role === 'user' ? 'user' : 'ai'}`;
      msg.innerHTML = `<div class="mh-msg__bubble">${html}</div>`;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      chatHistory.push({ role, html });
      saveHistory();
    }

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

    function formatText(text) {
      return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      addMessage('user', formatText(text));
      setTimeout(() => {
        addMessage('ai', formatText(buildResponse(text, wikiData)));
      }, 180);
    }

    chatHistory = loadHistory();
    if (chatHistory.length) {
      renderHistory();
    } else {
      addMessage('ai', 'Saludos, cazador. Soy el Archivista del Gremio, tu asistente profesional del bestiario.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
