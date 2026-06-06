import { useTranslation } from 'react-i18next';

interface Props {
  variant?: 'sidebar' | 'login';
}

export default function LanguageSwitcher({ variant = 'sidebar' }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function switchTo(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  }

  if (variant === 'login') {
    return (
      <div className="flex items-center justify-center gap-1">
        {(['uz', 'ru'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => switchTo(lang)}
            className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
            style={
              current === lang
                ? { backgroundColor: 'rgba(39,162,71,0.15)', color: '#27A247', border: '1px solid rgba(39,162,71,0.3)' }
                : { backgroundColor: 'transparent', color: 'rgba(26,46,34,0.4)', border: '1px solid transparent' }
            }
          >
            {lang === 'uz' ? "O'Z" : 'RU'}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {(['uz', 'ru'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => switchTo(lang)}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
          style={
            current === lang
              ? { backgroundColor: 'rgba(39,162,71,0.12)', color: '#1a7a34', border: '1px solid rgba(39,162,71,0.2)' }
              : { backgroundColor: 'transparent', color: 'rgba(26,46,34,0.35)', border: '1px solid transparent' }
          }
        >
          {lang === 'uz' ? "O'Z" : 'RU'}
        </button>
      ))}
    </div>
  );
}
