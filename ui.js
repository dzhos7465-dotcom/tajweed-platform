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
  function renderTask() {
    const task = currentTask();
    const total = session.taskOrder.length;
    const idx = session.currentIndex;

    applyThemeAccent(task.theme);

    $('q-cur').textContent = idx + 1;
    $('q-total').textContent = total;
    $('q-theme').textContent = THEMES[task.theme] ? THEMES[task.theme].name : '';
    $('track-fill').parentElement.style.setProperty('--pct', ((idx + 1) / total * 100) + '%');

    $('q-no').textContent = 'Задание ' + (idx + 1);
    $('q-prompt').textContent = task.prompt;

    // Тег правила в карточке — имя темы её педагогическим цветом
    const tag = document.getElementById('q-rule-tag');
    if (tag) tag.textContent = THEMES[task.theme] ? THEMES[task.theme].name : '';

    const wrap = $('q-options');
    wrap.innerHTML = '';
    const exampleCard = document.querySelector('.example');

    if (task.type === TASK_TYPES.SINGLE) {
      // Одиночный: пример — герой в карточке, ниже варианты
      exampleCard.style.display = '';
      const examples = resolveExamples(task);
      $('q-example').textContent = examples.map(e => e.text).join('   ');
      renderSingle(task, wrap);
    } else if (task.type === TASK_TYPES.SORT) {
      // Распределение: героя-примера нет, есть объекты и группы
      exampleCard.style.display = 'none';
      renderSort(task, wrap);
    } else if (task.type === TASK_TYPES.RECITE) {
      // Чтение вслух: аят — герой, ниже запись голоса
      exampleCard.style.display = 'none';
      renderRecite(task, wrap);
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

    task.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'opt' + (chosen === opt.id ? ' on' : '');
      btn.innerHTML = '<span class="dot"></span><span>' + opt.label + '</span>';

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

    function itemText(it) {
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
  function renderRecite(task, wrap) {
    var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[task.ayahRef] : null;
    var ayahText = ayah ? ayah.text : '—';

    wrap.innerHTML =
      '<div class="recite-card">' +
        '<div class="recite-label">Прочитайте с соблюдением правил</div>' +
        '<div class="arabic recite-ar">' + ayahText + '</div>' +
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
          // Сохранить запись в ответ задания (пока локально)
          recordAnswer(task.id, { blob: blob, url: url, size: blob.size });
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
    } else {
      $('dlg-title').textContent = 'Завершить работу?';
      $('dlg-text').textContent = 'После завершения изменить ответы будет нельзя.';
    }
    $('scrim').classList.add('open');
  }
  function closeDlg() { $('scrim').classList.remove('open'); }

  function doFinish() {
    closeDlg();
    stopTimer();
    const result = finishExam();
    renderResult(result);
    show('screen-result');
    // Результат уже показан ученику. Отправка в фоне — не блокирует экран.
    var shouldSend = session.mode ? session.mode.sendResult : true;
    if (shouldSend && typeof sendResultToSheets === 'function') {
      sendResultToSheets(result).then(function (r) {
        if (!r.sent && r.reason !== 'no-url') {
          console.warn('Не удалось отправить результат:', r.reason);
        }
      });
      sendAllRecordings(result);
    }
  }

  // Отправить все записи чтения, собранные за экзамен (по одной на аят).
  function sendAllRecordings(result) {
    if (typeof sendRecording !== 'function') return;
    var meta = session.config ? { id: session.config.id, title: session.config.title } : null;
    session.taskOrder.forEach(function (taskId) {
      var task = getTask(taskId);
      if (!task || task.type !== TASK_TYPES.RECITE) return;
      var ans = session.answers[taskId];
      if (!ans || !ans.blob) return;   // нет записи — пропускаем
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

  function renderResult(r) {
    $('r-who').textContent = r.student.name;
    const mins = Math.floor(r.durationMs / 60000);
    const secs = Math.floor((r.durationMs % 60000) / 1000);
    $('r-meta').textContent = 'Группа ' + r.student.group + ' · ответов ' +
      r.answeredCount + ' из ' + r.totalCount + ' · время ' + mins + ' мин ' + secs + ' сек';
    $('r-score').textContent = r.auto.percent;

    if (r.hasPendingManual) {
      $('r-cap').textContent = 'предварительный результат (автоматическая часть)';
      $('r-pending').classList.add('show');
    } else {
      $('r-cap').textContent = 'результат автоматической проверки';
      $('r-pending').classList.remove('show');
    }

    const tbody = $('r-themes');
    tbody.innerHTML = '';
    EXAM_CONFIG.themeOrder.forEach(themeId => {
      const t = r.perTheme[themeId];
      if (!t || t.max === 0) return;
      const accent = (typeof ruleAccent === 'function') ? ruleAccent(themeId) : 'var(--ink-faint)';
      const tr = document.createElement('tr');
      const name = THEMES[themeId] ? THEMES[themeId].name : themeId;
      tr.innerHTML =
        '<td class="name" style="--row-accent:' + accent + '">' + name + '</td>' +
        '<td class="val">' + t.earned + ' / ' + t.max + '</td>';
      tbody.appendChild(tr);
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
    $('btn-cancel').addEventListener('click', closeDlg);
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
      eyebrow.textContent = (m === 'training') ? 'Тренировка' : 'Контрольная работа';
    }

    // Число заданий на обложке — считаем реально, чтобы не расходилось
    var lede = document.getElementById('lede-count');
    if (lede && typeof TASKS !== 'undefined') lede.textContent = TASKS.length;

    checkDraft();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
