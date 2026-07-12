/* ══════════════════════════════════════════════════════════════════════
   РАЗМЕТКА АЯТОВ — где какое правило (для задания «Найди в аяте»)
   ──────────────────────────────────────────────────────────────────────
   Выверено преподавателем (Дзхо) пословно, порциями 1–6.
   Формат: для каждого аята — массив меток { w, rule }, где
     w    — индекс СЛОВА в тексте аята (text.split(' ')), на котором
            стоит нун/мим сакина или танвин, дающий правило.
     rule — какое это правило.
   Правило на стыке слов помечается на ПЕРВОМ слове (где стоит нун/мим/
   танвин); движок засчитает тап и по следующему слову.
   Концы аятов (последнее слово при остановке) НЕ размечаются.

   Правила: izhar_mim, idgham_mim, ikhfa_mim,
            izhar_nun, idgham_nun, iqlab_nun, ikhfa_nun,
            shadda_mim, shadda_nun
══════════════════════════════════════════════════════════════════════ */

const AYAH_MARKS = {
  // ── идгам мими ──
  ay_idm_1: [ {w:0, rule:'izhar_mim'}, {w:2, rule:'idgham_nun'}, {w:3, rule:'idgham_mim'} ],
  //           لَهُمۡ فِيهَا(изхар мими) · فَٰكِهَةٌ وَلَهُم(идгам нуна) · وَلَهُم مَّا(идгам мими)
  ay_idm_2: [ {w:1, rule:'ikhfa_nun'}, {w:1, rule:'idgham_mim'}, {w:2, rule:'izhar_nun'}, {w:3, rule:'izhar_nun'}, {w:4, rule:'izhar_nun'} ],
  //           مِنكُم(ихфа нуна внутри) · مِنكُم مِّنۡ(идгам мими) · مِّنۡ أَحَدٍ(изхар) · أَحَدٍ عَنۡهُ(изхар) · عَنۡهُ(изхар внутри)
  ay_idm_3: [ {w:1, rule:'idgham_mim'}, {w:2, rule:'ikhfa_nun'}, {w:3, rule:'idgham_nun'}, {w:4, rule:'idgham_mim'}, {w:5, rule:'izhar_nun'} ],
  ay_idm_4: [ {w:0, rule:'idgham_mim'} ],
  ay_idm_5: [ {w:0, rule:'idgham_mim'} ],
  ay_idm_6: [ {w:0, rule:'idgham_mim'}, {w:1, rule:'izhar_nun'} ],
  ay_idm_7: [ {w:1, rule:'idgham_mim'}, {w:2, rule:'izhar_nun'} ],
  ay_idm_8: [ {w:0, rule:'idgham_mim'}, {w:1, rule:'ikhfa_nun'}, {w:2, rule:'ikhfa_nun'} ],

  // ── ихфа мими ──
  ay_ikm_1: [ {w:0, rule:'ikhfa_mim'}, {w:1, rule:'idgham_nun'} ],
  ay_ikm_2: [ {w:1, rule:'ikhfa_mim'} ],
  ay_ikm_3: [ {w:0, rule:'ikhfa_mim'} ],
  ay_ikm_4: [ {w:0, rule:'ikhfa_mim'}, {w:1, rule:'idgham_nun'}, {w:2, rule:'ikhfa_nun'} ],
  ay_ikm_5: [ {w:1, rule:'ikhfa_mim'} ],
  ay_ikm_6: [ {w:0, rule:'ikhfa_nun'}, {w:0, rule:'ikhfa_mim'} ],
  ay_ikm_7: [ {w:0, rule:'ikhfa_mim'} ],
  ay_ikm_8: [ {w:0, rule:'ikhfa_mim'} ],

  // ── изхар мими ──
  ay_izm_1: [],  // правил нет
  ay_izm_2: [ {w:0, rule:'izhar_mim'} ],
  ay_izm_3: [ {w:0, rule:'izhar_mim'}, {w:2, rule:'izhar_mim'} ],
  ay_izm_4: [ {w:1, rule:'izhar_mim'}, {w:2, rule:'izhar_nun'} ],
  ay_izm_5: [ {w:0, rule:'izhar_mim'}, {w:1, rule:'idgham_nun'} ],

  // ── мим с шаддой ──
  ay_shm_1: [ {w:1, rule:'izhar_mim'}, {w:2, rule:'ikhfa_nun'} ],
  ay_shm_2: [ {w:0, rule:'shadda_mim'} ],
  ay_shm_3: [ {w:0, rule:'shadda_mim'} ],

  // ── изхар нуна ──
  ay_izn_1: [ {w:2, rule:'izhar_nun'} ],
  ay_izn_2: [ {w:3, rule:'izhar_nun'} ],
  ay_izn_3: [ {w:1, rule:'shadda_nun'}, {w:2, rule:'izhar_nun'} ],
  ay_izn_4: [ {w:2, rule:'izhar_nun'}, {w:2, rule:'izhar_mim'} ],

  // ── идгам нуна ──
  ay_idn_1: [ {w:0, rule:'izhar_mim'}, {w:1, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'} ],
  ay_idn_2: [ {w:0, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'}, {w:4, rule:'idgham_nun'} ],
  ay_idn_3: [ {w:2, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'} ],
  ay_idn_4: [ {w:1, rule:'idgham_nun'} ],

  // ── ихфа нуна ──
  ay_ikn_1: [ {w:0, rule:'izhar_mim'}, {w:4, rule:'izhar_nun'}, {w:8, rule:'ikhfa_nun'} ],
  ay_ikn_2: [ {w:0, rule:'idgham_nun'}, {w:4, rule:'idgham_nun'} ],
  ay_ikn_3: [ {w:1, rule:'ikhfa_nun'} ],

  // ── икляб ──
  ay_iqn_1: [ {w:6, rule:'iqlab_nun'} ],
};

if (typeof window !== 'undefined') window.AYAH_MARKS = AYAH_MARKS;
