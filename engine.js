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
// Детерминированный генератор для порядка заданий: тот же seed → тот же
// порядок у ВСЕХ устройств. Для контрольной seed фиксирован, поэтому
// телефон и ноутбук получают идентичный экзамен.
function orderRng(seed) {
  let s = (seed >>> 0) || 20260101;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const rand = rng || Math.random;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
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
  // Детерминированный порядок: у контрольной seed фиксирован → у всех устройств
  // одинаковый экзамен. У остальных режимов — свежая случайность каждый раз.
  var randomize = (MODES[config.mode] || MODES.exam).randomizeExamples;
  var rng = randomize ? Math.random : orderRng(20260101);
  var st = config.settings || {};
  var orderMode = st.orderMode || 'byType';        // byType | byTheme | shuffle
  var reciteLast = st.reciteLast !== false;        // по умолчанию да
  var spread = st.spreadThemes !== false;          // по умолчанию да

  /* РАЗБРОС ОДИНАКОВЫХ ТЕМ.
     Если по одному правилу взято два-три примера, они шли подряд, и ученик
     отвечал не думая: «раз прошлый был мунфасыль, значит и этот». Здесь мы
     расставляем задания так, чтобы соседние были из РАЗНЫХ тем.

     Приём простой: на каждом шаге берём тему, у которой осталось больше
     всего заданий, но не ту, что стояла только что. Если выбора нет
     (осталась одна тема) — ставим что есть. */
  function spreadByTheme(list) {
    if (list.length < 3) return list;
    var buckets = {};
    list.forEach(function (t) {
      var k = t.theme || '—';
      (buckets[k] = buckets[k] || []).push(t);
    });
    Object.keys(buckets).forEach(function (k) { buckets[k] = shuffle(buckets[k], rng); });

    var out = [], last = null;
    while (out.length < list.length) {
      var keys = Object.keys(buckets).filter(function (k) { return buckets[k].length; });
      if (!keys.length) break;
      keys.sort(function (a, b) { return buckets[b].length - buckets[a].length; });
      var pickKey = keys.find(function (k) { return k !== last; }) || keys[0];
      out.push(buckets[pickKey].shift());
      last = pickKey;
    }
    return out;
  }

  var order = [], placed = {};
  var push = function (arr) { arr.forEach(function (t) { order.push(t.id); placed[t.id] = true; }); };

  if (orderMode === 'byTheme') {
    // как было раньше: все задания одной темы вместе
    var themeSequence = [].concat(config.themeOrder);
    if (st.shuffleThemes) themeSequence = shuffle(themeSequence, rng);
    themeSequence.forEach(function (themeId) {
      var themeTasks = TASKS.filter(function (t) {
        return t.theme === themeId && !(reciteLast && t.type === TASK_TYPES.RECITE);
      });
      if (st.shuffleWithinTheme) themeTasks = shuffle(themeTasks, rng);
      push(themeTasks);
    });
  } else if (orderMode === 'shuffle') {
    var all = TASKS.filter(function (t) { return !(reciteLast && t.type === TASK_TYPES.RECITE); });
    push(spread ? spreadByTheme(shuffle(all, rng)) : shuffle(all, rng));
  } else {
    /* ПО ТИПАМ (по умолчанию): вопросы → распределение → найди → чтение.
       Ребёнок начинает с коротких вопросов и входит в работу, а к записи
       голоса подходит уже разогретым. Раньше запись могла оказаться первым
       заданием: телефон сразу просил доступ к микрофону, и это пугало. */
    [TASK_TYPES.SINGLE, TASK_TYPES.SORT, TASK_TYPES.FIND].forEach(function (ty) {
      var block = TASKS.filter(function (t) { return t.type === ty; });
      push(spread ? spreadByTheme(block) : shuffle(block, rng));
    });
  }

  // Чтение — в конец (если так задано)
  if (reciteLast) push(TASKS.filter(function (t) { return t.type === TASK_TYPES.RECITE && !placed[t.id]; }));

  // ЗАЩИТА: ни одно построенное задание не должно потеряться.
  TASKS.forEach(function (t) { if (!placed[t.id]) { order.push(t.id); placed[t.id] = true; } });

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
    // Рецептом целиком: движок не разбирает конфиг на части и потому не
    // может забыть новый раздел заданий (см. asRecipe в tasks.js).
    rebuildTasks(session.mode.randomizeExamples, activeConfig);
    // запоминаем, каким «номером билета» собрана работа: он уйдёт в черновик
    session.seed = (typeof LAST_SEED !== 'undefined') ? LAST_SEED : null;
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

/* Перейти к заданию по номеру. Нужен, чтобы «Вернуться» из окна
   завершения приводило прямо к пропущенному вопросу, а не оставляло
   ученика искать его вручную. */
function goTo(index) {
  if (index < 0 || index >= session.taskOrder.length) return false;
  session.currentIndex = index;
  saveDraft();
  return true;
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

    case TASK_TYPES.FIND: {
      // Найди в аяте: ученик подчёркивает места и называет правило.
      // task.answer — карта {индекс слова: [правила]}: на одном слове может
      // сойтись несколько искомых правил (у маддов это обычное дело).
      // answer ученика — массив черт [{words:[индексы], rule}].
      //
      // Цель — ПАРА «слово + правило». Слово с двумя искомыми правилами даёт
      // две цели: ученик отмечает его дважды, называя разные правила.
      const targets = task.answer || {};
      const strokes = Array.isArray(answer) ? answer : [];

      // на всякий случай понимаем и старый формат {слово: 'правило'}
      const rulesAt = function (w) {
        const v = targets[w];
        if (v == null) return [];
        return Array.isArray(v) ? v : [v];
      };

      let total = 0;
      Object.keys(targets).forEach(w => { total += rulesAt(w).length; });
      if (!total) total = 1;

      const found = {};      // ключ «слово|правило» — чтобы не зачесть дважды
      let wrongStrokes = 0;  // черты, не попавшие ни в одну цель с верным правилом
      strokes.forEach(s => {
        if (!s || !s.rule || !Array.isArray(s.words)) return;
        // черта верна, если накрыла слово-цель И названное правило там есть
        const hits = s.words.filter(w => rulesAt(w).indexOf(s.rule) !== -1);
        if (hits.length) hits.forEach(w => { found[w + '|' + s.rule] = true; });
        else wrongStrokes++;
      });

      const right = Object.keys(found).length;
      // балл: доля найденных минус штраф за лишние черты (не ниже нуля)
      const ratio = Math.max(0, (right - wrongStrokes) / total);
      const earned = task.weight * ratio;
      return {
        auto: true,
        correct: right === total && wrongStrokes === 0,
        earned,
        max: task.weight,
        pending: false,
        partial: { right, total, wrong: wrongStrokes },
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

    // Разбивка по темам (только авто-часть имеет мгновенный балл).
    // Распределение проверяет много правил сразу и потому идёт отдельной
    // строкой (scoreGroup), а не вешается на одну тему.
    var scoreKey = task.scoreGroup || task.theme;
    if (!perTheme[scoreKey]) perTheme[scoreKey] = { earned: 0, max: 0 };
    if (result.auto) {
      perTheme[scoreKey].earned += result.earned;
      perTheme[scoreKey].max += result.max;
    }

    // Разбор для детального просмотра — «самое необходимое»:
    // что спрашивали, что ответил ученик, верно ли.
    var studentAns = '', correctAns = '';
    if (task.type === 'single') {
      // подставить читаемые названия правил
      var opt = (task.options || []).filter(function (o) { return o.id === answer; })[0];
      studentAns = opt ? opt.label : (answer || '—');
      var copt = (task.options || []).filter(function (o) { return o.id === task.answer; })[0];
      correctAns = copt ? copt.label : task.answer;
    }
    details.push({
      taskId: taskId,
      theme: task.theme,
      type: task.type,
      answered: answer !== undefined,
      correct: result.correct,
      pending: result.pending,
      studentAnswer: studentAns,   // что выбрал ученик
      correctAnswer: correctAns,   // правильный ответ
      // Для распределения и «найди» одного «верно/неверно» мало: работа
      // почти всегда частичная. Передаём, сколько из скольких.
      partial: result.partial || null,
      /* Что именно было показано ученику. Без этого работу нельзя
         восстановить: в разборе оставались тема и ответ, а само слово
         терялось — и документ выходил сухим списком вместо экзамена. */
      /* Признаки выбранного и верного варианта. Названия сохраняются
         отдельно (studentAnswer), но по названию нельзя опознать кнопку
         в документе — там нужен признак. Из-за этого в документе ни один
         вариант не отмечался: было видно «ошибка», но не видно, где. */
      answerId: (answer !== undefined && answer !== null) ? answer : null,
      correctId: (task.answer !== undefined) ? task.answer : null,
      exampleRef: (task.exampleRefs && task.exampleRefs[0]) || task.exampleRef || null,
      /* Что показывали крупно, когда примера из библиотеки нет: слог, знак,
         отдельная буква. Без этого работа нулевого курса в разборе выглядела
         бы как вопрос без вопроса. */
      hero: task.hero || null,
      ayahRef: task.ayahRef || null,
      items: task.items || null,          // для распределения — слова по коробкам
      groups: task.groups || null,        // и сами коробки
      options: task.options || null,
      prompt: task.prompt || null,
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
      // Без него после перезагрузки собиралась ДРУГАЯ работа: те же номера
      // заданий, но другие слова, а ответы оставались от прежних.
      seed: session.seed || null,
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
  /* Собираем работу заново тем же «номером билета» — тогда в заданиях
     окажутся ровно те слова, на которые ученик уже отвечал. */
  if (draft.seed != null && typeof rebuildTasks === 'function' && session.mode) {
    var cfg = (typeof window !== 'undefined' && window.SESSION_EXAM_CONFIG)
      ? window.SESSION_EXAM_CONFIG : EXAM_CONFIG;
    rebuildTasks(session.mode.randomizeExamples, cfg, draft.seed);
    session.seed = draft.seed;
  }
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
  url: 'https://script.google.com/macros/s/AKfycbwtHWLk-swTt4FeRlGSpPKGaCv7nV8KnRJ6PATj5hcHLINIl_OsDwGyui9Njfb3RjMd/exec',
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
  if (!blob) return Promise.resolve({ sent: false, reason: 'no-blob' });

  /* Новое хранилище кладёт файл напрямую и отвечает сразу. Заодно исчезает
     превращение звука в текст: раньше запись раздувалась на треть, потому
     что иначе Apps Script её не принимал. */
  if (typeof StorageAPI !== 'undefined' && StorageAPI.recordings && StorageAPI.recordings.send) {
    return StorageAPI.recordings.send({
      fullName: student.name, group: student.group,
      ayahId: ayahId, ayahText: ayahText,
      exam: examMeta ? examMeta.id : '', examTitle: examMeta ? examMeta.title : '',
      sessionId: (typeof window !== 'undefined' && window.SESSION_ID) ? window.SESSION_ID : '',
    }, blob).then(res => ({ sent: !!(res && res.ok), reason: res && res.error }));
  }

  var endpoint = SHEETS_CONFIG.url;   // старый путь: единый скрипт
  if (!endpoint) {
    return Promise.resolve({ sent: false, reason: 'no-url' });
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
      sessionId: (typeof window !== 'undefined' && window.SESSION_ID) ? window.SESSION_ID : '',
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
    sessionId: (typeof window !== 'undefined' && window.SESSION_ID) ? window.SESSION_ID : '',
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
    // Компактный разбор для детального просмотра (самое необходимое):
    // тема, тип, ответ ученика, правильный ответ, верно ли.
    review: JSON.stringify((result.details || []).map(function (d) {
      return { t: d.theme, ty: d.type, a: d.studentAnswer, c: d.correctAnswer,
               ok: d.correct, p: d.pending, pt: d.partial, an: d.answered,
               // чтобы работу можно было показать такой, какой её видел ученик
               ex: d.exampleRef, ay: d.ayahRef, op: d.options, q: d.prompt, h: d.hero,
               it: d.items, gr: d.groups, ai: d.answerId, ci: d.correctId };
    })),
  };
}

/* Отправка. Возвращает Promise, но интерфейс не обязан его ждать —
   результат ученику уже показан. */
function sendResultToSheets(result) {
  const payload = buildResultPayload(result);

  /* Если на странице подключено хранилище нового образца — отдаём работу
     ему. Оно отвечает сразу, и мы наконец знаем, дошла работа или нет:
     раньше отправка уходила «вслепую», подтвердить было нечем.
     Старый путь остаётся ниже — переключение между базами не требует
     менять движок, только строку подключения в exam.html. */
  if (typeof StorageAPI !== 'undefined' && StorageAPI.results && StorageAPI.results.send) {
    return StorageAPI.results.send(payload)
      .then(res => ({ sent: !!(res && res.ok), reason: res && res.error }));
  }

  if (!SHEETS_CONFIG.url) {
    // URL ещё не настроен — тихо выходим, чтобы не ломать показ результата.
    return Promise.resolve({ sent: false, reason: 'no-url' });
  }
  return fetch(SHEETS_CONFIG.url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
    .then(() => ({ sent: true }))
    .catch(err => ({ sent: false, reason: String(err) }));
}