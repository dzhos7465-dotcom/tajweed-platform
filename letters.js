/* ══════════════════════════════════════════════════════════════════════
   БУКВЫ АРАБСКОГО АЛФАВИТА
   ══════════════════════════════════════════════════════════════════════
   Основа нулевого курса. Здесь только ЗНАНИЕ о буквах — что за буква,
   как называется, какие у неё свойства. Ни вопросов, ни ответов: они
   собираются из этого отдельно, как и в остальной библиотеке.

   Свойства:
     name        — как читается название по-русски
     connects    — соединяется ли с ПОСЛЕДУЮЩЕЙ буквой
                   (шесть букв не соединяются: ا د ذ ر ز و)
     interdental — межзубная (ث ذ ظ)
     heavy       — читается твёрдо, с оттенком «о»
     madd        — буква мадда (ا و ي)
     throat      — горловая (ء ه ع ح غ خ) — те же, что в изхаре нуна
     special     — не обычная буква алфавита: хамза, та-марбута, лам-алиф
     similar     — на какие буквы похожа ПО НАПИСАНИЮ
     tr          — согласный звук по-русски, для сборки слогов
     sound       — путь к записи названия буквы в хранилище

   ПРО ПОХОЖИЕ БУКВЫ. Дети путают буквы глазами, а не ухом: различаются
   точками и мелкими деталями. Если в вопросе «как называется эта буква»
   поставить неверными вариантами случайные буквы, ребёнок ответит, не
   глядя на начертание, — задание проверит удачу, а не знание. Поэтому
   неверные варианты берутся отсюда. Список открыт: преподаватель видит
   на занятиях, на чём именно спотыкаются, и правит здесь.

   ПРО tr. Русскими буквами арабский звук передать нельзя, и «са» стоит
   и у ث, и у س. Но в вопросе «как читается بَ» варианты отличаются только
   ГЛАСНЫМ (ба / би / бу) — согласный во всех один и тот же, и подмены не
   происходит. Поэтому tr годится ровно для слогов и больше ни для чего.
   У твёрдых букв и у тех, где звук меняется, tr не ставим: там фатха даёт
   оттенок «о», и запись «са» была бы неправдой.

   ПРО ЗВУК. Поле sound пока пустое у всех — место заложено заранее.
   Русскими буквами арабский звук не передать: «са» для ث и для س
   выглядит одинаково, а звучит по-разному. Когда записи появятся,
   достаточно вписать сюда путь — ни экраны, ни задания менять не
   придётся. Записывает преподаватель: машинное чтение врёт как раз
   в тонкостях, а в таджвиде важны именно они.

   ФОРМЫ БУКВЫ НЕ ХРАНЯТСЯ. Начальную, срединную и конечную рисует сам
   шрифт, если рядом поставить знак «здесь соединяется» (U+200D). Хранить
   их отдельно значило бы держать 28 × 4 записи и следить, чтобы они не
   разошлись между собой.
────────────────────────────────────────────────────────────────────── */

const LETTERS = [
  // ── алфавит по порядку ──
  { id: 'alif',  ch: 'ا', name: 'алиф',  connects: false, madd: true,
    similar: ['lam', 'hamza'] },
  { id: 'ba',    ch: 'ب', name: 'ба',    connects: true,  tr: 'б',
    similar: ['ta', 'tha', 'nun', 'ya'] },
  { id: 'ta',    ch: 'ت', name: 'та',    connects: true,  tr: 'т',
    similar: ['ba', 'tha', 'nun', 'ya'] },
  { id: 'tha',   ch: 'ث', name: 'са',    connects: true,  interdental: true, tr: 'с',
    similar: ['ta', 'ba', 'shin', 'nun'] },
  { id: 'jim',   ch: 'ج', name: 'джим',  connects: true,  tr: 'дж',
    similar: ['hha', 'kha'] },
  { id: 'hha',   ch: 'ح', name: 'ха',    connects: true,  throat: true,
    similar: ['jim', 'kha', 'ayn'] },
  { id: 'kha',   ch: 'خ', name: 'хха',   connects: true,  throat: true, heavy: true,
    similar: ['jim', 'hha', 'ghayn'] },
  { id: 'dal',   ch: 'د', name: 'даль',  connects: false, tr: 'д',
    similar: ['dhal', 'ra'] },
  { id: 'dhal',  ch: 'ذ', name: 'заль',  connects: false, interdental: true, tr: 'з',
    similar: ['dal', 'zay'] },
  { id: 'ra',    ch: 'ر', name: 'ра',    connects: false, heavyVaries: true,
    similar: ['zay', 'dal', 'waw'] },
  { id: 'zay',   ch: 'ز', name: 'зай',   connects: false, tr: 'з',
    similar: ['ra', 'dhal'] },
  { id: 'sin',   ch: 'س', name: 'син',   connects: true,  tr: 'с',
    similar: ['shin', 'sad'] },
  { id: 'shin',  ch: 'ش', name: 'шин',   connects: true,  tr: 'ш',
    similar: ['sin', 'tha', 'dad'] },
  { id: 'sad',   ch: 'ص', name: 'сад',   connects: true,  heavy: true,
    similar: ['dad', 'sin'] },
  { id: 'dad',   ch: 'ض', name: 'дад',   connects: true,  heavy: true,
    similar: ['sad', 'shin'] },
  { id: 'tta',   ch: 'ط', name: 'та (твёрдая)', connects: true, heavy: true,
    similar: ['zza'] },
  { id: 'zza',   ch: 'ظ', name: 'за (твёрдая)', connects: true, heavy: true, interdental: true,
    similar: ['tta', 'dad'] },
  { id: 'ayn',   ch: 'ع', name: 'айн',   connects: true,  throat: true,
    similar: ['ghayn', 'hha'] },
  { id: 'ghayn', ch: 'غ', name: 'гайн',  connects: true,  throat: true, heavy: true,
    similar: ['ayn', 'kha'] },
  { id: 'fa',    ch: 'ف', name: 'фа',    connects: true,  tr: 'ф',
    similar: ['qaf', 'waw'] },
  { id: 'qaf',   ch: 'ق', name: 'каф (твёрдая)', connects: true, heavy: true,
    similar: ['fa', 'nun'] },
  { id: 'kaf',   ch: 'ك', name: 'кяф',   connects: true,  tr: 'к',
    similar: ['lam'] },
  { id: 'lam',   ch: 'ل', name: 'лям',   connects: true,  heavyVaries: true,
    similar: ['kaf', 'alif'] },
  { id: 'mim',   ch: 'م', name: 'мим',   connects: true,  tr: 'м',
    similar: ['ha', 'waw'] },
  { id: 'nun',   ch: 'ن', name: 'нун',   connects: true,  tr: 'н',
    similar: ['ba', 'ta', 'ya', 'tha'] },
  { id: 'ha',    ch: 'ه', name: 'ха (мягкая)', connects: true, throat: true, tr: 'х',
    similar: ['mim', 'ta_marbuta'] },
  { id: 'waw',   ch: 'و', name: 'вав',   connects: false, madd: true,
    similar: ['fa', 'ra', 'mim'] },
  { id: 'ya',    ch: 'ي', name: 'йа',    connects: true,  madd: true,
    similar: ['ta', 'ba', 'nun', 'tha'] },

  // ── особые знаки: в алфавит не входят, но спрашиваются ──
  { id: 'hamza',      ch: 'ء',  name: 'хамза',            connects: false, throat: true, special: true,
    similar: ['hamza_wasl', 'alif'] },
  { id: 'hamza_wasl', ch: 'ٱ',  name: 'хамзатуль-васль',  connects: false, special: true,
    similar: ['hamza', 'alif'],
    note: 'Соединительная хамза. Стоит в начале слова. В начале речи читается, в середине — нет.' },
  { id: 'ta_marbuta', ch: 'ة',  name: 'та-марбута (закрытая та)', connects: false, special: true,
    similar: ['ha', 'ta'],
    note: 'При остановке читается как ه, при продолжении — как ت.' },
  { id: 'lam_alif',   ch: 'لا', name: 'лям-алиф',         connects: false, special: true,
    isPair: true, similar: ['lam', 'alif'],
    note: 'Не одна буква, а две вместе: лям и алиф.' },
];

const LETTER_BY_ID = {};
LETTERS.forEach(function (l) { LETTER_BY_ID[l.id] = l; });

/* ── Формы буквы ──────────────────────────────────────────────────────
   Знак U+200D говорит шрифту «здесь буква соединяется с соседом».
   Буква, которая не соединяется с последующей, начальной и срединной
   формы не имеет — возвращаем отдельную, чтобы не показывать неправду. */
const ZWJ = '\u200D';

/* Есть ли у буквы запись голоса. Пока нет ни у одной — вернёт false,
   и экран просто не покажет кнопку звука. */
function letterSound(letter) {
  const l = (typeof letter === 'string') ? LETTER_BY_ID[letter] : letter;
  return (l && l.sound) || null;
}

function letterForm(letter, form) {
  const l = (typeof letter === 'string') ? LETTER_BY_ID[letter] : letter;
  if (!l) return '';
  if (l.isPair || l.special) return l.ch;          // особые знаки форм не имеют
  switch (form) {
    case 'initial': return l.connects ? (l.ch + ZWJ) : l.ch;
    case 'medial':  return l.connects ? (ZWJ + l.ch + ZWJ) : (ZWJ + l.ch);
    case 'final':   return ZWJ + l.ch;
    default:        return l.ch;                   // отдельная
  }
}

/* ── Отбор букв по свойству ───────────────────────────────────────────
   Отсюда собираются вопросы: «какая из этих букв межзубная» берёт одну
   межзубную и две обычные. Значит вопросы не нужно писать руками —
   каждый ученик получает свой набор. */
function lettersWith(prop, value, withSpecial) {
  const want = (value === undefined) ? true : value;
  return LETTERS.filter(function (l) {
    if (l.special && !withSpecial) return false;
    return !!l[prop] === want;
  });
}

/* Горловые — шесть, и хамза среди них. Она помечена особой (в алфавит не
   входит), поэтому обычный отбор её пропускал бы. */
function throatLetters() { return lettersWith('throat', true, true); }

function lettersWithout(prop) { return lettersWith(prop, false); }

/* Обычные буквы алфавита — без хамзы, та-марбуты и лям-алифа. */
function alphabet() {
  return LETTERS.filter(function (l) { return !l.special; });
}

/* Буквы, похожие на данную по написанию. Если у буквы список не заполнен,
   возвращаем пусто — вызывающий сам решит, чем добрать. Молча подставлять
   случайные здесь нельзя: тогда не видно, что список неполон. */
function similarLetters(letter) {
  const l = (typeof letter === 'string') ? LETTER_BY_ID[letter] : letter;
  if (!l || !Array.isArray(l.similar)) return [];
  return l.similar.map(function (id) { return LETTER_BY_ID[id]; }).filter(Boolean);
}

/* Буквы, из которых можно собрать слог с честной русской записью:
   не твёрдые, не с меняющимся звуком, не сами буквы мадда. */
function syllableLetters() {
  return LETTERS.filter(function (l) {
    return !l.special && !l.madd && !l.heavy && !l.heavyVaries && l.tr;
  });
}

if (typeof window !== 'undefined') {
  window.LETTERS = LETTERS;
  window.LETTER_BY_ID = LETTER_BY_ID;
  window.letterForm = letterForm;
  window.letterSound = letterSound;
  window.lettersWith = lettersWith;
  window.throatLetters = throatLetters;
  window.lettersWithout = lettersWithout;
  window.alphabet = alphabet;
  window.similarLetters = similarLetters;
  window.syllableLetters = syllableLetters;
}
