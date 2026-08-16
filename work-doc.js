/* ══════════════════════════════════════════════════════════════════════
   ДОКУМЕНТ РАБОТЫ УЧЕНИКА
   ══════════════════════════════════════════════════════════════════════
   Собирает разбор работы в PDF: шапка, итоговый балл, полоска правил,
   задания с арабскими словами и объяснениями.

   Почему страницы рисуются картинками, а не текстом:
   арабская вязь в PDF ломается — огласовки съезжают, слова идут задом
   наперёд. У нас крупный текст с огласовками, татвилями и малыми алифами,
   то есть самый сложный случай. Браузер рисует его безупречно, поэтому
   рисуем им и вкладываем картинку в страницу. Цена — текст нельзя
   выделить и скопировать; документ смотрят и печатают, так что не потеря.

   ГЛАВНОЕ ПРАВИЛО: документ появляется, ТОЛЬКО когда балл окончателен.
   Есть чтение и оно не оценено — документа нет ни у кого. Иначе ребёнок
   сохранит число, которое потом изменится, и покажет его родителям.
────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const PAPER = '#fdfbf4', INK = '#23252e', SOFT = '#55586a', FAINT = '#8f8f9c';
  const TEAL = '#0f7d74', GOLD = '#b8912f', OK = '#2f7d5f', ERR = '#a53a3a';

  // высота страницы под A4 при ширине 794 пикселя
  const PAGE_W = 794, PAGE_H = 1123;

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = url; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureTools() {
    const need = [];
    if (typeof html2canvas === 'undefined') {
      need.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'));
    }
    if (typeof window.jspdf === 'undefined') {
      need.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
    }
    return Promise.all(need).then(waitForFonts);
  }

  /* ДОЖДАТЬСЯ ШРИФТА ПЕРЕД ПЕЧАТЬЮ.
     Документ рисуется снимком страницы. Если Amiri в этот миг ещё не
     загрузился, снимок делается запасным шрифтом — а он арабскую вязь не
     соединяет, и буквы выходят порознь. Отсюда «иногда бывает»: успел
     шрифт подгрузиться или нет, зависело от связи, и на телефоне не
     успевал чаще. Просим браузер загрузить оба нужных начертания и ждём;
     если он такого не умеет — идём дальше, хуже не станет. */
  function waitForFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const wanted = ['19px Amiri', '24px Amiri', '32px Amiri'];
    return Promise.all(wanted.map(function (f) {
      try { return document.fonts.load(f, 'ابجد'); } catch (e) { return Promise.resolve(); }
    }))
    .then(function () { return document.fonts.ready; })
    .catch(function () { return null; });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function ruleName(id) {
    if (typeof THEMES !== 'undefined' && THEMES[id]) return THEMES[id].name;
    /* Блоки нулевого курса — не правила таджвида, их имена лежат в другой
       библиотеке. Без этой строки в документе стояло «c0_harakat» вместо
       «Огласовки»: внутреннее имя утекало на глаза ученику. */
    if (typeof course0Name === 'function') {
      const n = course0Name(id);
      if (n) return n;
    }
    return id;
  }

  function ruleColor(id) {
    return (typeof ruleAccent === 'function') ? ruleAccent(id) : TEAL;
  }

  /* Признак правила — то же объяснение, что ученик видит в домашке.
     Берём из библиотеки, чтобы правка формулировки меняла и документ. */
  function ruleSign(id) {
    return (typeof THEMES !== 'undefined' && THEMES[id] && THEMES[id].sign) || '';
  }

  /* Полное имя темы: у мима и нуна ответ записан общим именем (izhar),
     а признак лежит у izhar_nun. Та же оговорка, что в объяснениях. */
  function fullTheme(answerId, taskTheme) {
    if (typeof THEMES === 'undefined') return answerId;
    if (THEMES[answerId]) return answerId;
    const m = String(taskTheme || '').match(/_(mim|nun)$/);
    if (m && THEMES[answerId + m[0]]) return answerId + m[0];
    return ['_nun', '_mim'].map(x => answerId + x).filter(id => THEMES[id])[0] || answerId;
  }

  const TYPE_LABEL = { sort: 'Распределение', find: 'Найди в аяте', recite: 'Чтение вслух' };
  const AR = "Amiri, 'Scheherazade New', serif";

  function exampleText(id) {
    return (typeof EXAMPLE_BY_ID !== 'undefined' && EXAMPLE_BY_ID[id]) ? EXAMPLE_BY_ID[id].text : '';
  }
  function ayahText(id) {
    return (typeof AYAH_BY_ID !== 'undefined' && AYAH_BY_ID[id]) ? AYAH_BY_ID[id].text : '';
  }

  /* Рамка-мусхаф вокруг арабского текста — та же, что видит ученик на
     экране: кремовый лист, золотая двойная рамка, коранические скобки. */
  function mushaf(text, size, isAyah) {
    if (!text) return '';
    // Коранические скобки ставим ТОЛЬКО вокруг аята. Отдельное слово —
    // не аят, и обрамлять его так было бы неправдой.
    const open = isAyah ? '<span style="color:' + GOLD + ';">\uFD3F</span> ' : '';
    const close = isAyah ? ' <span style="color:' + GOLD + ';">\uFD3E</span>' : '';
    /* НАПРАВЛЕНИЕ СТАВИМ НА РАМКУ, А НЕ НА СТРОЧНЫЙ ЭЛЕМЕНТ.
       Раньше direction:rtl висело на <span>. На строчном элементе оно само
       по себе не переставляет соседние элементы — нужен ещё unicode-bidi.
       Из-за этого скобки в документе выходили развёрнутыми: открывающая
       оказывалась слева, закрывающая справа, то есть наоборот. На экране
       всё было верно, потому что там направление задано блоку. */
    return '<div style="background:#fdfbf4;border:1.5px solid ' + GOLD + ';border-radius:10px;' +
        'padding:10px 16px;margin:8px 0;text-align:center;direction:rtl;' +
        'box-shadow:inset 0 0 0 3px #fdfbf4, inset 0 0 0 4px #e6d9b8;">' +
      '<span style="font-family:' + AR + ';direction:rtl;unicode-bidi:isolate;' +
        'font-size:' + (size || 30) + 'px;' +
        'line-height:1.9;color:' + INK + ';">' +
        open + esc(text) + close + '</span></div>';
  }

  /* ── АЯТ С ОТМЕТКАМИ УЧЕНИКА ──────────────────────────────────────────
     В задании «найди в аяте» одной строчки «верно 2 из 3» мало: по ней не
     видно, ГДЕ ученик ошибся. Здесь аят показан так, как он его разметил.

     Три вида черты под словом:
       сплошная зелёная — отметил верно;
       волнистая красная — отметил там, где правила нет, или назвал не то;
       пунктирная       — место, которое он пропустил.

     Данные для этого уже приходят в разборе: ai — черты ученика
     [{words:[индексы], rule}], ci — карта верных мест {слово: [правила]}.
     Ничего досчитывать не нужно, только показать. */
  function findTargets(d) {
    const raw = d.ci || {};
    const map = {};
    Object.keys(raw).forEach(function (w) {
      const v = raw[w];
      map[w] = Array.isArray(v) ? v : [v];
    });
    return map;
  }

  function findMarked(d) {
    const ayah = ayahText(d.ay);
    if (!ayah) return '';
    const words = ayah.split(' ');
    const targets = findTargets(d);
    const strokes = Array.isArray(d.ai) ? d.ai : [];

    // что ученик отметил на каждом слове и верно ли
    const marks = {};      // индекс слова → {rule, ok}
    /* ЧЕРТА СУДИТСЯ ЦЕЛИКОМ, А НЕ ПО СЛОВАМ.
       Правило часто лежит НА СТЫКЕ: конец одного слова и начало
       следующего — так устроены икляб, идгам, ихфа. Ученик проводит одну
       черту через оба слова, и это правильный ответ.

       Раньше документ проверял каждое слово порознь. Правило записано на
       одном слове стыка, поэтому второе не находило себя среди верных и
       получало красный крест: работа выглядела наполовину ошибочной, хотя
       движок засчитал её верно. Теперь смотрим: если ХОТЬ ОДНО слово под
       чертой — нужное место, вся черта верна. */
    const covered = {};    // какие места ученик закрыл
    strokes.forEach(function (s) {
      if (!s || !Array.isArray(s.words) || !s.words.length) return;
      var good = false;
      s.words.forEach(function (w) {
        if ((targets[w] || []).indexOf(s.rule) !== -1) { good = true; covered[w] = true; }
      });
      s.words.forEach(function (w) {
        if (marks[w] && marks[w].ok) return;   // верную отметку не затираем
        marks[w] = { rule: s.rule, ok: good };
      });
    });

    /* Места, которые ученик не тронул вовсе. Считаем по закрытым местам,
       а не по «есть ли отметка на слове»: слово стыка могло попасть под
       черту соседнего правила и выглядеть тронутым, не будучи найденным. */
    const missed = {};
    Object.keys(targets).forEach(function (w) {
      if (!covered[w] && !(marks[w] && marks[w].ok)) missed[w] = true;
    });

    const html = words.map(function (word, i) {
      const key = String(i);
      const m = marks[key];
      let style = '';
      let tail = '';
      if (m && m.ok) {
        const c = ruleColor(m.rule);
        style = 'border-bottom:3px solid ' + c + ';padding-bottom:2px;';
        tail = '<span style="font-family:sans-serif;font-size:11px;color:' + c +
               ';vertical-align:super;">✓</span>';
      } else if (m) {
        style = 'border-bottom:3px wavy solid ' + ERR + ';padding-bottom:2px;color:' + ERR + ';';
        tail = '<span style="font-family:sans-serif;font-size:11px;color:' + ERR +
               ';vertical-align:super;">✗</span>';
      } else if (missed[key]) {
        style = 'border-bottom:3px dashed ' + FAINT + ';padding-bottom:2px;';
      }
      return '<span style="' + style + '">' + esc(word) + '</span>' + tail;
    }).join(' ');

    return '<div style="background:' + PAPER + ';border:1.5px solid ' + GOLD + ';border-radius:10px;' +
        'padding:10px 16px;margin:8px 0;text-align:center;direction:rtl;' +
        'box-shadow:inset 0 0 0 3px ' + PAPER + ', inset 0 0 0 4px #e6d9b8;">' +
      '<span style="font-family:' + AR + ';direction:rtl;unicode-bidi:isolate;font-size:26px;' +
        'line-height:2.4;color:' + INK + ';">' +
        '<span style="color:' + GOLD + ';">\uFD3F</span> ' + html +
        ' <span style="color:' + GOLD + ';">\uFD3E</span></span></div>';
  }

  /* Подпись под аятом: какое правило ученик назвал на каждой черте.
     Цвет черты сам по себе ничего не говорит — важно, ЧТО он там увидел. */
  function findLegend(d) {
    const targets = findTargets(d);
    const strokes = Array.isArray(d.ai) ? d.ai : [];
    const rows = [];

    strokes.forEach(function (s) {
      if (!s || !Array.isArray(s.words)) return;
      const good = s.words.some(function (w) { return (targets[w] || []).indexOf(s.rule) !== -1; });
      rows.push('<span style="color:' + (good ? OK : ERR) + ';">' +
        (good ? '✓ ' : '✗ ') + esc(ruleName(s.rule)) + '</span>');
    });

    // пропущенное
    const marked = {};
    strokes.forEach(function (s) {
      if (s && Array.isArray(s.words)) s.words.forEach(function (w) { marked[w] = true; });
    });
    Object.keys(targets).forEach(function (w) {
      if (marked[w]) return;
      targets[w].forEach(function (r) {
        rows.push('<span style="color:' + FAINT + ';">— пропущено: ' + esc(ruleName(r)) + '</span>');
      });
    });

    if (!rows.length) return '';
    return '<div style="font-size:12px;color:' + SOFT + ';margin-top:4px;' +
      'display:flex;flex-wrap:wrap;gap:10px;">' + rows.join('') + '</div>';
  }

  /* Варианты ответа — такими же кнопками, как в экзамене. Выбранный
     подсвечен, верный отмечен галочкой. Ребёнок узнаёт свой экран. */
  /* Есть ли в строке арабские буквы или знаки. */
  const RE_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function optionRow(opt, chosenId, rightId) {
    const id = (typeof opt === 'object') ? opt.id : opt;
    const label = (typeof opt === 'object') ? (opt.label || opt.id) : ruleName(opt);
    const sub = (typeof opt === 'object' && opt.sub) ? opt.sub : '';
    const isChosen = String(id) === String(chosenId);
    const isRight = String(id) === String(rightId);

    /* ВАРИАНТ МОЖЕТ БЫТЬ АРАБСКИМ.
       В заданиях о правилах вариант — русское слово («Ихфа»), и шрифт
       интерфейса подходит. В нулевом курсе вариантом бывает сама буква,
       знак или целое слово. Обычный шрифт арабскую вязь не соединяет, а
       огласовок в нём часто нет вовсе — в документе выходили разорванные
       буквы и пустые прямоугольники, из-за чего казалось, что заданий не
       видно. Арабскую строку рисуем шрифтом мусхафа и крупнее. */
    const arabic = RE_ARABIC.test(String(label));
    const labelStyle = arabic
      ? 'font-family:' + AR + ';direction:rtl;unicode-bidi:isolate;font-size:24px;line-height:1.7;'
      : 'font-size:14px;';

    let border = '#e6ded1', bg = '#fdfbf6', color = INK, mark = '';
    if (isRight) { border = OK; bg = '#e8f2ec'; color = OK; mark = '✓'; }
    if (isChosen && !isRight) { border = ERR; bg = '#f8ecec'; color = ERR; mark = '✗'; }

    return '<div style="display:flex;align-items:center;gap:10px;border:1.5px solid ' + border +
        ';background:' + bg + ';border-radius:999px;padding:6px 14px;margin-bottom:5px;">' +
      '<span style="width:13px;height:13px;border-radius:50%;border:2px solid ' +
        (isChosen ? color : '#cfc6b6') + ';background:' + (isChosen ? color : 'transparent') + ';"></span>' +
      '<span style="flex:1;' + labelStyle + 'color:' + color + ';font-weight:' +
        (isChosen || isRight ? '600' : '400') + ';">' + esc(label) +
        (sub ? '<span style="font-size:12px;color:' + FAINT + ';margin-right:8px;"> ' +
               esc(sub) + '</span>' : '') + '</span>' +
      '<span style="font-size:15px;color:' + color + ';font-weight:700;">' + mark + '</span>' +
    '</div>';
  }

  /* ── Одно задание, как оно выглядело на экране ── */
  function taskBlock(d, i) {
    const isRecite = d.ty === 'recite';
    const ok = d.ok === true;
    const right = fullTheme(d.c, d.t);
    const chosen = fullTheme(d.a, d.t);

    let head, badge, badgeColor;
    if (isRecite) {
      /* Документ собирается ПОСЛЕ проверки — значит балл уже есть, и
         писать «проверяет преподаватель» неправду нельзя. У каждого аята
         балл свой; несданная запись — ноль, и об этом сказано прямо, чтобы
         ноль не выглядел как строгая оценка за прочитанное. */
      if (d.rmiss) { badge = 'чтение не сдано: 0 из 10'; badgeColor = ERR; }
      else { badge = (d.rg != null) ? ('чтение: ' + d.rg + ' из 10') : 'чтение'; badgeColor = GOLD; }
    }
    else if (ok) { badge = 'верно'; badgeColor = OK; }
    else {
      /* ЧАСТИЧНО ВЕРНО — НЕ ОШИБКА.
         В распределении и «найди в аяте» балл начисляется за каждое верное
         место. Разложил шесть слов из восьми — получил три четверти балла.
         Подпись «ошибка» это скрывала: ученик видел красную отметку и
         думал, что задание не зачтено вовсе. Показываем, сколько сделано,
         и цветом — что сделано частично, а не провалено. */
      const p = d.pt;
      const partial = p && p.total > 0 && p.right > 0 && p.right < p.total;
      if (partial) {
        badge = 'частично верно: ' + p.right + ' из ' + p.total;
        badgeColor = GOLD;
      } else if (p && p.total > 0 && p.right === 0) {
        badge = 'ошибка: 0 из ' + p.total;
        badgeColor = ERR;
      } else {
        badge = 'ошибка';
        badgeColor = ERR;
      }
    }

    head = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
        '<span style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:' + TEAL +
          ';font-weight:600;">Задание ' + (i + 1) + '</span>' +
        '<span style="flex:1;"></span>' +
        '<span style="font-size:11px;color:' + badgeColor + ';border:1px solid ' + badgeColor +
          ';border-radius:999px;padding:2px 10px;">' + badge + '</span>' +
      '</div>';

    // сам вопрос — тем же текстом, что видел ученик
    const q = String(d.q || '').replace(/\*\*(.+?)\*\*/g,
      '<span style="color:' + ERR + ';text-decoration:underline;">$1</span>');
    const question = q ? '<div style="font-size:15px;font-weight:600;margin-bottom:6px;">' + q + '</div>' : '';

    let body = '';

    if (d.ty === 'single') {
      /* У заданий нулевого курса примера из библиотеки нет: показанный слог
         или знак собирается на месте и сохраняется в работе полем h.
         Без этого документ выходил бы с пустой рамкой вместо вопроса. */
      body = mushaf(exampleText(d.ex) || d.h || '', 32, false) +
        (Array.isArray(d.op)
          ? d.op.map(function (o) { return optionRow(o, d.ai, d.ci); }).join('')
          : '');
    } else if (d.ty === 'find') {
      body = findMarked(d) +
        '<div style="font-size:13px;color:' + (ok ? SOFT : ERR) + ';">' +
          (d.pt ? 'Найдено верно: ' + d.pt.right + ' из ' + d.pt.total +
            (d.pt.wrong ? ' · лишних отметок: ' + d.pt.wrong : '') : '') + '</div>' +
        findLegend(d);
    } else if (d.ty === 'sort') {
      body = '<div style="font-size:13px;color:' + (ok ? SOFT : ERR) + ';margin-bottom:8px;">' +
          (d.pt ? 'Разложено верно: ' + d.pt.right + ' из ' + d.pt.total : '') + '</div>' +
        (Array.isArray(d.it)
          ? '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + d.it.map(function (it) {
              return '<span style="font-family:' + AR + ';direction:rtl;font-size:19px;' +
                'background:#fdfbf4;border:1px solid #e6ded1;border-radius:8px;padding:4px 12px;">' +
                esc(it.text || exampleText(it.exampleRef)) + '</span>';
            }).join('') + '</div>'
          : '');
    } else if (isRecite) {
      body = mushaf(ayahText(d.ay), 26, true);
    }

    // объяснение — только там, где ошибся: смотреть надо туда
    let expl = '';
    if (!ok && !isRecite && ruleSign(right)) {
      expl = '<div style="margin-top:8px;padding:10px 12px;background:#f3efe6;border-radius:8px;' +
          'font-size:12px;color:' + SOFT + ';line-height:1.55;">' +
        '<b style="color:' + OK + ';">' + esc(ruleName(right)) + '.</b> ' + esc(ruleSign(right)) +
        (chosen && chosen !== right && ruleSign(chosen)
          ? '<br><br><b style="color:' + ERR + ';">Ты выбрал «' + esc(ruleName(chosen)) + '».</b> ' +
            esc(ruleSign(chosen))
          : '') +
      '</div>';
    }

    return '<div style="padding:13px 16px;margin-bottom:11px;background:#fdfbf6;' +
        'border:1px solid #ece3cf;border-radius:12px;break-inside:avoid;">' +
      head + question + body + expl +
    '</div>';
  }

  /* ── Полоска правил: сколько верно по каждому ── */
  function rulesSummary(review) {
    const by = {};
    review.forEach(function (d) {
      if (d.ty === 'recite' || d.ty === 'sort' || d.ty === 'find') return;
      const t = d.t;
      if (!by[t]) by[t] = { ok: 0, total: 0 };
      by[t].total++; if (d.ok) by[t].ok++;
    });
    const keys = Object.keys(by);
    if (!keys.length) return '';
    return '<div style="margin:18px 0 6px;">' +
      '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:' + FAINT +
        ';margin-bottom:10px;">Результат по правилам</div>' +
      keys.map(function (t) {
        const v = by[t], pct = Math.round((v.ok / v.total) * 100);
        return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:' + ruleColor(t) + ';"></span>' +
          '<span style="flex:1;font-size:13px;color:' + INK + ';">' + esc(ruleName(t)) + '</span>' +
          '<span style="width:150px;height:7px;background:#ece3cf;border-radius:4px;overflow:hidden;">' +
            '<span style="display:block;height:100%;width:' + pct + '%;background:' + ruleColor(t) + ';"></span>' +
          '</span>' +
          '<span style="width:52px;text-align:right;font-size:13px;color:' + SOFT + ';">' +
            v.ok + ' / ' + v.total + '</span>' +
        '</div>';
      }).join('') + '</div>';
  }

  /* ── Шапка первой страницы ──────────────────────────────────────────
     Сведения о работе стоят СПИСКОМ, строка под строкой: ученик, группа,
     сдано, преподаватель. Раньше они шли одной строкой через точки и
     растягивали верх страницы, а имя преподавателя вообще пряталось внизу
     каждой страницы — искать его приходилось глазами. Теперь всё, что
     нужно знать о работе, читается в одном месте сверху. */
  function header(r, teacherName, examTitle) {
    function row(label, value) {
      if (!value) return '';
      return '<div style="display:flex;gap:10px;margin-bottom:5px;">' +
        '<span style="width:120px;font-size:12px;color:' + FAINT + ';">' + label + '</span>' +
        '<span style="flex:1;font-size:13px;color:' + INK + ';font-weight:600;">' + esc(value) + '</span>' +
      '</div>';
    }
    var when = String(r.date || '') + (r.time ? ' · ' + String(r.time) : '');
    return '<div style="padding-bottom:14px;border-bottom:2px solid ' + GOLD + ';">' +
        '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:' + TEAL +
          ';font-weight:600;margin-bottom:12px;">' + esc(examTitle || 'Работа по таджвиду') + '</div>' +
        row('Ученик', r.fullName || '—') +
        row('Группа', r.group || '') +
        row('Сдано', when) +
        row('Преподаватель', teacherName || '') +
      '</div>';
  }

  /* ── Балл с раскладом ── */
  function scoreBlock(r) {
    const total = (r._total != null) ? r._total : null;
    const test = (r.autoScore != null && r.autoScore !== '') ? Math.round(Number(r.autoScore)) : null;
    const reading = (r._reading != null) ? Math.round(r._reading / 10) : null;

    return '<div style="text-align:center;margin:20px 0;padding:18px;background:#f3efe6;border-radius:12px;">' +
      '<div style="font-size:44px;font-weight:700;color:' + TEAL + ';line-height:1;">' +
        (total != null ? total : '—') +
        '<span style="font-size:20px;color:' + SOFT + ';">/100</span></div>' +
      '<div style="font-size:12px;color:' + SOFT + ';margin-top:8px;">' +
        (test != null ? 'тест ' + test + ' × 80%' : '') +
        (reading != null ? ' · чтение ' + reading + '/10 × 20%' : '') +
      '</div>' +
    '</div>';
  }

  /* Низ страницы. Имя преподавателя отсюда убрано: оно теперь стоит в
     шапке первой страницы, а повторяться на каждой ему незачем. */
  function footer() {
    return '<div style="margin-top:auto;padding-top:14px;border-top:1px solid #ece3cf;text-align:center;">' +
        '<div style="color:' + GOLD + ';font-size:14px;">۞</div>' +
      '</div>';
  }

  function pageWrap(inner) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + PAGE_W + 'px;min-height:' + PAGE_H +
      'px;background:' + PAPER + ';padding:44px 48px;box-sizing:border-box;' +
      'font-family:Inter,system-ui,sans-serif;color:' + INK + ';display:flex;flex-direction:column;';
    d.innerHTML = inner;
    document.body.appendChild(d);
    return d;
  }

  /* ── Собрать документ на одного ученика ── */
  function buildDoc(r, teacherName) {
    let review = [];
    if (Array.isArray(r.review)) review = r.review;
    else { try { review = r.review ? JSON.parse(r.review) : []; } catch (e) { review = []; } }

    /* Балл за чтение — У КАЖДОГО АЯТА СВОЙ.
       Преподаватель слушает записи по отдельности и ставит разные баллы;
       раньше документ подставлял во все карточки одно среднее число, и
       работа с оценками 7 и 8 показывала «8 из 10» дважды. Смысл раздельной
       проверки при этом пропадал.

       Берём балл по аяту задания. Если для аята записи нет — ученик его не
       сдал, и это ноль, а не «ждёт проверки»: то же правило, что и в общем
       подсчёте. Если поаятных баллов нет вовсе (старая работа), возвращаемся
       к среднему — иначе документы прошлых работ остались бы без оценки. */
    const byAyah = r._readingByAyah || {};
    const hasPerAyah = Object.keys(byAyah).length > 0;
    const avgGrade = (r._reading != null) ? Math.round(r._reading / 10) : null;

    if (hasPerAyah || avgGrade != null) {
      review = review.map(function (d) {
        if (d.ty !== 'recite') return d;
        let g = null, missing = false;
        if (hasPerAyah) {
          if (d.ay && byAyah[d.ay] != null) g = byAyah[d.ay];
          else if (d.ay) { g = 0; missing = true; }
          else g = avgGrade;                 // аят не записан в разборе
        } else {
          g = avgGrade;
        }
        return Object.assign({}, d, { rg: g, rmiss: missing });
      });
    }

    // Первая страница: шапка, балл, полоска правил, сколько влезет заданий.
    // Дальше — по 11 заданий на страницу.
    /* Карточки крупные — арабское слово в рамке, варианты ответа, объяснение.
       На первую страницу помещается меньше: там ещё шапка и балл. */
    /* ПЕРВАЯ СТРАНИЦА — ТИТУЛЬНАЯ, БЕЗ ЗАДАНИЙ.
       На ней шапка, балл и полоска «Результат по правилам». Заданий тут
       больше нет: полоска растёт вместе с числом тем, и страница
       перерастала лист — тем сильнее, чем полнее была контрольная.
       Теперь её высота предсказуема при любом составе работы.

       Разбор начинается со второй страницы, по три задания на лист. */
    /* ── СКОЛЬКО ЗАДАНИЙ ВЛЕЗЕТ НА СТРАНИЦУ ────────────────────────────
       Раньше на лист ставилось ровно три задания, каким бы ни был их
       размер. Из-за этого чтение аята — а это две строки, вопрос и рамка —
       занимало треть листа, и рядом оставалось пустое место, куда легко
       вставало бы ещё одно такое же.

       Теперь у каждого задания своя мера высоты, и лист наполняется, пока
       есть место. Мера примерная: точную высоту знает только браузер, а
       считать её пришлось бы отрисовкой каждой страницы дважды. Числа
       взяты с запасом — лучше оставить поле внизу, чем срезать задание. */
    const PAGE_ROOM = 100;          // условная вместимость листа

    /* Мера высоты у каждого вида своя. Вопрос с четырьмя вариантами —
       треть листа, это опора шкалы; остальное посчитано от него и
       поправлено по тому, как документы вышли на деле. */
    function taskCost(d) {
      /* Числа выверены глазами по готовым документам: пять заданий чтения
         и четыре «найди» умещаются на лист свободно. Прежние меры были
         осторожнее — и внизу оставалось пустое поле. */
      if (d.ty === 'recite') return 19;   // вопрос и аят в рамке — и всё
      if (d.ty === 'find')   return 24;   // аят, отметки ученика и подписи
      if (d.ty === 'sort') {
        // коробки идут столбиком: чем больше правил, тем задание выше
        var boxes = Array.isArray(d.gr) ? d.gr.length : 3;
        return 10 + boxes * 6;
      }
      // вопрос: заголовок, пример и кнопки вариантов
      var opts = Array.isArray(d.op) ? d.op.length : 4;
      return 15 + opts * 4.5;
    }

    const pages = [];
    pages.push(
      header(r, teacherName, r.exam) +
      scoreBlock(r) +
      rulesSummary(review) +
      footer()
    );
    /* Раскладываем задания по листам: набираем, пока помещается. */
    const chunks = [];
    let cur = [], room = PAGE_ROOM;
    review.forEach(function (d) {
      const cost = taskCost(d);
      if (cur.length && cost > room) { chunks.push(cur); cur = []; room = PAGE_ROOM; }
      cur.push(d);
      room -= cost;
    });
    if (cur.length) chunks.push(cur);

    chunks.forEach(function (chunk, ci) {
      const from = chunks.slice(0, ci).reduce(function (n, c) { return n + c.length; }, 0);
      pages.push(
        '<div style="font-size:12px;color:' + FAINT + ';margin-bottom:14px;">' +
          esc(r.fullName || '') + ' · ' + esc(r.exam || '') + '</div>' +
        // заголовок раздела — только над первой страницей разбора
        (ci === 0
          ? '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:' +
            FAINT + ';margin-bottom:10px;">Разбор работы</div>'
          : '') +
        '<div>' + chunk.map(function (d, k) {
          return taskBlock(d, from + k);       // сквозная нумерация заданий
        }).join('') + '</div>' +
        footer()
      );
    });
    return pages;
  }

  /* ── Нарисовать страницы и сложить в PDF ── */
  function renderPdf(r, teacherName) {
    const pages = buildDoc(r, teacherName);
    const nodes = pages.map(pageWrap);

    return Promise.all(nodes.map(function (n) {
      /* Плотность снимка. Двойная давала очень чёткую, но тяжёлую картинку:
         работа на десяток страниц выходила в несколько мегабайт, а по почте
         и в мессенджере это уже неудобно. Полторы читаются так же хорошо —
         арабская вязь остаётся резкой, — а файл становится примерно вдвое
         легче. Ниже опускать нельзя: огласовки начинают мылиться. */
      return html2canvas(n, { backgroundColor: PAPER, scale: 1.5 });
    })).then(function (canvases) {
      nodes.forEach(function (n) { document.body.removeChild(n); });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      canvases.forEach(function (c, i) {
        if (i) pdf.addPage();

        /* ВПИСЫВАЕМ, СОХРАНЯЯ ПРОПОРЦИИ.
           Раньше ширина ставилась во весь лист всегда, а высота обрезалась
           по листу. Стоило странице перерасти лист — и снимок сплющивался
           по вертикали: буквы становились приземистыми. Первая страница
           перерастала чаще других, там сверх заданий стоят шапка, балл и
           полоска правил.

           Теперь берём меньший из двух масштабов — по ширине и по высоте.
           Содержимое может стать чуть мельче, но форму не потеряет
           никогда. Если осталось поле, ставим снимок по центру. */
        var scale = Math.min(W / c.width, H / c.height);
        var w = c.width * scale;
        var h = c.height * scale;
        var x = (W - w) / 2;      // если осталось поле по бокам — по центру

        /* Сжатие 0.82 вместо 0.92: на глаз неотличимо, вес заметно меньше.
           Текст на снимке крупный и контрастный, ему такое сжатие не вредит. */
        pdf.addImage(c.toDataURL('image/jpeg', 0.82), 'JPEG', x, 0, w, h);
      });
      return pdf;
    }).catch(function (err) {
      nodes.forEach(function (n) { if (n.parentNode) document.body.removeChild(n); });
      throw err;
    });
  }

  function safeName(s) {
    return String(s || '').replace(/[\\/:*?"<>|]+/g, '-').trim();
  }

  /* ── Публичная граница ── */
  window.WorkDoc = {
    /* Только для проверки: отдать разметку задания «найди» как HTML. */
    _findPreview: function (d) { return findMarked(d) + findLegend(d); },

    /* Готов ли документ: балл должен быть окончательным.
       Ждёт чтения или чтение не сдано — документа нет. */
    ready: function (r) {
      return !!r && r._total != null && !r._waiting;
    },

    // Скачать документ одного ученика
    save: function (r, teacherName) {
      return ensureTools().then(function () {
        return renderPdf(r, teacherName || 'Преподаватель');
      }).then(function (pdf) {
        pdf.save(safeName(r.fullName) + ' — ' + safeName(r.exam || 'Работа') + '.pdf');
        return { ok: true };
      }).catch(function (err) {
        return { ok: false, error: String(err) };
      });
    },

    /* Скачать документы всех учеников подряд. Экзамен редок, а раздавать
       надо всем сразу — двадцать нажатий никому не нужны.
       Идём по одному: рисование страниц тяжёлое, разом браузер не тянет. */
    saveAll: function (list, teacherName, onProgress) {
      const queue = list.filter(window.WorkDoc.ready);
      if (!queue.length) return Promise.resolve({ ok: false, error: 'нет готовых работ' });
      let done = 0, failed = 0;

      return ensureTools().then(function () {
        return queue.reduce(function (chain, r) {
          return chain.then(function () {
            if (onProgress) onProgress(done + failed + 1, queue.length, r.fullName);
            return renderPdf(r, teacherName || 'Преподаватель').then(function (pdf) {
              pdf.save(safeName(r.fullName) + ' — ' + safeName(r.exam || 'Работа') + '.pdf');
              done++;
            }).catch(function () { failed++; });
          });
        }, Promise.resolve());
      }).then(function () {
        return { ok: true, done: done, failed: failed };
      });
    },
  };
})();
