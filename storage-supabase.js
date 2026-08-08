/* ══════════════════════════════════════════════════════════════════════
   ХРАНИЛИЩЕ — Supabase
   ══════════════════════════════════════════════════════════════════════
   Замена storage.js. Граница та же самая: панель и экзамен вызывают
   StorageAPI.results.list(), StorageAPI.sessions.open() и так далее — и
   не знают, что под ними поменялось. Ради этого слой и делался.

   Чем отличается от Apps Script:
   • отвечает за десятки миллисекунд, а не за секунды, и не засыпает;
   • ответ читается сразу — не нужно перечитывать список, чтобы узнать,
     записалось ли;
   • запись голоса лежит в хранилище и играется по прямой ссылке, без
     посредника — то, из-за чего мы мучились с Google Диском.

   Ключ ниже лежит открыто и это нормально: он для того и предназначен.
   Кто что может делать, решает не он, а правила доступа в самой базе.
────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://ullxrzxoscdpftbatltu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qNR6uaRvK0lWwrhVHiIV4w_ru7WcUw9';

  const REST = SUPABASE_URL + '/rest/v1/';
  const BUCKET = 'recordings';

  /* ── КТО ОБРАЩАЕТСЯ К БАЗЕ ────────────────────────────────────────
     Ключ ниже одинаков у всех — он лежит в коде страницы, спрятать его
     нельзя. Поэтому база различает не по ключу, а по входу: пока входа
     нет, обращение считается ученическим и права у него ученические.
     Преподаватель входит по паролю и получает пропуск на время работы.

     Пропуск хранится в самом браузере: закрыл вкладку — вошёл заново.
     Так безопаснее, чем помнить его вечно. */
  const TOKEN_KEY = 'tajweed_teacher_token';
  const REFRESH_KEY = 'tajweed_teacher_refresh';

  /* Пропуск помним НА УСТРОЙСТВЕ, а не до закрытия вкладки: преподаватель
     заходит с телефона и с компьютера по многу раз в день, и вводить пароль
     каждый раз — мучение. Хранится он в памяти самого браузера, на чужом
     устройстве не появится.

     Сам пропуск живёт около часа, поэтому рядом храним второй ключ —
     обменный. По нему браузер молча получает новый пропуск, и вход
     держится неделями. Кнопка «Выйти» стирает оба. */
  function savedToken() {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
  }

  function savedRefresh() {
    try { return localStorage.getItem(REFRESH_KEY) || null; } catch (e) { return null; }
  }

  function storeTokens(r) {
    try {
      if (r.access_token) localStorage.setItem(TOKEN_KEY, r.access_token);
      if (r.refresh_token) localStorage.setItem(REFRESH_KEY, r.refresh_token);
    } catch (e) {}
  }

  function clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(TOKEN_KEY);      // остатки прежнего способа
    } catch (e) {}
  }

  /* Обновить просроченный пропуск по обменному ключу. Возвращает true,
     если получилось: тогда можно повторить неудавшийся запрос. */
  function refreshToken() {
    const rt = savedRefresh();
    if (!rt) return Promise.resolve(false);
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then(r => r.json())
      .then(function (r) {
        if (r && r.access_token) { storeTokens(r); return true; }
        clearTokens();                            // обменный ключ протух
        return false;
      })
      .catch(function () { return false; });
  }

  function authHeader() {
    return 'Bearer ' + (savedToken() || SUPABASE_KEY);
  }

  function headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    };
  }



  /* ── Общение с базой ──────────────────────────────────────────────
     Пустой список и «не смог получить» — разные вещи, и панель должна
     их различать: в первом случае честное «пока пусто», во втором —
     «попробуйте ещё раз». Помечаем массив свойством failed. */
  function fail(err) {
    const empty = [];
    empty.failed = true;
    empty.error = String(err);
    return empty;
  }

  function query(table, params) {
    const url = new URL(REST + table);
    if (params) Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    return fetch(url.toString(), { headers: headers() })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .catch(fail);
  }

  function write(table, rows, extraPrefer) {
    return fetch(REST + table, {
      method: 'POST',
      headers: Object.assign({}, headers(), {
        'Prefer': 'return=representation' + (extraPrefer ? ',' + extraPrefer : ''),
      }),
      body: JSON.stringify(rows),
    })
      .then(function (r) {
        if (!r.ok) return r.text().then(t => ({ ok: false, error: t || ('HTTP ' + r.status) }));
        return r.json().then(data => ({ ok: true, data: data }));
      })
      .catch(err => ({ ok: false, error: String(err) }));
  }

  function patch(table, match, values) {
    const url = new URL(REST + table);
    Object.keys(match).forEach(k => url.searchParams.set(k, 'eq.' + match[k]));
    return fetch(url.toString(), {
      method: 'PATCH',
      headers: Object.assign({}, headers(), { 'Prefer': 'return=representation' }),
      body: JSON.stringify(values),
    })
      .then(r => r.ok ? { ok: true } : { ok: false, error: 'HTTP ' + r.status })
      .catch(err => ({ ok: false, error: String(err) }));
  }

  function remove(table, match) {
    const url = new URL(REST + table);
    Object.keys(match).forEach(k => url.searchParams.set(k, 'eq.' + match[k]));
    return fetch(url.toString(), { method: 'DELETE', headers: headers() })
      .then(r => r.ok ? { ok: true } : { ok: false, error: 'HTTP ' + r.status })
      .catch(err => ({ ok: false, error: String(err) }));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Перевод между видом базы и видом платформы ───────────────────
     В базе принято писать имена через подчёркивание, в платформе — слитно.
     Панель и экзамен ждут привычных названий (fullName, sessionId), и
     менять их ради базы было бы неправильно: хвост завилял бы собакой. */
  function pad(n) { return ('0' + n).slice(-2); }

  function toDate(iso) {
    const d = new Date(iso);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function toTime(iso) {
    const d = new Date(iso);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function resultOut(r) {
    return {
      id: r.id, row: r.id,
      date: toDate(r.created_at), time: toTime(r.created_at),
      fullName: r.full_name, group: r.group_name,
      autoScore: r.auto_score, answered: r.answered, total: r.total,
      duration: r.duration, exam: r.exam_title,
      // Разбор отдаём как есть: панель принимает и список, и строку.
      review: r.review || null,
      sessionId: r.session_id,
    };
  }

  function recordingOut(r) {
    return {
      id: r.id, row: r.id,
      date: toDate(r.created_at), time: toTime(r.created_at),
      fullName: r.full_name, group: r.group_name,
      ayahId: r.ayah_id, ayahText: r.ayah_text, exam: r.exam_title,
      url: publicUrl(r.file_path), filePath: r.file_path,
      grade: (r.grade === null || r.grade === undefined) ? '' : r.grade,
      sessionId: r.session_id,
    };
  }

  /* Обратное превращение: из ссылки обратно в путь к файлу. */
  function pathFromUrl(url) {
    const mark = '/object/public/' + BUCKET + '/';
    const i = String(url || '').indexOf(mark);
    return i === -1 ? String(url || '') : decodeURIComponent(String(url).slice(i + mark.length));
  }

  function publicUrl(path) {
    return SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path;
  }

  /* ── Публичная граница. ТОЛЬКО это видит панель. ── */
  window.StorageAPI = {

    activities: {
      list: function () {
        return query('activities', { select: '*', order: 'created_at.desc' })
          .then(function (rows) {
            if (rows.failed) return rows;
            return rows.map(r => Object.assign({ id: r.id, title: r.title, type: r.type }, r.data));
          });
      },
      get: function (id) {
        return query('activities', { select: '*', id: 'eq.' + id })
          .then(function (rows) {
            if (rows.failed || !rows.length) return null;
            const r = rows[0];
            return Object.assign({ id: r.id, title: r.title, type: r.type }, r.data);
          });
      },
      save: function (activity) {
        if (!activity.id) activity.id = uid('act');
        const row = {
          id: activity.id, title: activity.title || '', type: activity.type || 'exam',
          data: activity,
        };
        // on_conflict — чтобы правка существующей активности не создавала вторую
        return write('activities', [row], 'resolution=merge-duplicates')
          .then(function (res) { res.activity = activity; return res; });
      },
      remove: function (id) {
        return remove('activities', { id: id });
      },
    },

    sessions: {
      list: function () {
        return query('sessions', { select: '*', order: 'opened_at.desc' })
          .then(function (rows) {
            if (rows.failed) return rows;
            return rows.map(s => ({
              id: s.id, activityId: s.activity_id, group: s.group_name,
              status: s.status, openedAt: s.opened_at, closedAt: s.closed_at,
            }));
          });
      },
      get: function (id) {
        return query('sessions', { select: '*', id: 'eq.' + id })
          .then(function (rows) {
            if (rows.failed || !rows.length) return null;
            const s = rows[0];
            return {
              id: s.id, activityId: s.activity_id, group: s.group_name,
              status: s.status, openedAt: s.opened_at, closedAt: s.closed_at,
            };
          });
      },
      open: function (activityId, group) {
        const session = { id: uid('ses'), activityId: activityId, group: group, status: 'open' };
        return write('sessions', [{
          id: session.id, activity_id: activityId, group_name: group, status: 'open',
        }]).then(function (res) { res.session = session; return res; });
      },
      close: function (id) {
        return patch('sessions', { id: id }, { status: 'closed', closed_at: new Date().toISOString() });
      },
      remove: function (id) {
        return remove('sessions', { id: id });
      },
    },

    results: {
      list: function () {
        return query('results', { select: '*', order: 'created_at.desc', limit: '500' })
          .then(rows => rows.failed ? rows : rows.map(resultOut));
      },
      // Отправка работы ученика
      send: function (payload) {
        /* Имена полей берём ровно те, что шлёт движок: durationText, а не
           duration; totalQuestions, а не total. Из-за этой мелочи работа
           записывалась наполовину — без разбора и без длительности, а в
           панели выглядела как «старый результат без деталей». */
        let review = payload.review;
        if (typeof review === 'string') {
          try { review = JSON.parse(review); } catch (e) { review = null; }
        }
        return write('results', [{
          session_id: payload.sessionId || null,
          full_name: payload.fullName, group_name: payload.group,
          auto_score: payload.autoScore,
          answered: payload.answered,
          total: payload.totalQuestions != null ? payload.totalQuestions : payload.total,
          duration: payload.durationText || payload.duration || '',
          exam_title: payload.examTitle || payload.exam,
          review: review || null,
        }]);
      },
      remove: function (r) {
        return remove('results', { id: r.id != null ? r.id : r.row });
      },
    },

    recordings: {
      list: function () {
        return query('recordings', { select: '*', order: 'created_at.desc', limit: '500' })
          .then(rows => rows.failed ? rows : rows.map(recordingOut));
      },

      /* Отправка записи чтения. Файл кладётся в хранилище, в таблицу
         идёт путь к нему. Имя пути включает сессию, ученика и аят —
         тогда перезапись ложится ПОВЕРХ прежней, а не рядом: ребёнок
         вправе считать, что старый вариант исчез. */
      send: function (meta, blob) {
        /* В пути к файлу — только латиница, цифры и дефис: хранилище не
           принимает кириллицу в именах, и запись молча не загружалась.
           Имя ученика заменяем на короткий отпечаток от него: файлы
           разных учеников не столкнутся, а само имя всё равно хранится
           в таблице, рядом. */
        const stamp = str => {
          let h = 0;
          const v = String(str || '');
          for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
          return h.toString(36);
        };
        const safe = s => String(s || '').replace(/[^A-Za-z0-9_-]+/g, '-')
                                         .replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
        const path = [safe(meta.sessionId), stamp(meta.fullName), safe(meta.ayahId)].join('/')
                   + '.' + (blob.type.indexOf('mp4') !== -1 ? 'm4a' : 'webm');

        return fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': blob.type || 'audio/webm',
            'x-upsert': 'true',              // перезапись заменяет прежнюю
          },
          body: blob,
        })
          .then(function (r) {
            if (!r.ok) return { ok: false, error: 'загрузка файла: HTTP ' + r.status };
            return write('recordings', [{
              session_id: meta.sessionId || null,
              full_name: meta.fullName, group_name: meta.group,
              ayah_id: meta.ayahId, ayah_text: meta.ayahText,
              exam_title: meta.examTitle || meta.exam,
              file_path: path,
              grade: null,                   // балл сбрасывается: это другое чтение
            }], 'resolution=merge-duplicates');
          })
          .catch(err => ({ ok: false, error: String(err) }));
      },

      /* Запись играется по прямой ссылке — посредник не нужен.
         Оставлено ради совместимости с панелью. */
      audio: function (idOrPath, url) {
        // ссылка уже готова — панель получает её и отдаёт плееру
        return Promise.resolve({ ok: true, directUrl: url || idOrPath });
      },

      /* Панель опознаёт запись по ссылке — так повелось со времён Диска.
         Достаём из ссылки путь к файлу и правим строку по нему: искать по
         внутреннему номеру нельзя, панель его не передаёт. */
      grade: function (idOrUrl, grade) {
        const match = (typeof idOrUrl === 'object')
          ? { id: idOrUrl.id }
          : { file_path: pathFromUrl(idOrUrl) };
        return patch('recordings', match, { grade: grade })
          .then(res => (res.ok ? { ok: true, grade: grade } : res));
      },

      remove: function (rec) {
        const path = (typeof rec === 'object')
          ? (rec.filePath || pathFromUrl(rec.url))
          : pathFromUrl(rec);
        return fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
          method: 'DELETE', headers: headers(),
        })
          .catch(function () { /* файла может уже не быть — не беда */ })
          .then(function () {
            return (typeof rec === 'object' && rec.id != null)
              ? remove('recordings', { id: rec.id })
              : remove('recordings', { file_path: path });
          });
      },
    },

    /* ── ВХОД ПРЕПОДАВАТЕЛЯ ──────────────────────────────────────────
       Пока не вошёл — панель показывает только экран входа, а база и не
       отдаст ей ничего: права ученические. */
    auth: {
      signIn: function (email, password) {
        return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(r => r.json())
          .then(function (r) {
            if (!r || !r.access_token) {
              return { ok: false, error: (r && (r.error_description || r.msg)) || 'не удалось войти' };
            }
            storeTokens(r);
            return { ok: true };
          })
          .catch(err => ({ ok: false, error: String(err) }));
      },
      signOut: function () {
        clearTokens();
        return Promise.resolve({ ok: true });
      },
      // молча продлить вход — вызывается панелью при запуске
      refresh: refreshToken,
      isSignedIn: function () { return !!savedToken(); },

      /* Действителен ли пропуск ПРЯМО СЕЙЧАС.
         Нужна отдельная проверка, потому что истёкший пропуск не даёт
         ошибки: база честно отвечает «200» и пустым списком — правило
         доступа просто не выполняется. Панель принимала это за «работ
         нет» и показывала пустые разделы, хотя работы были на месте. */
      check: function () {
        const t = savedToken();
        if (!t) return Promise.resolve(false);
        return fetch(SUPABASE_URL + '/auth/v1/user', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + t },
        })
          .then(r => r.ok)
          .catch(() => false);
      },
    },

    // Служебное: доступно ли хранилище
    ping: function () {
      return query('activities', { select: 'id', limit: '1' })
        .then(r => ({ ok: !r.failed }));
    },
  };
})();
