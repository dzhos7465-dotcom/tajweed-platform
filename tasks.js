/* ══════════════════════════════════════════════════════════════════════
   БИБЛИОТЕКА ПРОВЕРКИ ЗНАНИЙ  (tasks.js)
   ──────────────────────────────────────────────────────────────────────
   АРХИТЕКТУРНЫЙ ЗАКОН ПЛАТФОРМЫ:
   Задание — это НЕ знание. Задание использует знание (примеры из
   knowledge.js), чтобы проверить конкретный навык.

   Поэтому задания живут ОТДЕЛЬНО от библиотеки знаний.
   Здесь находятся:
     • закрытый список типов заданий
     • способы проверки (авто / ручная)
     • сами задания (ссылаются на примеры по id)
     • сборка экзамена (какие темы, в каком режиме)

   Задание хранит то, чего нет и не может быть у примера:
     • что спрашивается
     • что считается правильным ответом
     • вес
     • способ проверки

   Зависит от knowledge.js (использует EXAMPLE_BY_ID), но не наоборот:
   знания ничего не знают о проверке.
══════════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────────────
   ЗАКРЫТЫЙ СПИСОК ТИПОВ ЗАДАНИЙ
   Любая будущая тема обязана уложиться в этот список — новый тип добавляется
   осознанно и редко, а не под каждую тему. В Блоке 1 реализован только SINGLE.
────────────────────────────────────────────────────────────────────── */
const TASK_TYPES = {
  SINGLE: 'single',   // выбор одного правильного ответа   (реализован)
  MULTI:  'multi',    // выбор нескольких                  (позже)
  SORT:   'sort',     // распределение по группам          (реализован)
  MATCH:  'match',    // соединение элементов              (позже)
  ORDER:  'order',    // расположение по порядку           (позже)
  FIND:   'find',     // поиск/выделение в тексте          (позже)
  FILL:   'fill',     // заполнение пропусков              (позже)
  RECITE: 'recite',   // запись собственного чтения        (Блок 4, ручная)
};

/* Способы проверки — два класса, зафиксированы как закон архитектуры.
   Заложены с Блока 1, даже пока ручных заданий нет. */
const CHECK = {
  AUTO:   'auto',     // машина знает ответ, балл мгновенно
  MANUAL: 'manual',   // проверяет преподаватель, балл позже
};


/* ──────────────────────────────────────────────────────────────────────
   ПЕРЕИСПОЛЬЗУЕМЫЕ НАБОРЫ ВАРИАНТОВ
   Один и тот же набор ответов для вопроса «какое правило?» — тоже
   применение принципа «не дублировать».
────────────────────────────────────────────────────────────────────── */
const RULE_OPTIONS = [
  { id: 'izhar',      label: 'Изхар' },
  { id: 'idgham',     label: 'Идгам' },
  { id: 'ikhfa',      label: 'Ихфа' },
  { id: 'iqlab',      label: 'Икляб' },
  { id: 'shadda_mim', label: 'Мим с шаддой' },
  { id: 'shadda_nun', label: 'Нун с шаддой' },
];

/* Семейства правил — чтобы отвлекающие варианты были ПОХОЖИМИ (того же
   раздела), а не очевидно чужими. По теме задания определяем семейство,
   и три неправильных варианта берём в первую очередь из него. */
const OPTION_FAMILY = {
  mim: ['izhar', 'idgham', 'ikhfa', 'shadda_mim'],
  nun: ['izhar', 'idgham', 'ikhfa', 'iqlab', 'shadda_nun'],
};
function familyOfTheme(themeId) {
  return (themeId.indexOf('mim') !== -1) ? 'mim' : 'nun';
}

/* Построить 4 варианта для вопроса: правильный + 3 похожих отвлекающих.
   Похожие берём из того же семейства; если не хватает — добираем из общего
   списка. Порядок вариантов перемешиваем детерминированно (через rng). */
function buildFourOptions(correctId, themeId, rng) {
  const byId = {};
  RULE_OPTIONS.forEach(o => { byId[o.id] = o; });

  const fam = OPTION_FAMILY[familyOfTheme(themeId)] || [];
  // отвлекающие из того же семейства (кроме правильного), перемешанные
  let famDistract = shuffleWith(fam.filter(id => id !== correctId), rng);

  let distractors = famDistract.slice(0, 3);
  // если в семействе меньше 3 — добрать из общего списка (тоже перемешав)
  if (distractors.length < 3) {
    const rest = shuffleWith(
      RULE_OPTIONS.map(o => o.id).filter(id => id !== correctId && distractors.indexOf(id) === -1),
      rng
    );
    distractors = distractors.concat(rest).slice(0, 3);
  }

  // собрать 4 варианта (верный + 3) и перемешать порядок
  const four = [correctId].concat(distractors).map(id => byId[id]).filter(Boolean);
  return shuffleWith(four, rng);
}

/* ──────────────────────────────────────────────────────────────────────
   ШАБЛОНЫ ЗАДАНИЙ  (templates)
   ──────────────────────────────────────────────────────────────────────
   ГЛАВНЫЙ СДВИГ: задание — не «вопрос про конкретный пример», а ШАБЛОН
   «вопрос про правило». Шаблон не привязан к примеру. Он говорит:
   «возьми случайный пример правила X и спроси то-то». Конкретный пример
   подставляется движком при старте попытки — поэтому каждое прохождение
   разное.

   Следствие (то, ради чего всё делалось): добавил примеры в knowledge.js —
   они СРАЗУ идут в тренировки и экзамены. tasks.js менять не нужно.
   Данные растут, логика не меняется.

   Шаблон «какое правило?»:
     kind:'rule'  — тип задания single, вопрос «какое правило в примере?»
     theme        — из какого правила брать пример (тема библиотеки)
     answer       — какой вариант считается верным (принадлежит заданию!)
     count        — сколько таких вопросов создать (случайные разные примеры)
     weight       — вес каждого

   Шаблон «распредели» (sort):
     kind:'sort'
     groups       — категории (id совпадает с темой библиотеки + подпись)
     perGroup     — сколько примеров брать из каждой группы
     weight
────────────────────────────────────────────────────────────────────── */

/* Сколько вопросов на тему — МЕТОДИЧЕСКИ, по ценности, не поровну.
   Легко менять: одно число на тему. (Пока сдержанно; уточнишь под контрольную.) */
const RULE_TEMPLATES = [
  { theme: 'izhar_mim',  answer: 'izhar',      count: 3 },
  { theme: 'idgham_mim', answer: 'idgham',     count: 3 },
  { theme: 'ikhfa_mim',  answer: 'ikhfa',      count: 3 },
  { theme: 'shadda_mim', answer: 'shadda_mim', count: 2 },
  { theme: 'izhar_nun',  answer: 'izhar',      count: 3 },
  { theme: 'idgham_nun', answer: 'idgham',     count: 3 },
  { theme: 'iqlab_nun',  answer: 'iqlab',      count: 2 },
  { theme: 'ikhfa_nun',  answer: 'ikhfa',      count: 3 },
  { theme: 'shadda_nun', answer: 'shadda_nun', count: 2 },
];

/* Карта «тема → правильный ответ». Нужна, когда шаблоны приходят из
   активности (там только тема и количество, без ответа). По теме находим,
   какой вариант верный. Один источник истины для встроенных и внешних тем. */
const THEME_ANSWER = {};
RULE_TEMPLATES.forEach(function (t) { THEME_ANSWER[t.theme] = t.answer; });
function answerForTheme(themeId) {
  // shadda различает букву; остальные — по «семейству» правила
  if (THEME_ANSWER[themeId]) return THEME_ANSWER[themeId];
  if (themeId.indexOf('izhar') === 0) return 'izhar';
  if (themeId.indexOf('idgham') === 0) return 'idgham';
  if (themeId.indexOf('ikhfa') === 0) return 'ikhfa';
  if (themeId.indexOf('iqlab') === 0) return 'iqlab';
  return themeId;
}

/* Шаблоны sort. groups.id = тема библиотеки (откуда брать примеры). */
const SORT_TEMPLATES = [
  {
    id: 'sort_mim',
    theme: 'izhar_mim',                 // тема-«владелец» для порядка в экзамене
    prompt: 'Распределите слова по правилам мима',
    perGroup: 2,
    groups: [
      { id: 'izhar_mim',  label: 'Изхар мими' },
      { id: 'idgham_mim', label: 'Идгам мими' },
      { id: 'ikhfa_mim',  label: 'Ихфа мими' },
    ],
    weight: 3,
  },
  {
    id: 'sort_nun',
    theme: 'ikhfa_nun',                 // sort нуна встанет среди тем нуна
    prompt: 'Распределите слова по правилам нуна',
    perGroup: 2,
    groups: [
      { id: 'izhar_nun',  label: 'Изхар нуна' },
      { id: 'idgham_nun', label: 'Идгам нуна' },
      { id: 'iqlab_nun',  label: 'Икляб нуна' },
      { id: 'ikhfa_nun',  label: 'Ихфа нуна' },
    ],
    weight: 4,
  },
];


/* ──────────────────────────────────────────────────────────────────────
   ШАБЛОНЫ ЧТЕНИЯ ВСЛУХ  (recite — восьмой тип, класс manual)
   ──────────────────────────────────────────────────────────────────────
   Задание recite показывает АЯТ и просит прочитать вслух. Запись оценивает
   преподаватель (не машина) — поэтому check: manual. Это то самое ручное
   задание, ради которого мы с первого дня держали результат разделённым
   на авто- и ручную часть.

   Источник аята — библиотека ayahs.js (не короткие примеры). Аят выбирается:
     • если преподаватель задал конкретные аяты (?ayahs=… из конструктора) —
       берём их (FIXED, выбор преподавателя);
     • иначе — случайный аят нужного правила.

   weight — вес чтения. Пока умеренный; окончательный вес ручной части
   определим, когда появится реальная запись и оценивание.
────────────────────────────────────────────────────────────────────── */
const RECITE_TEMPLATES = [
  { id: 'recite_mim', theme: 'ikhfa_mim', rule: 'ikhfa_mim', weight: 5 },
  { id: 'recite_nun', theme: 'ikhfa_nun', rule: 'ikhfa_nun', weight: 5 },
];


/* ──────────────────────────────────────────────────────────────────────
   ПОСТРОИТЕЛЬ ЗАДАНИЙ ИЗ ШАБЛОНОВ
   Превращает шаблоны в конкретные задания, подставляя СЛУЧАЙНЫЕ примеры
   из библиотеки знаний. Вызывается движком при старте каждой попытки —
   поэтому набор примеров каждый раз новый.

   Надёжность: не берём один пример дважды в одном задании; если примеров
   меньше, чем просит шаблон, — берём сколько есть, не падаем.
────────────────────────────────────────────────────────────────────── */

/* Простой детерминированный генератор (mulberry32). При одном и том же seed
   даёт одну и ту же последовательность — значит контрольная будет ОДИНАКОВОЙ
   у всех учеников. Без seed используется настоящая случайность (тренировка). */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Выбрать n элементов. rng — функция случайности (детерминированная для
   контрольной, настоящая для тренировки). */
function pickWith(arr, n, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

// Перемешать весь массив детерминированно (тем же rng)
function shuffleWith(arr, rng) {
  return pickWith(arr, arr.length, rng);
}

function examplesOfTheme(themeId) {
  return EXAMPLES.filter(e => e.themes.indexOf(themeId) !== -1);
}

/* Построить задания из шаблонов.
   randomize=false (контрольная): фиксированный seed → у всех одинаковый набор.
   randomize=true (тренировка): настоящая случайность → каждый раз разное. */
/* ──────────────────────────────────────────────────────────────────────
   ВЕСА ЗАДАНИЙ (решение преподавателя)
   ──────────────────────────────────────────────────────────────────────
   Это ОТНОСИТЕЛЬНЫЕ числа, а не «баллы из 100». Они говорят, во сколько
   раз одно задание весомее другого: «найди в аяте» весит как 3 вопроса.
   Итоговый процент считается как (заработано / максимум) — поэтому работы
   РАЗНОГО размера сравнимы: и на 15 вопросов, и на 35 итог приводится к 100.
   Поменять баланс — поменять числа здесь, в одном месте.
────────────────────────────────────────────────────────────────────── */
const TASK_WEIGHTS = {
  single: 3,    // вопрос «какое правило»
  sort:   5,    // распределение по правилам
  find:  10,    // найди в аяте (сложнее: место + правило + без лишних)
  recite: 5,    // чтение вслух (ручная часть, в общий балл входит отдельно — 20%)
};

/* Группы правил для задания «Найди в аяте» (без шадды — решение
   преподавателя): нун = 4 правила, мим = 3. */
const FIND_GROUPS = {
  nun: { id:'nun', name:'нуна', rules:['izhar_nun','idgham_nun','iqlab_nun','ikhfa_nun'] },
  mim: { id:'mim', name:'мима', rules:['izhar_mim','idgham_mim','ikhfa_mim'] },
};

/* Цели задания: из разметки аята берём только правила нужной группы.
   Возвращает {индекс слова: правило} или null, если в аяте таких правил нет. */
function findTargetsFor(ayahId, groupId) {
  if (typeof AYAH_MARKS === 'undefined') return null;
  const marks = AYAH_MARKS[ayahId] || [];
  const grp = FIND_GROUPS[groupId];
  if (!grp) return null;
  const targets = {};
  let any = false;
  marks.forEach(m => {
    if (grp.rules.indexOf(m.rule) !== -1) { targets[m.w] = m.rule; any = true; }
  });
  return any ? targets : null;
}

/* Аяты, где есть правила данной группы — чтобы задание было осмысленным. */
function ayahsWithGroup(groupId) {
  if (typeof AYAHS === 'undefined') return [];
  return AYAHS.filter(a => findTargetsFor(a.id, groupId) !== null);
}

function buildTasksFromTemplates(randomize, activityThemes, activityRecite, activitySort, activityFind) {
  // Для контрольной seed постоянный — «билет» стабилен для всей группы.
  // Для тренировки seed из времени — каждый запуск свежий.
  const rng = randomize ? makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0)
                        : makeRng(20260101); // фиксированный «номер билета»
  const pick = (arr, n) => pickWith(arr, n, rng);

  const built = [];
  let uid = 0;
  const nextId = prefix => prefix + '_' + (uid++);

  // Источник тем: если пришли темы из активности — берём их, иначе встроенные.
  // Движок не знает, откуда список — из файла или из панели. Граница соблюдена.
  let ruleTemplates;
  if (activityThemes && activityThemes.length) {
    ruleTemplates = activityThemes.map(function (t) {
      return { theme: t.theme, count: t.count || 1, answer: answerForTheme(t.theme) };
    });
  } else {
    ruleTemplates = RULE_TEMPLATES;
  }

  // 1. Вопросы «какое правило?»
  ruleTemplates.forEach(tpl => {
    const pool = examplesOfTheme(tpl.theme);
    const chosen = pick(pool, tpl.count);
    chosen.forEach(ex => {
      built.push({
        id: nextId('t_' + tpl.theme),
        theme: tpl.theme,
        type: TASK_TYPES.SINGLE,
        exampleRefs: [ex.id],
        prompt: 'Какое правило в этом примере?',
        options: buildFourOptions(tpl.answer, tpl.theme, rng),  // 4 варианта: верный + 3 похожих
        answer: tpl.answer,          // правильный ответ принадлежит заданию
        check: CHECK.AUTO,
        weight: TASK_WEIGHTS.single,
      });
    });
  });

  // 2. Sort-задания (распределение).
  //    Встроенный экзамен: все SORT_TEMPLATES.
  //    По активности: только те, что преподаватель отметил галочкой
  //      (sortMim → sort_mim, sortNun → sort_nun).
  const byActivity = !!(activityThemes && activityThemes.length);
  SORT_TEMPLATES.forEach(tpl => {
    if (byActivity) {
      const want = (tpl.id === 'sort_mim' && activitySort && activitySort.mim) ||
                   (tpl.id === 'sort_nun' && activitySort && activitySort.nun);
      if (!want) return;   // галочка не стоит — пропускаем это распределение
    }
    const items = [];
    const answer = {};
    let k = 0;
    tpl.groups.forEach(g => {
      const chosen = pick(examplesOfTheme(g.id), tpl.perGroup);
      chosen.forEach(ex => {
        const itemId = 'i' + (k++);
        items.push({ id: itemId, exampleRef: ex.id });
        answer[itemId] = g.id;       // правильное размещение — в задании
      });
    });
    built.push({
      id: tpl.id,
      theme: tpl.theme,
      type: TASK_TYPES.SORT,
      prompt: tpl.prompt,
      groups: tpl.groups,
      items,
      answer,
      check: CHECK.AUTO,
      weight: TASK_WEIGHTS.sort,     // общий вес распределения (см. TASK_WEIGHTS)
    });
  });

  // 2.5 Задания «Найди в аяте» — по галочкам активности (найди правила нуна/мима)
  if (activityFind && (activityFind.nun || activityFind.mim)) {
    ['nun', 'mim'].forEach(function (gid) {
      if (!activityFind[gid]) return;
      var grp = FIND_GROUPS[gid];
      // аяты, где эти правила есть; выбор — тем же seeded rng
      var pool = ayahsWithGroup(gid);
      if (!pool.length) return;
      var count = activityFind[gid + 'Count'] || 1;
      var chosen = pick(pool, count);
      chosen.forEach(function (ayah) {
        var targets = findTargetsFor(ayah.id, gid);
        built.push({
          id: nextId('t_find_' + gid),
          theme: grp.rules[0],              // для окраски/группировки
          type: TASK_TYPES.FIND,
          prompt: 'Подчеркни места правил ' + grp.name,
          ayahRef: ayah.id,
          findGroup: gid,                   // какая группа правил
          options: grp.rules,               // варианты при выборе правила
          answer: targets,                  // {индекс слова: правило}
          check: CHECK.AUTO,
          weight: TASK_WEIGHTS.find,
        });
      });
    });
  }

  // 3. Задания чтения вслух (recite, ручная проверка)
  //    Если преподаватель выбрал аяты в конструкторе (?ayahs=…) — читаем их.
  //    Иначе берём по одному случайному аяту нужного правила.
  if (typeof AYAHS !== 'undefined') {
    // Приоритет источника аятов для чтения:
    //   1) активность (recite из панели), 2) выбранные в конструкторе (?ayahs=),
    //   3) иначе случайные по правилу.
    var selectedIds = (activityRecite && activityRecite.length)
      ? activityRecite
      : ((typeof getSelectedAyahIds === 'function') ? getSelectedAyahIds() : []);

    if (selectedIds.length > 0) {
      // FIXED: преподаватель задал конкретные аяты — по заданию на каждый
      selectedIds.forEach(function (ayId, i) {
        var ayah = (typeof AYAH_BY_ID !== 'undefined') ? AYAH_BY_ID[ayId] : null;
        if (!ayah) return;
        built.push({
          id: 'recite_' + i,
          theme: ayah.rules && ayah.rules[0] ? ayah.rules[0] : 'ikhfa_nun',
          type: TASK_TYPES.RECITE,
          prompt: 'Прочитайте аят вслух с соблюдением правил',
          ayahRef: ayah.id,          // ссылка в библиотеку аятов
          check: CHECK.MANUAL,       // оценивает преподаватель
          weight: TASK_WEIGHTS.recite,
        });
      });
    } else {
      // RANDOM: по одному аяту на раздел из шаблонов recite
      RECITE_TEMPLATES.forEach(function (tpl) {
        var pool = AYAHS.filter(function (a) { return a.rules.indexOf(tpl.rule) !== -1; });
        var chosen = pick(pool, 1);
        if (chosen.length) {
          built.push({
            id: tpl.id,
            theme: tpl.theme,
            type: TASK_TYPES.RECITE,
            prompt: 'Прочитайте аят вслух с соблюдением правил',
            ayahRef: chosen[0].id,
            check: CHECK.MANUAL,
            weight: TASK_WEIGHTS.recite,
          });
        }
      });
    }
  }

  return built;
}

/* TASKS теперь СТРОИТСЯ, а не пишется вручную. При каждом вызове —
   свежий набор со случайными примерами. Движок зовёт rebuildTasks()
   при старте попытки; здесь — начальное построение для совместимости. */
let TASKS = buildTasksFromTemplates(false);  // старт — фиксированный набор

function rebuildTasks(randomize, activityThemes, activityRecite, activitySort, activityFind) {
  TASKS = buildTasksFromTemplates(!!randomize, activityThemes || null, activityRecite || null, activitySort || null, activityFind || null);
  return TASKS;
}


/* ──────────────────────────────────────────────────────────────────────
   РЕЖИМЫ  (mode — самостоятельная сущность)
   ──────────────────────────────────────────────────────────────────────
   Закон платформы: задание НЕ знает, где оно используется. Режим решает,
   ПО КАКИМ ПРАВИЛАМ обращаться с одними и теми же заданиями.

   Один и тот же набор заданий проходится и как экзамен, и как тренировка —
   меняется только режим. Это третий столп архитектуры (после «тема=данные»
   и «новый тип без правки движка»): доказать, что режим — отдельный слой.

   Добавить новый режим (домашка, самопроверка) = добавить запись сюда,
   не трогая ни задания, ни движок.
────────────────────────────────────────────────────────────────────── */
const MODES = {
  exam: {
    id: 'exam',
    showAnswersImmediately: false,  // правильность — только в конце
    allowBack: true,                // свободная навигация до завершения
    showExplanation: false,         // объяснений нет
    warnOnUnanswered: true,
    unlimitedAttempts: false,       // официальна первая попытка
    sendResult: true,               // результат уходит преподавателю
    randomizeExamples: false,       // ← КОНТРОЛЬНАЯ ФИКСИРОВАНА: у всех одинаково
    timerMode: 'countdown',         // обратный отсчёт от лимита
    warnBeforeEndMin: 3,            // предупредить за 3 минуты до конца
    graceMinutes: 2,               // добавка после конца, потом автозавершение
  },
  training: {
    id: 'training',
    showAnswersImmediately: true,   // сразу видно верно/неверно
    allowBack: false,               // идём вперёд, как в мини-тренажёрах
    showExplanation: true,          // снизу объяснение
    warnOnUnanswered: false,
    unlimitedAttempts: true,        // проходить сколько угодно
    sendResult: false,              // тренировка не отправляется
    randomizeExamples: true,        // ← ТРЕНИРОВКА РАЗНАЯ: случайные примеры
    timerMode: 'countup',           // время идёт вперёд, без лимита
    warnBeforeEndMin: 0,
  },
};


/* ──────────────────────────────────────────────────────────────────────
   ПОСТАВЩИК ОБЪЯСНЕНИЙ  (абстракция за границей)
   ──────────────────────────────────────────────────────────────────────
   ВАЖНОЕ АРХИТЕКТУРНОЕ РЕШЕНИЕ (по требованию преподавателя):
   Мы СОЗНАТЕЛЬНО не фиксируем, где хранятся объяснения. Режим тренировки
   спрашивает объяснение ЧЕРЕЗ эту функцию и не знает источника.

   Сегодня функция возвращает заглушку. Когда появятся уроки и разбор
   ошибок, мы поймём, где объяснения живут естественно (задание? знание?
   методический слой? отдельная сущность?) — и поменяем ТОЛЬКО эту функцию.
   Режим тренировки и интерфейс останутся нетронутыми.

   Тот же принцип, что везде: спрашивать через границу, а не знать напрямую.
────────────────────────────────────────────────────────────────────── */
function getExplanation(task, userAnswer, checkResult) {
  // Пока — временная заглушка. Источник намеренно не зафиксирован.
  // Возвращаем короткую нейтральную подсказку по факту правильности.
  if (checkResult && checkResult.correct === true) {
    return 'Верно.';
  }
  if (checkResult && checkResult.pending) {
    return 'Это задание проверит преподаватель.';
  }
  return 'Пока без подробного объяснения — оно появится позже.';
}


/* ──────────────────────────────────────────────────────────────────────
   СБОРКА ЭКЗАМЕНА
   Экзамен только ССЫЛАЕТСЯ на темы и задаёт режим. Ничего не копирует.
   Настройки вынесены отдельно — в будущем ими управляет панель преподавателя.
────────────────────────────────────────────────────────────────────── */
const EXAM_CONFIG = {
  id: 'exam_mim_nun_1',
  title: 'Контрольная работа: правила мима и нуна',
  mode: 'exam',                     // ← ссылка на режим, а не встроенные правила
  themeOrder: [
    'izhar_mim', 'idgham_mim', 'ikhfa_mim', 'shadda_mim',
    'izhar_nun', 'idgham_nun', 'iqlab_nun', 'ikhfa_nun', 'shadda_nun',
  ],
  settings: {
    shuffleThemes: false,
    shuffleWithinTheme: false,   // контрольная: порядок стабилен у всех
    timeLimitMinutes: 20,        // лимит контрольной (мин); задаёт преподаватель
  },
};

/* Та же сборка в режиме тренировки: те же темы, отличается только mode. */
const TRAINING_CONFIG = {
  id: 'training_mim_nun_1',
  title: 'Тренировка: правила мима и нуна',
  mode: 'training',
  themeOrder: EXAM_CONFIG.themeOrder,   // те же темы, ссылка — не копия
  settings: {
    shuffleThemes: false,
    shuffleWithinTheme: true,    // тренировка: порядок можно перемешивать
    timeLimitMinutes: null,
  },
};


/* ──────────────────────────────────────────────────────────────────────
   АКТИВНОСТИ  (activity — то, что ученик открывает по ссылке)
   ──────────────────────────────────────────────────────────────────────
   Ученик открывает НЕ режим и НЕ «экзамен» — он открывает конкретную
   активность. Активность несёт в себе режим, набор тем и состояние
   (открыта/закрыта). Движку безразлично, кто создал активность: сегодня
   она задана здесь в файле, завтра её создаст панель преподавателя —
   движок не заметит разницы.

   EXAM_CONFIG и TRAINING_CONFIG выше — это и есть две активности,
   просто заданные вручную. Ниже — их реестр и указатель «что открыто».
────────────────────────────────────────────────────────────────────── */
const ACTIVITIES = {
  exam_mim_nun_1:     EXAM_CONFIG,
  training_mim_nun_1: TRAINING_CONFIG,
};

/* Какая активность открыта — определяется ССЫЛКОЙ (параметром в адресе).
   Это даёт преподавателю два простых способа раздать нужное:

     …/exam.html                  → контрольная (по умолчанию)
     …/exam.html?mode=training    → тренировка
     …/exam.html?mode=exam        → контрольная (явно)

   Ученик видит только то, что в его ссылке — переключателя у него нет.
   Позже панель преподавателя заменит ручную раздачу ссылок, не меняя
   эту логику: она просто будет создавать активности и давать на них ссылки.

   Значение по умолчанию — контрольная, чтобы «голая» ссылка была строгой. */
function getModeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'training') return 'training_mim_nun_1';
    if (m === 'exam') return 'exam_mim_nun_1';
  } catch (e) { /* нет window (тесты) — вернём дефолт */ }
  return 'exam_mim_nun_1';
}

function getOpenActivity() {
  return ACTIVITIES[getModeFromUrl()] || EXAM_CONFIG;
}


/* Выбранные преподавателем аяты (из конструктора). Приходят в ссылке как
   ?ayahs=id1,id2,... Пока запись голоса не готова, мы просто СОХРАНЯЕМ выбор —
   он будет использован разделом чтения, как только тот появится. Ничего не
   ломает: если параметра нет, список пуст. */
function getSelectedAyahIds() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ayahs');
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch (e) { return []; }
}
