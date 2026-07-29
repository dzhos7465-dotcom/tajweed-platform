/* ══════════════════════════════════════════════════════════════════════
   БИБЛИОТЕКА ЗНАНИЙ  (knowledge.js)
   ──────────────────────────────────────────────────────────────────────
   АРХИТЕКТУРНЫЙ ЗАКОН ПЛАТФОРМЫ:
   Знания и проверка знаний существуют раздельно — вплоть до уровня файлов.

   В ЭТОМ файле живут ТОЛЬКО знания — то, что существует само по себе:
     • темы
     • примеры
     (в будущем: определения, правила, аудио, видео, изображения, пояснения)

   Здесь НЕТ и не может быть:
     • заданий
     • вопросов
     • правильных ответов
     • логики проверки

   Всё перечисленное живёт отдельно, в tasks.js.

   Эти знания могут использоваться чем угодно — уроком, тренировкой,
   домашним заданием, экзаменом. Знание нейтрально к тому, как его применяют.
══════════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────────────
   ТЕМЫ
   Тема — именованный узел знания. Порядок здесь НЕ определяется:
   последовательность задаёт курс или экзамен, а не сама тема.
   Поле order — лишь удобная подсказка «естественного» порядка, которую
   слой проверки может использовать или переопределить.
────────────────────────────────────────────────────────────────────── */
/* Два поля вместо одного — они отвечают на РАЗНЫЕ вопросы:

     group — «из чего собирать варианты ответа». Нельзя предложить мадд
             в ответах на вопрос про нун, поэтому семья вариантов = раздел.
     stage — «когда это изучается». Место в последовательности курса.

   Пока разделы совпадали с этапами обучения, разницы не было видно. Но
   раздел «знаки и соединение» — это начало первого курса, а мадд идёт
   в том же курсе позже: одна координата этого уже не выражает.

   ВАЖНО: stage пока НЕ используется ни одним экраном. Поле заложено под
   промежуточные тесты по темам и порядок разделов в панели. Если окажется
   лишним — удаляется без последствий.

   ВАЖНО: id темы менять НЕЛЬЗЯ. Он записан внутри уже сохранённых
   активностей в таблице; переименование осиротит их. Название меняется
   свободно, id — нет. */
const THEMES = {
  izhar_mim:  { id: 'izhar_mim',  name: 'Изхар мими',   group: 'mim', stage: 'course1', order: 1 },
  idgham_mim: { id: 'idgham_mim', name: 'Идгам мими',   group: 'mim', stage: 'course1', order: 2 },
  ikhfa_mim:  { id: 'ikhfa_mim',  name: 'Ихфа мими',    group: 'mim', stage: 'course1', order: 3 },
  shadda_mim: { id: 'shadda_mim', name: 'Мим с шаддой', group: 'mim', stage: 'course1', order: 4 },

  izhar_nun:  { id: 'izhar_nun',  name: 'Изхар нуна',   group: 'nun', stage: 'course1', order: 5 },
  idgham_nun: { id: 'idgham_nun', name: 'Идгам нуна',   group: 'nun', stage: 'course1', order: 6 },
  iqlab_nun:  { id: 'iqlab_nun',  name: 'Икляб нуна',   group: 'nun', stage: 'course1', order: 7 },
  ikhfa_nun:  { id: 'ikhfa_nun',  name: 'Ихфа нуна',    group: 'nun', stage: 'course1', order: 8 },
  shadda_nun: { id: 'shadda_nun', name: 'Нун с шаддой', group: 'nun', stage: 'course1', order: 9 },

  // ── Правила мадда (удлинение) ──
  madd_tabii:      { id: 'madd_tabii',      name: 'Естественный мадд',        group: 'madd', stage: 'course1', order: 10 },
  madd_iwad:       { id: 'madd_iwad',       name: 'Мадд ‘ивад',               group: 'madd', stage: 'course1', order: 11 },
  madd_muttasil:   { id: 'madd_muttasil',   name: 'Мадд муттасиль',           group: 'madd', stage: 'course1', order: 12 },
  madd_munfasil:   { id: 'madd_munfasil',   name: 'Мадд мунфасыль',           group: 'madd', stage: 'course1', order: 13 },
  // id остаётся madd_lazim — тема уже живёт в сохранённых активностях.
  // Уточнение «(словесный)» появилось, когда добавился буквенный.
  madd_lazim:      { id: 'madd_lazim',      name: 'Мадд лазим (словесный)',   group: 'madd', stage: 'course1', order: 14 },
  madd_lazim_harfi:{ id: 'madd_lazim_harfi',name: 'Мадд лазим (буквенный)',   group: 'madd', stage: 'course1', order: 15 },
  madd_arid:       { id: 'madd_arid',       name: 'Мадд ‘арид',               group: 'madd', stage: 'course1', order: 16 },
};


/* ──────────────────────────────────────────────────────────────────────
   БИБЛИОТЕКА ПРИМЕРОВ
   Пример — нейтральная единица знания. Он ничего не спрашивает,
   ничего не проверяет и не содержит правильного ответа.
   То, что مِنۢ بَعۡدِ иллюстрирует икляб, знает ЗАДАНИЕ (в tasks.js),
   а не сам пример.

   Минимальная форма (Блок 1): id, text, themes[].
   Форма готова к росту без ломки: vowels, type, audio, image, note, source.

   ── Поле alsoShows ──
   В одном слове бывает видно сразу несколько правил. В لَآ أُضِيعُ мадд
   двойной: разделённый между словами и естественный внутри أُضِيعُ.
   Для вопроса «какое правило» это не мешает — спрашиваем про конкретное
   место. Для распределения мешает: если коробка «Естественный» стоит рядом,
   оба ответа верны, а платформа засчитает один.

   Поэтому пример честно объявляет, что ещё в нём видно:
       alsoShows: ['madd_tabii']
   Он по-прежнему ничего не проверяет и не знает про задания — только
   описывает себя. Решает ЗАДАНИЕ: вопрос берёт такой пример спокойно,
   распределение пропускает его, если названное правило стоит коробкой.
   Правила из ДРУГИХ разделов не указываем — мим и мадд по разным коробкам
   не путаются.
────────────────────────────────────────────────────────────────────── */
const EXAMPLES = [
  // ── Изхар мими ──
  { id: 'ex_izm_1', text: 'هُمۡ فِيهَا',          themes: ['izhar_mim'] },
  { id: 'ex_izm_2', text: 'لَكُمۡ دِينُكُمۡ',      themes: ['izhar_mim'] },
  { id: 'ex_izm_3', text: 'عَلَيۡهِمۡ وَلَا',      themes: ['izhar_mim'] },
  { id: 'ex_izm_4', text: 'لَمۡ يَلِدۡ',           themes: ['izhar_mim'] },
  { id: 'ex_izm_5', text: 'هُمۡ عَن',              themes: ['izhar_mim'] },
  { id: 'ex_izm_6', text: 'لَمۡ يَعۡلَمۡ',         themes: ['izhar_mim'] },
  { id: 'ex_izm_7', text: 'كُلُّ أَمۡرٍ',          themes: ['izhar_mim'] },
  { id: 'ex_izm_8', text: 'سَمۡعَهُمۡ',            themes: ['izhar_mim'] },
  { id: 'ex_izm_9', text: 'مَمۡنُونٍ',             themes: ['izhar_mim'] },

  // ── Идгам мими ──
  { id: 'ex_idm_1', text: 'لَهُم مَّا',            themes: ['idgham_mim'] },
  { id: 'ex_idm_2', text: 'كَم مِّن',              themes: ['idgham_mim'] },
  { id: 'ex_idm_3', text: 'عَلَيۡهِم مُّؤۡصَدَةٌ',  themes: ['idgham_mim'] },
  { id: 'ex_idm_4', text: 'رَبِّهِم مِّن',         themes: ['idgham_mim'] },
  { id: 'ex_idm_5', text: 'وَلَهُم مَّا',          themes: ['idgham_mim'] },
  { id: 'ex_idm_6', text: 'مِنكُم مَّن',           themes: ['idgham_mim'] },
  { id: 'ex_idm_7', text: 'وَءَامَنَهُم مِّنۡ',    themes: ['idgham_mim'] },
  { id: 'ex_idm_8', text: 'أَطۡعَمَهُم مِّن',      themes: ['idgham_mim'] },

  // ── Ихфа мими ──
  { id: 'ex_ikm_1', text: 'هُمۡ بِهَا',            themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_2', text: 'تَرۡمِيهِم بِحِجَارَةٍ', themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_3', text: 'رَبَّهُم بِهِمۡ',       themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_4', text: 'كُنتُم بِهِ',           themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_5', text: 'كَذَّبۡتُم بِهِ',       themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_6', text: 'بَيۡنَهُم بِمَا',       themes: ['ikhfa_mim'] },
  { id: 'ex_ikm_7', text: 'بَعۡضُهُم بِبَعۡضٍ',    themes: ['ikhfa_mim'] },

  // ── Мим с шаддой: мّ читается с гунной две огласовки ──
  { id: 'ex_shm_1', text: 'ثُمَّ',                 themes: ['shadda_mim'] },
  { id: 'ex_shm_2', text: 'عَمَّ',                 themes: ['shadda_mim'] },
  { id: 'ex_shm_3', text: 'لَمَّا',                themes: ['shadda_mim'] },
  { id: 'ex_shm_4', text: 'مِّمَّا',               themes: ['shadda_mim'] },
  { id: 'ex_shm_5', text: 'أَمَّةٌ',               themes: ['shadda_mim'] },

  // ── Изхар нуна ──
  { id: 'ex_izn_1', text: 'مِنۡ هَادٍ',            themes: ['izhar_nun'] },
  { id: 'ex_izn_2', text: 'مِنۡ عِلۡمٍ',            themes: ['izhar_nun'] },
  { id: 'ex_izn_3', text: 'غَفُورٌ حَلِيمٌ',        themes: ['izhar_nun'] },
  { id: 'ex_izn_4', text: 'مَنۡ أَعۡطَىٰ',          themes: ['izhar_nun'] },
  { id: 'ex_izn_5', text: 'مَنۡ هَاجَرَ',           themes: ['izhar_nun'] },
  { id: 'ex_izn_6', text: 'إِنۡ عَلَيۡكَ',          themes: ['izhar_nun'] },
  { id: 'ex_izn_7', text: 'وَمَنۡ حَوۡلَهُ',        themes: ['izhar_nun'] },
  { id: 'ex_izn_8', text: 'مِنۡ غَيۡرِ شَيۡءٍ',     themes: ['izhar_nun'] },
  { id: 'ex_izn_9', text: 'مِنۡ خَوۡفٍ',            themes: ['izhar_nun'] },

  // ── Идгам нуна ──
  { id: 'ex_idn_1', text: 'مَن يَقُولُ',           themes: ['idgham_nun'] },
  { id: 'ex_idn_2', text: 'مِن رَّبِّهِمۡ',         themes: ['idgham_nun'] },
  { id: 'ex_idn_3', text: 'هُدٗى لِّلۡمُتَّقِينَ',   themes: ['idgham_nun'] },
  { id: 'ex_idn_4', text: 'مَن يَعۡمَلۡ',           themes: ['idgham_nun'] },
  { id: 'ex_idn_5', text: 'مِن نِّعۡمَةٍ',          themes: ['idgham_nun'] },
  { id: 'ex_idn_6', text: 'مِن مَّاءٍ',             themes: ['idgham_nun'] },
  { id: 'ex_idn_7', text: 'مِن وَاقٍ',              themes: ['idgham_nun'] },
  { id: 'ex_idn_8', text: 'مِن لَّدُنۡهُ',          themes: ['idgham_nun'] },
  { id: 'ex_idn_9', text: 'مِن رَّسُولٍ',           themes: ['idgham_nun'] },

  // ── Икляб нуна ──
  { id: 'ex_iqn_1', text: 'مِنۢ بَعۡدِ',           themes: ['iqlab_nun'] },
  { id: 'ex_iqn_2', text: 'زَوۡجِۢ بَهِيجٍ',        themes: ['iqlab_nun'] },
  { id: 'ex_iqn_3', text: 'مِنۢ بَيۡنِ',            themes: ['iqlab_nun'] },
  { id: 'ex_iqn_4', text: 'أَنۢ بُورِكَ',           themes: ['iqlab_nun'] },

  // ── Ихфа нуна ──
  { id: 'ex_ikn_1', text: 'مِنۡ قَبۡلُ',           themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_2', text: 'أَنفُسَكُمۡ',           themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_3', text: 'مِنۡ ثَمَرَاتٍ',         themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_4', text: 'شَيۡءٖ قَدِيرٌ',         themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_5',  text: 'أَن سَيَكُونَ',         themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_6',  text: 'مِن دَابَّةٍ',          themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_7',  text: 'مِن طِينٍ',             themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_8',  text: 'مِن زَوَالٍ',           themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_9',  text: 'مِن فَضۡلِهِ',          themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_10', text: 'وَمَن تَابٍ',           themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_11', text: 'مِن ضَعۡفٍ',            themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_12', text: 'مِن ظَهِيرٍ',           themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_13', text: 'عَن صَلَاتِهِمۡ',       themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_14', text: 'مِن ذِكۡرٍ',            themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_15', text: 'فَمَن ثَقُلَتۡ',        themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_16', text: 'مِن كُلٍّ',             themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_17', text: 'مَن جَاءَ',             themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_18', text: 'مِن شَرٍّ',             themes: ['ikhfa_nun'] },
  { id: 'ex_ikn_19', text: 'وَإِن قِيلَ',           themes: ['ikhfa_nun'] },

  // ── Нун с шаддой: نّ читается с гунной две огласовки ──
  { id: 'ex_shn_1', text: 'إِنَّ',                 themes: ['shadda_nun'] },
  { id: 'ex_shn_2', text: 'أَنَّ',                 themes: ['shadda_nun'] },
  { id: 'ex_shn_3', text: 'إِنَّا',                themes: ['shadda_nun'] },
  { id: 'ex_shn_4', text: 'جَنَّةٌ',               themes: ['shadda_nun'] },
  { id: 'ex_shn_5', text: 'ٱلنَّاسِ',              themes: ['shadda_nun'] },
  { id: 'ex_shn_6', text: 'ظَنَّ',                 themes: ['shadda_nun'] },

  // ── Примеры мадда (ровно из материала преподавателя) ──
  // Естественный мадд (табиий) — 2 хараката
  { id: 'ex_mdt_1', text: 'كَاتِبٌ',   themes: ['madd_tabii'] },
  { id: 'ex_mdt_2', text: 'خَالِدٌ',   themes: ['madd_tabii'] },
  { id: 'ex_mdt_3', text: 'يُوسُفُ',   themes: ['madd_tabii'] },
  { id: 'ex_mdt_4', text: 'سُورَةٌ',   themes: ['madd_tabii'] },
  { id: 'ex_mdt_5', text: 'فِيهَا',    themes: ['madd_tabii'] },
  { id: 'ex_mdt_6', text: 'دِينَهُ',   themes: ['madd_tabii'] },

  // Мадд ‘ивад — 2 хараката.
  // Слово показывается в ИСХОДНОЙ форме (с танвином фатха) — так ученик видит
  // его в Коране. Правило появляется только при ОСТАНОВКЕ на этом слове,
  // поэтому у темы свой текст вопроса (THEME_PROMPTS в tasks.js).
  { id: 'ex_mdi_1',  text: 'أَبَدًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_2',  text: 'أَحَدًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_3',  text: 'وَلَدًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_4',  text: 'عَجَبًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_5',  text: 'نَفۡسًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_6',  text: 'ظُلۡمًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_7',  text: 'رَشَدًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_8',  text: 'مُّرۡشِدًا',   themes: ['madd_iwad'] },
  { id: 'ex_mdi_9',  text: 'مَّسۡجِدًا',   themes: ['madd_iwad'] },
  { id: 'ex_mdi_10', text: 'مَوۡعِدًا',    themes: ['madd_iwad'] },
  { id: 'ex_mdi_11', text: 'سَبۡحًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_12', text: 'غَرۡقًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_13', text: 'مُنقَلَبًا',   themes: ['madd_iwad'] },
  // Сура «Аль-‘Адият», 1–5 — эту суру дети проходили как домашнее задание.
  { id: 'ex_mdi_14', text: 'ضَبۡحًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_15', text: 'قَدۡحًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_16', text: 'صُبۡحًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_17', text: 'نَقۡعًا',      themes: ['madd_iwad'] },
  { id: 'ex_mdi_18', text: 'جَمۡعًا',      themes: ['madd_iwad'] },
  // Слова из урока: внутри каждого есть ещё и естественный мадд, поэтому
  // в вопрос они идут, а в распределение с коробкой «Естественный» — нет.
  { id: 'ex_mdi_19', text: 'عَلِيمًا',     themes: ['madd_iwad'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdi_20', text: 'حَكِيمًا',     themes: ['madd_iwad'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdi_21', text: 'غَفُورًا',     themes: ['madd_iwad'], alsoShows: ['madd_tabii'] },

  // Мадд муттасиль (соединённый) — хамза в том же слове, 4–5
  { id: 'ex_mdt2_1', text: 'يَشَآءُ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_2', text: 'دُعَآءٌ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_3', text: 'جَآءَتۡهُمُ',  themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_4', text: 'تَبُوٓءَ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_5', text: 'ٱلسُّوٓءِ',    themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_6', text: 'سِيٓئَتۡ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_7', text: 'يُضِيٓءُ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_8', text: 'قُرُوٓءٍ',     themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_9', text: 'وَجِيٓءَ',     themes: ['madd_muttasil'] },

  // Мадд мунфасыль (разделённый) — хамза в следующем слове, 4–5
  { id: 'ex_mdm_1', text: 'لَآ أُضِيعُ',        themes: ['madd_munfasil'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdm_2', text: 'إِنَّآ أَنزَلۡنَٰهُ',   themes: ['madd_munfasil'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdm_3', text: 'رَبِّيٓ أَعۡلَمُ',     themes: ['madd_munfasil'] },
  { id: 'ex_mdm_4', text: 'قَالُوٓا۟ إِنَّمَا',    themes: ['madd_munfasil'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdm_5', text: 'مُتَّخِذيٓ أَخۡدَانٍ', themes: ['madd_munfasil'], alsoShows: ['madd_tabii'] },
  { id: 'ex_mdm_6', text: 'قَالُوٓا۟ إِنۡ أَنتُمۡ', themes: ['madd_munfasil'], alsoShows: ['madd_tabii'] },

  // Мадд лазим СЛОВЕСНЫЙ — сукун в шадде, 6 харакатов
  { id: 'ex_mdl_1', text: 'ضَآلًّا',      themes: ['madd_lazim'], alsoShows: ['madd_iwad'] },
  { id: 'ex_mdl_2', text: 'كَآفَّةً',     themes: ['madd_lazim'] },   // та-марбута — ‘ивада нет
  { id: 'ex_mdl_3', text: 'دَآبَّةٍ',     themes: ['madd_lazim'] },
  { id: 'ex_mdl_4', text: 'حَآدَّ',       themes: ['madd_lazim'] },
  { id: 'ex_mdl_5', text: 'صَوَآفَّ',     themes: ['madd_lazim'] },
  { id: 'ex_mdl_6', text: 'ٱلضَّآلِّينَ', themes: ['madd_lazim'], alsoShows: ['madd_tabii', 'madd_arid'] },

  // Мадд лазим БУКВЕННЫЙ — буквы в начале суры, 6 харакатов.
  // Признак: волнистая линия (маддах) над буквой. Есть линия — тянем.
  // الٓرٓ и يسٓ сюда пока не входят: в них рядом стоит удлинение на два
  // хараката (رَا، يَا) — правила, которого в библиотеке ещё нет.
  { id: 'ex_mdlh_1', text: 'الٓمٓ',  themes: ['madd_lazim_harfi'] },
  { id: 'ex_mdlh_2', text: 'صٓ',     themes: ['madd_lazim_harfi'] },
  { id: 'ex_mdlh_3', text: 'نٓ',     themes: ['madd_lazim_harfi'] },
  { id: 'ex_mdlh_4', text: 'قٓ',     themes: ['madd_lazim_harfi'] },

  // Мадд ‘арид — при остановке последняя буква получает сукун, а перед
  // ним стоит буква мадда. Как и ‘ивад, существует только при остановке:
  // при продолжении чтения та же буква звучит как естественный мадд.
  { id: 'ex_mda_1', text: 'وَٱلنَّاسِ',    themes: ['madd_arid'] },
  { id: 'ex_mda_2', text: 'ٱلۡإِنسَانَ',   themes: ['madd_arid'] },
  { id: 'ex_mda_3', text: 'ٱلرَّحۡمَانُ',   themes: ['madd_arid'] },
  { id: 'ex_mda_4', text: 'تَعۡلَمُونَ',    themes: ['madd_arid'] },
  { id: 'ex_mda_5', text: 'يُنفِقُونَ',    themes: ['madd_arid'] },
  { id: 'ex_mda_6', text: 'ٱلۡمُفۡلِحُونَ', themes: ['madd_arid'] },
  { id: 'ex_mda_7', text: 'مُبِينٌ',       themes: ['madd_arid'] },
  { id: 'ex_mda_8', text: 'نَسۡتَعِينُ',    themes: ['madd_arid'] },
  { id: 'ex_mda_9', text: 'ٱلرَّحِيمِ',     themes: ['madd_arid'] },
];

// Индекс для быстрого доступа к примеру по id (строится один раз)
const EXAMPLE_BY_ID = {};
EXAMPLES.forEach(ex => { EXAMPLE_BY_ID[ex.id] = ex; });
