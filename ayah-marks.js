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
  ay_idm_1: [ {w:0, rule:'izhar_mim'}, {w:2, rule:'idgham_nun'}, {w:3, rule:'idgham_mim'}, {w:5, rule:'madd_arid'} ],
  //           لَهُمۡ فِيهَا(изхар мими) · فَٰكِهَةٌ وَلَهُم(идгам нуна) · وَلَهُم مَّا(идгам мими)
  ay_idm_2: [ {w:1, rule:'ikhfa_nun'}, {w:1, rule:'idgham_mim'}, {w:2, rule:'izhar_nun'}, {w:3, rule:'izhar_nun'}, {w:4, rule:'izhar_nun'}, {w:5, rule:'madd_arid'}, {w:0, rule:'madd_tabii'}, {w:5, rule:'madd_tabii'} ],
  //           مِنكُم(ихфа нуна внутри) · مِنكُم مِّنۡ(идгам мими) · مِّنۡ أَحَدٍ(изхар) · أَحَدٍ عَنۡهُ(изхар) · عَنۡهُ(изхар внутри)
  ay_idm_3: [ {w:1, rule:'idgham_mim'}, {w:2, rule:'ikhfa_nun'}, {w:3, rule:'idgham_nun'}, {w:4, rule:'idgham_mim'}, {w:5, rule:'izhar_nun'}, {w:0, rule:'madd_munfasil'}, {w:3, rule:'madd_tabii'} ],
  ay_idm_4: [ {w:0, rule:'idgham_mim'} ],
  ay_idm_5: [ {w:0, rule:'idgham_mim'} ],
  ay_idm_6: [ {w:0, rule:'idgham_mim'}, {w:1, rule:'izhar_nun'} ],
  ay_idm_7: [ {w:1, rule:'idgham_mim'}, {w:2, rule:'izhar_nun'} ],
  ay_idm_8: [ {w:0, rule:'idgham_mim'}, {w:1, rule:'ikhfa_nun'}, {w:2, rule:'ikhfa_nun'} ],

  // ── ихфа мими ──
  ay_ikm_1: [ {w:0, rule:'ikhfa_mim'}, {w:1, rule:'idgham_nun'} ],
  ay_ikm_2: [ {w:1, rule:'ikhfa_mim'}, {w:2, rule:'madd_arid'}, {w:0, rule:'madd_tabii'} ],
  ay_ikm_3: [ {w:0, rule:'ikhfa_mim'} ],
  ay_ikm_4: [ {w:0, rule:'ikhfa_mim'}, {w:1, rule:'idgham_nun'}, {w:2, rule:'ikhfa_nun'}, {w:3, rule:'madd_arid'}, {w:0, rule:'madd_tabii'} ],
  ay_ikm_5: [ {w:1, rule:'ikhfa_mim'}, {w:4, rule:'madd_arid'}, {w:0, rule:'madd_tabii'}, {w:2, rule:'madd_tabii'} ],
  ay_ikm_6: [ {w:0, rule:'ikhfa_nun'}, {w:0, rule:'ikhfa_mim'}, {w:2, rule:'madd_arid'} ],
  ay_ikm_8: [ {w:0, rule:'ikhfa_mim'}, {w:2, rule:'madd_arid'}, {w:2, rule:'madd_tabii'} ],

  // ── изхар мими ──
  ay_izm_1: [ {w:3, rule:'madd_arid'}, {w:2, rule:'madd_tabii'} ],  // правил нет
  ay_izm_2: [ {w:0, rule:'izhar_mim'}, {w:6, rule:'madd_arid'}, {w:5, rule:'madd_tabii'} ],
  ay_izm_3: [ {w:0, rule:'izhar_mim'}, {w:2, rule:'izhar_mim'}, {w:4, rule:'madd_arid'}, {w:3, rule:'madd_tabii'} ],
  ay_izm_4: [ {w:1, rule:'izhar_mim'}, {w:2, rule:'izhar_nun'}, {w:3, rule:'madd_arid'}, {w:3, rule:'madd_tabii'} ],
  ay_izm_5: [ {w:0, rule:'izhar_mim'}, {w:1, rule:'idgham_nun'}, {w:2, rule:'madd_arid'} ],

  // ── мим с шаддой ──
  ay_shm_1: [ {w:1, rule:'izhar_mim'}, {w:2, rule:'ikhfa_nun'}, {w:2, rule:'madd_arid'}, {w:1, rule:'madd_tabii'} ],
  ay_shm_2: [ {w:0, rule:'shadda_mim'}, {w:1, rule:'madd_arid'}, {w:1, rule:'madd_muttasil'} ],
  ay_shm_3: [ {w:0, rule:'shadda_mim'} ],

  // ── изхар нуна ──
  ay_izn_1: [ {w:2, rule:'izhar_nun'} ],
  ay_izn_2: [ {w:3, rule:'izhar_nun'}, {w:1, rule:'madd_muttasil'}, {w:2, rule:'madd_tabii'} ],
  ay_izn_3: [ {w:1, rule:'shadda_nun'}, {w:2, rule:'izhar_nun'} ],
  ay_izn_4: [ {w:2, rule:'izhar_nun'}, {w:2, rule:'izhar_mim'} ],

  // ── идгам нуна ──
  ay_idn_1: [ {w:0, rule:'izhar_mim'}, {w:1, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'} ],
  ay_idn_2: [ {w:0, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'}, {w:4, rule:'idgham_nun'} ],
  ay_idn_3: [ {w:2, rule:'idgham_nun'}, {w:3, rule:'izhar_nun'} ],
  ay_idn_4: [ {w:1, rule:'idgham_nun'}, {w:2, rule:'madd_iwad'}, {w:0, rule:'madd_tabii'} ],

  // ── ихфа нуна ──
  ay_ikn_1: [ {w:0, rule:'izhar_mim'}, {w:4, rule:'izhar_nun'}, {w:8, rule:'ikhfa_nun'} ],
  ay_ikn_2: [ {w:0, rule:'idgham_nun'}, {w:4, rule:'idgham_nun'} ],
  ay_ikn_3: [ {w:1, rule:'ikhfa_nun'} ],

  // ── икляб ──
  ay_iqn_1: [ {w:6, rule:'iqlab_nun'}, {w:9, rule:'madd_muttasil'} ],

  // ── МАДД: аяты домашних заданий (порция 1: мунфасыль и лазим) ──
  // Естественный мадд НЕ размечаем: он в 63% слов, задание превратилось бы
  // в подчёркивание всего аята. Он остаётся в вопросах и распределении.
  ay_mdm_3: [ {w:1, rule:'madd_muttasil'} ],   // Ан-Наср, 1
  ay_mdm_4: [ {w:0, rule:'madd_munfasil'} ],   // Аль-Кадр, 1
  ay_mdl_1: [ {w:1, rule:'madd_lazim'} ],   // Ад-Духа, 7
  ay_mdl_2: [ {w:1, rule:'madd_muttasil'}, {w:2, rule:'madd_lazim'} ],   // Абаса, 33

  // ── МАДД, порция 2: буквенный лазим и ‘арид ──
  // ‘Арид помечается ТОЛЬКО на последнем слове аята: он возникает при
  // остановке, а естественная остановка — конец аята. Слова в середине,
  // подходящие по строению, не помечаем — останавливаться там незачем.
  ay_mdlh_2: [ {w:1, rule:'madd_munfasil'}, {w:6, rule:'madd_arid'} ],   // Аль-‘Имран, 2
  ay_mdlh_5: [ {w:0, rule:'madd_lazim_harfi'}, {w:2, rule:'madd_arid'} ],   // Каф, 1
  ay_mda_1: [ {w:3, rule:'madd_arid'} ],   // Аль-Фатиха, 2
  ay_mda_2: [ {w:3, rule:'madd_arid'} ],   // Ан-Нас, 1


  // ── МАДД, порция 3: ‘ивад и естественный мадд ──
  // ‘Ивад — только на последнем слове аята: правило возникает при остановке.
  ay_mdi_4: [ {w:2, rule:'madd_iwad'} ],   // Аль-‘Адият, 4
  ay_mdi_5: [ {w:2, rule:'madd_iwad'} ],   // Аль-‘Адият, 5
  ay_mdt_1: [ {w:3, rule:'madd_tabii'} ],   // Аль-Ихляс, 3
  ay_mdt_5: [ {w:0, rule:'madd_tabii'}, {w:2, rule:'madd_tabii'}, {w:3, rule:'madd_tabii'}, {w:3, rule:'madd_arid'} ],   // Аль-Фатиха, 5

  // ── МАДД, порция 5 ──
  ay_mdlh_7: [ {w:0, rule:'madd_lazim_harfi'} ],   // Аль-А‘раф, 1
  ay_mdlh_8: [ {w:0, rule:'madd_lazim_harfi'} ],   // Юнус, 1
  ay_mdlh_9: [ {w:0, rule:'madd_lazim_harfi'} ],   // Ар-Ра‘д, 1
  ay_mdlh_10: [ {w:0, rule:'madd_lazim_harfi'} ],   // Марьям, 1
  ay_mdlh_11: [ {w:0, rule:'madd_lazim_harfi'} ],   // Аш-Шу‘ара, 1
  ay_mdlh_12: [ {w:0, rule:'madd_lazim_harfi'} ],   // Ан-Намль, 1
  ay_mdlh_15: [ {w:0, rule:'madd_lazim_harfi'} ],   // Гафир, 1
  ay_mdl_6: [ {w:8, rule:'madd_lazim'}, {w:8, rule:'madd_arid'} ],   // Аль-Фатиха, 7
  ay_mdl_7: [ {w:1, rule:'madd_muttasil'}, {w:2, rule:'madd_lazim'} ],   // Ан-Нази‘ат, 34
  ay_mdl_8: [ {w:0, rule:'madd_lazim'}, {w:1, rule:'madd_iwad'} ],   // Ас-Саффат, 1
  ay_mdl_9: [ {w:5, rule:'madd_lazim'} ],   // Ар-Рахман, 74
  ay_mdl_10: [ {w:2, rule:'madd_lazim'} ],   // Аль-Муджадиля, 5

  // ── МАДД, порция 6 ──
  ay_mdm_5: [ {w:0, rule:'madd_munfasil'}, {w:3, rule:'madd_arid'} ],   // Аль-Кафирун, 2
  ay_mdm_6: [ {w:0, rule:'madd_munfasil'}, {w:3, rule:'madd_munfasil'} ],   // Аль-Кафирун, 3
  ay_mdm_7: [ {w:0, rule:'madd_munfasil'} ],   // Аль-Кыяма, 1
  ay_mdm_8: [ {w:0, rule:'madd_munfasil'} ],   // Аль-Балад, 1
  ay_mdm_9: [ {w:0, rule:'madd_munfasil'} ],   // Аль-Кадр, 2
  ay_mdt2_1: [ {w:0, rule:'madd_muttasil'}, {w:4, rule:'madd_iwad'} ],   // Аль-Фаджр, 22
  ay_mdt2_2: [ {w:1, rule:'madd_muttasil'} ],   // Аль-Инфитар, 1
  ay_mdt2_3: [ {w:1, rule:'madd_muttasil'} ],   // Аль-Иншикак, 1
  ay_mdi_6: [ {w:6, rule:'madd_iwad'} ],   // Ан-Наср, 3
  ay_mdi_7: [ {w:1, rule:'madd_iwad'} ],   // Аз-Зарият, 1
  ay_mdi_8: [ {w:1, rule:'madd_iwad'} ],   // Аль-Мурсалят, 1
  ay_mdt_6: [ {w:0, rule:'madd_munfasil'}, {w:1, rule:'madd_tabii'} ],   // Аль-Каусар, 1
  ay_mdt_7: [ {w:1, rule:'madd_tabii'} ],   // Аль-‘Аср, 2
  ay_mdt_8: [ {w:0, rule:'madd_tabii'}, {w:2, rule:'madd_tabii'}, {w:2, rule:'madd_arid'} ],   // Ат-Тин, 3
  ay_mdt_9: [ {w:0, rule:'madd_tabii'}, {w:3, rule:'madd_tabii'}, {w:4, rule:'madd_tabii'} ],   // Ад-Духа, 3
  ay_mdt_10: [ {w:4, rule:'madd_tabii'} ],   // Ад-Духа, 4

  // ── МАДД ЛИН: «Аль-Кураиш» 1–4 ──
  ay_mln_3: [ {w:3, rule:'madd_lin'} ],   // «Аль-Кураиш», 3
  ay_mln_4: [ {w:0, rule:'madd_munfasil'}, {w:6, rule:'madd_lin'} ],   // «Аль-Кураиш», 4

  // ── Разметка склеенных отрывков ──
  ay_j_adiyat_1_3: [ {w:1, rule:'madd_iwad'}, {w:4, rule:'madd_iwad'}, {w:7, rule:'madd_iwad'} ],   // Аль-‘Адият, 1–3
  ay_j_haqqa_1_3: [ {w:0, rule:'madd_lazim'}, {w:3, rule:'madd_lazim'}, {w:5, rule:'madd_munfasil'}, {w:8, rule:'madd_lazim'} ],   // Аль-Хакка, 1–3
  ay_j_duha_1_2: [ {w:0, rule:'madd_tabii'}, {w:3, rule:'madd_tabii'}, {w:4, rule:'madd_tabii'} ],   // Ад-Духа, 1–2
  ay_j_tin_1_2: [ {w:1, rule:'madd_arid'}, {w:3, rule:'madd_tabii'}, {w:4, rule:'madd_tabii'} ],   // Ат-Тин, 1–2
  ay_j_tariq_1_2: [ {w:0, rule:'madd_muttasil'}, {w:3, rule:'madd_munfasil'} ],   // Ат-Тарик, 1–2
  ay_j_quraysh_1_2: [ {w:1, rule:'madd_lin'}, {w:5, rule:'madd_muttasil'}, {w:6, rule:'madd_lin'} ],   // Аль-Кураиш, 1–2
  ay_j_baqara_1_2: [ {w:0, rule:'madd_lazim_harfi'}, {w:7, rule:'idgham_nun'}, {w:8, rule:'madd_arid'} ],   // Аль-Бакара, 1–2
  ay_j_yasin_1_2: [ {w:0, rule:'madd_lazim_harfi'}, {w:3, rule:'madd_arid'} ],   // Йа-Син, 1–2
  ay_j_qalam_1: [ {w:0, rule:'madd_lazim_harfi'}, {w:2, rule:'madd_tabii'}, {w:3, rule:'madd_arid'} ],   // Аль-Калям, 1
  ay_j_sad_1: [ {w:0, rule:'madd_lazim_harfi'}, {w:3, rule:'madd_arid'} ],   // Сад, 1

  // ── Разметка аятов для бедных правил ──
  ay_iqn_a1: [ {w:1, rule:'iqlab_nun'}, {w:1, rule:'shadda_nun'}, {w:2, rule:'madd_tabii'} ],   // Аль-Хумаза, 4
  ay_iqn_a2: [ {w:0, rule:'shadda_nun'}, {w:2, rule:'madd_tabii'}, {w:3, rule:'iqlab_nun'}, {w:4, rule:'madd_iwad'} ],   // Ан-Ниса, 58
  ay_iqn_a3: [ {w:0, rule:'iqlab_nun'}, {w:4, rule:'madd_tabii'}, {w:5, rule:'madd_arid'} ],   // Аль-Бакара, 18
  ay_shn_a1: [ {w:0, rule:'shadda_nun'}, {w:1, rule:'ikhfa_nun'}, {w:1, rule:'madd_tabii'} ],   // Аль-‘Аср, 2
  ay_shn_a2: [ {w:0, rule:'madd_munfasil'}, {w:1, rule:'shadda_nun'}, {w:2, rule:'ikhfa_nun'} ],   // Аль-Аляк, 6
  ay_shn_a3: [ {w:0, rule:'madd_munfasil'}, {w:0, rule:'shadda_nun'}, {w:1, rule:'madd_tabii'} ],   // Аль-Каусар, 1
  ay_shn_a4: [ {w:0, rule:'shadda_nun'}, {w:3, rule:'madd_arid'} ],   // Аль-Калям, 4
  ay_shm_a1: [ {w:0, rule:'shadda_mim'}, {w:1, rule:'ikhfa_nun'}, {w:3, rule:'madd_tabii'} ],   // Аль-Кари‘а, 6
  ay_shm_a2: [ {w:0, rule:'shadda_mim'}, {w:1, rule:'izhar_nun'}, {w:3, rule:'madd_tabii'} ],   // Аль-Кари‘а, 8
  ay_shm_a3: [ {w:0, rule:'shadda_mim'}, {w:1, rule:'shadda_nun'}, {w:4, rule:'madd_arid'} ],   // Ат-Такасур, 8
};

if (typeof window !== 'undefined') window.AYAH_MARKS = AYAH_MARKS;

/* ─────────────────────────────────────────────────────────────────────
   ПРАВИЛА АЯТА БЕРУТСЯ ИЗ РАЗМЕТКИ
   ─────────────────────────────────────────────────────────────────────
   Раньше поле rules заполнялось вручную — «к какой теме аят заведён».
   Из-за этого басмала числилась в изхаре мими, хотя мима в ней нет:
   она попала в библиотеку как начало суры из урока про мим.

   Теперь rules вычисляется по разметке: что размечено, то и есть.
   Единый источник — разметка. Ручное поле сохраняется в rulesDeclared
   на случай, если понадобится вспомнить, откуда аят пришёл.

   Стоит здесь, а не в ayahs.js, потому что этот файл грузится ПОСЛЕ
   и к этому моменту известно и то и другое.
──────────────────────────────────────────────────────────────────── */
(function () {
  if (typeof AYAHS === 'undefined') return;
  AYAHS.forEach(function (a) {
    var marks = AYAH_MARKS[a.id] || [];
    if (!marks.length) return;                     // нет разметки — оставляем как есть
    var seen = {}, list = [];
    marks.forEach(function (m) { if (!seen[m.rule]) { seen[m.rule] = 1; list.push(m.rule); } });
    a.rulesDeclared = a.rules;
    a.rules = list;
  });
})();
