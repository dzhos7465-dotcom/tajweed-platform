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
   НУЛЕВОЙ КУРС: БУКВЫ И ЗНАКИ
   ──────────────────────────────────────────────────────────────────────
   Вопросы не пишутся руками по одному. Каждый БЛОК — это умение, которое
   проверяется; внутри блока лежит несколько видов вопросов на это умение,
   и платформа каждый раз берёт другой вид и другие буквы. Значит вопросов
   хватит на любое число прохождений, и у каждого ученика свой набор —
   в отличие от готовой формы, где тридцать вопросов навсегда.

   ПОЧЕМУ БЛОК, А НЕ ВОПРОС. В панели преподаватель думает умениями
   («проверить огласовки»), а не формулировками. Если бы каждый вид стал
   отдельной строкой, список вырос бы вдвое, а прямой и обратный вопрос
   («какая межзубная» / «какая НЕ межзубная») всё равно осмысленны только
   вместе.

   УЗНАВАНИЕ И ПРИМЕНЕНИЕ. Там, где можно, блок спрашивает не название,
   а работу: не «что такое танвин», а «как прозвучит это окончание».
   Название запоминается со слуха и угадывается по длине ответа;
   применение — нет.

   ГОРЛОВЫХ ЗДЕСЬ НЕТ намеренно: на занятиях эта категория не вводится.
   Свойство throat в библиотеке остаётся — оно нужно для изхара нуна.
────────────────────────────────────────────────────────────────────── */

/* Буквы, которыми можно набрать неверные варианты к вопросу о названии.
   Сначала похожие по написанию, потом — чем добрать, если похожих мало. */
function c0Distractors(right, rng, howMany) {
  const out = [];
  const seen = {};
  seen[right.id] = 1;
  const take = function (list) {
    shuffleWith(list, rng).forEach(function (l) {
      if (out.length < howMany && l && !seen[l.id]) { seen[l.id] = 1; out.push(l); }
    });
  };
  take(similarLetters(right));
  if (out.length < howMany) take(alphabet());
  return out;
}

/* Собрать вопрос с одним ответом. Всё, что отличает вопросы нулевого
   курса друг от друга, задаётся здесь параметрами — сам вид задания
   остаётся тем же SINGLE, который движок уже умеет проверять. */
function c0Task(nextId, blockId, spec) {
  return {
    id: nextId('t_' + blockId),
    theme: blockId,
    stage: 'course0',
    type: TASK_TYPES.SINGLE,
    optionStyle: spec.optionStyle || OPTION_STYLE.TEXT,
    prompt: spec.prompt,
    hero: spec.hero || null,        // что показать крупно над вариантами
    options: spec.options,
    answer: spec.answer,
    explain: spec.explain || '',    // разбор для тренировки
    check: CHECK.AUTO,
    weight: TASK_WEIGHTS.single,
  };
}

/* Вопрос о свойстве буквы: одна подходящая и две неподходящие. */
function c0PropQuestion(nextId, blockId, rng, prop, ask, negative, explain) {
  const yes = lettersWith(prop, true);
  const no = lettersWith(prop, false);
  const rightPool = negative ? no : yes;
  const wrongPool = negative ? yes : no;
  if (!rightPool.length || wrongPool.length < 2) return null;

  const right = pickWith(rightPool, 1, rng)[0];
  const wrong = pickWith(wrongPool, 2, rng);
  if (wrong.length < 2) return null;

  const opts = shuffleWith([right].concat(wrong), rng).map(function (l) {
    return { id: l.id, label: l.ch, sub: l.name };
  });
  return c0Task(nextId, blockId, {
    optionStyle: OPTION_STYLE.LETTER,
    prompt: ask,
    options: opts,
    answer: right.id,
    explain: explain(right),
  });
}

/* Вопрос из готовых словесных вариантов. */
function c0TextQuestion(nextId, blockId, rng, prompt, hero, right, wrongs, explain) {
  const opts = shuffleWith(
    [{ id: 'ok', label: right }].concat(wrongs.map(function (w, i) {
      return { id: 'w' + i, label: w };
    })), rng);
  return c0Task(nextId, blockId, {
    prompt: prompt, hero: hero, options: opts, answer: 'ok', explain: explain,
  });
}

/* Вопрос, где варианты — арабские знаки крупно, без подписей.
   Подпись под знаком была бы ответом. */
function c0GlyphQuestion(nextId, blockId, rng, prompt, hero, rightCh, wrongChs, explain) {
  const opts = shuffleWith(
    [{ id: 'ok', label: rightCh }].concat(wrongChs.map(function (c, i) {
      return { id: 'w' + i, label: c };
    })), rng);
  return c0Task(nextId, blockId, {
    optionStyle: OPTION_STYLE.LETTER,
    prompt: prompt, hero: hero, options: opts, answer: 'ok', explain: explain,
  });
}

/* Случайная лёгкая буква для слога. Твёрдые и меняющие звук сюда не
   попадают: у них фатха даёт оттенок «о», и запись «са» была бы ложью. */
function c0SyllableLetter(rng) {
  const pool = (typeof syllableLetters === 'function') ? syllableLetters() : [];
  return pool.length ? pickWith(pool, 1, rng)[0] : null;
}

const C0_VOWELS = ['fatha', 'kasra', 'damma'];

/* Почему хамза читается именно так. Объяснение строится из свойств слова,
   а не пишется при каждом вопросе: правило одно, и звучать оно должно
   одинаково, где бы ни встретилось. */
function waslWhy(w) {
  if (w.kind === 'moon') {
    return 'Это определённый артикль <b>ٱلْ</b> — хамза в нём всегда читается на «а». ' +
           'Буква после ляма лунная, поэтому сам лям читается.';
  }
  if (w.kind === 'sun') {
    return 'Это определённый артикль <b>ٱلْ</b> — хамза в нём всегда читается на «а». ' +
           'Буква после ляма солнечная: лям не читается, а следующая буква удваивается.';
  }
  const why = (w.vowel === 'у')
    ? 'на третьей букве стоит <b>дамма</b>'
    : 'на третьей букве стоит <b>касра</b> или <b>фатха</b>';
  return 'Хамза читается на «' + w.vowel + '», потому что ' + why +
         '. Смотреть надо не на саму хамзу — у неё своего звука нет, — а на третью букву слова.';
}

const COURSE0_BLOCKS = [
  /* ── БУКВЫ: свойства ───────────────────────────────────────────── */
  {
    id: 'c0_connect', title: 'Соединение букв',
    hint: 'соединяется ли буква с соседней',
    kinds: [
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_connect', rng, 'connects',
          'Какая из этих букв соединяется <b>с обеих</b> сторон?', false,
          function (l) { return 'Это <b>' + l.name + '</b>. Она соединяется и справа, и слева, поэтому в середине слова у неё есть срединная форма.'; });
      },
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_connect', rng, 'connects',
          'Какая из этих букв <b>НЕ</b> соединяется с последующей?', true,
          function (l) { return 'Это <b>' + l.name + '</b>. Таких букв шесть: ا د ذ ر ز و — после них следующая буква начинается заново.'; });
      },
    ],
  },
  {
    id: 'c0sort_connect', title: 'Распределение: соединение',
    hint: 'разложить буквы по тому, соединяются ли они',
    prop: 'connects', perBox: 3,
    prompt: 'Разложите буквы: соединяется с последующей или нет?',
    yes: 'Соединяется', no: 'Не соединяется',
  },
  {
    id: 'c0_interdental', title: 'Межзубные буквы',
    hint: 'ث ذ ظ — кончик языка между зубами',
    kinds: [
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_interdental', rng, 'interdental',
          'Какая из этих букв является межзубной?', false,
          function (l) { return 'Это <b>' + l.name + '</b>. Межзубных три: ث ذ ظ — кончик языка выходит между зубами.'; });
      },
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_interdental', rng, 'interdental',
          'Какая из этих букв <b>НЕ</b> является межзубной?', true,
          function (l) { return 'Это <b>' + l.name + '</b>, язык за зубами не выходит. Межзубные только ث ذ ظ.'; });
      },
    ],
  },
  {
    id: 'c0sort_interdental', title: 'Распределение: межзубные',
    hint: 'разложить буквы на межзубные и обычные',
    prop: 'interdental', perBox: 3,
    prompt: 'Разложите буквы: межзубная или нет?',
    yes: 'Межзубная', no: 'Не межзубная',
  },
  {
    id: 'c0_heavy', title: 'Твёрдые буквы',
    hint: 'читаются с оттенком «о»',
    kinds: [
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_heavy', rng, 'heavy',
          'Какая буква читается твёрдо (с оттенком «о»)?', false,
          function (l) { return 'Это <b>' + l.name + '</b> — твёрдая буква, звук идёт с поднятым корнем языка.'; });
      },
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_heavy', rng, 'heavy',
          'Какая из этих букв <b>НЕ</b> является твёрдой?', true,
          function (l) { return 'Это <b>' + l.name + '</b> — мягкая буква, оттенка «о» в ней нет.'; });
      },
    ],
  },
  {
    id: 'c0sort_heavy', title: 'Распределение: твёрдые и мягкие',
    hint: 'разложить буквы на твёрдые и мягкие',
    prop: 'heavy', perBox: 3,
    prompt: 'Разложите буквы: читается твёрдо или мягко?',
    yes: 'Твёрдая', no: 'Мягкая',
  },
  {
    id: 'c0_madd_letters', title: 'Буквы мадда',
    hint: 'ا و ي — какая какой звук тянет',
    kinds: [
      function (nextId, rng) {
        return c0PropQuestion(nextId, 'c0_madd_letters', rng, 'madd',
          'Какая из этих букв является буквой мадда?', false,
          function (l) { return 'Это <b>' + l.name + '</b>. Букв мадда три: ا و ي — они тянут звук.'; });
      },
      /* Какая тянет именно этот звук: неверные варианты — две другие буквы
         мадда, а не случайные. Иначе ответить можно, не зная разницы. */
      function (nextId, rng) {
        const pairs = [
          { id: 'alif', vowel: 'а' }, { id: 'waw', vowel: 'у' }, { id: 'ya', vowel: 'и' },
        ];
        const right = pickWith(pairs, 1, rng)[0];
        const wrongs = pairs.filter(function (p) { return p.id !== right.id; });
        const opts = shuffleWith([right].concat(wrongs), rng).map(function (p) {
          const l = LETTER_BY_ID[p.id];
          return { id: p.id, label: l.ch, sub: l.name };
        });
        return c0Task(nextId, 'c0_madd_letters', {
          optionStyle: OPTION_STYLE.LETTER,
          prompt: 'Какая буква удлиняет звук «' + right.vowel + '»?',
          options: opts,
          answer: right.id,
          explain: 'Звук «' + right.vowel + '» тянет <b>' + LETTER_BY_ID[right.id].name +
                   '</b>. Алиф тянет «а», вав — «у», йа — «и».',
        });
      },
    ],
  },
  {
    id: 'c0sort_madd', title: 'Распределение: буквы мадда',
    hint: 'отделить буквы мадда от остальных',
    prop: 'madd', perBox: 3,
    prompt: 'Разложите буквы: буква мадда или обычная?',
    yes: 'Буква мадда', no: 'Обычная буква',
  },
  {
    id: 'c0_letter_name', title: 'Названия букв',
    hint: 'узнать букву по начертанию (варианты — похожие)',
    kinds: [
      function (nextId, rng) {
        const right = pickWith(alphabet(), 1, rng)[0];
        const wrong = c0Distractors(right, rng, 2);
        if (wrong.length < 2) return null;
        const opts = shuffleWith([right].concat(wrong), rng).map(function (l) {
          return { id: l.id, label: l.name };
        });
        return c0Task(nextId, 'c0_letter_name', {
          prompt: 'Как называется эта буква?',
          hero: right.ch,
          options: opts,
          answer: right.id,
          explain: 'Это <b>' + right.name + '</b> — ' + right.ch +
                   '. Смотри на точки: похожие буквы различаются именно ими.',
        });
      },
      /* Обратный ход: названо имя — найди букву среди похожих. */
      function (nextId, rng) {
        const right = pickWith(alphabet(), 1, rng)[0];
        const wrong = c0Distractors(right, rng, 2);
        if (wrong.length < 2) return null;
        const opts = shuffleWith([right].concat(wrong), rng).map(function (l) {
          return { id: l.id, label: l.ch };   // без подписи: подпись была бы ответом
        });
        return c0Task(nextId, 'c0_letter_name', {
          optionStyle: OPTION_STYLE.LETTER,
          prompt: 'Где буква <b>' + right.name + '</b>?',
          options: opts,
          answer: right.id,
          explain: '<b>' + right.name + '</b> пишется так: ' + right.ch + '.',
        });
      },
    ],
  },
  {
    id: 'c0_alphabet', title: 'Алфавит',
    hint: 'сколько букв',
    kinds: [
      function (nextId, rng) {
        /* Число берём из библиотеки, а не пишем руками: добавится буква —
           верный ответ изменится сам. */
        const n = alphabet().length;
        return c0TextQuestion(nextId, 'c0_alphabet', rng,
          'Сколько букв в арабском алфавите?', null,
          String(n), [String(n - 2), String(n + 2)],
          'В арабском алфавите <b>' + n + '</b> букв. Хамза, та-марбута и лям-алиф в это число не входят.');
      },
    ],
  },
  {
    id: 'c0_special', title: 'Особые знаки',
    hint: 'хамза, хамзатуль-васль, та-марбута, лям-алиф',
    kinds: [
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_special', rng,
          'Как называется этот знак?', LETTER_BY_ID.hamza.ch,
          'Хамза', ['Хамзатуль-васль', 'Алиф'],
          'Это <b>хамза</b>. У хамзатуль-васль сверху есть головка сад (ٱ), а алиф — просто палочка.');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_special', rng,
          'Как называется эта буква?', LETTER_BY_ID.ta_marbuta.ch,
          'Та-марбута (закрытая та)', ['Хамзатуль-васль', 'Лям-алиф'],
          'Это <b>та-марбута</b>. Похожа на ха, но с двумя точками сверху.');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_special', rng,
          'Что такое лям-алиф?', LETTER_BY_ID.lam_alif.ch,
          'Две буквы вместе', ['Одна буква', 'Огласовка'],
          'Это <b>две буквы вместе</b>: лям и алиф. Отдельной буквой алфавита лям-алиф не считается.');
      },
      /* Применение вместо названия: та-марбута меняет звук при остановке. */
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_special', rng,
          'Как читается та-марбута <b>при остановке</b>?',
          LETTER_BY_ID.ta_marbuta.ch,
          'Как ه', ['Как ت', 'Не читается'],
          'При остановке та-марбута звучит как <b>ه</b>, а при продолжении — как ت.');
      },
    ],
  },
  {
    id: 'c0_hamza_wasl', title: 'Соединительная хамза',
    hint: 'что это, где стоит, когда читается и когда пропускается',
    kinds: [
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_hamza_wasl', rng,
          'Что такое хамзатуль-васль?', LETTER_BY_ID.hamza_wasl.ch,
          'Соединительная хамза', ['Буква мадда', 'Огласовка'],
          'Это <b>соединительная хамза</b>. Она нужна, чтобы начать слово, которое иначе начиналось бы с буквы на сукуне.');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_hamza_wasl', rng,
          'Где ставится хамзатуль-васль в слове?', LETTER_BY_ID.hamza_wasl.ch,
          'В начале', ['В середине', 'В конце'],
          'Только <b>в начале слова</b>. В середине и в конце её не бывает.');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_hamza_wasl', rng,
          'Когда хамзатуль-васль <b>читается</b>?', LETTER_BY_ID.hamza_wasl.ch,
          'Когда с неё начинают речь', ['В середине речи', 'Всегда'],
          'Она звучит, только если с этого слова <b>начинают</b> чтение.');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_hamza_wasl', rng,
          'Когда хамзатуль-васль <b>НЕ</b> читается?', LETTER_BY_ID.hamza_wasl.ch,
          'В середине речи', ['В начале речи', 'Всегда'],
          'При продолжении чтения она <b>пропускается</b>: соединяет слова и сама не звучит.');
      },
      /* Ниже — применение вместо названия: не «что такое хамзатуль-васль»,
         а как её прочитать в живом слове. Это то, ради чего правило учат. */

      // Показано слово — на какой звук читается хамза?
      function (nextId, rng) {
        if (typeof WASL_WORDS === 'undefined' || !WASL_WORDS.length) return null;
        const w = pickWith(WASL_WORDS, 1, rng)[0];
        const others = waslVowels().filter(function (v) { return v !== w.vowel; });
        if (others.length < 2) return null;
        return c0TextQuestion(nextId, 'c0_hamza_wasl', rng,
          'На какой звук читается хамзатуль-васль в этом слове?', w.text,
          '«' + w.vowel + '»', others.map(function (v) { return '«' + v + '»'; }),
          waslWhy(w));
      },

      /* Обратный ход — так спрашивал исходный тест: назван звук, среди трёх
         слов надо найти нужное. Неверные слова берутся с ДРУГИМ звуком,
         иначе верных ответов оказалось бы несколько. */
      function (nextId, rng) {
        if (typeof WASL_WORDS === 'undefined' || !WASL_WORDS.length) return null;
        const v = pickWith(waslVowels(), 1, rng)[0];
        const right = pickWith(waslWordsWithVowel(v), 1, rng)[0];
        const wrongPool = WASL_WORDS.filter(function (x) { return x.vowel !== v; });
        const wrong = pickWith(wrongPool, 2, rng);
        if (!right || wrong.length < 2) return null;
        const opts = shuffleWith([right].concat(wrong), rng).map(function (x) {
          return { id: x.id, label: x.text };
        });
        return c0Task(nextId, 'c0_hamza_wasl', {
          optionStyle: OPTION_STYLE.LETTER,
          prompt: 'В каком слове хамзатуль-васль читается на «' + v + '»?',
          options: opts,
          answer: right.id,
          explain: waslWhy(right),
        });
      },
    ],
  },

  /* ── ЗНАКИ: огласовки и остальное ──────────────────────────────── */
  {
    id: 'c0_harakat', title: 'Огласовки',
    hint: 'фатха, касра, дамма — и как читается слог',
    kinds: [
      /* Применение: прочитать слог. Согласный во всех вариантах один,
         отличается только гласный — подмены звука не происходит. */
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        const vid = pickWith(C0_VOWELS, 1, rng)[0];
        const right = SIGN_BY_ID[vid];
        const others = C0_VOWELS.filter(function (v) { return v !== vid; })
          .map(function (v) { return l.tr + SIGN_BY_ID[v].vowel; });
        return c0TextQuestion(nextId, 'c0_harakat', rng,
          'Как читается этот слог?', syllable(l, vid),
          l.tr + right.vowel, others,
          'Здесь <b>' + right.name.toLowerCase() + '</b> — она даёт звук «' + right.vowel + '».');
      },
      function (nextId, rng) {
        const vid = pickWith(C0_VOWELS, 1, rng)[0];
        const right = SIGN_BY_ID[vid];
        const others = C0_VOWELS.filter(function (v) { return v !== vid; });
        return c0TextQuestion(nextId, 'c0_harakat', rng,
          'Как называется огласовка, которая даёт звук «' + right.vowel + '»?',
          signAlone(right),
          right.name, others.map(function (v) { return SIGN_BY_ID[v].name; }),
          '<b>' + right.name + '</b> — ' + right.does + '.');
      },
      function (nextId, rng) {
        const vid = pickWith(C0_VOWELS, 1, rng)[0];
        const right = SIGN_BY_ID[vid];
        const others = C0_VOWELS.filter(function (v) { return v !== vid; });
        return c0GlyphQuestion(nextId, 'c0_harakat', rng,
          'Какой знак даёт звук «' + right.vowel + '»?', null,
          signAlone(right), others.map(function (v) { return signAlone(v); }),
          'Это <b>' + right.name.toLowerCase() + '</b>: ' + right.does + '.');
      },
    ],
  },
  {
    id: 'c0_sukun', title: 'Сукун',
    hint: 'буква без гласного',
    kinds: [
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        return c0GlyphQuestion(nextId, 'c0_sukun', rng,
          'В каком слоге буква читается <b>без гласного</b>?', null,
          syllable(l, 'sukun'), [syllable(l, 'fatha'), syllable(l, 'damma')],
          'Знак сукун (кружок) значит, что гласного нет: звучит только сама буква — «' + l.tr + '».');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_sukun', rng,
          'Как называется этот знак?', signAlone('sukun'),
          'Сукун', ['Шадда', 'Хамза'],
          'Это <b>сукун</b>: ' + SIGN_BY_ID.sukun.does + '.');
      },
    ],
  },
  {
    id: 'c0_shadda', title: 'Шадда',
    hint: 'удвоение буквы',
    kinds: [
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        return c0GlyphQuestion(nextId, 'c0_shadda', rng,
          'В каком слоге буква <b>удваивается</b>?', null,
          syllable(l, ['shadda', 'fatha']), [syllable(l, 'fatha'), syllable(l, 'sukun')],
          'Шадда значит, что буква читается дважды: «' + l.tr + l.tr + 'а».');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_shadda', rng,
          'Что означает знак шадда?', signAlone('shadda'),
          'Удвоение', ['Удлинение', 'Пауза'],
          'Шадда — <b>удвоение</b>: буква произносится дважды, одна на сукуне и одна с огласовкой.');
      },
    ],
  },
  {
    id: 'c0_tanwin', title: 'Танвин',
    hint: 'двойная огласовка в конце слова',
    kinds: [
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        const map = { tanwin_fath: 'fatha', tanwin_kasr: 'kasra', tanwin_damm: 'damma' };
        const tid = pickWith(Object.keys(map), 1, rng)[0];
        const t = SIGN_BY_ID[tid];
        const other = C0_VOWELS.filter(function (v) { return v !== map[tid]; })[0];
        return c0TextQuestion(nextId, 'c0_tanwin', rng,
          'Как читается это окончание?', syllable(l, tid),
          l.tr + t.vowel + 'н', [l.tr + t.vowel, l.tr + SIGN_BY_ID[other].vowel + 'н'],
          'Танвин — двойная огласовка: к звуку «' + t.vowel + '» добавляется <b>н</b>.');
      },
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        return c0GlyphQuestion(nextId, 'c0_tanwin', rng,
          'Где в конце добавится звук <b>«н»</b>?', null,
          syllable(l, 'tanwin_fath'), [syllable(l, 'fatha'), syllable(l, 'sukun')],
          'Две одинаковые огласовки подряд — это танвин, он добавляет «н».');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_tanwin', rng,
          'Что такое танвин?', null,
          'Двойная огласовка в конце слова', ['Удлинение', 'Сукун'],
          'Танвин — <b>двойная огласовка в конце слова</b>, читается с добавлением «н».');
      },
    ],
  },
  {
    id: 'c0_madd_read', title: 'Удлинение',
    hint: 'что такое мадд и где тянется звук',
    kinds: [
      function (nextId, rng) {
        const l = c0SyllableLetter(rng);
        if (!l) return null;
        return c0GlyphQuestion(nextId, 'c0_madd_read', rng,
          'В каком слоге звук <b>тянется</b>?', null,
          longSyllable(l), [syllable(l, 'fatha'), syllable(l, 'sukun')],
          'После огласовки стоит буква мадда — звук тянется: «' + l.tr + 'аа».');
      },
      function (nextId, rng) {
        return c0TextQuestion(nextId, 'c0_madd_read', rng,
          'Что такое мадд?', null,
          'Удлинение', ['Огласовка', 'Остановка'],
          'Мадд — это <b>удлинение</b> звука буквами ا و ي.');
      },
    ],
  },
];

/* ── РАСПРЕДЕЛЕНИЕ БУКВ ПО СВОЙСТВУ ────────────────────────────────
   Тот же тип задания, что распределение слов по правилам, но предметы —
   буквы, а коробки — свойство и его отсутствие.

   Зачем оно, если про то же свойство уже есть вопрос. Вопрос показывает
   три буквы и просит выбрать одну: угадать можно с одного раза из трёх,
   а зная всего одну букву из трёх — почти наверняка. Распределение просит
   решить про КАЖДУЮ букву отдельно, и угадать шесть раз подряд нельзя.
   Одно такое задание закрывает столько же, сколько шесть вопросов.

   Коробок всегда две: свойство есть или его нет. Третьей быть не может. */
function buildCourse0Sort(block, rng, nextId) {
  if (typeof lettersWith !== 'function') return null;
  const yes = lettersWith(block.prop, true);
  const no = lettersWith(block.prop, false);
  const per = block.perBox || 3;
  // берём поровну, но не больше, чем есть букв с редким свойством
  const n = Math.min(per, yes.length, no.length);
  if (n < 2) return null;

  const items = [], answer = {};
  let k = 0;
  [['yes', pickWith(yes, n, rng)], ['no', pickWith(no, n, rng)]].forEach(function (pair) {
    pair[1].forEach(function (l) {
      const id = 'i' + (k++);
      /* Только сама буква, без названия. Название выдало бы ответ: у ط оно
         звучит «та (твёрдая)», и в распределении на твёрдые и мягкие
         ребёнку осталось бы прочитать подпись. Смотреть надо на букву. */
      items.push({ id: id, text: l.ch });
      answer[id] = pair[0];
    });
  });

  return {
    id: nextId('t_' + block.id),
    theme: block.id,
    scoreGroup: block.id,
    stage: 'course0',
    type: TASK_TYPES.SORT,
    prompt: block.prompt,
    /* Поле называется label — так его читает экран и документ. С «name»
       коробка выходила без подписи и показывала слово undefined. */
    groups: [
      { id: 'yes', label: block.yes, accent: 'var(--seal)' },
      { id: 'no',  label: block.no,  accent: 'var(--gold, #b8912f)' },
    ],
    items: shuffleWith(items, rng),
    answer: answer,
    check: CHECK.AUTO,
    weight: TASK_WEIGHTS.sort,
  };
}

const COURSE0_BY_ID = {};
COURSE0_BLOCKS.forEach(function (b) { COURSE0_BY_ID[b.id] = b; });

/* Место блока в порядке изучения. Порядок в COURSE0_BLOCKS — не список
   для галочек, а последовательность: сперва буквы и их свойства, потом
   названия, потом знаки над буквами. Движок ставит задания по нему. */
function course0Order(blockId) {
  for (let i = 0; i < COURSE0_BLOCKS.length; i++) {
    if (COURSE0_BLOCKS[i].id === blockId) return i;
  }
  return 999;
}

/* Название блока по его id — чтобы панель в разборе работы не держала
   свой список подписей. Пять раз в этом проекте переписанный руками
   список отставал от библиотеки; здесь этого не повторяем. */
function course0Name(blockId) {
  return COURSE0_BY_ID[blockId] ? COURSE0_BY_ID[blockId].title : '';
}

/* Собрать одно задание блока: вид вопроса выбирается случайно.
   Если вид не собрался (не хватило букв) — пробуем другие. */
function buildCourse0Task(blockId, rng, nextId, order, at) {
  const block = COURSE0_BY_ID[blockId];
  if (!block || typeof LETTERS === 'undefined' || typeof SIGNS === 'undefined') return null;
  /* Виды вопросов ПЕРЕБИРАЮТСЯ по кругу, а не выбираются заново каждый раз.
     При случайном выборе на трёх заданиях блока легко выпадал трижды один
     и тот же вид — блок «Огласовки» спрашивал название три раза подряд,
     а прочитать слог ученику так и не предлагали. */
  const kinds = order || shuffleWith(block.kinds, rng);
  const from = at || 0;
  for (let i = 0; i < kinds.length; i++) {
    const task = kinds[(from + i) % kinds.length](nextId, rng);
    if (task) return task;
  }
  return null;
}

/* Порядок видов вопросов внутри блока — перемешивается один раз на работу. */
function course0KindOrder(blockId, rng) {
  const block = COURSE0_BY_ID[blockId];
  return block ? shuffleWith(block.kinds, rng) : [];
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
  // варианты ляма
  { id: 'lam_heavy', label: 'Твёрдый лям' },
  { id: 'lam_light', label: 'Мягкий лям' },
];

/* Семейства правил — чтобы отвлекающие варианты были ПОХОЖИМИ (того же
   раздела), а не очевидно чужими. По теме задания определяем семейство,
   и три неправильных варианта берём в первую очередь из него. */
const OPTION_FAMILY = {
  mim: ['izhar', 'idgham', 'ikhfa', 'shadda_mim'],
  nun: ['izhar', 'idgham', 'ikhfa', 'iqlab', 'shadda_nun'],
  madd: ['madd_tabii', 'madd_iwad', 'madd_muttasil', 'madd_munfasil',
         'madd_lazim', 'madd_lazim_harfi', 'madd_arid', 'madd_lin'],
  /* У ляма ответов ровно два, и третьего быть не может: лям либо твёрдый,
     либо мягкий. Вопрос выходит с двумя вариантами — так и должно быть.
     Добирать третий из чужого раздела нельзя: «Икляб» рядом с «Твёрдый
     лям» виден за версту и подсказывает, где искать верный ответ. */
  lam: ['lam_heavy', 'lam_light'],
};
function familyOfTheme(themeId) {
  if (themeId.indexOf('madd') !== -1) return 'madd';
  if (themeId.indexOf('lam') !== -1) return 'lam';
  return (themeId.indexOf('mim') !== -1) ? 'mim' : 'nun';
}

/* ── ЧТО ЕЩЁ ВИДНО В ПРИМЕРЕ, КРОМЕ ЗАЯВЛЕННОГО ПРАВИЛА ─────────────────
   Поле alsoShows заполняется вручную и потому неизбежно отстаёт. Но два
   правила — «нун с шаддой» и «мим с шаддой» — видны прямо в буквах: это
   ن или م со знаком шадды. Их можно распознать в самом тексте, ничего
   не размечая.

   Зачем. В примере جَنَّـٰتࣲ وَعُيُونٍ проверяется идгам нуна, но в слове
   جَنَّات стоит نّ. Ребёнок, выбравший «нун с шаддой», по-своему прав —
   а платформа засчитывала ошибку и объясняла, почему он неправ. Такой
   вопрос учит недоверию к себе, а не правилу.

   Считаем только то, что видно наверняка по буквам. Остальные наложения
   правил — дело преподавателя: он объявляет их в alsoShows. */
const RE_SHADDA_NUN = /\u0646[\u064B-\u0650\u0652\u0670\u06E1]*\u0651/;
const RE_SHADDA_MIM = /\u0645[\u064B-\u0650\u0652\u0670\u06E1]*\u0651/;

function rulesVisibleInText(text) {
  const out = [];
  const t = String(text || '');
  if (RE_SHADDA_NUN.test(t)) out.push('shadda_nun');
  if (RE_SHADDA_MIM.test(t)) out.push('shadda_mim');
  return out;
}

/* Всё спорное для примера: объявленное преподавателем плюс увиденное
   в буквах. Одно место, к которому обращаются и вопросы, и распределение. */
function disputedRules(example) {
  if (!example) return [];
  const declared = example.alsoShows || [];
  const seen = rulesVisibleInText(example.text);
  const out = declared.slice();
  seen.forEach(function (r) { if (out.indexOf(r) === -1) out.push(r); });
  return out;
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

  /* Если в семействе не набралось трёх — вопрос выходит с тремя вариантами,
     и это нормально. Раньше недостающее добиралось из ОБЩЕГО списка, и в
     вопросе про мим мог появиться вариант из правил нуна: он виден за
     версту и подсказывает, что верный ответ не он. Лучше три честных
     варианта, чем четыре с пустышкой.
     К общему списку обращаемся только в крайнем случае — когда иначе
     выбирать будет не из чего. */
  if (distractors.length < 1) {
    const rest = shuffleWith(
      RULE_OPTIONS.map(o => o.id).filter(id => allowed(id) && distractors.indexOf(id) === -1),
      rng
    );
    distractors = distractors.concat(rest).slice(0, 3);
  }

  // собрать варианты (верный + отвлекающие) и перемешать порядок
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
    const disputed = disputedRules(e);
    if (!disputed.length) return true;
    return !disputed.some(function (r) { return boxIds.indexOf(r) !== -1; });
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

/* ── РЕЦЕПТ РАБОТЫ ────────────────────────────────────────────────────
   Раньше сюда передавалось шесть отдельных аргументов по порядку, и три
   места в других файлах должны были помнить этот порядок. Каждый новый
   вид заданий означал правку в четырёх файлах — ровно тот путь, которым
   в проекте уже не раз получались загадочные поломки.

   Теперь передаётся ОДИН объект — тот самый конфиг, который собирается
   в exam.html. Старый порядок аргументов продолжает работать: если вторым
   пришёл список тем, а не объект, мы соберём рецепт сами. */
function asRecipe(a, recite, sort, find, course0) {
  if (a && !Array.isArray(a) && typeof a === 'object') {
    return {
      themes: a.activityThemes || a.themes || null,
      recite: a.activityRecite || a.recite || null,
      sort: a.activitySort || a.sort || null,
      find: a.activityFind || a.find || null,
      course0: a.activityCourse0 || a.course0 || null,
    };
  }
  return { themes: a || null, recite: recite || null, sort: sort || null,
           find: find || null, course0: course0 || null };
}

function buildTasksFromTemplates(randomize, recipeArg, reciteArg, sortArg, findArg, seed, course0Arg) {
  const recipe = asRecipe(recipeArg, reciteArg, sortArg, findArg, course0Arg);
  const activityThemes = recipe.themes;
  const activityRecite = recipe.recite;
  const activitySort = recipe.sort;
  const activityFind = recipe.find;
  const activityCourse0 = recipe.course0;
  /* Рецептом вызывают коротко: (randomize, cfg, seed). Тогда «номер билета»
     приходит третьим аргументом, а не шестым. */
  if (recipeArg && !Array.isArray(recipeArg) && typeof recipeArg === 'object' &&
      seed == null && typeof reciteArg === 'number') seed = reciteArg;
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
  /* Рецепт пришёл из панели, если задан хоть один его раздел. Отличать это
     от «вызвали без рецепта» обязательно: у работы нулевого курса тем-правил
     нет вовсе, и по прежнему условию она молча набирала весь встроенный
     учебный набор — 43 чужих задания вместо букв. */
  const byActivity = !!(activityThemes || activitySort || activityFind || activityCourse0);

  let ruleTemplates;
  if (activityThemes && activityThemes.length) {
    ruleTemplates = activityThemes.map(function (t) {
      return { theme: t.theme, count: t.count || 1, answer: answerForTheme(t.theme) };
    });
  } else if (byActivity) {
    ruleTemplates = [];              // преподаватель тем не выбрал — вопросов о правилах нет
  } else {
    ruleTemplates = RULE_TEMPLATES;  // вызов без рецепта — учебный набор по умолчанию
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
        options: buildFourOptions(tpl.answer, tpl.theme, rng, disputedRules(ex)),  // верный + похожие, без спорных
        answer: tpl.answer,          // правильный ответ принадлежит заданию
        check: CHECK.AUTO,
        weight: TASK_WEIGHTS.single,
      });
    });
  });

  // 1.5 Вопросы нулевого курса (буквы и знаки).
  //     Преподаватель отмечает УМЕНИЯ, а не формулировки; вид вопроса
  //     внутри блока платформа выбирает сама, каждый раз другой.
  if (Array.isArray(activityCourse0) && activityCourse0.length &&
      typeof buildCourse0Task === 'function') {
    activityCourse0.forEach(function (row) {
      const blockId = row.block || row.id;
      const block = COURSE0_BY_ID[blockId];

      /* Блок-распределение даёт РОВНО ОДНО задание: в нём и так все буквы
         сразу, и число вопросов к нему неприменимо. */
      if (block && block.prop) {
        const sortTask = buildCourse0Sort(block, rng, nextId);
        if (sortTask) built.push(sortTask);
        return;
      }

      const count = Math.max(1, parseInt(row.count, 10) || 1);
      const seenPrompts = {};
      const kindOrder = course0KindOrder(blockId, rng);
      let guard = 0;
      let made = 0;
      /* Один и тот же вопрос дважды в одной работе — впустую потраченное
         задание. Повторов избегаем по тексту вопроса вместе с показанным
         знаком: «как называется эта буква» про разные буквы — это разные
         вопросы, а про одну и ту же — один и тот же. */
      while (made < count && guard++ < count * 12) {
        const task = buildCourse0Task(blockId, rng, nextId, kindOrder, made);
        if (!task) break;
        const key = task.prompt + '|' + (task.hero || '') + '|' + task.answer;
        if (seenPrompts[key]) continue;
        seenPrompts[key] = 1;
        built.push(task);
        made++;
      }
    });
  }

  // 2. Sort-задания (распределение).
  //    Встроенный экзамен: все SORT_TEMPLATES.
  //    По активности: только те, что преподаватель отметил галочкой
  //      (sortMim → sort_mim, sortNun → sort_nun).
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
    /* «Активность есть» — это любой заданный раздел рецепта, не только
       список аятов. Раньше проверялся один activityRecite: работа, где
       преподаватель выбрал только темы, считалась «активности нет» и
       получала случайные аяты для чтения в придачу. Ученику доставалось
       задание, которого учитель не давал, а балл за чтение уходил в ноль. */
    var fromActivity = Array.isArray(activityRecite) || byActivity;
    var selectedIds = Array.isArray(activityRecite)
      ? activityRecite
      : (byActivity ? []
                    : ((typeof getSelectedAyahIds === 'function') ? getSelectedAyahIds() : []));

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

function rebuildTasks(randomize, recipeOrThemes, reciteOrSeed, sort, find, seed, course0) {
  /* Два способа вызова:
       rebuildTasks(randomize, cfg, seed)                        — новый, рецептом
       rebuildTasks(randomize, themes, recite, sort, find, seed) — прежний
     Второй оставлен, чтобы старые вызовы не пришлось искать по всем файлам. */
  TASKS = buildTasksFromTemplates(!!randomize, recipeOrThemes || null, reciteOrSeed,
                                  sort || null, find || null, seed, course0 || null);
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

  /* Задание нулевого курса несёт объяснение при себе: правила таджвида
     тут ни при чём, и спрашивать THEMES о букве нечего. */
  if (task && task.explain) {
    if (checkResult && checkResult.correct === true) return task.explain;
    var chosenOpt = (task.options || []).filter(function (o) { return o.id === userAnswer; })[0];
    return task.explain + (chosenOpt
      ? '<br><br>Ты выбрал: <b>' + chosenOpt.label + '</b>.' : '');
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
