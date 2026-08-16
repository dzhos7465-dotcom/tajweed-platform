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

  /* ── ПОРЯДОК ИЗУЧЕНИЯ ─────────────────────────────────────────────
     Задания идут так, как темы идут в программе: мим → нун → мадд → лям.
     Внутри темы — в том порядке, в каком собраны.

     Раньше здесь работал «разброс»: соседние задания брались из разных
     тем, чтобы ребёнок не отвечал по инерции. На деле выходило хуже.
     Разброс раздаёт темы по кругу — сперва по одному заданию из каждой,
     потом по второму. Работа с двумя вопросами на тему выглядела так,
     будто все темы прошли дважды, а начиналась со случайной темы из
     середины программы: ученик открывал контрольную и видел мадд лазим
     раньше мима. Предсказуемый порядок важнее защиты от инерции —
     тем более что инерции мешает и сам подбор вариантов. */
  /* Разделы идут по программе, ВНУТРИ раздела — вперемешку.

     Ученик проходит мим, потом нун, потом мадд — как их и учили. Но какое
     правило раздела спросят первым, заранее не известно, и при новом
     заходе порядок другой. Так проверяется знание раздела, а не память о
     том, в каком месте списка стоит икляб.

     Перемешиваем числом захода, а не номером билета: билет один на всех и
     дал бы всем одинаковый порядок навсегда. Слова и состав работы он
     по-прежнему определяет — меняются только места. */
  function byGroupShuffled(list) {
    var groupPos = {}, groupOf = {};
    list.forEach(function (t) {
      var th = (typeof THEMES !== 'undefined') ? THEMES[t.theme] : null;
      var g = (th && th.group) ? th.group : '—';
      var o = (th && th.order != null) ? th.order : 999;
      groupOf[t.theme] = g;
      if (groupPos[g] == null || o < groupPos[g]) groupPos[g] = o;
    });

    var buckets = {}, names = [];
    list.forEach(function (t) {
      var g = groupOf[t.theme] || '—';
      if (!buckets[g]) { buckets[g] = []; names.push(g); }
      buckets[g].push(t);
    });
    names.sort(function (a, b) { return (groupPos[a] || 999) - (groupPos[b] || 999); });

    var out = [];
    names.forEach(function (g) {
      var inGroup = shuffle(buckets[g], attemptRng);
      /* Галочка «не ставить подряд вопросы одного правила» — если она
         стоит, внутри раздела ещё и разводим одинаковые темы. */
      out = out.concat(spread ? spreadByTheme(inGroup) : inGroup);
    });
    return out;
  }

  /* Число захода: своё у каждого прохождения, сохраняется в черновике.
     Если его ещё нет (старый черновик), берём номер билета — порядок
     тогда будет постоянным, но работа соберётся. */
  var attemptRng = makeRng(session.optSeed || st.seed || 1);

  var order = [], placed = {};
  var push = function (arr) { arr.forEach(function (t) { order.push(t.id); placed[t.id] = true; }); };

  /* ── ДВЕ СТУПЕНИ ИДУТ ДРУГ ЗА ДРУГОМ ──────────────────────────────
     Нулевой курс (буквы и знаки) и первый (правила таджвида) — не два
     раздела одной работы, а две ступени. Если смешать их вперемешку,
     ребёнок прыгает с «какая буква межзубная» на «какое правило нуна»
     и обратно, и каждый раз перестраивается заново.

     Поэтому: сперва ВЕСЬ нулевой курс, потом весь первый.

     Внутри нулевого курса разброса тем НЕТ намеренно. Там задания идут
     по порядку изучения: свойства букв → названия → знаки над буквами.
     Разброс, полезный для правил (чтобы не отвечали по инерции), здесь
     только мешает: соседние вопросы одного блока — это не подсказка,
     а продолжение одной мысли. */
  var isC0 = function (t) { return t.stage === 'course0'; };
  var course0Tasks = TASKS.filter(isC0);
  var mainTasks = TASKS.filter(function (t) { return !isC0(t); });

  if (course0Tasks.length) {
    var seq = course0Tasks.slice().sort(function (a, b) {
      var oa = (typeof course0Order === 'function') ? course0Order(a.theme) : 0;
      var ob = (typeof course0Order === 'function') ? course0Order(b.theme) : 0;
      if (oa !== ob) return oa - ob;
      return 0;   // внутри блока — в том порядке, в каком собраны
    });
    push(seq.filter(function (t) { return !(reciteLast && t.type === TASK_TYPES.RECITE); }));
  }

  /* Дальше — прежняя расстановка, но уже только для первого курса.
     Ни одна строка ниже про ступени не знает. */
  var TASKS_ALL = TASKS;
  TASKS = mainTasks;

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
      push(byGroupShuffled(block));
    });
  }

  TASKS = TASKS_ALL;   // вернуть полный список: дальше он нужен целиком

  // Чтение — в конец (если так задано). Оно общее для обеих ступеней:
  // одна запись голоса на работу, как и договаривались.
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

  /* ── ЧИСЛО ЗАХОДА ─────────────────────────────────────────────────
     Экзамен собирается фиксированным номером билета — чтобы на всех
     устройствах были одни и те же слова и один и тот же порядок заданий.
     Но из-за этого и варианты ответа стояли всегда одинаково: пройдя
     работу второй раз, можно было запомнить не правило, а место кнопки.

     СОСТАВ работы номер билета по-прежнему определяет: те же примеры, те
     же аяты у всех. А вот МЕСТА — и вариантов ответа, и тем внутри
     раздела — задаёт это число, своё у каждого захода. Ответ хранится
     признаком варианта, а не его местом, поэтому проверка не страдает.

     Число сохраняется в черновике: после перезагрузки посреди работы
     кнопки и задания останутся там же, где были. */
  /* Число берём случайным, а не из часов: два захода подряд укладываются
     в одну миллисекунду, и кнопки вставали бы на прежние места. */
  session.optSeed = Math.floor(Math.random() * 1000000) + 1;
  shuffleTaskOptions(session.optSeed);
  session.taskOrder = buildTaskOrder(activeConfig);   // порядок зависит от числа захода
  session.answers = {};
  session.currentIndex = 0;
  session.finished = false;

  saveDraft(); // автосохранение с самого начала (защита от потери связи)
}

/* Переставить варианты во всех заданиях заданным числом. Меняются только
   места: сами варианты и признак верного ответа остаются прежними. */
function shuffleTaskOptions(seed) {
  if (typeof TASKS === 'undefined' || !Array.isArray(TASKS)) return;
  var rng = (typeof makeRng === 'function') ? makeRng(seed || 1) : Math.random;
  TASKS.forEach(function (t) {
    if (!Array.isArray(t.options) || t.options.length < 2) return;
    var a = t.options.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    t.options = a;
  });
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
  let autoEarned = 0, autoMax = 0;   // очки заданий; наружу уйдёт балл из ста
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

  /* ── БАЛЛ ТЕСТА: ПО ДОЛЯМ ВИДОВ ───────────────────────────────────
     Считаем не «сколько очков набрано из скольких», а долю каждого ВИДА
     заданий. Внутри вида задания равны: доля вида делится на их число.

     Почему не суммой очков. При суммировании доля вида зависела от того,
     сколько заданий этого вида поставил преподаватель: десять вопросов
     против одного «найди» — и вопросы решали работу. Теперь он назначает,
     что проверяет, а число заданий выбирает по удобству.

     Частичный зачёт сохраняется: распределение и «найди» дают дробную
     долю задания, как и раньше. */
  const byCat = {};
  session.taskOrder.forEach(function (taskId) {
    const task = getTask(taskId);
    const cat = (typeof categoryOfTask === 'function') ? categoryOfTask(task) : null;
    if (!cat) return;                       // чтение считается отдельно
    const res = checkTask(task, session.answers[taskId]);
    if (!res.auto) return;
    if (!byCat[cat]) byCat[cat] = { sum: 0, n: 0 };
    byCat[cat].sum += (res.max > 0) ? (res.earned / res.max) : 0;
    byCat[cat].n += 1;
  });

  const shares = (typeof CATEGORY_SHARES !== 'undefined') ? CATEGORY_SHARES : {};
  const c0Share = (typeof COURSE0_TEST_SHARE !== 'undefined') ? COURSE0_TEST_SHARE : 0.2;

  /* Нулевому курсу — твёрдая пятая часть теста, остальное делят виды
     правил по своим числам. Если правил нет, буквы забирают всё. */
  const cats = Object.keys(byCat);
  const ruleCats = cats.filter(function (c) { return c !== 'course0'; });
  const hasC0 = cats.indexOf('course0') !== -1;

  let ruleTotal = 0;
  ruleCats.forEach(function (c) { ruleTotal += (shares[c] || 1); });

  const weightOf = {};
  if (hasC0 && ruleCats.length) {
    weightOf.course0 = c0Share;
    ruleCats.forEach(function (c) {
      weightOf[c] = (1 - c0Share) * (shares[c] || 1) / ruleTotal;
    });
  } else if (hasC0) {
    weightOf.course0 = 1;
  } else {
    ruleCats.forEach(function (c) { weightOf[c] = (shares[c] || 1) / ruleTotal; });
  }

  let autoPercent = 0;
  const perCategory = {};
  if (cats.length) {
    cats.forEach(function (c) {
      const ratio = byCat[c].n ? (byCat[c].sum / byCat[c].n) : 0;   // средняя доля заданий вида
      const weight = weightOf[c] || 0;                              // доля вида в тесте
      perCategory[c] = {
        ratio: ratio,
        share: Math.round(weight * 100),
        count: byCat[c].n,
        earned: Math.round(ratio * weight * 100),
      };
      autoPercent += ratio * weight * 100;
    });
    autoPercent = Math.round(autoPercent);
  } else if (autoMax > 0) {
    // видов не нашлось — считаем по старому, чтобы работа не осталась без балла
    autoPercent = Math.round((autoEarned / autoMax) * 100);
  }

  /* Наружу отдаём балл ИЗ СТА, а не внутренние очки. «34 из 58» ничего не
     говорит ни ученику, ни преподавателю и заставляет считать в уме. */
  autoEarned = autoPercent;
  autoMax = 100;

  return {
    student: session.student,
    durationMs: (session.endTime || Date.now()) - session.startTime,

    auto: { earned: autoEarned, max: autoMax, percent: autoPercent },
    perCategory: perCategory,     // сколько дал каждый вид заданий
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
      // и порядок вариантов: после перезагрузки кнопки не должны прыгать
      optSeed: session.optSeed || null,
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
  if (draft.optSeed != null) {
    session.optSeed = draft.optSeed;
    shuffleTaskOptions(draft.optSeed);
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
  /* РЕЖИМ ПРОСМОТРА. Преподаватель смотрит работу глазами ученика — в
     журнал такое попадать не должно. Заглушка стоит здесь, на единственном
     выходе наружу: проверять флаг в каждом месте, откуда зовут отправку,
     значило бы однажды пропустить одно и записать пробный проход в группу.
     Отвечаем так же, как при удачной отправке, чтобы показ результата шёл
     обычным чередом. */
  if (typeof window !== 'undefined' && window.PREVIEW_MODE) {
    return Promise.resolve({ sent: false, reason: 'preview' });
  }



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


/* ── РАЗБОР РАБОТЫ В КОМПАКТНОМ ВИДЕ ──────────────────────────────────
   Один сборщик на всех. Разбор нужен в двух местах: он уходит в базу
   вместе с результатом и он же скармливается документу, когда ученик
   скачивает свою работу сразу после сдачи.

   Раньше эти два места собирали список полей КАЖДОЕ ПО-СВОЕМУ, и второе
   отстало: в нём не было ни текста вопроса, ни вариантов, ни примера.
   Учитель скачивал полную работу, ученик — пустые карточки «Задание 1,
   верно». Ровно та поломка, от которой спасает единый источник. */
function compactReview(details) {
  return (details || []).map(function (d) {
    return { t: d.theme, ty: d.type, a: d.studentAnswer, c: d.correctAnswer,
             ok: d.correct, p: d.pending, pt: d.partial, an: d.answered,
             // чтобы работу можно было показать такой, какой её видел ученик
             ex: d.exampleRef, ay: d.ayahRef, op: d.options, q: d.prompt, h: d.hero,
             it: d.items, gr: d.groups, ai: d.answerId, ci: d.correctId };
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
    review: JSON.stringify(compactReview(result.details)),
  };
}

/* Отправка. Возвращает Promise, но интерфейс не обязан его ждать —
   результат ученику уже показан. */
function sendResultToSheets(result) {
  /* РЕЖИМ ПРОСМОТРА. Преподаватель смотрит работу глазами ученика — в
     журнал такое попадать не должно. Заглушка стоит здесь, на единственном
     выходе наружу: проверять флаг в каждом месте, откуда зовут отправку,
     значило бы однажды пропустить одно и записать пробный проход в группу.
     Отвечаем так же, как при удачной отправке, чтобы показ результата шёл
     обычным чередом. */
  if (typeof window !== 'undefined' && window.PREVIEW_MODE) {
    return Promise.resolve({ sent: false, reason: 'preview' });
  }

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