/* ══════════════════════════════════════════════════════════════════════
   UI-КОНТРОЛЛЕР  (ui.js)
   ──────────────────────────────────────────────────────────────────────
   Связывает движок с интерфейсом. Знает про DOM, но не про таджвид.
   Цвета правил берёт из педагогического слоя (pedagogy.js), а не выдумывает.
══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const show = screenId => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(screenId).classList.add('active');
    window.scrollTo(0, 0);
  };

  // ── Применить цвет текущей темы (из педагогического слоя) к экрану ──
  function applyThemeAccent(themeId) {
    const accent = (typeof ruleAccent === 'function') ? ruleAccent(themeId) : 'var(--seal)';
    $('screen-exam').style.setProperty('--theme-accent', accent);
  }

  // ── Регистрация ──
  function validate() {
    const fields = [
      { key: 'name',  box: 'f-name',  input: 'in-name' },
      { key: 'group', box: 'f-group', input: 'in-group' },
    ];
    let ok = true; const data = {};
    fields.forEach(f => {
      const val = $(f.input).value.trim();
      data[f.key] = val;
      if (!val) { $(f.box).classList.add('invalid'); ok = false; }
      else { $(f.box).classList.remove('invalid'); }
    });
    return ok ? data : null;
  }

  function begin() {
    const data = validate();
    if (!data) return;
    // Ученик открывает ту активность, которую открыл преподаватель.
    // Приоритет: конфиг из сессии (собран по активности панели) → иначе обычный.
    let activity;
    if (window.SESSION_EXAM_CONFIG) {
      activity = window.SESSION_EXAM_CONFIG;
    } else if (typeof getOpenActivity === 'function') {
      activity = getOpenActivity();
    } else {
      activity = EXAM_CONFIG;
    }
    startExam(data, activity);
    renderTask();
    show('screen-exam');
    startTimer();
  }

  // ── Отрисовка задания ──
  // Выделить цветом раздел («нуна»/«мима») в тексте задания
  function highlightGroupWord(prompt) {
    var text = String(prompt || '');
    var map = { 'нуна': '#009c8e', 'мима': '#2563eb' };
    Object.keys(map).forEach(function (w) {
      text = text.replace(new RegExp('(' + w + ')', 'g'),
        '<span style="color:' + map[w] + '; font-weight:var(--weight-bold);">$1</span>');
    });
    // Условие задания, отмеченное **звёздочками**, выделяем красным
    // с подчёркиванием. В потоке однотипных вопросов «при остановке»
    // иначе проскакивает мимо глаз — и ученик отвечает про обычный мадд.
    text = text.replace(/\*\*(.+?)\*\*/g,
      '<span style="color:#a53a3a; font-weight:var(--weight-bold); ' +
      'text-decoration:underline; text-decoration-color:#a53a3a; ' +
      'text-underline-offset:3px;">$1</span>');
    return text;
  }

  function renderTask() {
    const task = currentTask();
    const total = session.taskOrder.length;
    const idx = session.currentIndex;

    // Название темы в шапке НЕ показываем НИКОГДА — ни на вопросах «какое
    // правило», ни на «найди в аяте», ни на распределении: везде это подсказка.
    $('screen-exam').style.setProperty('--theme-accent', 'var(--seal)');
    $('q-theme').textContent = '';

    $('q-cur').textContent = idx + 1;
    $('q-total').textContent = total;
    $('track-fill').parentElement.style.setProperty('--pct', ((idx + 1) / total * 100) + '%');

    $('q-no').textContent = 'Задание ' + (idx + 1);
    // В тексте задания выделяем цветом раздел («нуна»/«мима»), чтобы дети
    // сразу видели, что искать. Это не подсказка: раздел назван в самом вопросе.
    $('q-prompt').innerHTML = highlightGroupWord(task.prompt);

    // Метка правила на карточке примера — не показываем (это был бы ответ)
    const tag = document.getElementById('q-rule-tag');
    if (tag) tag.textContent = '';

    const wrap = $('q-options');
    wrap.innerHTML = '';
    const exampleCard = document.querySelector('.example');

    if (task.type === TASK_TYPES.SINGLE) {
      /* Одиночный: пример — герой в карточке, ниже варианты.
         Примера из библиотеки может не быть: у нулевого курса герой — слог,
         знак или отдельная буква, собранная на месте. А бывает, что героя
         нет вовсе («что такое танвин») — тогда карточку прячем, иначе над
         вопросом висела бы пустая рамка. */
      const examples = resolveExamples(task);
      const heroText = examples.length ? examples.map(e => e.text).join('   ') : (task.hero || '');
      exampleCard.style.display = heroText ? '' : 'none';
      $('q-example').textContent = heroText;
      renderSingle(task, wrap);
    } else if (task.type === TASK_TYPES.SORT) {
      // Распределение: героя-примера нет, есть объекты и группы
      exampleCard.style.display = 'none';
      renderSort(task, wrap);
    } else if (task.type === TASK_TYPES.RECITE) {
      // Чтение вслух: аят — герой, ниже запись голоса
      exampleCard.style.display = 'none';
      renderRecite(task, wrap);
    } else if (task.type === TASK_TYPES.FIND) {
      // Найди в аяте: аят в обрамлении, ученик подчёркивает места
      exampleCard.style.display = 'none';
      renderFind(task, wrap);
    } else {
      exampleCard.style.display = 'none';
      const note = document.createElement('div');
      note.style.cssText = 'color:var(--ink-faint);font-size:var(--text-sm);padding:var(--space-3) 0;';
      note.textContent = 'Этот тип задания появится позже.';
      wrap.appendChild(note);
    }
    updateNav();
  }

  function renderSingle(task, wrap) {
    const chosen = session.answers[task.id];
    const isTraining = session.mode && session.mode.showAnswersImmediately;
    const alreadyAnswered = chosen !== undefined;

    /* Варианты-буквы показываем крупно арабским, а не строкой: ребёнок
       узнаёт букву по начертанию, и мелкая подпись тут ничего не даёт.
       Под буквой её название — чтобы связать вид и звучание. */
    const asLetters = task.optionStyle === 'letter';
    if (asLetters) wrap.classList.add('opts-letters');
    else wrap.classList.remove('opts-letters');

    task.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'opt' + (chosen === opt.id ? ' on' : '') + (asLetters ? ' opt-letter' : '');
      btn.innerHTML = asLetters
        ? '<span class="opt-letter-ch">' + opt.label + '</span>' +
          (opt.sub ? '<span class="opt-letter-sub">' + opt.sub + '</span>' : '')
        : '<span class="dot"></span><span>' + opt.label + '</span>';

      // В тренировке после ответа — подсветка верного/неверного и блокировка
      if (isTraining && alreadyAnswered) {
        markTrainingOption(btn, opt.id, task.answer, chosen);
        btn.disabled = true;
        btn.style.cursor = 'default';
      } else {
        btn.addEventListener('click', () => {
          recordAnswer(task.id, opt.id);
          if (isTraining) {
            // Тренировка: сразу показать результат и объяснение, заблокировать
            renderTask();
          } else {
            // Экзамен: просто отметить выбор, без реакции
            wrap.querySelectorAll('.opt').forEach(o => o.classList.remove('on'));
            btn.classList.add('on');
          }
        });
      }
      wrap.appendChild(btn);
    });

    // В тренировке под вариантами — область объяснения
    if (isTraining && alreadyAnswered) {
      const chk = checkTask(task, chosen);
      showTrainingFeedback(wrap, task, chosen, chk);
    }
  }

  // Подсветить вариант в тренировке: верный — зелёным, ошибочный выбор — красным
  function markTrainingOption(btn, optId, correctId, chosenId) {
    if (optId === correctId) {
      btn.classList.add('opt-correct');
    } else if (optId === chosenId) {
      btn.classList.add('opt-wrong');
    }
  }

  // Показать примечание снизу: верно/неверно + объяснение (через абстракцию)
  function showTrainingFeedback(wrap, task, chosen, chk) {
    const box = document.createElement('div');
    const ok = chk.correct === true;
    box.className = 'feedback ' + (ok ? 'feedback-ok' : 'feedback-no');
    const head = ok ? '✓ Верно' : '✗ Неверно';
    const explain = (typeof getExplanation === 'function')
      ? getExplanation(task, chosen, chk) : '';
    box.innerHTML = '<div class="feedback-head">' + head + '</div>' +
                    '<div class="feedback-body">' + explain + '</div>';
    wrap.appendChild(box);
  }

  /* ── Тип SORT: распределение объектов по группам ──
     Взаимодействие: тап по объекту (выбрать) → тап по группе (положить).
     Просто и надёжно на телефоне. Ответ хранится как карта {itemId: groupId}. */
  function renderSort(task, wrap) {
    // Текущее размещение ученика (или пусто)
    const placement = session.answers[task.id] || {};
    let selectedItem = null;

    // Панель нераспределённых объектов
    const pool = document.createElement('div');
    pool.className = 'sort-pool';

    // Контейнер групп
    const groupsWrap = document.createElement('div');
    groupsWrap.className = 'sort-groups';

    /* Предмет распределения — обычно пример из библиотеки, но в нулевом
       курсе это буква, которой в библиотеке примеров нет. Тогда текст
       лежит в самом предмете. */
    function itemText(it) {
      if (it.text) return it.text;
      const ex = EXAMPLE_BY_ID[it.exampleRef];
      return ex ? ex.text : '?';
    }

    function redraw() {
      // Пул: объекты без группы
      pool.innerHTML = '<div class="sort-pool-label">Нажмите на слово, затем на группу</div>';
      const poolItems = document.createElement('div');
      poolItems.className = 'sort-chips';
      task.items.forEach(it => {
        if (placement[it.id]) return; // уже разложен
        poolItems.appendChild(makeChip(it));
      });
      pool.appendChild(poolItems);

      // Группы с их объектами
      groupsWrap.innerHTML = '';
      task.groups.forEach(g => {
        const box = document.createElement('button');
        box.className = 'sort-box';
        box.style.setProperty('--box-accent', (typeof ruleAccent === 'function') ? ruleAccent(g.id) : 'var(--seal)');
        box.innerHTML = '<span class="sort-box-title">' + g.label + '</span>';
        const inner = document.createElement('div');
        inner.className = 'sort-box-items';
        task.items.forEach(it => {
          if (placement[it.id] === g.id) inner.appendChild(makeChip(it, true));
        });
        box.appendChild(inner);
        box.addEventListener('click', () => {
          if (!selectedItem) return;
          placement[selectedItem] = g.id;
          selectedItem = null;
          recordAnswer(task.id, Object.assign({}, placement));
          redraw();
        });
        groupsWrap.appendChild(box);
      });
    }

    function makeChip(it, placed) {
      const chip = document.createElement('button');
      chip.className = 'sort-chip' + (selectedItem === it.id ? ' sel' : '') + (placed ? ' placed' : '');
      chip.innerHTML = '<span class="arabic sort-chip-ar">' + itemText(it) + '</span>';
      chip.addEventListener('click', e => {
        e.stopPropagation();
        if (placed) {
          // вернуть в пул
          delete placement[it.id];
          selectedItem = null;
          recordAnswer(task.id, Object.assign({}, placement));
          redraw();
        } else {
          selectedItem = (selectedItem === it.id) ? null : it.id;
          redraw();
        }
      });
      return chip;
    }

    wrap.appendChild(pool);
    wrap.appendChild(groupsWrap);
    redraw();
  }

  /* ── Тип RECITE: чтение аята вслух с записью голоса ──
     Аят — герой. Ниже: надпись-предупреждение, кнопка записи, прослушивание,
     удалить-перезаписать. Запись хранится в ответе (пока локально; отправка
     на Google Drive — следующий шаг). Оценивает преподаватель (manual). */
  /* ── Найди в аяте: ученик подчёркивает места правил ── */
  var FIND_GROUP_NAMES = { nun: 'нуна', mim: 'мима' };
  /* Подписи кнопок правил берём из общего списка вариантов (RULE_OPTIONS),
     а не из своей копии. Копия была четвёртой по счёту за проект и, как все
     предыдущие, отстала: в кнопках «найди в аяте» мадд показывался как
     madd_lazim_harfi. Теперь новая тема подписывается сама. */
  function findRuleLabel(id) {
    if (typeof RULE_OPTIONS !== 'undefined') {
      // у мима и нуна подписи общие: izhar_nun и izhar_mim оба «Изхар» —
      // семейство и так названо в вопросе
      var base = String(id).replace(/_(mim|nun)$/, '');
      var o = RULE_OPTIONS.filter(function (x) { return x.id === id; })[0]
           || RULE_OPTIONS.filter(function (x) { return x.id === base; })[0];
      if (o) return o.label;
    }
    return (typeof THEMES !== 'undefined' && THEMES[id]) ? THEMES[id].name : id;
  }

  function renderFind(task, wrap) {
    var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[task.ayahRef] : null;
    var words = ayah ? ayah.text.split(' ') : [];
    var groupColor = (typeof ruleAccent === 'function') ? ruleAccent(task.options[0]) : 'var(--seal)';

    // Умный перенос: слова, где есть правило, склеиваем со следующим словом
    // в неразрывную группу — чтобы правило на стыке не разорвалось переносом
    // строки (тогда черту всегда можно провести на одной строке).
    var targets = task.answer || {};
    var glueNext = {};   // индекс слова → приклеить к следующему
    Object.keys(targets).forEach(function (w) {
      var i = parseInt(w, 10);
      if (i < words.length - 1) glueNext[i] = true;   // не для последнего слова
    });

    // Собираем HTML. Каждое слово — span.fw. Чтобы правило на стыке не
    // разорвалось переносом, слово-цель и следующее слово соединяем
    // «неразрывным пробелом» вместо обычного: браузер не перенесёт между ними.
    // Обычные пробелы (где нет правила) остаются местами возможного переноса.
    var parts = words.map(function (w, idx) {
      return '<span class="fw" data-i="' + idx + '">' + w + '</span>';
    });
    var html = '';
    for (var k = 0; k < parts.length; k++) {
      html += parts[k];
      if (k < parts.length - 1) {
        // между словом-целью и следующим — неразрывный пробел (правило не рвётся)
        html += glueNext[k] ? '\u00A0' : ' ';
      }
    }

    wrap.innerHTML =
      '<div class="find-hint">Проведи пальцем черту под местом правила. Нажми на черту, чтобы убрать.</div>' +
      '<div class="mushaf" id="find-box">' +
        /* Скобки — отдельными значками, НЕ внутри текста аята: слова
           здесь измеряются по своим местам, и лишний знак сдвинул бы
           черты ученика. */
        '<div class="ayah-find" id="find-ayah">' +
          '<span class="ayah-br ayah-br-open">\uFD3F</span>' +
          html +
          '<span class="ayah-br ayah-br-close">\uFD3E</span>' +
        '</div>' +
        '<svg id="find-strokes"></svg>' +
      '</div>' +
      '<div class="find-count">Подчёркнуто: <b id="find-cnt" style="color:' + groupColor + '">0</b></div>' +
      '<div class="find-picker" id="find-picker">' +
        '<div class="find-picker-title">Какое это правило?</div>' +
        '<div class="find-btns" id="find-btns"></div>' +
        '<button class="find-cancel" id="find-cancel" type="button">Отмена</button>' +
      '</div>';

    setupFind(task, words, groupColor);
  }

  function setupFind(task, words, groupColor) {
    var box = document.getElementById('find-box');
    var svg = document.getElementById('find-strokes');
    var picker = document.getElementById('find-picker');
    // ответ ученика восстанавливаем, если возвращается к заданию
    var strokes = Array.isArray(session.answers[task.id]) ? session.answers[task.id].slice() : [];
    var drawing = null, pendingRemove = null;

    function syncSvg() {
      var r = box.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
      svg.setAttribute('width', r.width);
      svg.setAttribute('height', r.height);
    }

    function save() { recordAnswer(task.id, strokes.filter(function (s) { return s.rule; })); }

    function render() {
      svg.innerHTML = strokes.map(function (s) {
        var col = s.rule ? ruleAccent(s.rule) : groupColor;
        return '<line x1="' + s.x1 + '" y1="' + s.y + '" x2="' + s.x2 + '" y2="' + s.y +
               '" stroke="transparent" stroke-width="26" stroke-linecap="round"/>' +
               '<line x1="' + s.x1 + '" y1="' + s.y + '" x2="' + s.x2 + '" y2="' + s.y +
               '" stroke="' + col + '" stroke-width="4" stroke-linecap="round" opacity="' + (s.rule ? 1 : 0.5) + '"/>';
      }).join('') + (drawing ? '<line x1="' + drawing.x1 + '" y1="' + drawing.y + '" x2="' + drawing.x2 +
               '" y2="' + drawing.y + '" stroke="' + groupColor + '" stroke-width="4" stroke-linecap="round" opacity="0.4"/>' : '');
      var c = document.getElementById('find-cnt');
      if (c) c.textContent = strokes.filter(function (s) { return s.rule; }).length;
    }

    function pt(e) {
      var r = box.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }

    function strokeAt(p) {
      for (var i = strokes.length - 1; i >= 0; i--) {
        var s = strokes[i];
        var lo = Math.min(s.x1, s.x2) - 8, hi = Math.max(s.x1, s.x2) + 8;
        if (p.x >= lo && p.x <= hi && Math.abs(p.y - s.y) < 14) return i;
      }
      return -1;
    }

    function wordsUnder(x1, x2, y) {
      var r = box.getBoundingClientRect();
      var lo = Math.min(x1, x2), hi = Math.max(x1, x2), hits = [];
      box.querySelectorAll('.fw').forEach(function (el) {
        var b = el.getBoundingClientRect();
        var ex1 = b.left - r.left, ex2 = b.right - r.left, ey = b.bottom - r.top;
        if (Math.abs(ey - y) < 46 && ex2 > lo && ex1 < hi) hits.push(parseInt(el.getAttribute('data-i'), 10));
      });
      return hits.sort(function (a, b) { return a - b; });
    }

    function openPicker(idx) {
      var btns = document.getElementById('find-btns');
      btns.innerHTML = task.options.map(function (r) {
        return '<button type="button" class="find-btn" data-r="' + r + '" style="--bc:' + ruleAccent(r) + '">' +
               '<span class="find-dot"></span>' + findRuleLabel(r) + '</button>';
      }).join('');
      btns.querySelectorAll('.find-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          strokes[idx].rule = b.getAttribute('data-r');
          picker.classList.remove('up'); render(); save(); updateNav();
        });
      });
      picker.classList.add('up');
    }

    document.getElementById('find-cancel').addEventListener('click', function () {
      strokes.pop(); picker.classList.remove('up'); render();
    });

    function start(e) {
      var p = pt(e);
      var hit = strokeAt(p);
      if (hit !== -1) { drawing = null; pendingRemove = { i: hit, p: p }; return; }
      pendingRemove = null;
      drawing = { x1: p.x, x2: p.x, y: p.y };
    }
    function move(e) {
      if (pendingRemove) {
        var q = pt(e);
        if (Math.abs(q.x - pendingRemove.p.x) > 10 || Math.abs(q.y - pendingRemove.p.y) > 10) {
          drawing = { x1: pendingRemove.p.x, x2: q.x, y: pendingRemove.p.y }; pendingRemove = null;
        } else return;
      }
      if (!drawing) return;
      e.preventDefault();
      var p = pt(e); drawing.x2 = p.x; drawing.y = p.y; render();
    }
    function end() {
      if (pendingRemove) { strokes.splice(pendingRemove.i, 1); pendingRemove = null; render(); save(); updateNav(); return; }
      if (!drawing) return;
      var d = drawing; drawing = null;
      if (Math.abs(d.x2 - d.x1) < 12) { render(); return; }
      var hit = wordsUnder(d.x1, d.x2, d.y);
      if (!hit.length) { render(); return; }
      strokes.push({ x1: d.x1, x2: d.x2, y: d.y, words: hit, rule: null });
      // Если ищем только одно правило, спрашивать «какое?» бессмысленно —
      // оно названо в самом вопросе. Ставим сразу и не мучаем ребёнка
      // лишним нажатием.
      if (task.options && task.options.length === 1) {
        strokes[strokes.length - 1].rule = task.options[0];
        render(); save(); updateNav();
        return;
      }
      render(); openPicker(strokes.length - 1);
    }

    box.addEventListener('mousedown', start);
    box.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    box.addEventListener('touchstart', start, { passive: false });
    box.addEventListener('touchmove', move, { passive: false });
    box.addEventListener('touchend', end);

    syncSvg(); render();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncSvg(); render(); });
  }

  function renderRecite(task, wrap) {
    var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[task.ayahRef] : null;
    var ayahText = ayah ? ayah.text : '—';

    wrap.innerHTML =
      '<div class="mushaf recite-mushaf">' +
        '<div class="recite-label">Прочитайте с соблюдением правил</div>' +
        '<div class="ayah-find recite-ar-framed">' +
          '<span class="ayah-br">\uFD3F</span>' + ayahText + '<span class="ayah-br">\uFD3E</span>' +
        '</div>' +
      '</div>' +
      '<div class="rec-note">🎙️ Вашу запись услышит преподаватель. Перед отправкой убедитесь, ' +
        'что вас хорошо слышно. Если чтение не получилось — можно перезаписать.</div>' +
      '<div class="rec-zone">' +
        '<button class="rec-btn" id="rec-btn" type="button">●</button>' +
        '<div class="rec-status" id="rec-status">Нажмите, чтобы начать запись</div>' +
      '</div>' +
      '<div class="playback" id="playback">' +
        '<audio id="rec-audio" controls></audio>' +
        '<div class="playback-actions">' +
          '<button class="btn btn-quiet" id="btn-redo" type="button">Удалить и перезаписать</button>' +
        '</div>' +
      '</div>';

    // Если запись для этого задания уже есть — показать её
    var existing = session.answers[task.id];
    if (existing && existing.url) {
      document.getElementById('rec-audio').src = existing.url;
      document.getElementById('playback').classList.add('show');
      document.getElementById('rec-status').textContent = 'Запись готова. Можно послушать или перезаписать.';
    }

    setupRecorder(task);
  }

  // Логика записи для текущего recite-задания
  var recState = { mr: null, chunks: [], stream: null, timer: null, sec: 0 };

  function setupRecorder(task) {
    var recBtn = document.getElementById('rec-btn');
    var status = document.getElementById('rec-status');
    var playback = document.getElementById('playback');
    var audioEl = document.getElementById('rec-audio');
    if (!recBtn) return;

    function fmt(s) { var m = Math.floor(s/60), r = s%60; return m + ':' + String(r).padStart(2,'0'); }

    function start() {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        recState.stream = stream;
        recState.chunks = [];
        recState.mr = new MediaRecorder(stream);
        recState.mr.ondataavailable = function (e) { if (e.data.size > 0) recState.chunks.push(e.data); };
        recState.mr.onstop = function () {
          var blob = new Blob(recState.chunks, { type: recState.chunks[0] ? recState.chunks[0].type : 'audio/webm' });
          var url = URL.createObjectURL(blob);
          audioEl.src = url;
          playback.classList.add('show');
          recState.stream.getTracks().forEach(function (t) { t.stop(); });
          // Сохранить запись в ответ задания
          recordAnswer(task.id, { blob: blob, url: url, size: blob.size });
          // …и сразу отправить преподавателю, не дожидаясь конца работы.
          sendOneRecording(task, status);
        };
        recState.mr.start();
        recBtn.classList.add('recording');
        recBtn.textContent = '■';
        recState.sec = 0;
        status.innerHTML = 'Идёт запись… <span class="rec-timer">0:00</span>';
        recState.timer = setInterval(function () {
          recState.sec++;
          status.innerHTML = 'Идёт запись… <span class="rec-timer">' + fmt(recState.sec) + '</span>';
        }, 1000);
      }).catch(function () {
        status.textContent = 'Не удалось получить доступ к микрофону. Разрешите доступ в браузере.';
      });
    }

    function stop() {
      if (recState.mr && recState.mr.state !== 'inactive') recState.mr.stop();
      clearInterval(recState.timer);
      recBtn.classList.remove('recording');
      recBtn.textContent = '●';
      status.textContent = 'Запись готова. Послушайте себя ниже.';
    }

    recBtn.onclick = function () {
      if (recState.mr && recState.mr.state === 'recording') stop(); else start();
    };
    var redo = document.getElementById('btn-redo');
    if (redo) redo.onclick = function () {
      session.answers[task.id] = undefined;
      playback.classList.remove('show');
      audioEl.src = '';
      status.textContent = 'Запись удалена. Нажмите, чтобы записать заново.';
    };
  }

  function updateNav() {
    const idx = session.currentIndex;
    const last = session.taskOrder.length - 1;
    const backAllowed = session.mode ? session.mode.allowBack : true;
    $('btn-back').style.display = backAllowed ? '' : 'none';
    $('btn-back').disabled = idx === 0;
    if (idx === last) {
      $('btn-fwd').classList.add('hidden');
      $('btn-finish').classList.remove('hidden');
    } else {
      $('btn-fwd').classList.remove('hidden');
      $('btn-finish').classList.add('hidden');
    }
  }

  function fwd() { if (goNext()) renderTask(); }
  function back() { if (goBack()) renderTask(); }

  function askFinish() {
    const un = countUnanswered();
    const warn = session.mode ? session.mode.warnOnUnanswered : true;
    if (warn && un > 0) {
      $('dlg-title').textContent = 'Без ответа: ' + un;
      $('dlg-text').textContent = 'Некоторые вопросы ещё не отвечены. После завершения изменить ответы будет нельзя. Всё равно завершить?';
      // предупреждение стоит здесь же: закрыть вкладку, не завершив работу,
      // значит не сдать её вовсе — записи уйдут, а работа нет
      $('dlg-text').textContent += ' Работа доходит до преподавателя ТОЛЬКО после нажатия «Завершить».';
    } else {
      $('dlg-title').textContent = 'Завершить работу?';
      $('dlg-text').textContent = 'После завершения изменить ответы будет нельзя.';
    }
    $('scrim').classList.add('open');
  }
  function closeDlg() { $('scrim').classList.remove('open'); }

  /* «Вернуться» — не просто закрыть окно, а привести к ПЕРВОМУ вопросу
     без ответа. Раньше окно закрывалось, ученик оставался на последнем
     задании и найти пропущенное мог только листая назад вручную —
     а в домашке и тренировке кнопки «назад» тогда вовсе не было. */
  function backToUnanswered() {
    closeDlg();
    var idx = -1;
    for (var i = 0; i < session.taskOrder.length; i++) {
      var id = session.taskOrder[i];
      var a = session.answers[id];
      var empty = (a === undefined) ||
                  (Array.isArray(a) && !a.length) ||
                  (a && typeof a === 'object' && !Array.isArray(a) && !a.blob && !Object.keys(a).length);
      if (empty) { idx = i; break; }
    }
    if (idx >= 0 && typeof goTo === 'function') { goTo(idx); renderTask(); }
  }

  function doFinish() {
    closeDlg();
    stopTimer();
    const result = finishExam();
    renderResult(result);
    show('screen-result');
    // Результат уже показан ученику. Отправка в фоне — не блокирует экран.
    var shouldSend = session.mode ? session.mode.sendResult : true;
    if (shouldSend && typeof sendResultToSheets === 'function') {
      /* Ученик ДОЛЖЕН видеть, дошла ли работа. Раньше неудача уходила в
         служебный журнал, которого никто не читает: ребёнок был уверен,
         что сдал, а у преподавателя работы не было. */
      showDocButton(result);
      showSendState('sending');
      sendResultToSheets(result).then(function (r) {
        if (r.sent) { showSendState('sent'); return; }
        if (r.reason === 'no-url') { showSendState(null); return; }
        function retry() {
          showDocButton(result);
      showSendState('sending');
          sendResultToSheets(result).then(function (again) {
            showSendState(again.sent ? 'sent' : 'failed', retry);
          });
        }
        showSendState('failed', retry);
      });
      sendAllRecordings(result);
    }
  }

  /* Кнопка «скачать мою работу».
     Показываем ТОЛЬКО если в работе не было чтения: тогда балл, который
     ученик видит, — окончательный. Если чтение было, документ соберёт и
     раздаст преподаватель, уже с оценкой за чтение. Иначе ребёнок сохранит
     число, которое потом изменится, и покажет его дома. */
  function showDocButton(result) {
    var box = document.getElementById('doc-box');
    var wait = document.getElementById('doc-wait');
    if (!box || !wait) return;

    var hasRecite = (result.details || []).some(function (d) { return d.type === TASK_TYPES.RECITE; });
    if (hasRecite) { wait.style.display = ''; return; }
    if (typeof WorkDoc === 'undefined') return;

    box.style.display = '';
    var btn = document.getElementById('doc-save');
    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Собираю…';
      // документ ждёт те же поля, что панель показывает в разборе
      var r = {
        fullName: session.student.name, group: session.student.group,
        date: new Date().toLocaleDateString('ru'),
        exam: (typeof getOpenActivity === 'function' ? getOpenActivity().title : '') || 'Работа по таджвиду',
        autoScore: result.auto.percent,
        _total: Math.round(result.auto.percent),
        _reading: null, _waiting: false,
        review: (result.details || []).map(function (d) {
          return { t: d.theme, ty: d.type, a: d.studentAnswer, c: d.correctAnswer,
                   ok: d.correct, p: d.pending, pt: d.partial, an: d.answered };
        }),
      };
      WorkDoc.save(r, 'Садулаев Джохар').then(function (res) {
        btn.disabled = false; btn.textContent = 'Скачать мою работу';
        if (!res.ok) alert('Не удалось собрать документ. Попробуйте ещё раз.');
      });
    });
  }

  /* Полоска о судьбе работы на экране результата. */
  function showSendState(state, onRetry) {
    var box = document.getElementById('send-state');
    if (!box) return;
    if (!state) { box.style.display = 'none'; return; }
    box.style.display = '';
    if (state === 'sending') {
      box.className = 'send-state send-state-wait';
      box.textContent = 'Отправляю работу преподавателю…';
    } else if (state === 'sent') {
      box.className = 'send-state send-state-ok';
      box.textContent = '✓ Работа отправлена преподавателю';
    } else {
      box.className = 'send-state send-state-fail';
      box.innerHTML = 'Работа НЕ отправлена. Проверьте интернет. ' +
        '<button class="btn" id="send-retry" style="margin-top:8px;">Отправить ещё раз</button>';
      var b = document.getElementById('send-retry');
      if (b && onRetry) b.addEventListener('click', onRetry);
    }
  }

  /* Отправить ОДНУ запись сразу после того, как ученик её сделал.
     ──────────────────────────────────────────────────────────────────
     Почему сразу, а не в конце: аудио — единственное, что нельзя
     восстановить. Ответ на вопрос ученик может дать заново, а пропавшую
     запись придётся перезаписывать. Если телефон выключится или вкладка
     закроется на середине работы — уже отправленное чтение не потеряется.

     Отметка ans.sent нужна, чтобы финальная отправка не послала тот же
     файл второй раз. */
  function sendOneRecording(task, statusEl) {
    var shouldSend = session.mode ? session.mode.sendResult : true;
    if (!shouldSend || typeof sendRecording !== 'function') return;

    var ans = session.answers[task.id];
    if (!ans || !ans.blob) return;

    var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[task.ayahRef] : null;
    var meta = session.config ? { id: session.config.id, title: session.config.title } : null;

    // Показываем ход дела, но только если ученик всё ещё на этом задании:
    // он мог уйти вперёд, и тогда этой надписи на экране уже нет.
    function say(text) {
      if (statusEl && document.body.contains(statusEl)) statusEl.textContent = text;
    }
    say('Запись готова. Отправляю преподавателю…');

    sendRecording(session.student, task.ayahRef, ayah ? ayah.text : '', ans.blob, meta)
      .then(function (r) {
        if (r && r.sent) {
          ans.sent = true;
          say('Запись отправлена. Можно идти дальше.');
        } else {
          say('Запись сохранена. Отправим её в конце работы.');
        }
      })
      .catch(function () {
        say('Запись сохранена. Отправим её в конце работы.');
      });
  }

  // Добор в конце работы: отправляем только то, что ещё не ушло.
  // Обычно здесь уже пусто — записи уходят сразу после записи. Это
  // страховка на случай, если отправка тогда не удалась.
  function sendAllRecordings(result) {
    if (typeof sendRecording !== 'function') return;
    var meta = session.config ? { id: session.config.id, title: session.config.title } : null;
    session.taskOrder.forEach(function (taskId) {
      var task = getTask(taskId);
      if (!task || task.type !== TASK_TYPES.RECITE) return;
      var ans = session.answers[taskId];
      if (!ans || !ans.blob) return;   // нет записи — пропускаем
      if (ans.sent) return;            // уже ушла сразу после записи
      var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[task.ayahRef] : null;
      sendRecording(
        session.student,
        task.ayahRef,
        ayah ? ayah.text : '',
        ans.blob,
        meta
      );
    });
  }

  /* Балл в человеческом виде: 13.615384615384617 → «13,6».
     Целое остаётся целым, дробное округляется до одного знака. */
  function niceScore(n) {
    var v = Math.round(Number(n) * 10) / 10;
    return String(v).replace('.', ',');
  }

  function renderResult(r) {
    $('r-who').textContent = r.student.name;
    const mins = Math.floor(r.durationMs / 60000);
    const secs = Math.floor((r.durationMs % 60000) / 1000);
    /* «Группа» не приписываем, если преподаватель уже назвал её так —
       иначе выходит «Группа Группа 793». Та же оговорка, что в панели. */
    var grp = String(r.student.group || '');
    $('r-meta').textContent = (/^гр/i.test(grp) ? grp : 'Группа ' + grp) + ' · ответов ' +
      r.answeredCount + ' из ' + r.totalCount + ' · время ' + mins + ' мин ' + secs + ' сек';
    $('r-score').textContent = r.auto.percent;

    // Откуда взялась сотня. Без этой строки крупное число выглядит
    // взявшимся из воздуха — непонятно ни ученику, ни преподавателю.
    var howEl = document.getElementById('r-how');
    if (howEl) {
      howEl.textContent = 'набрано ' + niceScore(r.auto.earned) +
                          ' из ' + niceScore(r.auto.max) + ' возможных баллов';
    }

    // В тренировке чтение никто не проверяет — не обещаем итоговый балл.
    var isTraining = !!(session.mode && session.mode.sendResult === false);
    if (isTraining) {
      $('r-cap').textContent = 'результат тренировки';   // домашка сюда не попадает: она отправляется
      if (r.hasPendingManual) {
        $('r-pending').textContent = 'Чтение вслух в тренировке не оценивается — ' +
          'запись нужна, чтобы послушать себя. Балл за него ставится только на экзамене.';
        $('r-pending').classList.add('show');
      } else {
        $('r-pending').classList.remove('show');
      }
    } else if (r.hasPendingManual) {
      $('r-cap').textContent = 'предварительный результат (автоматическая часть)';
      $('r-pending').textContent = 'Часть заданий (чтение вслух) проверяется преподавателем. ' +
        'Итоговый балл будет объявлен после проверки.';
      $('r-pending').classList.add('show');
    } else {
      $('r-cap').textContent = 'результат автоматической проверки';
      $('r-pending').classList.remove('show');
    }

    const tbody = $('r-themes');
    tbody.innerHTML = '';

    function addRow(key) {
      const t = r.perTheme[key];
      if (!t || t.max === 0) return;
      const accent = (typeof ruleAccent === 'function') ? ruleAccent(key) : 'var(--ink-faint)';
      const names = (typeof SCORE_GROUP_NAMES !== 'undefined') ? SCORE_GROUP_NAMES : {};
      const name = (THEMES[key] && THEMES[key].name) || names[key] || key;
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="name" style="--row-accent:' + accent + '">' + name + '</td>' +
        '<td class="val">' + niceScore(t.earned) + ' / ' + niceScore(t.max) + '</td>';
      tbody.appendChild(tr);
    }

    // Сначала темы в порядке экзамена…
    EXAM_CONFIG.themeOrder.forEach(addRow);
    // …потом строки, которые темами не являются (распределения) — они
    // не стоят в порядке тем и иначе просто не попали бы в разбор.
    Object.keys(r.perTheme).forEach(function (key) {
      if (EXAM_CONFIG.themeOrder.indexOf(key) === -1) addRow(key);
    });
  }

  function checkDraft() {
    const draft = loadDraft();
    if (draft && draft.taskOrder && draft.taskOrder.length) {
      $('resume').classList.add('show');
      $('btn-resume').addEventListener('click', () => {
        restoreDraft(draft);
        renderTask();
        show('screen-exam');
      });
    }
  }


  // ────────────────────────────────────────────────
  // ТАЙМЕР (свойство режима)
  //   countup   — тренировка: время идёт вперёд, без лимита
  //   countdown — экзамен: обратный отсчёт, предупреждение за N минут
  // ────────────────────────────────────────────────
  var timerInterval = null;
  var timerStart = 0;

  function fmtTime(sec) {
    if (sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function showToast(text) {
    var t = document.getElementById('time-toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 5000);
  }

  function startTimer() {
    var mode = session.mode || {};
    var clock = document.getElementById('timer-clock');
    if (!clock) return;

    var limitMin = (session.config && session.config.settings && session.config.settings.timeLimitMinutes) || null;
    var warnMin = mode.warnBeforeEndMin || 0;
    var graceMin = mode.graceMinutes || 0;
    var kind = mode.timerMode || 'countup';
    var warned = false, graceAnnounced = false;

    timerStart = Date.now();
    if (timerInterval) clearInterval(timerInterval);

    function tick() {
      var elapsed = Math.floor((Date.now() - timerStart) / 1000);

      if (kind === 'countdown' && limitMin) {
        var total = limitMin * 60;
        var left = total - elapsed;

        // ── Основное время ещё идёт ──
        if (left > 0) {
          clock.textContent = fmtTime(left);
          // предупреждение за N минут до конца
          if (!warned && warnMin > 0 && left <= warnMin * 60) {
            warned = true;
            clock.classList.add('warn');
            showToast('Время заканчивается: осталось ' + warnMin + ' мин');
          }
          if (left <= 60) { clock.classList.remove('warn'); clock.classList.add('danger'); }
          return;
        }

        // ── Основное время вышло: даём добавку (grace) ──
        if (graceMin > 0) {
          var graceLeft = graceMin * 60 + left; // left уже отрицателен
          if (graceLeft > 0) {
            if (!graceAnnounced) {
              graceAnnounced = true;
              showToast('Время вышло. У вас есть ' + graceMin + ' дополнительные минуты, чтобы завершить.');
            }
            clock.classList.add('danger');
            clock.textContent = '+' + fmtTime(graceLeft); // «+1:30» — идёт добавка
            return;
          }
        }

        // ── Добавка тоже кончилась: честно завершаем ──
        clock.textContent = '0:00';
        clearInterval(timerInterval);
        timerInterval = null;
        showToast('Время истекло. Работа завершается.');
        setTimeout(function () { autoFinish(); }, 1500);
        return;
      }

      // countup — просто вперёд, без лимита
      clock.textContent = fmtTime(elapsed);
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  // Автозавершение по истечении времени (не спрашивает подтверждения)
  function autoFinish() {
    if (session.finished) return;
    stopTimer();
    var result = finishExam();
    renderResult(result);
    show('screen-result');
    var shouldSend = session.mode ? session.mode.sendResult : true;
    if (shouldSend && typeof sendResultToSheets === 'function') {
      sendResultToSheets(result);
      sendAllRecordings(result);
    }
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function init() {
    $('btn-begin').addEventListener('click', begin);
    $('btn-fwd').addEventListener('click', fwd);
    $('btn-back').addEventListener('click', back);
    $('btn-finish').addEventListener('click', askFinish);
    $('btn-cancel').addEventListener('click', backToUnanswered);
    $('btn-confirm').addEventListener('click', doFinish);
    $('btn-again').addEventListener('click', () => location.reload());
    ['in-name', 'in-group'].forEach(id => {
      $(id).addEventListener('keydown', e => { if (e.key === 'Enter') begin(); });
    });
    // Подпись обложки по режиму открытой активности
    var eyebrow = document.getElementById('cover-eyebrow');
    if (eyebrow && typeof getOpenActivity === 'function') {
      var act = getOpenActivity();
      var m = MODES[act.mode] ? MODES[act.mode].id : 'exam';
      eyebrow.textContent = { training: 'Тренировка', homework: 'Домашнее задание' }[m]
        || 'Контрольная работа';
    }

    updateLedeCount();

    checkDraft();
  }

  /* Число заданий на обложке.
     Раньше показывалось TASKS.length — все построенные задания, а в работу
     идёт лишь часть: сколько преподаватель задал по темам. Отсюда «43» там,
     где на самом деле 16. Считаем ровно тем же путём, каким движок строит
     работу. Вызывается ещё раз, когда активность сессии дозагрузилась. */
  function updateLedeCount() {
    var lede = document.getElementById('lede-count');
    if (!lede) return;
    var n = 0;
    try {
      var cfg = (typeof window !== 'undefined' && window.SESSION_EXAM_CONFIG)
        ? window.SESSION_EXAM_CONFIG
        : ((typeof getOpenActivity === 'function') ? getOpenActivity() : null);
      if (cfg && typeof buildTaskOrder === 'function') {
        session.mode = MODES[cfg.mode] || MODES.exam;
        /* Сначала СОБРАТЬ задания по активности, потом считать. Без этого
           считались встроенные шаблоны — те самые 43–45 заданий, которых
           преподаватель не задавал. */
        /* Считать число заданий можно только по СОБРАННОЙ работе.
           Прежнее условие требовало тем-правил, поэтому работа из одних
           букв показывала бы на входе чужое число. */
        if (typeof rebuildTasks === 'function') {
          rebuildTasks(session.mode.randomizeExamples, cfg);
        }
        n = buildTaskOrder(cfg).length;
      }
    } catch (e) { n = 0; }
    if (!n && typeof TASKS !== 'undefined') n = TASKS.length;
    lede.textContent = n;
  }
  window.updateLedeCount = updateLedeCount;

  document.addEventListener('DOMContentLoaded', init);
})();
