/* ══════════════════════════════════════════════════════════════════════
   БИБЛИОТЕКА АЯТОВ  (ayahs.js)
   ──────────────────────────────────────────────────────────────────────
   Целые аяты — отдельный вид знания, отличный от коротких примеров.
   Короткий пример (مِنۡ قَبۡلُ) показывает ОДНО место правила — годится
   для вопроса «какое правило?». Целый аят содержит правило (или несколько)
   в потоке живого текста — годится для ДРУГИХ заданий:

     • запись чтения вслух (ученик читает аят, преподаватель слушает)
     • «найди в аяте» (отметить, где срабатывает правило)
     • «сколько правил в аяте»
     • уроки (правило показано в настоящем аяте)

   Поэтому аяты помечены type:'ayah' и usage — чтобы движок НЕ подставил
   длинный аят в обычный вопрос с вариантами. Они ждут своих типов заданий.

   Поле rules — массив: в длинном аяте правил может быть несколько.
   Это предварительная разметка преподавателя; при подключении заданий
   уточним, какое правило где именно срабатывает.

   ВАЖНО: как и примеры, аят нейтрален — правильный ответ (что и где)
   будет принадлежать заданию, а не аяту. Аят лишь несёт текст и пометку,
   какие правила преподаватель на нём отрабатывает.
══════════════════════════════════════════════════════════════════════ */

const AYAHS = [
  // ── Идгам мими ──
  { id: 'ay_idm_1', text: 'لَهُمۡ فِيهَا فَـٰكِهَةٌ وَلَهُم مَّا يَدَّعُونَ', rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_2', text: 'فَمَا مِنكُم مِّنۡ أَحَدٍ عَنۡهُ حَـٰجِزِينَ',   rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_3', text: 'ٱلَّذِىٓ أَطۡعَمَهُم مِّن جُوعٍ وَءَامَنَهُم مِّنۡ خَوۡفٍ', rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_4', text: 'لَهُم مَّا يَشَآءُونَ فِيهَا',                 rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_5', text: 'وَلَكُم مَّا كَسَبۡتُمۡ',                       rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_6', text: 'أَم مَّنۡ خَلَقۡنَا',                           rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_7', text: 'وَمَا هُم مِّنۡهَا بِـمُخۡرَجِينَ',              rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_8', text: 'كَـم مِّن فِئَةٍ قَلِيلَةٍ',                     rules: ['idgham_mim'], usage: ['recite', 'find'] },

  // ── Ихфа мими ──
  { id: 'ay_ikm_1', text: 'أَم بِظَـٰهِرٍ مِّنَ ٱلۡقَوۡلِ',                 rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_2', text: 'وَمَا هُم بِـمُؤۡمِنِينَ',                       rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_3', text: 'تَرۡمِيهِم بِـحِـجَارَةٍ',                       rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_4', text: 'تَرۡمِيهِم بِـحِـجَارَةٍ مِّن سِـجِّيلٍ',          rules: ['ikhfa_mim', 'ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_5', text: 'وَمَا هُم بِـخَـٰرِجِينَ مِنَ ٱلنَّارِ',          rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_6', text: 'أَنتُم بِهِۦ مُؤۡمِنُونَ',                      rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_7', text: 'هُم بِهَا كَـٰفِرُونَ',                         rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_8', text: 'وَهُم بِٱلۡءَاخِرَةِ كَـٰفِرُونَ',              rules: ['ikhfa_mim'], usage: ['recite', 'find'] },

  // ── Изхар мими (сура Аль-Филь и др.) ──
  { id: 'ay_izm_1', text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ',        rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_2', text: 'أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِأَصۡـحَـٰبِ ٱلۡفِيلِ', rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_3', text: 'أَلَمۡ يَجۡعَلۡ كَيۡدَهُمۡ فِى تَضۡلِيلٍ',      rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_4', text: 'وَأَرۡسَلَ عَلَيۡهِمۡ طَيۡرًا أَبَابِيلَ',      rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_5', text: 'فَـجَعَلَهُمۡ كَعَصۡفٍ مَّأۡكُولٍۭ',            rules: ['izhar_mim'], usage: ['recite', 'find'] },

  // ── Мим с шаддой ──
  { id: 'ay_shm_1', text: 'وَمِمَّا رَزَقۡنَـٰهُمۡ يُنفِقُونَ',            rules: ['shadda_mim'], usage: ['recite', 'find'] },
  { id: 'ay_shm_2', text: 'عَمَّ يَتَسَآءَلُونَ',                         rules: ['shadda_mim'], usage: ['recite', 'find'] },
  { id: 'ay_shm_3', text: 'فَأَمَّا ٱلۡيَتِيمَ فَلَا تَقۡهَرۡ',           rules: ['shadda_mim'], usage: ['recite', 'find'] },

  // ── Изхар нуна ──
  { id: 'ay_izn_1', text: 'فَصَلِّ لِرَبِّكَ وَٱنۡـحَرۡ',                   rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_2', text: 'وَأَمَّا ٱلسَّآئِلَ فَلَا تَنۡـهَرۡ',           rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_3', text: 'وَقَالَ إِنِّى ذَاهِبٌ إِلَىٰ رَبِّى',        rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_4', text: 'صِرَـٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ',      rules: ['izhar_nun'], usage: ['recite', 'find'] },

  // ── Идгам нуна ──
  { id: 'ay_idn_1', text: 'وَلَمۡ يَكُن لَّهُۥ كُفُوًا أَحَدُۢ',          rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_2', text: 'فَـمَن يَعۡمَلۡ مِثۡقَالَ ذَرَّةٍ خَيۡرࣰا يَرَهُۥ', rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_3', text: 'لَيۡلَةُ ٱلۡقَدۡرِ خَيۡرٌ مِّنۡ أَلۡفِ شَهۡرٍ', rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_4', text: 'وَجَعَلۡنَا سِرَاجࣰا وَهَّاجࣰا',              rules: ['idgham_nun'], usage: ['recite', 'find'] },

  // ── Икляб + Ихфа нуна (длинные аяты суры Аль-Баййина) ──
  { id: 'ay_ikn_1', text: 'لَمۡ يَكُنِ ٱلَّذِينَ كَفَرُوا۟ مِنۡ أَهۡلِ ٱلۡكِتَـٰبِ وَٱلۡمُشۡرِكِينَ مُنفَكِّينَ حَتَّىٰ تَأۡتِيَهُمُ ٱلۡبَيِّنَةُ', rules: ['ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikn_2', text: 'رَسُولٌ مِّنَ ٱللَّهِ يَتۡلُوا۟ صُحُفࣰا مُّطَهَّرَةࣰ', rules: ['ikhfa_nun', 'idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikn_3', text: 'فِيهَا كُتُبٌ قَيِّمَةٌ',                       rules: ['ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_iqn_1', text: 'وَمَا تَفَرَّقَ ٱلَّذِينَ أُوتُوا۟ ٱلۡكِتَـٰبَ إِلَّا مِنۢ بَعۡدِ مَا جَآءَتۡهُمُ ٱلۡبَيِّنَةُ', rules: ['iqlab_nun'], usage: ['recite', 'find'] },

  // ── Аяты для мадда (домашние задания уроков; выверены преподавателем) ──
  { id: 'ay_mdm_1', text: 'وَٱلسَّمَآءِ وَٱلطَّارِقِ', rules: ['madd_muttasil'], usage: ['recite', 'find'] },   // Ат-Тарик, 1
  { id: 'ay_mdm_2', text: 'وَمَآ أَدۡرَىٰكَ مَا ٱلطَّارِقُ', rules: ['madd_munfasil'], usage: ['recite', 'find'] },   // Ат-Тарик, 2
  { id: 'ay_mdm_3', text: 'إِذَا جَآءَ نَصۡرُ ٱللَّهِ وَٱلۡفَتۡحُ', rules: ['madd_muttasil'], usage: ['recite', 'find'] },   // Ан-Наср, 1
  { id: 'ay_mdm_4', text: 'إِنَّآ أَنزَلۡنَـٰهُ فِى لَيۡلَةِ ٱلۡقَدۡرِ', rules: ['madd_munfasil'], usage: ['recite', 'find'] },   // Аль-Кадр, 1
  { id: 'ay_mdl_1', text: 'وَوَجَدَكَ ضَآلًّا فَهَدَىٰ', rules: ['madd_lazim'], usage: ['recite', 'find'] },   // Ад-Духа, 7
  { id: 'ay_mdl_2', text: 'فَإِذَا جَآءَتِ ٱلصَّآخَّةُ', rules: ['madd_lazim', 'madd_muttasil'], usage: ['recite', 'find'] },   // Абаса, 33
  { id: 'ay_mdl_3', text: 'ٱلۡحَآقَّةُ', rules: ['madd_lazim'], usage: ['recite', 'find'] },   // Аль-Хакка, 1
  { id: 'ay_mdl_4', text: 'مَا ٱلۡحَآقَّةُ', rules: ['madd_lazim'], usage: ['recite', 'find'] },   // Аль-Хакка, 2
  { id: 'ay_mdl_5', text: 'وَمَآ أَدۡرَىٰكَ مَا ٱلۡحَآقَّةُ', rules: ['madd_lazim', 'madd_munfasil'], usage: ['recite', 'find'] },   // Аль-Хакка, 3

  // ── Аяты для мадда, порция 2: буквенный лазим и ‘арид ──
  { id: 'ay_mdlh_1', text: 'الٓـمٓ', rules: ['madd_lazim_harfi'], usage: ['recite', 'find'] },   // Аль-‘Имран, 1
  { id: 'ay_mdlh_2', text: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلۡحَىُّ ٱلۡقَيُّومُ', rules: ['madd_arid', 'madd_munfasil'], usage: ['recite', 'find'] },   // Аль-‘Имран, 2
  { id: 'ay_mdlh_3', text: 'يـسٓ', rules: ['madd_lazim_harfi'], usage: ['recite', 'find'] },   // Йа-Син, 1
  { id: 'ay_mdlh_4', text: 'وَٱلۡقُرۡءَانِ ٱلۡحَكِيمِ', rules: ['madd_arid'], usage: ['recite', 'find'] },   // Йа-Син, 2
  { id: 'ay_mdlh_5', text: 'قٓ وَٱلۡقُرۡءَانِ ٱلۡمَجِيدِ', rules: ['madd_arid', 'madd_lazim_harfi'], usage: ['recite', 'find'] },   // Каф, 1
  { id: 'ay_mda_1', text: 'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِينَ', rules: ['madd_arid'], usage: ['recite', 'find'] },   // Аль-Фатиха, 2
  { id: 'ay_mda_2', text: 'قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ', rules: ['madd_arid'], usage: ['recite', 'find'] },   // Ан-Нас, 1
  { id: 'ay_mda_3', text: 'وَٱلتِّينِ وَٱلزَّيۡتُونِ', rules: ['madd_arid'], usage: ['recite', 'find'] },   // Ат-Тин, 1


  // ── Аяты для мадда, порция 3: ‘ивад и естественный мадд ──
  // Естественный мадд берём ТОЛЬКО короткими аятами: в длинных он
  // в каждом втором слове, и задание стало бы разметкой всего текста.
  { id: 'ay_mdi_1', text: 'وَٱلۡعَـٰدِيَـٰتِ ضَبۡحًا', rules: ['madd_iwad'], usage: ['recite', 'find'] },   // Аль-‘Адият, 1
  { id: 'ay_mdi_2', text: 'فَٱلۡمُورِيَـٰتِ قَدۡحًا', rules: ['madd_iwad'], usage: ['recite', 'find'] },   // Аль-‘Адият, 2
  { id: 'ay_mdi_3', text: 'فَٱلۡمُغِيرَـٰتِ صُبۡحًا', rules: ['madd_iwad'], usage: ['recite', 'find'] },   // Аль-‘Адият, 3
  { id: 'ay_mdi_4', text: 'فَأَثَرۡنَ بِهِۥ نَقۡعًا', rules: ['madd_iwad'], usage: ['recite', 'find'] },   // Аль-‘Адият, 4
  { id: 'ay_mdi_5', text: 'فَوَسَطۡنَ بِهِۥ جَمۡعًا', rules: ['madd_iwad'], usage: ['recite', 'find'] },   // Аль-‘Адият, 5
  { id: 'ay_mdt_1', text: 'لَمۡ يَلِدۡ وَلَمۡ يُولَدۡ', rules: ['madd_tabii'], usage: ['recite', 'find'] },   // Аль-Ихляс, 3
  { id: 'ay_mdt_2', text: 'وَٱلضُّحَىٰ', rules: ['madd_tabii'], usage: ['recite', 'find'] },   // Ад-Духа, 1
  { id: 'ay_mdt_3', text: 'وَٱللَّيۡلِ إِذَا سَجَىٰ', rules: ['madd_tabii'], usage: ['recite', 'find'] },   // Ад-Духа, 2
  { id: 'ay_mdt_4', text: 'وَطُورِ سِينِينَ', rules: ['madd_arid', 'madd_tabii'], usage: ['recite', 'find'] },   // Ат-Тин, 2
  { id: 'ay_mdt_5', text: 'إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ', rules: ['madd_arid', 'madd_tabii'], usage: ['recite', 'find'] },   // Аль-Фатиха, 5
];

// Индекс по id
const AYAH_BY_ID = {};
AYAHS.forEach(a => { AYAH_BY_ID[a.id] = a; });

// Помощник: аяты по правилу (для будущих заданий)
function ayahsByRule(ruleThemeId) {
  return AYAHS.filter(a => a.rules.includes(ruleThemeId));
}
