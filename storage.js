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
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwtHWLk-swTt4FeRlGSpPKGaCv7nV8KnRJ6PATj5hcHLINIl_OsDwGyui9Njfb3RjMd/exec';

  /* Низкоуровневые запросы к backend. Наружу не торчат — панель их не видит.
     Всё общение идёт через них, поэтому смена backend = правка только тут. */
  /* Сколько ждём ответ, прежде чем считать, что связи нет.
     Google Apps Script после простоя «просыпается» медленно, поэтому
     запас большой. Но ждать бесконечно нельзя: без этого панель просто
     висит на «Загрузка…» и преподаватель не понимает, что произошло. */
  const REQUEST_TIMEOUT_MS = 25000;

  /* Аудио — особый случай: файл едет целиком, да ещё и раздутый примерно
     на треть (двоичное приходится передавать текстом). Плюс Apps Script
     после простоя просыпается несколько секунд. Общего предела в 25 секунд
     ему не хватало, и панель сдавалась раньше времени — отсюда «не удалось
     получить запись», которое со второго-третьего раза проходило. */
  const AUDIO_TIMEOUT_MS = 90000;

  function backendGet(action, params, timeoutMs) {
    const url = new URL(BACKEND_URL);
    url.searchParams.set('action', action);
    if (params) Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); },
                             timeoutMs || REQUEST_TIMEOUT_MS);

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

  /* ЗАПИСЬ В ХРАНИЛИЩЕ.
     Отправляем как обычную форму: такому запросу браузер разрешает прочитать
     ответ, и мы сразу знаем, получилось или нет.

     Раньше было иначе: ответ прочитать было нельзя, поэтому после каждой
     записи панель скачивала весь список заново — только чтобы убедиться.
     При тридцати с лишним записях каждое сохранение балла тянуло за собой
     полную перекачку, и панель еле шевелилась. Теперь одно обращение. */
  /* ЗАПИСЬ В ХРАНИЛИЩЕ.
     Отправляем JSON как простой текст. Это важно сразу по двум причинам:
     • такой запрос браузер шлёт напрямую, без предварительного согласования,
       поэтому он быстрый;
     • и старая, и новая версия скрипта понимают его одинаково — обновление
       backend'а можно делать спокойно, панель не сломается.

     Ответ читаем: тогда мы точно знаем, записалось или нет. Если прочитать
     не удалось (сеть, старый backend, что угодно) — НЕ объявляем неудачу:
     запрос мог дойти. Возвращаем «отправлено, подтверждения нет», и панель
     напишет об этом мягко, а не красным «не сохранилось». */
  function backendPost(kind, payload) {
    const body = JSON.stringify(Object.assign({ kind: kind }, payload));
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, REQUEST_TIMEOUT_MS);

    return fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        clearTimeout(timer);
        if (r && r.ok === false) return { ok: false, error: r.error };
        return { ok: true, data: r };
      })
      .catch(function () {
        clearTimeout(timer);
        return { ok: true, unverified: true };   // ушло, но подтвердить не смогли
      });
  }

  function writeThenVerify(kind, payload) {
    return backendPost(kind, payload).then(function (r) {
      return (r && r.ok)
        ? { ok: true, unverified: !!r.unverified }
        : { ok: false, error: (r && r.error) || 'нет ответа' };
    });
  }

  // Записи, уже полученные в этом сеансе работы панели
  const audioCache = {};

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* ── Публичная граница. ТОЛЬКО это видит панель. ──
     Методы описаны по СМЫСЛУ (сохрани активность), а не по способу
     (запиши строку в Google). Способ спрятан выше. */
  return {
    // Активности
    activities: {
      list: function () {
        return backendGet('activities').then(r => listOrFail(r, 'activities'));
      },
      /* Одна активность по id. Спрашиваем именно её, а не весь список:
         ученику при открытии ссылки не нужно скачивать все активности.
         Если backend ещё старый и такого не умеет — откатываемся к списку. */
      get: function (id) {
        return backendGet('activity', { id: id }).then(function (r) {
          if (r && r.ok && r.activity !== undefined) return r.activity;
          return backendGet('activities').then(function (r2) {
            const list = (r2 && r2.ok ? r2.activities || [] : []);
            return list.filter(a => a.id === id)[0] || null;
          });
        });
      },
      save: function (activity) {
        if (!activity.id) { activity.id = uid('act'); activity.createdAt = Date.now(); }
        return writeThenVerify('activity', { activity: activity })
          .then(function (res) { res.activity = activity; return res; });
      },
      remove: function (id) {
        return writeThenVerify('activity_delete', { id: id });
      },
    },

    // Сессии (запуск активности для группы)
    sessions: {
      list: function () {
        return backendGet('sessions').then(r => listOrFail(r, 'sessions'));
      },
      // Одна сессия по id — см. пояснение у активностей.
      get: function (id) {
        return backendGet('session', { id: id }).then(function (r) {
          if (r && r.ok && r.session !== undefined) return r.session;
          return backendGet('sessions').then(function (r2) {
            const list = (r2 && r2.ok ? r2.sessions || [] : []);
            return list.filter(s => s.id === id)[0] || null;
          });
        });
      },
      open: function (activityId, group) {
        const session = {
          id: uid('ses'), activityId: activityId, group: group,
          status: 'open', openedAt: Date.now(), closedAt: null,
        };
        return writeThenVerify('session', { session: session })
          .then(function (res) { res.session = session; return res; });
      },
      close: function (id) {
        return writeThenVerify('session_close', { id: id });
      },
      remove: function (id) {
        return writeThenVerify('session_delete', { id: id });
      },
    },

    // Результаты и записи
    results: {
      list: function () {
        return backendGet('results').then(r => listOrFail(r, 'results'));
      },
      // Строки не имеют id — определяем по номеру строки и полям.
      remove: function (r) {
        return writeThenVerify('result_delete',
          { row: r.row, date: r.date, time: r.time, fullName: r.fullName, group: r.group });
      },
    },

    recordings: {
      list: function () {
        return backendGet('recordings').then(r => listOrFail(r, 'recordings'));
      },

      /* Получить саму запись: { ok, blob }. Через backend, потому что
         напрямую с Диска браузеру звук не достаётся. */
      audio: function (fileId) {
        // Уже полученное не качаем заново: вернуться к записи — обычное дело.
        if (audioCache[fileId]) return Promise.resolve({ ok: true, blob: audioCache[fileId] });

        function attempt(triesLeft) {
          return backendGet('audio', { id: fileId }, AUDIO_TIMEOUT_MS).then(function (r) {
            if (!r || !r.ok || !r.data) {
              // Первая попытка часто уходит на пробуждение Apps Script —
              // пробуем ещё раз, прежде чем говорить о неудаче.
              if (triesLeft > 0) return attempt(triesLeft - 1);
              return { ok: false, error: (r && r.error) || 'нет ответа' };
            }
            try {
              var bin = atob(r.data);
              var bytes = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              var blob = new Blob([bytes], { type: r.mime || 'audio/mpeg' });
              audioCache[fileId] = blob;
              return { ok: true, blob: blob };
            } catch (e) {
              return { ok: false, error: String(e) };
            }
          });
        }
        return attempt(1);
      },

      // Удалить запись целиком: строку из таблицы и файл с Диска.
      remove: function (url) {
        return writeThenVerify('recording_delete', { url: url });
      },

      /* Балл за чтение. Backend отвечает сам — лишнего скачивания всего
         списка записей больше нет, именно оно тормозило сохранение. */
      grade: function (url, grade) {
        return backendPost('grade_recording', { url: url, grade: grade })
          .then(function (r) {
            return (r && r.ok) ? { ok: true, grade: grade }
                               : { ok: false, error: (r && r.error) || 'нет ответа' };
          });
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
