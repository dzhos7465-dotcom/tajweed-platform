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
    return Promise.all(need);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function ruleName(id) {
    return (typeof THEMES !== 'undefined' && THEMES[id]) ? THEMES[id].name : id;
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

  /* ── Разметка одной карточки задания ── */
  function taskBlock(d, i) {
    const typeLabel = TYPE_LABEL[d.ty];
    const right = fullTheme(d.c, d.t);
    const chosen = fullTheme(d.a, d.t);
    const isRecite = d.ty === 'recite';
    const ok = d.ok === true;

    let mark, markColor;
    if (isRecite) { mark = 'чтение'; markColor = GOLD; }
    else if (ok) { mark = '✓'; markColor = OK; }
    else { mark = '✗'; markColor = ERR; }

    let body = '';
    if (isRecite) {
      body = '<div style="color:' + SOFT + ';font-size:13px;">Оценивает преподаватель</div>';
    } else if (d.pt && d.pt.total) {
      body = '<div style="color:' + (d.pt.right === d.pt.total ? SOFT : ERR) + ';font-size:13px;">' +
        'верно ' + d.pt.right + ' из ' + d.pt.total +
        (d.pt.wrong ? ' · лишних отметок: ' + d.pt.wrong : '') + '</div>';
    } else if (!ok) {
      body =
        '<div style="font-size:13px;margin-bottom:2px;">' +
          '<span style="color:' + ERR + ';">Твой ответ: ' + esc(d.a || 'нет ответа') + '</span>' +
        '</div>' +
        '<div style="font-size:13px;"><span style="color:' + OK + ';">Верно: ' +
          esc(ruleName(right)) + '</span></div>' +
        (ruleSign(right)
          ? '<div style="margin-top:6px;padding:8px 10px;background:#f3efe6;border-radius:6px;' +
            'font-size:12px;color:' + SOFT + ';line-height:1.5;">' + esc(ruleSign(right)) +
            (chosen && chosen !== right && ruleSign(chosen)
              ? '<br><br>Ты выбрал «' + esc(ruleName(chosen)) + '»: ' + esc(ruleSign(chosen))
              : '') +
            '</div>'
          : '');
    } else {
      body = '<div style="font-size:13px;color:' + SOFT + ';">' + esc(d.a || '') + '</div>';
    }

    const title = typeLabel || ruleName(d.t);
    const color = typeLabel ? TEAL : ruleColor(d.t);

    return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #ece3cf;">' +
      '<div style="width:26px;color:' + FAINT + ';font-size:13px;flex-shrink:0;">' + (i + 1) + '</div>' +
      '<div style="flex:1;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:' + color + ';"></span>' +
          '<b style="font-size:14px;color:' + INK + ';">' + esc(title) + '</b>' +
        '</div>' + body +
      '</div>' +
      '<div style="width:52px;text-align:right;color:' + markColor + ';font-weight:700;' +
        'font-size:' + (isRecite ? '12px' : '17px') + ';flex-shrink:0;">' + mark + '</div>' +
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

  /* ── Шапка ── */
  function header(r, teacherName, examTitle) {
    return '<div style="text-align:center;padding-bottom:18px;border-bottom:2px solid ' + GOLD + ';">' +
        '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:' + TEAL +
          ';font-weight:600;">' + esc(examTitle || 'Работа по таджвиду') + '</div>' +
        '<div style="font-size:26px;font-weight:700;color:' + INK + ';margin:8px 0 4px;">' +
          esc(r.fullName || '—') + '</div>' +
        '<div style="font-size:13px;color:' + SOFT + ';">' +
          esc(r.group || '') + ' · ' + esc(r.date || '') + (r.time ? ' · ' + esc(r.time) : '') + '</div>' +
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

  function footer(teacherName) {
    return '<div style="margin-top:auto;padding-top:16px;border-top:1px solid #ece3cf;text-align:center;">' +
        '<div style="color:' + GOLD + ';font-size:15px;margin-bottom:4px;">۞</div>' +
        '<div style="font-size:12px;color:' + FAINT + ';">' + esc(teacherName) +
          ' · преподаватель таджвида</div>' +
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

    // Первая страница: шапка, балл, полоска правил, сколько влезет заданий.
    // Дальше — по 11 заданий на страницу.
    const FIRST = 6, REST = 11;
    const pages = [];
    pages.push(
      header(r, teacherName, r.exam) +
      scoreBlock(r) +
      rulesSummary(review) +
      '<div style="margin-top:14px;">' +
        '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:' + FAINT +
          ';margin-bottom:6px;">Разбор работы</div>' +
        review.slice(0, FIRST).map(taskBlock).join('') +
      '</div>' +
      footer(teacherName)
    );
    for (let i = FIRST; i < review.length; i += REST) {
      pages.push(
        '<div style="font-size:12px;color:' + FAINT + ';margin-bottom:14px;">' +
          esc(r.fullName || '') + ' · ' + esc(r.exam || '') + '</div>' +
        '<div>' + review.slice(i, i + REST).map(function (d, k) {
          return taskBlock(d, i + k);
        }).join('') + '</div>' +
        footer(teacherName)
      );
    }
    return pages;
  }

  /* ── Нарисовать страницы и сложить в PDF ── */
  function renderPdf(r, teacherName) {
    const pages = buildDoc(r, teacherName);
    const nodes = pages.map(pageWrap);

    return Promise.all(nodes.map(function (n) {
      return html2canvas(n, { backgroundColor: PAPER, scale: 2 });
    })).then(function (canvases) {
      nodes.forEach(function (n) { document.body.removeChild(n); });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      canvases.forEach(function (c, i) {
        if (i) pdf.addPage();
        const h = Math.min(H, (c.height / c.width) * W);
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, h);
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
