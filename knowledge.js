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
const THEMES = {
  izhar_mim:  { id: 'izhar_mim',  name: 'Изхар мими',   group: 'mim', order: 1 },
  idgham_mim: { id: 'idgham_mim', name: 'Идгам мими',   group: 'mim', order: 2 },
  ikhfa_mim:  { id: 'ikhfa_mim',  name: 'Ихфа мими',    group: 'mim', order: 3 },
  shadda_mim: { id: 'shadda_mim', name: 'Мим с шаддой', group: 'mim', order: 4 },

  izhar_nun:  { id: 'izhar_nun',  name: 'Изхар нуна',   group: 'nun', order: 5 },
  idgham_nun: { id: 'idgham_nun', name: 'Идгам нуна',   group: 'nun', order: 6 },
  iqlab_nun:  { id: 'iqlab_nun',  name: 'Икляб нуна',   group: 'nun', order: 7 },
  ikhfa_nun:  { id: 'ikhfa_nun',  name: 'Ихфа нуна',    group: 'nun', order: 8 },
  shadda_nun: { id: 'shadda_nun', name: 'Нун с шаддой', group: 'nun', order: 9 },

  // ── Правила мадда (удлинение) — новая тема ──
  madd_tabii:     { id: 'madd_tabii',     name: 'Естественный мадд',  group: 'madd', order: 10 },
  madd_iwad:      { id: 'madd_iwad',      name: 'Мадд ‘ивад',         group: 'madd', order: 11 },
  madd_muttasil:  { id: 'madd_muttasil',  name: 'Мадд муттасиль',     group: 'madd', order: 12 },
  madd_munfasil:  { id: 'madd_munfasil',  name: 'Мадд мунфасыль',     group: 'madd', order: 13 },
  madd_lazim:     { id: 'madd_lazim',     name: 'Мадд лазим',         group: 'madd', order: 14 },
};


/* ──────────────────────────────────────────────────────────────────────
   БИБЛИОТЕКА ПРИМЕРОВ
   Пример — нейтральная единица знания. Он ничего не спрашивает,
   ничего не проверяет и не содержит правильного ответа.
   То, что مِنۢ بَعۡدِ иллюстрирует икляб, знает ЗАДАНИЕ (в tasks.js),
   а не сам пример.

   Минимальная форма (Блок 1): id, text, themes[].
   Форма готова к росту без ломки: vowels, type, audio, image, note, source.
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

  // Мадд ‘ивад — 2 хараката (при остановке на танвине фатха; показываем форму «при остановке»)
  { id: 'ex_mdi_1', text: 'عَلِيمَا',  themes: ['madd_iwad'] },
  { id: 'ex_mdi_2', text: 'حَكِيمَا',  themes: ['madd_iwad'] },
  { id: 'ex_mdi_3', text: 'غَفُورَا',  themes: ['madd_iwad'] },

  // Мадд муттасиль (соединённый) — хамза в том же слове, 4–5
  { id: 'ex_mdt2_1', text: 'يَشَآءُ',    themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_2', text: 'دُعَآءٌ',    themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_3', text: 'جَآءَتۡهُمُ', themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_4', text: 'تَبُوٓءَ',    themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_5', text: 'ٱلسُّوٓءِ',   themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_6', text: 'سِيٓئَتۡ',    themes: ['madd_muttasil'] },
  { id: 'ex_mdt2_7', text: 'يُضِيٓءُ',    themes: ['madd_muttasil'] },

  // Мадд мунфасыль (разделённый) — хамза в следующем слове, 4–5
  { id: 'ex_mdm_1', text: 'لَآ أُضِيعُ',      themes: ['madd_munfasil'] },
  { id: 'ex_mdm_2', text: 'إِنَّآ أَنزَلۡنَٰهُ', themes: ['madd_munfasil'] },
  { id: 'ex_mdm_3', text: 'رَبِّيٓ أَعۡلَمُ',   themes: ['madd_munfasil'] },
  { id: 'ex_mdm_4', text: 'قَالُوٓا۟ إِنَّمَا',  themes: ['madd_munfasil'] },

  // Мадд лазим — сукун в шадде, 6 харакатов
  { id: 'ex_mdl_1', text: 'ضَآلًّا',      themes: ['madd_lazim'] },
  { id: 'ex_mdl_2', text: 'كَآفَّةً',     themes: ['madd_lazim'] },
  { id: 'ex_mdl_3', text: 'دَآبَّةٍ',     themes: ['madd_lazim'] },
  { id: 'ex_mdl_4', text: 'حَآدَّ',       themes: ['madd_lazim'] },
  { id: 'ex_mdl_5', text: 'صَوَآفَّ',     themes: ['madd_lazim'] },
  { id: 'ex_mdl_6', text: 'ٱلضَّآلِّينَ', themes: ['madd_lazim'] },
];

// Индекс для быстрого доступа к примеру по id (строится один раз)
const EXAMPLE_BY_ID = {};
EXAMPLES.forEach(ex => { EXAMPLE_BY_ID[ex.id] = ex; });
