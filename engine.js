/* ══════════════════════════════════════════════════════════════════════
   ДВИЖОК ПЛАТФОРМЫ  (engine.js)
   ──────────────────────────────────────────────────────────────────────
   Движок НИЧЕГО не знает про таджвид, мим, нун или конкретные правила.
   Он умеет одно: провести ученика через набор заданий по правилам режима,
   собрать ответы, посчитать результат и отделить авто-часть от ручной.

   Проверка главного принципа платформы: чтобы добавить тему, правят ТОЛЬКО
   content.js. Этот файл (движок) при добавлении новой темы не меняется.

   Разделение авто/ручной проверки заложено с первого дня (Блок 1):
   результат всегда состоит из двух частей, даже если ручная пока пустая.
══════════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────────────
   СОСТОЯНИЕ СЕССИИ ЭКЗАМЕНА
────────────────────────────────────────────────────────────────────── */
const session = {
  config: null,          // активная сборка (экзамен/тренировка)
  mode: null,            // активный режим из MODES
  student: { name: '', group: '' },
  startTime: null,
  endTime: null,

  taskOrder: [],        // порядок заданий этой попытки (id заданий)
  answers: {},          // taskId -> ответ ученика (или undefined)
  currentIndex: 0,
  finished: false,
};


/* ──────────────────────────────────────────────────────────────────────
   УТИЛИТЫ
────────────────────────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Найти задание по id (движок работает с заданиями абстрактно)
function getTask(taskId) {
  return TASKS.find(t => t.id === taskId);
}

// Достать примеры задания из библиотеки по ссылкам
function resolveExamples(task) {
  return (task.exampleRefs || []).map(refId => EXAMPLE_BY_ID[refId]).filter(Boolean);
}


/* ──────────────────────────────────────────────────────────────────────
   СБОРКА ПОРЯДКА ЗАДАНИЙ
   Движок берёт конфиг экзамена и строит последовательность заданий,
   уважая настройки режима (порядок тем, перемешивание внутри темы).
   Здесь нет ни одного упоминания конкретной темы — только правила.
────────────────────────────────────────────────────────────────────── */
function buildTaskOrder(config) {
  // 1. Определяем порядок тем
  let themeSequence = [...config.themeOrder];
  if (config.settings.shuffleThemes) {
    themeSequence = shuffle(themeSequence);
  }

  // 2. Для каждой темы собираем её задания, при необходимости перемешивая
  const order = [];
  themeSequence.forEach(themeId => {
    let themeTasks = TASKS.filter(t => t.theme === themeId);
    if (config.settings.shuffleWithinTheme) {
      themeTasks = shuffle(themeTasks);
    }
    themeTasks.forEach(t => order.push(t.id));
  });

  return order;
}


/* ──────────────────────────────────────────────────────────────────────
   ЖИЗНЕННЫЙ ЦИКЛ  (работает с ЛЮБОЙ сборкой — экзамен или тренировка)
   startExam принимает конфиг. По умолчанию — экзамен, для обратной
   совместимости. Тренировка передаёт TRAINING_CONFIG. Движок читает
   правила из режима (MODES[config.mode]), а не из жёстких настроек.
────────────────────────────────────────────────────────────────────── */
function startExam(student, config) {
  const activeConfig = config || EXAM_CONFIG;
  session.config = activeConfig;
  session.mode = MODES[activeConfig.mode] || MODES.exam;
  // Пересобрать задания. Случайность — по режиму: тренировка перемешивает,
  // контрольная фиксирована (одинакова у всех учеников).
  // Если конфиг несёт темы из активности (activityThemes) — собираем по ним,
  // иначе по встроенным шаблонам. Движок не знает, откуда темы.
  if (typeof rebuildTasks === 'function') {
    rebuildTasks(session.mode.randomizeExamples, activeConfig.activityThemes || null, activeConfig.activityRecite || null, activeConfig.activitySort || null);
  }
  session.student = student;
  session.startTime = Date.now();
  session.endTime = null;
  session.taskOrder = buildTaskOrder(activeConfig);
  session.answers = {};
  session.currentIndex = 0;
  session.finished = false;

  saveDraft(); // автосохранение с самого начала (защита от потери связи)
}

function currentTask() {
  return getTask(session.taskOrder[session.currentIndex]);
}

function recordAnswer(taskId, answer) {
  session.answers[taskId] = answer;
  saveDraft();
}

function goNext() {
  if (session.currentIndex < session.taskOrder.length - 1) {
    session.currentIndex++;
    saveDraft();
    return true;
  }
  return false;
}

function goBack() {
  if (session.mode && session.mode.allowBack && session.currentIndex > 0) {
    session.currentIndex--;
    saveDraft();
    return true;
  }
  return false;
}

function countAnswered() {
  return session.taskOrder.filter(id => session.answers[id] !== undefined).length;
}

function countUnanswered() {
  return session.taskOrder.length - countAnswered();
}


/* ──────────────────────────────────────────────────────────────────────
   ПРОВЕРКА ЗАДАНИЯ
   Движок умеет проверять каждый ТИП задания. В Блоке 1 реализован 'single'.
   Для 'manual'-заданий движок возвращает null — «оценит преподаватель».
   Это и есть заложенное с первого дня разделение авто/ручная проверка.
────────────────────────────────────────────────────────────────────── */
function checkTask(task, answer) {
  // Ручная проверка: балл сейчас неизвестен
  if (task.check === CHECK.MANUAL) {
    return { auto: false, correct: null, earned: 0, max: task.weight, pending: true };
  }

  // Автопроверка по типу задания.
  // Движок работает с типами абстрактно — он не знает, что за содержание.
  switch (task.type) {
    case TASK_TYPES.SINGLE: {
      // Один ответ: всё или ничего.
      const ok = answer === task.answer;
      return { auto: true, correct: ok, earned: ok ? task.weight : 0, max: task.weight, pending: false };
    }

    case TASK_TYPES.SORT: {
      // Распределение: частичный балл пропорционально верно разложенным.
      // answer задания — карта {itemId: правильный groupId}.
      // answer ученика — карта {itemId: выбранный groupId} (или undefined).
      const correctMap = task.answer || {};
      const userMap = answer || {};
      const ids = Object.keys(correctMap);
      let right = 0;
      ids.forEach(id => { if (userMap[id] === correctMap[id]) right++; });
      const total = ids.length || 1;
      const earned = task.weight * (right / total);
      return {
        auto: true,
        correct: right === total,          // «полностью верно» только если все
        earned,                            // дробный балл — пропорционально
        max: task.weight,
        pending: false,
        partial: { right, total },         // для возможного показа «5 из 6»
      };
    }

    // Остальные типы будут добавлены позже.
    default:
      return { auto: true, correct: false, earned: 0, max: task.weight, pending: false };
  }
}


/* ──────────────────────────────────────────────────────────────────────
   ПОДСЧЁТ РЕЗУЛЬТАТА
   Результат ВСЕГДА состоит из двух частей: авто и ручная.
   В Блоке 1 ручная часть всегда пустая (нет manual-заданий), но структура
   результата уже финальная — в Блоке 4 она не изменится.

   Итог нормализуется к 100 баллам независимо от числа и веса заданий.
────────────────────────────────────────────────────────────────────── */
function computeResult() {
  let autoEarned = 0, autoMax = 0;
  let manualMax = 0;
  let pendingCount = 0;

  const perTheme = {}; // themeId -> {earned, max}
  const details = [];

  session.taskOrder.forEach(taskId => {
    const task = getTask(taskId);
    const answer = session.answers[taskId];
    const result = checkTask(task, answer);

    if (result.auto) {
      autoEarned += result.earned;
      autoMax += result.max;
    } else if (result.pending) {
      manualMax += result.max;
      pendingCount++;
    }

    // Разбивка по темам (только авто-часть имеет мгновенный балл)
    if (!perTheme[task.theme]) perTheme[task.theme] = { earned: 0, max: 0 };
    if (result.auto) {
      perTheme[task.theme].earned += result.earned;
      perTheme[task.theme].max += result.max;
    }

    details.push({
      taskId,
      theme: task.theme,
      answered: answer !== undefined,
      correct: result.correct,
      pending: result.pending,
    });
  });

  const totalMax = autoMax + manualMax;

  // Нормализация к 100. Пока ручная часть не проверена, показываем
  // предварительный процент по авто-части — и явно помечаем, что не финал.
  const autoPercent = autoMax > 0 ? Math.round((autoEarned / autoMax) * 100) : 0;

  return {
    student: session.student,
    durationMs: (session.endTime || Date.now()) - session.startTime,

    auto: { earned: autoEarned, max: autoMax, percent: autoPercent },
    manual: { max: manualMax, pending: pendingCount },

    hasPendingManual: pendingCount > 0,   // ← ключ к «частичному результату»
    totalMax,

    perTheme,
    details,
    answeredCount: countAnswered(),
    totalCount: session.taskOrder.length,
  };
}

function finishExam() {
  session.finished = true;
  session.endTime = Date.now();
  clearDraft();
  return computeResult();
}


/* ──────────────────────────────────────────────────────────────────────
   АВТОСОХРАНЕНИЕ ЧЕРНОВИКА  (защита от потери связи / закрытия вкладки)
   Заложено с Блока 1 по требованию архитектуры. Использует localStorage.
   Хранит достаточно, чтобы восстановить незавершённую попытку.
────────────────────────────────────────────────────────────────────── */
const DRAFT_KEY = 'tajweed_exam_draft_v1';

function saveDraft() {
  if (session.finished) return;
  try {
    const draft = {
      student: session.student,
      startTime: session.startTime,
      taskOrder: session.taskOrder,
      answers: session.answers,
      currentIndex: session.currentIndex,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) { /* localStorage может быть недоступен — не критично */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function restoreDraft(draft) {
  session.student = draft.student;
  session.startTime = draft.startTime;
  session.taskOrder = draft.taskOrder;
  session.answers = draft.answers || {};
  session.currentIndex = draft.currentIndex || 0;
  session.finished = false;
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}



/* ──────────────────────────────────────────────────────────────────────
   ОТПРАВКА РЕЗУЛЬТАТА В GOOGLE SHEETS  (Блок 3)
   ──────────────────────────────────────────────────────────────────────
   Результат уходит в таблицу учителя через Google Apps Script (web-app).
   Ключевые решения:
     • URL скрипта вынесен в ОДНО место — SHEETS_CONFIG. Поменять адрес —
       одна строка, без правки логики.
     • Отправка НЕ блокирует ученика: он видит свой результат сразу,
       отправка идёт в фоне. Если сеть упала — результат не теряется на
       экране, а попытку отправки можно повторить.
     • Отправляем только то, что нужно учителю: имя, фамилия, группа,
       время, баллы. Никаких лишних данных.

   ВАЖНО про CORS: Google Apps Script не всегда возвращает CORS-заголовки.
   Поэтому шлём как 'text/plain' и mode:'no-cors' — это позволяет записать
   данные, не требуя ответа. Мы не читаем ответ, только фиксируем отправку.
────────────────────────────────────────────────────────────────────── */
const SHEETS_CONFIG = {
  // Сюда вставляется URL веб-приложения Google Apps Script (заканчивается на /exec).
  // Пока пусто — заполнит преподаватель после настройки скрипта.
  url: 'https://script.google.com/macros/s/AKfycbwNjWb6EkWQQksqlry0hFgecagXh5L4lb-e3EISN7YSvxtF34yJ0f7xAjsJQEPycxxD/exec',
};

/* Отдельный URL для приёма голосовых записей (свой скрипт, см.
   google-apps-script-recordings.gs). Заполнит преподаватель после настройки. */
const RECORDINGS_CONFIG = {
  url: '',  // не используется: записи идут на SHEETS_CONFIG.url
};

/* Превратить аудио-Blob в base64 (чтобы отправить как текст). */
function blobToBase64(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function () {
      // reader.result = "data:audio/webm;base64,XXXX" — берём часть после запятой
      var res = String(reader.result);
      var comma = res.indexOf(',');
      resolve(comma > -1 ? res.slice(comma + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* Отправить одну запись чтения. Вызывается для каждого recite-задания,
   у которого есть запись. Не блокирует — как и результаты тестов. */
function sendRecording(student, ayahId, ayahText, blob, examMeta) {
  var endpoint = SHEETS_CONFIG.url;   // единый скрипт (результаты + записи)
  if (!endpoint || !blob) {
    return Promise.resolve({ sent: false, reason: 'no-url-or-blob' });
  }
  return blobToBase64(blob).then(function (b64) {
    var payload = {
      kind: 'recording',               // ← скрипт поймёт, что это запись
      fullName: student.name,
      group: student.group,
      ayahId: ayahId,
      ayahText: ayahText,
      mime: blob.type || 'audio/webm',
      audioBase64: b64,
      exam: examMeta ? examMeta.id : '',
      examTitle: examMeta ? examMeta.title : '',
    };
    return fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    }).then(function () { return { sent: true }; })
      .catch(function (e) { return { sent: false, reason: String(e) }; });
  });
}


function buildResultPayload(result) {
  // Локальная дата/время в читаемом виде
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear();
  const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes());

  const durSec = Math.round(result.durationMs / 1000);
  const durMin = Math.floor(durSec / 60);
  const durRem = durSec % 60;

  return {
    kind: 'result',                // ← скрипт поймёт, что это результат теста
    exam: (session.config || EXAM_CONFIG).id,
    examTitle: (session.config || EXAM_CONFIG).title,
    fullName: result.student.name,
    group: result.student.group,
    date: dateStr,
    time: timeStr,
    durationText: durMin + ' мин ' + durRem + ' сек',
    durationSec: durSec,
    autoScore: result.auto.percent,       // балл автоматической части (0..100)
    answered: result.answeredCount,
    totalQuestions: result.totalCount,
    hasPendingManual: result.hasPendingManual,
  };
}

/* Отправка. Возвращает Promise, но интерфейс не обязан его ждать —
   результат ученику уже показан. */
function sendResultToSheets(result) {
  if (!SHEETS_CONFIG.url) {
    // URL ещё не настроен — тихо выходим, чтобы не ломать показ результата.
    return Promise.resolve({ sent: false, reason: 'no-url' });
  }
  const payload = buildResultPayload(result);
  return fetch(SHEETS_CONFIG.url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
    .then(() => ({ sent: true }))
    .catch(err => ({ sent: false, reason: String(err) }));
}