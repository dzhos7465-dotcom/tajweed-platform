/* ══════════════════════════════════════════════════════════════════════
   СЛОВА НУЛЕВОГО КУРСА  (words.js)
   ══════════════════════════════════════════════════════════════════════
   Третья библиотека нулевого курса, рядом с letters.js и signs.js.
   Буквы и знаки показываются поодиночке; здесь — целые слова, на которых
   видно, как знак ведёт себя в живом чтении.

   Пока в ней слова с ХАМЗАТУЛЬ-ВАСЛЬ. Правило простое на словах и трудное
   на деле: соединительная хамза сама по себе звука не имеет, и то, как её
   прочитать, определяет ТРЕТЬЯ буква слова.

     дамма на третьей букве          → хамза читается на «у»
     касра или фатха на третьей      → на «и»
     определённый артикль ٱلْ         → всегда на «а»

   Свойства слова:
     text   — слово целиком
     vowel  — на какой звук читается хамза: «у», «и», «а»
     kind   — verb (глагол), moon (артикль, лунная буква),
              sun (артикль, солнечная буква)

   ПРО СУКУН. Здесь кружок (U+0652), как в signs.js: это учебный материал
   нулевого курса. Коранические примеры в knowledge.js набраны мусхафным
   сукуном — то же правило, другое начертание.

   ПРО ЛУННЫЕ И СОЛНЕЧНЫЕ. Поле kind пока используется только для отбора
   слов, но само различие — отдельная тема: у лунных лям артикля читается,
   у солнечных исчезает, а следующая буква удваивается. Когда дойдём до
   неё, вопросы соберутся из этого же списка, без новых данных.

   Слова выверены преподавателем.
────────────────────────────────────────────────────────────────────── */

const WASL_WORDS = [
  // ── Читается на «у»: третья буква с даммой ──
  { id: 'w_u_1', text: 'ٱدْرُسْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_2', text: 'ٱدْخُلْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_3', text: 'ٱنْصُرْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_4', text: 'ٱكْتُبْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_5', text: 'ٱسْجُدُوا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_6', text: 'ٱنْظُرُوا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_7', text: 'ٱقْتُلُوا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_8', text: 'ٱسْكُنْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_9', text: 'ٱشْكُرُوا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_10', text: 'ٱقْعُدْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_11', text: 'ٱتْلُوهَا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_12', text: 'ٱدْخُلُوهَا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_13', text: 'ٱذْكُرُوا', vowel: 'у', kind: 'verb' },
  { id: 'w_u_14', text: 'ٱرْكُضْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_15', text: 'ٱخْرُجْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_16', text: 'ٱصْدُقْ', vowel: 'у', kind: 'verb' },
  { id: 'w_u_17', text: 'ٱطْلُبْ', vowel: 'у', kind: 'verb' },

  // ── Читается на «и»: третья буква с касрой или фатхой ──
  { id: 'w_i_1', text: 'ٱقْرَأْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_2', text: 'ٱجْلِسْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_3', text: 'ٱرْكَبْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_4', text: 'ٱصْبِرْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_5', text: 'ٱفْتَحْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_6', text: 'ٱرْجِعْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_7', text: 'ٱفْهَمْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_8', text: 'ٱهْدِنَا', vowel: 'и', kind: 'verb' },
  { id: 'w_i_9', text: 'ٱرْحَمْنَا', vowel: 'и', kind: 'verb' },
  { id: 'w_i_10', text: 'ٱسْتَغْفِرْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_11', text: 'ٱسْأَلُوا', vowel: 'и', kind: 'verb' },
  { id: 'w_i_12', text: 'ٱضْرِبْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_13', text: 'ٱسْمَعْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_14', text: 'ٱرْفَعْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_15', text: 'ٱحْمِلْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_16', text: 'ٱجْمَعْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_17', text: 'ٱشْرَبْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_18', text: 'ٱذْهَبْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_19', text: 'ٱفْعَلْ', vowel: 'и', kind: 'verb' },
  { id: 'w_i_20', text: 'ٱتَّبِعْ', vowel: 'и', kind: 'verb' },

  /* ── Читается на «а»: определённый артикль ──
     Лунные буквы: лям артикля читается, над ним сукун. */
  { id: 'w_am_1', text: 'ٱلْأَرْضِ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_2', text: 'ٱلْبَيْتِ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_3', text: 'ٱلْجَنَّةِ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_4', text: 'ٱلْحَمْدُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_5', text: 'ٱلْخَالِقُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_6', text: 'ٱلْعَالَمِينَ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_7', text: 'ٱلْغَفُورُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_8', text: 'ٱلْفَلَقِ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_9', text: 'ٱلْقَمَرِ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_10', text: 'ٱلْكِتَابُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_11', text: 'ٱلْمَلِكُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_12', text: 'ٱلْوَاقِعَةُ', vowel: 'а', kind: 'moon' },
  { id: 'w_am_13', text: 'ٱلْهُدَى', vowel: 'а', kind: 'moon' },
  { id: 'w_am_14', text: 'ٱلْيَوْمُ', vowel: 'а', kind: 'moon' },

  /* Солнечные буквы: лям НЕ читается, следующая буква с шаддой. */
  { id: 'w_as_1', text: 'ٱلتَّوَّابُ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_2', text: 'ٱلثَّمَرَاتِ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_3', text: 'ٱلدِّينِ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_4', text: 'ٱلذِّكْرَ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_5', text: 'ٱلرَّحْمَٰنُ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_6', text: 'ٱلزَّقُّومِ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_7', text: 'ٱلسَّمَاءِ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_8', text: 'ٱلشَّمْسُ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_9', text: 'ٱلصِّرَاطَ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_10', text: 'ٱلظَّالِمِينَ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_11', text: 'ٱللَّيْلِ', vowel: 'а', kind: 'sun' },
  { id: 'w_as_12', text: 'ٱلنَّاسِ', vowel: 'а', kind: 'sun' },
];

const WASL_BY_ID = {};
WASL_WORDS.forEach(function (w) { WASL_BY_ID[w.id] = w; });

/* Слова, где хамза читается на заданный звук. */
function waslWordsWithVowel(v) {
  return WASL_WORDS.filter(function (w) { return w.vowel === v; });
}

/* Какие вообще бывают звуки — спрашиваем список, а не пишем руками. */
function waslVowels() {
  const seen = {}, out = [];
  WASL_WORDS.forEach(function (w) { if (!seen[w.vowel]) { seen[w.vowel] = 1; out.push(w.vowel); } });
  return out;
}

if (typeof window !== 'undefined') {
  window.WASL_WORDS = WASL_WORDS;
  window.WASL_BY_ID = WASL_BY_ID;
  window.waslWordsWithVowel = waslWordsWithVowel;
  window.waslVowels = waslVowels;
}
