export type Lang = 'be' | 'en';
export const LANGS: Lang[] = ['be', 'en'];
export const DEFAULT_LANG: Lang = 'be';

/** Every Belarusian string needs the owner's proofreading (Taraškievica). */
export const ui = {
  be: {
    skip: 'Перайсьці да зьместу', sections: 'Разьдзелы', siteLang: 'Мова сайта',
    writing: 'Допісы', now: 'Цяпер', about: 'Пра мяне', uses: 'Чым карыстаюся', links: 'Спасылкі',
    work: 'Праца', projects: 'Праекты', whyEssentis: 'Чаму essentis', mail: 'Пошта',
    moreAboutMe: 'Больш пра мяне', latest: 'Апошнія допісы', allPosts: 'Усе допісы',
    photosTitle: 'Фота', allAlbums: 'Усе альбомы', photosIntro: 'Фотаальбомы з падарожжаў. Спачатку яны выходзяць у канале essentis.',
    noAlbumsYet: 'Альбомаў пакуль няма.', onTelegram: 'Глядзець у Telegram', photoOf: (i: number, n: number) => `фота ${i} з ${n}`,
    closePhoto: 'Закрыць', prevPhoto: 'Папярэдняе фота', nextPhoto: 'Наступнае фота', viewer: 'Прагляд фота',
    channel: 'Канал essentis',
    langName: { be: 'па-беларуску', en: 'па-ангельску' },
    foreignNote: { be: 'Гэты допіс па-беларуску.', en: 'Гэты допіс па-ангельску.' },
    min: 'хв', minRead: 'хв чытаньня', photos: (n: number) => `${n}\u00a0фота`,
    notes: 'Заўвагі', note: 'Заўвага', backToText: 'Вярнуцца да тэксту',
    codeIn: (name?: string) => (name ? `Код на ${name}` : 'Код'),
    noPostsYet: 'Допісаў пакуль няма.', feed: 'RSS', feedTitle: 'essentis: допісы Данііла М.', prev: 'Папярэдні допіс', next: 'Наступны допіс', otherPosts: 'Іншыя допісы',
    discuss: 'Абмеркаваць у канале essentis',
    topic: 'Тэма', allTopics: 'Усе', noPostsForTopic: 'Пакуль няма допісаў на гэтую тэму.',
    writingIntro: 'Доўгія тэксты пра інжынэрыю і кіраваньне, ШІ, беларускую мову і культуру, кнігі, музыку і падарожжы. Па-беларуску і па-ангельску.',
    notTranslated: 'Гэты тэкст яшчэ не перакладзены.',
    updated: (d: string) => `Абноўлена ${d}`,
    siteDescription: 'Нататкі пра інжынэрыю, беларускую культуру, кнігі і музыку. Данііл М.',
    tagline: 'Нататкі пра інжынэрыю, беларускую культуру, кнігі і музыку.',
  },
  en: {
    skip: 'Skip to content', sections: 'Sections', siteLang: 'Site language',
    writing: 'Writing', now: 'Now', about: 'About', uses: 'Uses', links: 'Links',
    work: 'Work', projects: 'Projects', whyEssentis: 'Why essentis', mail: 'Email',
    moreAboutMe: 'More about me', latest: 'Latest writing', allPosts: 'All writing',
    photosTitle: 'Photos', allAlbums: 'All albums', photosIntro: 'Photo albums from my travels. They come out on the essentis channel first.',
    noAlbumsYet: 'No albums yet.', onTelegram: 'View on Telegram', photoOf: (i: number, n: number) => `photo ${i} of ${n}`,
    closePhoto: 'Close', prevPhoto: 'Previous photo', nextPhoto: 'Next photo', viewer: 'Photo viewer',
    channel: 'essentis channel',
    langName: { be: 'in Belarusian', en: 'in English' },
    foreignNote: { be: 'This post is in Belarusian.', en: 'This post is in English.' },
    min: 'min', minRead: 'min read', photos: (n: number) => `${n}\u00a0${n === 1 ? 'photo' : 'photos'}`,
    notes: 'Notes', note: 'Note', backToText: 'Back to the text',
    codeIn: (name?: string) => (name ? `${name} code` : 'Code'),
    noPostsYet: 'No posts yet.', feed: 'RSS', feedTitle: 'essentis: writing by Daniił M.', prev: 'Previous post', next: 'Next post', otherPosts: 'More writing',
    discuss: 'Discuss on the essentis channel',
    topic: 'Topic', allTopics: 'All', noPostsForTopic: 'No posts on this topic yet.',
    writingIntro: 'Long reads on engineering and leadership, AI, Belarusian language and culture, books, music and travel. In Belarusian and English.',
    notTranslated: 'This text is not translated yet.',
    updated: (d: string) => `Updated ${d}`,
    siteDescription: 'Notes on engineering, Belarusian culture, books and music, by Daniił M.',
    tagline: 'Notes on engineering, Belarusian culture, books and music.',
  },
} as const;

export const TOPICS = ['eng', 'ai', 'lang', 'books', 'music', 'travel'] as const;
export type Topic = (typeof TOPICS)[number];
export const topicLabels: Record<Lang, Record<Topic, string>> = {
  be: { eng: 'Інжынэрыя і кіраваньне', ai: 'ШІ', lang: 'Мова і культура', books: 'Кнігі', music: 'Музыка', travel: 'Падарожжы' },
  en: { eng: 'Engineering and leadership', ai: 'AI', lang: 'Language and culture', books: 'Books', music: 'Music', travel: 'Travel' },
};

const monthsBe = ['студзеня', 'лютага', 'сакавіка', 'красавіка', 'траўня', 'чэрвеня', 'ліпеня', 'жніўня', 'верасьня', 'кастрычніка', 'лістапада', 'сьнежня'];
const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdays = {
  be: ['нядзеля', 'панядзелак', 'аўторак', 'серада', 'чацьвер', 'пятніца', 'субота'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Non-breaking space between numbers and the word they belong to. */
export const NB = ' ';

/** "12 лістапада" / "12 November" (UTC). */
export function fmtDay(d: Date, lang: Lang): string {
  const m = d.getUTCMonth();
  return `${d.getUTCDate()}${NB}${lang === 'be' ? monthsBe[m] : monthsEn[m]}`;
}
/** "12 лістапада 2026" */
export const fmtDate = (d: Date, lang: Lang) => `${fmtDay(d, lang)} ${d.getUTCFullYear()}`;
export const weekday = (d: Date, lang: Lang) => weekdays[lang][d.getUTCDay()];
