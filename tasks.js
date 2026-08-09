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

/* Как показывать варианты ответа. НЕ новый тип задания: выбор одного
   ответа остаётся выбором одного ответа, движок и проверка те же.
   Меняется только вид — русская подпись или арабский знак крупно. */
const OPTION_STYLE = {
  TEXT:   'text',     // «Изхар», «Хамза» — как сейчас
  LETTER: 'letter',   // буква арабским, крупно: ب ص ط
};

/* ──────────────────────────────────────────────────────────────────────
   ВОПРОСЫ О БУКВАХ  (нулевой курс)
   ──────────────────────────────────────────────────────────────────────
   Не пишутся руками по одному. Каждый шаблон говорит, ПО КАКОМУ свойству
   спрашивать, а платформа берёт одну подходящую букву и две неподходящие.
   Значит вопросов хватит на любое число прохождений, и у каждого ученика
   свой набор — в отличие от готовой формы, где тридцать вопросов навсегда.

   negative: true — вопрос наоборот: «какая НЕ является межзубной».
   Тогда верный ответ тот, у кого свойства НЕТ.
────────────────────────────────────────────────────────────────────── */
const LETTER_TEMPLATES = [
  { id: 'lq_connect_both', prop: 'connects', ask: 'Какая из этих букв соединяется <b>с обеих</b> сторон?' },
  { id: 'lq_connect_no',   prop: 'connects', negative: true,
    ask: 'Какая из этих букв <b>НЕ</b> соединяется с последующей?' },
  { id: 'lq_interdental',  prop: 'interdental', ask: 'Какая из этих букв является межзубной?' },
  { id: 'lq_interdental_no', prop: 'interdental', negative: true,
    ask: 'Какая из этих букв <b>НЕ</b> является межзубной?' },
  { id: 'lq_heavy',        prop: 'heavy', ask: 'Какая буква читается твёрдо (с оттенком «о»)?' },
  { id: 'lq_heavy_no',     prop: 'heavy', negative: true,
    ask: 'Какая из этих букв <b>НЕ</b> является твёрдой?' },
  { id: 'lq_madd',         prop: 'madd',  ask: 'Какая из этих букв является буквой мадда?' },
  { id: 'lq_throat',       prop: 'throat', ask: 'Какая из этих букв горловая?' },
];

/* Собрать один вопрос о букве: верный ответ и два неверных. */
function buildLetterTask(tpl, rng, nextId) {
  if (typeof LETTERS === 'undefined') return null;
  const pick1 = function (arr) { return arr[Math.floor(rng() * arr.length)]; };

  const yes = lettersWith(tpl.prop, true);
  const no  = lettersWith(tpl.prop, false);
  // при вопросе наоборот верный — тот, У КОГО свойства нет
  const rightPool = tpl.negative ? no : yes;
  const wrongPool = tpl.negative ? yes : no;
  if (rightPool.length < 1 || wrongPool.length < 2) return null;

  const right = pick1(rightPool);
  const wrong = [];
  const seen = { [right.id]: 1 };
  let guard = 0;
  while (wrong.length < 2 && guard++ < 200) {
    const w = pick1(wrongPool);
    if (!seen[w.id]) { seen[w.id] = 1; wrong.push(w); }
  }
  if (wrong.length < 2) return null;

  const opts = shuffleWith([right].concat(wrong), rng).map(function (l) {
    return { id: l.id, label: l.ch, sub: l.name };   // подпись — сама буква
  });

  return {
    id: nextId('t_letter'),
    theme: 'letters',
    stage: 'course0',
    type: TASK_TYPES.SINGLE,
    optionStyle: OPTION_STYLE.LETTER,
    prompt: tpl.ask,
    options: opts,
    answer: right.id,
    check: CHECK.AUTO,
    weight: TASK_WEIGHTS.single,
  };
}

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
  // варианты мадда
  { id: 'madd_tabii',    label: 'Естественный' },
  { id: 'madd_iwad',     label: '‘Ивад' },
  { id: 'madd_muttasil', label: 'Муттасиль' },
  { id: 'madd_munfasil', label: 'Мунфасыль' },
  { id: 'madd_lazim',       label: 'Лазим (словесный)' },
  { id: 'madd_lazim_harfi', label: 'Лазим (буквенный)' },
  { id: 'madd_arid',        label: '‘Арид' },
  { id: 'madd_lin',         label: 'Мягкий (лин)' },
];

/* Семейства правил — чтобы отвлекающие варианты были ПОХОЖИМИ (того же
   раздела), а не очевидно чужими. По теме задания определяем семейство,
   и три неправильных варианта берём в первую очередь из него. */
const OPTION_FAMILY = {
  mim: ['izhar', 'idgham', 'ikhfa', 'shadda_mim'],
  nun: ['izhar', 'idgham', 'ikhfa', 'iqlab', 'shadda_nun'],
  madd: ['madd_tabii', 'madd_iwad', 'madd_muttasil', 'madd_munfasil',
         'madd_lazim', 'madd_lazim_harfi', 'madd_arid', 'madd_lin'],
};
function familyOfTheme(themeId) {
  if (themeId.indexOf('madd') !== -1) return 'madd';
  return (themeId.indexOf('mim') !== -1) ? 'mim' : 'nun';
}

/* Построить 4 варианта для вопроса: правильный + 3 похожих отвлекающих.
   Похожие берём из того же семейства; если не хватает — добираем из общего
   списка. Порядок вариантов перемешиваем детерминированно (через rng). */
function buildFourOptions(correctId, themeId, rng, exclude) {
  const byId = {};
  RULE_OPTIONS.forEach(o => { byId[o.id] = o; });

  /* exclude — правила, которые в ЭТОМ слове тоже видно (пример объявил их
     в alsoShows). Их нельзя ставить вариантом: ученик выберет такой ответ
     и будет по-своему прав, а платформа засчитает ошибку. Убираем их из
     отвлекающих — вопрос остаётся с четырьмя вариантами, но честный. */
  const ban = Array.isArray(exclude) ? exclude : [];
  const allowed = function (id) { return id !== correctId && ban.indexOf(id) === -1; };

  const fam = OPTION_FAMILY[familyOfTheme(themeId)] || [];
  // отвлекающие из того же семейства (кроме правильного и спорных), перемешанные
  let famDistract = shuffleWith(fam.filter(allowed), rng);

  let distractors = famDistract.slice(0, 3);
  // если в семействе меньше 3 — добрать из общего списка (тоже перемешав)
  if (distractors.length < 3) {
    const rest = shuffleWith(
      RULE_OPTIONS.map(o => o.id).filter(id => allowed(id) && distractors.indexOf(id) === -1),
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
  // Мадд — правильный ответ совпадает с id темы
  { theme: 'madd_tabii',    answer: 'madd_tabii',    count: 2 },
  { theme: 'madd_iwad',     answer: 'madd_iwad',     count: 2 },
  { theme: 'madd_muttasil', answer: 'madd_muttasil', count: 2 },
  { theme: 'madd_munfasil', answer: 'madd_munfasil', count: 2 },
  { theme: 'madd_lazim',       answer: 'madd_lazim',       count: 2 },
  { theme: 'madd_lazim_harfi', answer: 'madd_lazim_harfi', count: 2 },
  { theme: 'madd_arid',        answer: 'madd_arid',        count: 2 },
  { theme: 'madd_lin',         answer: 'madd_lin',         count: 2 },
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

/* ──────────────────────────────────────────────────────────────────────
   ОСОБЫЙ ТЕКСТ ВОПРОСА ДЛЯ ТЕМЫ
   ──────────────────────────────────────────────────────────────────────
   По умолчанию вопрос один на все темы: «Какое правило в этом примере?».
   Но некоторые правила так спрашивать НЕЛЬЗЯ — вопрос будет методически
   неверным. Первый такой случай — мадд ‘ивад: он существует только при
   ОСТАНОВКЕ (вакфе). Пока чтение продолжается, ‘ивада нет вовсе, и слово
   с танвином — это просто слово с танвином.

   Поэтому тема может задать свой текст вопроса. Одна строка на тему;
   темы без записи берут общий вопрос. Сюда же лягут будущие исключения
   (харакаты, буквы нулевого курса).
────────────────────────────────────────────────────────────────────── */
const DEFAULT_PROMPT = 'Какое правило в этом примере?';

const THEME_PROMPTS = {
  // Звёздочками отмечено условие, которое интерфейс выделит цветом.
  // Без выделения ученик в потоке однотипных вопросов читает его по
  // диагонали и отвечает так, будто спрашивают про обычный мадд.
  madd_iwad: 'Какой мадд появится, если **остановиться на этом слове**?',
  madd_arid: 'Какой мадд появится, если **остановиться на этом слове**?',
  madd_lin:  'Какой мадд появится, если **остановиться на этом слове**?',
};

function promptForTheme(themeId) {
  return THEME_PROMPTS[themeId] || DEFAULT_PROMPT;
}

/* Названия строк в разборе результата, которые НЕ являются темой.
   Распределение проверяет сразу много правил, поэтому нечестно вешать
   его баллы на одну тему: строка «Мадд муттасиль 13,6 / 14» врала бы.
   Оно получает собственную строку. */
const SCORE_GROUP_NAMES = {
  sort_mim:  'Распределение (мим)',
  sort_nun:  'Распределение (нун)',
  sort_madd: 'Распределение (мадд)',
};

/* Правила, которые существуют ТОЛЬКО при остановке. Если такое правило
   стоит коробкой в распределении, всё задание идёт «при остановке» —
   иначе оно противоречиво: при продолжении чтения этих правил нет вовсе.
   Одно место, откуда об этом узнают все задания. */
const STOP_ONLY_THEMES = ['madd_iwad', 'madd_arid', 'madd_lin'];

/* Шаблоны sort. groups.id = тема библиотеки (откуда брать примеры). */
const SORT_TEMPLATES = [
  {
    id: 'sort_mim',
    theme: 'izhar_mim',                 // тема-«владелец» для порядка в экзамене
    scoreGroup: 'sort_mim',             // в разборе по темам — своей строкой
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
    scoreGroup: 'sort_nun',             // в разборе по темам — своей строкой
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
  {
    id: 'sort_madd',
    theme: 'madd_muttasil',             // место в порядке заданий — среди тем мадда
    scoreGroup: 'sort_madd',            // а в разборе по темам — своей строкой
    prompt: 'Распределите слова по правилам мадда',
    perGroup: 2,
    groups: [
      { id: 'madd_tabii',    label: 'Естественный' },
      { id: 'madd_iwad',     label: '‘Ивад' },
      { id: 'madd_muttasil', label: 'Муттасиль' },
      { id: 'madd_munfasil', label: 'Мунфасыль' },
      { id: 'madd_lazim',       label: 'Лазим (словесный)' },
      { id: 'madd_lazim_harfi', label: 'Лазим (буквенный)' },
      { id: 'madd_lin',         label: 'Мягкий (лин)' },
      { id: 'madd_arid',        label: '‘Арид' },
    ],
    weight: 5,
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

/* Примеры темы, ПРИГОДНЫЕ ДЛЯ РАСПРЕДЕЛЕНИЯ по заданным коробкам.
   Отбрасываем те, в которых видно ещё одно правило, стоящее коробкой
   рядом: у такого слова два верных места, а засчитается одно.
   Знание об этом лежит в примере (alsoShows), решение — здесь, в задании.

   Если после отбора не осталось ничего (у темы все примеры «двойные»),
   возвращаем исходный список: лучше несовершенное задание, чем пустая
   коробка. Такую тему видно в панели по счётчику примеров. */
function examplesForSort(themeId, boxIds) {
  const all = examplesOfTheme(themeId);
  const fit = all.filter(function (e) {
    if (!e.alsoShows || !e.alsoShows.length) return true;
    return !e.alsoShows.some(function (r) { return boxIds.indexOf(r) !== -1; });
  });
  return fit.length ? fit : all;
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
  nun:  { id:'nun',  name:'нуна', rules:['izhar_nun','idgham_nun','iqlab_nun','ikhfa_nun'] },
  mim:  { id:'mim',  name:'мима', rules:['izhar_mim','idgham_mim','ikhfa_mim'] },
  madd: { id:'madd', name:'мадда', rules:['madd_tabii','madd_iwad','madd_muttasil',
          'madd_munfasil','madd_lazim','madd_lazim_harfi','madd_arid','madd_lin'] },
};

/* ──────────────────────────────────────────────────────────────────────
   ЦЕЛИ ЗАДАНИЯ «НАЙДИ В АЯТЕ»
   ──────────────────────────────────────────────────────────────────────
   Раньше здесь была карта {слово: правило} — по одному правилу на слово.
   Для мима и нуна это годилось: в одном слове они не встречаются вместе.
   Мадды встречаются постоянно: в ٱلضَّآلِّينَ сразу лазим, естественный и,
   при остановке, ‘арид. Одно правило на слово теряло бы остальные.

   Теперь цель — ПАРА «слово + правило», а на слове их может быть несколько:
       { 3: ['madd_lazim', 'madd_tabii'] }
   Слово с двумя искомыми правилами требует двух черт: ученик отмечает его
   дважды и называет разные правила.

   rules — какие правила ИЩЕМ. Их выбирает преподаватель для каждого аята:
   можно одно, можно три. Остальные правила в аяте просто не спрашиваются
   и за них не штрафуют.
────────────────────────────────────────────────────────────────────── */
function findTargetsFor(ayahId, rules) {
  if (typeof AYAH_MARKS === 'undefined') return null;
  const marks = AYAH_MARKS[ayahId] || [];
  // строкой пришёл id группы — берём все её правила (старые активности)
  const list = Array.isArray(rules)
    ? rules
    : ((FIND_GROUPS[rules] && FIND_GROUPS[rules].rules) || []);
  if (!list.length) return null;
  const targets = {};
  let any = false;
  marks.forEach(m => {
    if (list.indexOf(m.rule) === -1) return;
    if (!targets[m.w]) targets[m.w] = [];
    if (targets[m.w].indexOf(m.rule) === -1) { targets[m.w].push(m.rule); any = true; }
  });
  return any ? targets : null;
}

/* Сколько всего целей в аяте — считаем пары «слово + правило». */
function countFindTargets(targets) {
  return Object.keys(targets || {}).reduce(function (n, w) { return n + targets[w].length; }, 0);
}

/* Аяты, где есть искомые правила — чтобы задание было осмысленным. */
function ayahsWithGroup(rules) {
  if (typeof AYAHS === 'undefined') return [];
  return AYAHS.filter(a => findTargetsFor(a.id, rules) !== null);
}

/* Каким «номером билета» собрана последняя работа. Нужен снаружи:
   в случайных режимах его сохраняют вместе с ответами, чтобы после
   перезагрузки собрать РОВНО ТУ ЖЕ работу, а не новую. */
let LAST_SEED = null;

function buildTasksFromTemplates(randomize, activityThemes, activityRecite, activitySort, activityFind, seed) {
  /* Для контрольной seed постоянный — «билет» стабилен для всей группы.
     Для остальных режимов свежий при каждом запуске.

     ВАЖНО: seed можно передать снаружи. Без этого получалась порча работы:
     ученик отвечал на пять вопросов, перезагружал страницу — задания
     пересобирались заново со случайными примерами, а ответы оставались
     старыми и оказывались привязаны к другим словам. */
  const useSeed = randomize
    ? (seed != null ? seed : ((Date.now() ^ (Math.random() * 1e9)) >>> 0))
    : 20260101;                          // фиксированный «номер билета»
  LAST_SEED = useSeed;
  const rng = makeRng(useSeed);
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
        prompt: promptForTheme(tpl.theme),
        options: buildFourOptions(tpl.answer, tpl.theme, rng, ex.alsoShows),  // верный + 3 похожих, без спорных
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
    // какой набор выбранных правил у этого распределения (из активности)
    var selKey = tpl.id === 'sort_mim' ? 'mimRules' : (tpl.id === 'sort_nun' ? 'nunRules' : 'maddRules');
    if (byActivity) {
      const want = (tpl.id === 'sort_mim' && activitySort && activitySort.mim) ||
                   (tpl.id === 'sort_nun' && activitySort && activitySort.nun) ||
                   (tpl.id === 'sort_madd' && activitySort && activitySort.madd);
      if (!want) return;   // галочка не стоит — пропускаем это распределение
    }
    // Коробки — только выбранные преподавателем правила.
    // Не выбрал ничего (0) — берём все правила раздела.
    // Выбрал 1 — распределять не во что, пропускаем (минимум 2 коробки).
    // Выбрал 2+ — берём именно их.
    var selectedRules = (byActivity && activitySort && activitySort[selKey]) ? activitySort[selKey] : [];
    var groups = tpl.groups;
    if (byActivity && selectedRules.length > 0) {
      if (selectedRules.length < 2) return;   // только 1 правило — распределение бессмысленно
      groups = tpl.groups.filter(function (g) { return selectedRules.indexOf(g.id) !== -1; });
    }
    if (groups.length < 2) return;   // на всякий случай

    const items = [];
    const answer = {};
    let k = 0;
    const boxIds = groups.map(function (g) { return g.id; });
    groups.forEach(g => {
      const chosen = pick(examplesForSort(g.id, boxIds), tpl.perGroup);
      chosen.forEach(ex => {
        const itemId = 'i' + (k++);
        items.push({ id: itemId, exampleRef: ex.id });
        answer[itemId] = g.id;       // правильное размещение — в задании
      });
    });
    // Рамка «при остановке», если среди коробок есть правило паузы.
    // Это не подсказка (какое правило — не сказано), а условие задачи.
    var promptText = tpl.prompt;
    if (groups.some(function (g) { return STOP_ONLY_THEMES.indexOf(g.id) !== -1; })) {
      promptText += ' (на каждом слове — остановка)';
    }

    built.push({
      id: tpl.id,
      theme: tpl.theme,
      scoreGroup: tpl.scoreGroup || null,
      type: TASK_TYPES.SORT,
      prompt: promptText,
      groups: groups,
      items,
      answer,
      check: CHECK.AUTO,
      weight: TASK_WEIGHTS.sort,     // общий вес распределения (см. TASK_WEIGHTS)
    });
  });

  // 2.5 Задания «Найди в аяте» — по галочкам активности (найди правила нуна/мима)
  if (activityFind && (activityFind.nun || activityFind.mim || activityFind.madd)) {
    ['nun', 'mim', 'madd'].forEach(function (gid) {
      if (!activityFind[gid]) return;
      var grp = FIND_GROUPS[gid];
      // Какие правила ИЩЕМ. Преподаватель выбирает их сам; если не выбрал —
      // все правила раздела, как было раньше (старые активности не ломаются).
      var groupRules = activityFind[gid + 'Rules'];
      if (!Array.isArray(groupRules) || !groupRules.length) groupRules = grp.rules;

      // аяты, выбранные преподавателем; если не выбрал — берём все подходящие
      var selectedIds = activityFind[gid + 'Ayahs'] || [];
      var chosen;
      if (selectedIds.length) {
        chosen = selectedIds
          .map(function (id) { return AYAH_BY_ID[id]; })
          .filter(function (a) { return a && findTargetsFor(a.id, groupRules); });
      } else {
        var pool = ayahsWithGroup(groupRules);
        if (!pool.length) return;
        chosen = pick(pool, 1);   // не выбрал — один случайный
      }
      chosen.forEach(function (ayah) {
        var targets = findTargetsFor(ayah.id, groupRules);
        // Правила, которые в этом аяте вправду есть, — только они идут
        // в варианты. Предлагать правило, которого в аяте нет, — подсказка
        // наоборот: ученик будет искать несуществующее.
        var present = [];
        Object.keys(targets).forEach(function (w) {
          targets[w].forEach(function (r) { if (present.indexOf(r) === -1) present.push(r); });
        });
        var options = groupRules.filter(function (r) { return present.indexOf(r) !== -1; });
        var names = options.map(function (r) {
          return (THEMES[r] && THEMES[r].name) || r;
        });
        built.push({
          id: nextId('t_find_' + gid),
          theme: options[0] || grp.rules[0],   // для окраски/группировки
          type: TASK_TYPES.FIND,
          prompt: options.length === 1
            ? 'Подчеркни в аяте места правила «' + names[0] + '»'
            : 'Подчеркни места правил ' + grp.name + ': ' + names.join(', '),
          ayahRef: ayah.id,
          findGroup: gid,
          options: options,                    // варианты при выборе правила
          answer: targets,                     // {слово: [правила]}
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
    /* Активность пришла из панели (даже с пустым списком) — читаем ровно
       то, что выбрал преподаватель. Ничего не выбрал — чтения не будет.
       Случайные аяты подставляем только когда активности нет вовсе:
       это учебный набор по умолчанию, а не работа преподавателя. */
    var fromActivity = Array.isArray(activityRecite);
    var selectedIds = fromActivity
      ? activityRecite
      : ((typeof getSelectedAyahIds === 'function') ? getSelectedAyahIds() : []);

    if (fromActivity && !selectedIds.length) {
      // преподаватель не выбрал ни одного аята — заданий чтения нет
    } else if (selectedIds.length > 0) {
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

function rebuildTasks(randomize, activityThemes, activityRecite, activitySort, activityFind, seed) {
  TASKS = buildTasksFromTemplates(!!randomize, activityThemes || null, activityRecite || null,
                                  activitySort || null, activityFind || null, seed);
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
  /* ДОМАШНЕЕ ЗАДАНИЕ — то, чего не давали ни экзамен, ни тренировка:
     ученик видит ошибку сразу, И работа приходит преподавателю.

     Решения и причины:
     • ответ сразу + объяснение — домашка нужна, чтобы учиться, а не
       чтобы поймать на незнании;
     • назад нельзя: увидев верный ответ, можно было бы вернуться
       и переправить предыдущий;
     • одна работа на сессию, а не «сколько угодно»: иначе журнал
       заполнится повторами одного ученика, и непонятно, какой считать.
       Нужна вторая попытка — преподаватель открывает новую сессию;
     • примеры у каждого свои: домашку делают без присмотра;
     • таймер обратный, если преподаватель поставил лимит; без лимита
       время просто идёт вперёд.

     ВАЖНО: балл за домашку не сравним с баллом за контрольную — при
     мгновенных ответах ученик учится по ходу. Это две разные величины. */
  homework: {
    id: 'homework',
    showAnswersImmediately: true,
    // Назад ходить МОЖНО, но уже данный ответ переписать нельзя — интерфейс
    // блокирует варианты у отвеченных вопросов. Без этого получался тупик:
    // ученик пропустил вопрос, а вернуться к нему уже не мог.
    allowBack: true,
    showExplanation: true,
    warnOnUnanswered: true,
    unlimitedAttempts: false,
    sendResult: true,               // ← главное отличие от тренировки
    randomizeExamples: true,        // у каждого свой набор
    timerMode: 'countdown',
    warnBeforeEndMin: 3,
    graceMinutes: 2,
  },
  training: {
    id: 'training',
    showAnswersImmediately: true,   // сразу видно верно/неверно
    allowBack: true,                // вернуться можно, переписать ответ нельзя
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
   Режим спрашивает объяснение ЧЕРЕЗ эту функцию и не знает источника.
   Источник наконец определился: признак правила (THEMES[...].sign) —
   это знание о правиле, поэтому лежит в knowledge.js. Захотим позже
   объяснения под конкретный пример или под частую ошибку — поменяется
   только эта функция, режим и интерфейс останутся нетронутыми.

   Главное здесь — ПРОТИВОПОСТАВЛЕНИЕ. Ученику мало услышать «неверно»:
   он должен увидеть, чем выбранное им правило отличается от нужного.
   Поэтому при ошибке показываем два признака сразу.
────────────────────────────────────────────────────────────────────── */
/* У мима и нуна правильный ответ записан ОБЩИМ именем: izhar, idgham,
   ikhfa — потому что «Изхар» в вопросе один, семейство названо отдельно.
   А признак правила лежит у полной темы: izhar_nun, izhar_mim.

   Из-за этого объяснение не находилось и печаталось само имя: «izhar.».
   Здесь достраиваем общее имя до полного, глядя на тему задания. */
function fullTheme(answerId, taskTheme) {
  if (THEMES[answerId]) return answerId;
  if (taskTheme) {
    var suffix = String(taskTheme).match(/_(mim|nun)$/);
    if (suffix && THEMES[answerId + suffix[0]]) return answerId + suffix[0];
  }
  var guess = ['_nun', '_mim'].map(function (x) { return answerId + x; })
                              .filter(function (id) { return THEMES[id]; })[0];
  return guess || answerId;
}

function signOf(themeId) {
  return (THEMES[themeId] && THEMES[themeId].sign) || '';
}

function nameOf(themeId) {
  return (THEMES[themeId] && THEMES[themeId].name) || themeId;
}

function getExplanation(task, userAnswer, checkResult) {
  if (checkResult && checkResult.pending) {
    return 'Это задание проверит преподаватель.';
  }

  // Вопрос с одним ответом — здесь противопоставление работает лучше всего.
  if (task && task.type === TASK_TYPES.SINGLE) {
    var right = fullTheme(task.answer, task.theme);
    var rightPart = '<b>' + nameOf(right) + '</b>. ' + signOf(right);

    if (checkResult && checkResult.correct === true) {
      return rightPart;
    }
    var chosen = fullTheme(userAnswer, task.theme);
    var chosenSign = (chosen && chosen !== right) ? signOf(chosen) : '';
    return 'Здесь ' + rightPart +
      (chosenSign ? '<br><br>Ты выбрал <b>' + nameOf(chosen) + '</b>: ' + chosenSign : '');
  }

  // Распределение: разбор по каждому слову ученик уже видит на экране,
  // поэтому здесь — общая мысль, на что смотреть.
  if (task && task.type === TASK_TYPES.SORT) {
    return (checkResult && checkResult.correct === true)
      ? 'Все слова разложены верно.'
      : 'Смотри на букву, которая идёт сразу после нун, мим или буквы мадда — правило определяет именно она.';
  }

  // «Найди в аяте»
  if (task && task.type === TASK_TYPES.FIND) {
    return (checkResult && checkResult.correct === true)
      ? 'Все места правила найдены.'
      : 'Правило может стоять и на стыке двух слов — проверь концы слов, не только середину.';
  }

  return (checkResult && checkResult.correct === true) ? 'Верно.' : '';
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
    'madd_tabii', 'madd_iwad', 'madd_muttasil', 'madd_munfasil', 'madd_lazim',
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
