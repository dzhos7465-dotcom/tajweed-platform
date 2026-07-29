/* ══════════════════════════════════════════════════════════════════════
   STORAGE API — граница между панелью и хранилищем
   ──────────────────────────────────────────────────────────────────────
   ГЛАВНЫЙ ПРИНЦИП (по требованию преподавателя): панель НЕ знает, где
   хранятся данные. Она обращается только к этому storage-объекту:
     storage.activities.list()  — дай активности
     storage.activities.save(a) — сохрани активность
     storage.sessions.list()    — дай сессии
     ...
   А КАК и ГДЕ это делается — знает только реализация внутри. Сегодня за
   границей Google Apps Script; завтра можно поставить Firebase/Supabase/
   свою БД, переписав ТОЛЬКО этот файл. Панель не заметит разницы.

   Это тот же закон, что во всём проекте: спрашивать через границу,
   не знать напрямую.

   ── Структура объектов (не JSON-свалка, а поля) ──
   Активность: { id, title, type, mode, timeLimit, themes[], recite[], createdAt }
     type  — 'exam' | 'training' | 'homework' | 'review' | ...
     themes — [{ theme, count }]   (тема + сколько вопросов)
     recite — [ayahId, ...]        (аяты для чтения)
   Сессия:    { id, activityId, group, status, openedAt, closedAt, link }
     status — 'open' | 'closed'
────────────────────────────────────────────────────────────────────── */

const StorageAPI = (function () {
  'use strict';

  // ── Адрес хранилища. Сейчас — Google Apps Script. Позже сюда встанет
  //    другой backend, и это ЕДИНСТВЕННОЕ, что изменится снаружи. ──
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwNjWb6EkWQQksqlry0hFgecagXh5L4lb-e3EISN7YSvxtF34yJ0f7xAjsJQEPycxxD/exec';

  /* Низкоуровневые запросы к backend. Наружу не торчат — панель их не видит.
     Всё общение идёт через них, поэтому смена backend = правка только тут. */
  /* Сколько ждём ответ, прежде чем считать, что связи нет.
     Google Apps Script после простоя «просыпается» медленно, поэтому
     запас большой. Но ждать бесконечно нельзя: без этого панель просто
     висит на «Загрузка…» и преподаватель не понимает, что произошло. */
  const REQUEST_TIMEOUT_MS = 25000;

  function backendGet(action, params) {
    const url = new URL(BACKEND_URL);
    url.searchParams.set('action', action);
    if (params) Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, REQUEST_TIMEOUT_MS);

    return fetch(url.toString(), ctrl ? { signal: ctrl.signal } : undefined)
      .then(r => r.json())
      .then(function (r) { clearTimeout(timer); return r; })
      .catch(function (err) {
        clearTimeout(timer);
        return { ok: false, error: String(err) };
      });
  }

  /* Пустой список и «не смог получить» — разные вещи, и панель должна
     их различать: в первом случае честное «пока пусто», во втором —
     «попробуйте ещё раз». Помечаем массив свойством failed; для всех,
     кто просто смотрит на длину, ничего не меняется. */
  function listOrFail(r, key) {
    if (r && r.ok) return r[key] || [];
    const empty = [];
    empty.failed = true;
    empty.error = (r && r.error) || 'нет ответа';
    return empty;
  }

  function backendPost(kind, payload) {
    const body = Object.assign({ kind: kind }, payload);
    return fetch(BACKEND_URL, {
      method: 'POST',
      mode: 'no-cors',                       // Apps Script не отдаёт CORS-заголовки
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    })
      .then(() => ({ ok: true }))            // no-cors: ответ не читаем, считаем успехом
      .catch(err => ({ ok: false, error: String(err) }));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* ── Публичная граница. ТОЛЬКО это видит панель. ──
     Обрати внимание: методы описаны по СМЫСЛУ (сохрани активность),
     а не по способу (запиши строку в Google). Способ спрятан выше. */
  return {
    // Активности
    activities: {
      list: function () {
        return backendGet('activities').then(r => listOrFail(r, 'activities'));
      },
      get: function (id) {
        return backendGet('activities').then(function (r) {
          const list = (r && r.ok ? r.activities || [] : []);
          return list.filter(a => a.id === id)[0] || null;
        });
      },
      save: function (activity) {
        if (!activity.id) { activity.id = uid('act'); activity.createdAt = Date.now(); }
        return backendPost('activity', { activity: activity }).then(() => activity);
      },
      remove: function (id) {
        return backendPost('activity_delete', { id: id });
      },
    },

    // Сессии (запуск активности для группы)
    sessions: {
      list: function () {
        return backendGet('sessions').then(r => listOrFail(r, 'sessions'));
      },
      // Получить одну сессию по id (для проверки доступа на входе в экзамен).
      // Внутри — тот же список, отфильтрованный; когда backend научится
      // отдавать одну сессию напрямую, поменяется только эта функция.
      get: function (id) {
        return backendGet('sessions').then(function (r) {
          const list = (r && r.ok ? r.sessions || [] : []);
          return list.filter(s => s.id === id)[0] || null;
        });
      },
      open: function (activityId, group) {
        const session = {
          id: uid('ses'), activityId: activityId, group: group,
          status: 'open', openedAt: Date.now(), closedAt: null,
        };
        return backendPost('session', { session: session }).then(() => session);
      },
      close: function (id) {
        return backendPost('session_close', { id: id });
      },
      remove: function (id) {
        return backendPost('session_delete', { id: id });
      },
    },

    // Результаты и записи (уже существуют в таблице — только чтение)
    results: {
      list: function () {
        return backendGet('results').then(r => listOrFail(r, 'results'));
      },
      // Удалить результат. Строки не имеют id — определяем по совокупности
      // полей (дата+время+имя+группа), этого достаточно для уникальности.
      remove: function (r) {
        return backendPost('result_delete', {
          date: r.date, time: r.time, fullName: r.fullName, group: r.group
        });
      },
    },
    recordings: {
      list: function () {
        return backendGet('recordings').then(r => listOrFail(r, 'recordings'));
      },
      // Выставить балл за запись (обратная запись в хранилище).
      // Запись определяется по url — он уникален.
      grade: function (url, grade) {
        return backendPost('grade_recording', { url: url, grade: grade });
      },
    },

    // Служебное: узнать, доступно ли хранилище
    ping: function () {
      return backendGet('ping');
    },
  };
})();

// Доступно и как глобальная переменная, и (на будущее) как модуль
if (typeof window !== 'undefined') window.StorageAPI = StorageAPI;
