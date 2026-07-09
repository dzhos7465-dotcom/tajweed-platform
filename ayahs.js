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
  { id: 'ay_idm_1', text: 'لَهُمۡ فِيهَا فَٰكِهَةٌ وَلَهُم مَّا يَدَّعُونَ', rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_2', text: 'فَمَا مِنكُم مِّنۡ أَحَدٍ عَنۡهُ حَٰجِزِينَ',   rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_3', text: 'ٱلَّذِىٓ أَطۡعَمَهُم مِّن جُوعٍ وَءَامَنَهُم مِّنۡ خَوۡفٍ', rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_4', text: 'لَهُم مَّا يَشَآءُونَ فِيهَا',                 rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_5', text: 'وَلَكُم مَّا كَسَبۡتُمۡ',                       rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_6', text: 'أَم مَّنۡ خَلَقۡنَا',                           rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_7', text: 'وَمَا هُم مِّنۡهَا بِمُخۡرَجِينَ',              rules: ['idgham_mim'], usage: ['recite', 'find'] },
  { id: 'ay_idm_8', text: 'كَم مِّن فِئَةٍ قَلِيلَةٍ',                     rules: ['idgham_mim'], usage: ['recite', 'find'] },

  // ── Ихфа мими ──
  { id: 'ay_ikm_1', text: 'أَم بِظَٰهِرٍ مِّنَ ٱلۡقَوۡلِ',                 rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_2', text: 'وَمَا هُم بِمُؤۡمِنِينَ',                       rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_3', text: 'تَرۡمِيهِم بِحِجَارَةٍ',                       rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_4', text: 'تَرۡمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ',          rules: ['ikhfa_mim', 'ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_5', text: 'وَمَا هُم بِخَٰرِجِينَ مِنَ ٱلنَّارِ',          rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_6', text: 'أَنتُم بِهِۦ مُؤۡمِنُونَ',                      rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_7', text: 'هُم بِهَا كَٰفِرُونَ',                         rules: ['ikhfa_mim'], usage: ['recite', 'find'] },
  { id: 'ay_ikm_8', text: 'وَهُم بِٱلۡءَاخِرَةِ كَٰفِرُونَ',              rules: ['ikhfa_mim'], usage: ['recite', 'find'] },

  // ── Изхар мими (сура Аль-Филь и др.) ──
  { id: 'ay_izm_1', text: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',        rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_2', text: 'أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِأَصۡحَٰبِ ٱلۡفِيلِ', rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_3', text: 'أَلَمۡ يَجۡعَلۡ كَيۡدَهُمۡ فِى تَضۡلِيلٍ',      rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_4', text: 'وَأَرۡسَلَ عَلَيۡهِمۡ طَيۡرًا أَبَابِيلَ',      rules: ['izhar_mim'], usage: ['recite', 'find'] },
  { id: 'ay_izm_5', text: 'فَجَعَلَهُمۡ كَعَصۡفٍ مَّأۡكُولٍۭ',            rules: ['izhar_mim'], usage: ['recite', 'find'] },

  // ── Мим с шаддой ──
  { id: 'ay_shm_1', text: 'وَمِمَّا رَزَقۡنَٰهُمۡ يُنفِقُونَ',            rules: ['shadda_mim'], usage: ['recite', 'find'] },
  { id: 'ay_shm_2', text: 'عَمَّ يَتَسَآءَلُونَ',                         rules: ['shadda_mim'], usage: ['recite', 'find'] },
  { id: 'ay_shm_3', text: 'فَأَمَّا ٱلۡيَتِيمَ فَلَا تَقۡهَرۡ',           rules: ['shadda_mim'], usage: ['recite', 'find'] },

  // ── Изхар нуна ──
  { id: 'ay_izn_1', text: 'فَصَلِّ لِرَبِّكَ وَٱنۡحَرۡ',                   rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_2', text: 'وَأَمَّا ٱلسَّآئِلَ فَلَا تَنۡهَرۡ',           rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_3', text: 'وَقَالَ إِنِّى ذَاهِبٌ إِلَىٰ رَبِّى',        rules: ['izhar_nun'], usage: ['recite', 'find'] },
  { id: 'ay_izn_4', text: 'صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ',      rules: ['izhar_nun'], usage: ['recite', 'find'] },

  // ── Идгам нуна ──
  { id: 'ay_idn_1', text: 'وَلَمۡ يَكُن لَّهُۥ كُفُوًا أَحَدُۢ',          rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_2', text: 'فَمَن يَعۡمَلۡ مِثۡقَالَ ذَرَّةٍ خَيۡرٗا يَرَهُۥ', rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_3', text: 'لَيۡلَةُ ٱلۡقَدۡرِ خَيۡرٌ مِّنۡ أَلۡفِ شَهۡرٍ', rules: ['idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_idn_4', text: 'وَجَعَلۡنَا سِرَاجٗا وَهَّاجٗا',              rules: ['idgham_nun'], usage: ['recite', 'find'] },

  // ── Икляб + Ихфа нуна (длинные аяты суры Аль-Баййина) ──
  { id: 'ay_ikn_1', text: 'لَمۡ يَكُنِ ٱلَّذِينَ كَفَرُوا۟ مِنۡ أَهۡلِ ٱلۡكِتَٰبِ وَٱلۡمُشۡرِكِينَ مُنفَكِّينَ حَتَّىٰ تَأۡتِيَهُمُ ٱلۡبَيِّنَةُ', rules: ['ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikn_2', text: 'رَسُولٌ مِّنَ ٱللَّهِ يَتۡلُوا۟ صُحُفٗا مُّطَهَّرَةٗ', rules: ['ikhfa_nun', 'idgham_nun'], usage: ['recite', 'find'] },
  { id: 'ay_ikn_3', text: 'فِيهَا كُتُبٌ قَيِّمَةٌ',                       rules: ['ikhfa_nun'], usage: ['recite', 'find'] },
  { id: 'ay_iqn_1', text: 'وَمَا تَفَرَّقَ ٱلَّذِينَ أُوتُوا۟ ٱلۡكِتَٰبَ إِلَّا مِنۢ بَعۡدِ مَا جَآءَتۡهُمُ ٱلۡبَيِّنَةُ', rules: ['iqlab_nun'], usage: ['recite', 'find'] },
];

// Индекс по id
const AYAH_BY_ID = {};
AYAHS.forEach(a => { AYAH_BY_ID[a.id] = a; });

// Помощник: аяты по правилу (для будущих заданий)
function ayahsByRule(ruleThemeId) {
  return AYAHS.filter(a => a.rules.includes(ruleThemeId));
}
