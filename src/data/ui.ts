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
    fromChannel: 'З канала essentis', openChannel: 'Адкрыць канал', channelNote: 'Фотаальбомы і кароткія нататкі ў Telegram.',
    channel: 'Канал essentis',
    langName: { be: 'па-беларуску', en: 'па-ангельску' },
    foreignNote: { be: 'Гэты допіс па-беларуску.', en: 'Гэты допіс па-ангельску.' },
    min: 'хв', minRead: 'хв чытаньня', photos: 'фота',
    notes: 'Заўвагі', backToText: 'Вярнуцца да тэксту', prev: 'Папярэдні допіс', next: 'Наступны допіс', otherPosts: 'Іншыя допісы',
    discuss: 'Абмеркаваць у канале essentis',
    topic: 'Тэма', allTopics: 'Усе', noPostsForTopic: 'Пакуль няма допісаў на гэтую тэму.',
    writingIntro: 'Доўгія тэксты пра інжынэрыю і кіраваньне, ШІ, беларускую мову і культуру, кнігі, музыку і падарожжы. Па-беларуску і па-ангельску.',
    nowIntro: 'Чым я заняты цяпер. Ідэя такой старонкі ўзятая з nownownow.com.',
    notTranslated: 'Гэты тэкст яшчэ не перакладзены.',
    updated: (d: string) => `Абноўлена ${d}`,
    siteDescription: 'Нататкі пра інжынэрыю, беларускую культуру, кнігі і музыку. Данііл М.',
  },
  en: {
    skip: 'Skip to content', sections: 'Sections', siteLang: 'Site language',
    writing: 'Writing', now: 'Now', about: 'About', uses: 'Uses', links: 'Links',
    work: 'Work', projects: 'Projects', whyEssentis: 'Why essentis', mail: 'Email',
    moreAboutMe: 'More about me', latest: 'Latest writing', allPosts: 'All writing',
    fromChannel: 'From the essentis channel', openChannel: 'Open the channel', channelNote: 'Photo albums and short notes on Telegram.',
    channel: 'essentis channel',
    langName: { be: 'in Belarusian', en: 'in English' },
    foreignNote: { be: 'This post is in Belarusian.', en: 'This post is in English.' },
    min: 'min', minRead: 'min read', photos: 'photos',
    notes: 'Notes', backToText: 'Back to the text', prev: 'Previous post', next: 'Next post', otherPosts: 'More writing',
    discuss: 'Discuss on the essentis channel',
    topic: 'Topic', allTopics: 'All', noPostsForTopic: 'No posts on this topic yet.',
    writingIntro: 'Long reads on engineering and leadership, AI, Belarusian language and culture, books, music and travel. In Belarusian and English.',
    nowIntro: 'What I am doing now. The idea for a page like this comes from nownownow.com.',
    notTranslated: 'This text is not translated yet.',
    updated: (d: string) => `Updated ${d}`,
    siteDescription: 'Notes on engineering, Belarusian culture, books and music, by Daniił M.',
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
