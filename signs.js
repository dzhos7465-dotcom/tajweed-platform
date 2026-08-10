/* ══════════════════════════════════════════════════════════════════════
   ОГЛАСОВКИ И ЗНАКИ  (signs.js)
   ══════════════════════════════════════════════════════════════════════
   Второй кирпич нулевого курса, рядом с letters.js. Здесь только ЗНАНИЕ
   о знаках: как называется, какой звук даёт, что делает с буквой.
   Вопросов и ответов тут нет — они собираются отдельно, в tasks.js.

   ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ, А НЕ ВНУТРИ letters.js.
   Знак — не буква. У буквы спрашивают, соединяется ли она и твёрдая ли
   она; у знака — какой звук он даёт. Сложи их в один список — и в каждом
   отборе придётся писать «кроме знаков», а рано или поздно где-то забыть.
   Хамза и та-марбута остались среди букв правомерно: они пишутся в строке
   и занимают место буквы. Огласовка стоит НАД буквой и места не занимает.

   Свойства:
     id      — внутреннее имя
     ch      — сам знак (без буквы, для показа берётся с татвилем)
     name    — как называется по-русски
     vowel   — какой гласный звук даёт («а», «и», «у»); у сукуна нет
     tail    — что добавляется в конце слова (у танвина — «н»)
     does    — что делает с буквой, одной строкой (для объяснений)
     kind    — haraka (огласовка) | tanwin | other

   ПРО СУКУН. В Коране пишется знак U+06E1 (кружок), а не обычный U+0652.
   Держим коранический — ребёнок должен узнавать тот знак, который увидит
   в мусхафе, а не тот, что стоит в учебниках арабского языка.
────────────────────────────────────────────────────────────────────── */

const TATWEEL = '\u0640';   // соединительная черта: подставка для знака

const SIGNS = [
  { id: 'fatha', ch: '\u064E', name: 'Фатха', vowel: 'а', kind: 'haraka',
    does: 'даёт букве звук «а»' },
  { id: 'kasra', ch: '\u0650', name: 'Касра', vowel: 'и', kind: 'haraka',
    does: 'даёт букве звук «и»' },
  { id: 'damma', ch: '\u064F', name: 'Дамма', vowel: 'у', kind: 'haraka',
    does: 'даёт букве звук «у»' },

  { id: 'sukun', ch: '\u06E1', name: 'Сукун', vowel: null, kind: 'other',
    does: 'буква читается без гласного' },
  { id: 'shadda', ch: '\u0651', name: 'Шадда', vowel: null, kind: 'other',
    does: 'буква удваивается' },

  { id: 'tanwin_fath', ch: '\u064B', name: 'Танвин фатха', vowel: 'а', tail: 'н', kind: 'tanwin',
    does: 'двойная огласовка в конце слова, добавляет звук «н»' },
  { id: 'tanwin_kasr', ch: '\u064D', name: 'Танвин касра', vowel: 'и', tail: 'н', kind: 'tanwin',
    does: 'двойная огласовка в конце слова, добавляет звук «н»' },
  { id: 'tanwin_damm', ch: '\u064C', name: 'Танвин дамма', vowel: 'у', tail: 'н', kind: 'tanwin',
    does: 'двойная огласовка в конце слова, добавляет звук «н»' },
];

const SIGN_BY_ID = {};
SIGNS.forEach(function (s) { SIGN_BY_ID[s.id] = s; });

/* Знак сам по себе показать нельзя — он висит над буквой. Ставим его
   на татвиль: получается ровно то, что ребёнок видит в тесте. */
function signAlone(sign) {
  const s = (typeof sign === 'string') ? SIGN_BY_ID[sign] : sign;
  return s ? (TATWEEL + s.ch) : '';
}

/* Слог: буква со знаками. Порядок знаков важен — шадда пишется ПЕРЕД
   огласовкой, иначе шрифт нарисует их не одна над другой. */
function syllable(letter, signIds) {
  const l = (typeof letter === 'string')
    ? ((typeof LETTER_BY_ID !== 'undefined') ? LETTER_BY_ID[letter] : null)
    : letter;
  if (!l) return '';
  const ids = Array.isArray(signIds) ? signIds : [signIds];
  let out = l.ch;
  ids.forEach(function (id) {
    const s = SIGN_BY_ID[id];
    if (s) out += s.ch;
  });
  return out;
}

/* Долгий слог: буква с фатхой и алифом — то, что тянется.
   Буква мадда передаётся отдельно, потому что для «и» и «у» она другая. */
function longSyllable(letter, maddLetterCh) {
  const l = (typeof letter === 'string')
    ? ((typeof LETTER_BY_ID !== 'undefined') ? LETTER_BY_ID[letter] : null)
    : letter;
  if (!l) return '';
  return l.ch + SIGN_BY_ID.fatha.ch + (maddLetterCh || '\u0627');
}

function signsOfKind(kind) {
  return SIGNS.filter(function (s) { return s.kind === kind; });
}

if (typeof window !== 'undefined') {
  window.SIGNS = SIGNS;
  window.SIGN_BY_ID = SIGN_BY_ID;
  window.signAlone = signAlone;
  window.syllable = syllable;
  window.longSyllable = longSyllable;
  window.signsOfKind = signsOfKind;
}
