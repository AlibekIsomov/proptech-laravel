import { FormEvent, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import { Logo } from '@/Components/pm/ui';

interface Props {
    portal: 'sales' | 'pm';
    errors?: { email?: string; password?: string };
}

interface SharedProps {
    brand?: { name?: string; tagline?: string; legalName?: string };
    [key: string]: any;
}

const Icons = {
    Eye: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    EyeOff: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    ),
    Loader: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
    ),
};

export default function Login({ portal, errors }: Props) {
    const { t } = useTranslation();
    const page = usePage<SharedProps>();
    const brand = page?.props?.brand || { name: '1Mahalla', tagline: 'Heritage + Tech', legalName: '1Mahalla' };

    const [email,        setEmail]        = useState('');
    const [password,     setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading,      setLoading]      = useState(false);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        router.post('/pm/login', { email, password }, { onFinish: () => setLoading(false) });
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
            style={{ backgroundColor: '#f4faf5' }}
        >
            {/* Animated green orbs */}
            <div className="orb-1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(39,162,71,0.08) 0%, transparent 70%)' }} />
            <div className="orb-2 absolute -bottom-48 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(26,122,52,0.06) 0%, transparent 70%)' }} />
            <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(39,162,71,0.04) 0%, transparent 70%)' }} />

            {/* Glass card */}
            <div
                className="relative z-10 w-full max-w-md rounded-3xl p-8"
                style={{
                    background: 'var(--muted)',
                    border: '1px solid rgba(39,162,71,0.15)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 24px 64px rgba(26,46,34,0.08), 0 0 0 1px rgba(39,162,71,0.04)',
                }}
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #27A247 0%, #1a7a34 100%)',
                            boxShadow: '0 0 48px rgba(39,162,71,0.25)',
                        }}
                    >
                        <Logo size={36} light="#FFFFFF" accent="#CFEFDE" />
                    </div>
                    <h1 className="text-2xl text-slate-800 font-bold" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {brand?.name ?? '1Mahalla'}
                    </h1>
                    <p className="text-xs font-semibold uppercase tracking-widest mt-1.5"
                        style={{ color: '#1e7e34', letterSpacing: '0.15em' }}>
                        {portal === 'pm' ? t('login.pmPortal') : (brand?.tagline ?? t('login.salesTagline'))}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1.5"
                            style={{ color: 'rgba(26,46,34,0.7)' }}>
                            {t('login.emailLabel')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all bg-white"
                            style={{ border: '1px solid rgba(39,162,71,0.15)' }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#27A247')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(39,162,71,0.15)')}
                        />
                        {errors?.email && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1.5"
                            style={{ color: 'rgba(26,46,34,0.7)' }}>
                            {t('login.passwordLabel')}
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all bg-white"
                                style={{ border: '1px solid rgba(39,162,71,0.15)' }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = '#27A247')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(39,162,71,0.15)')}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-slate-700"
                                style={{ color: 'rgba(26,46,34,0.4)' }}
                            >
                                {showPassword
                                    ? <Icons.EyeOff className="w-4 h-4 text-slate-400" />
                                    : <Icons.Eye className="w-4 h-4 text-slate-400" />}
                            </button>
                        </div>
                        {errors?.password && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{errors.password}</p>}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        id="login-submit-btn"
                        className="btn-shine w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                        style={{
                            background: 'linear-gradient(135deg, #27A247 0%, #1a7a34 100%)',
                            boxShadow: '0 4px 24px rgba(39,162,71,0.25)',
                        }}
                    >
                        {loading
                            ? <><Icons.Loader className="w-4 h-4 animate-spin text-white" />{t('login.signingIn')}</>
                            : t('login.submit')}
                    </button>
                </form>

                {/* Language */}
                <div className="mt-6 pt-6 space-y-3" style={{ borderTop: '1px solid rgba(39,162,71,0.08)' }}>
                    <LanguageSwitcher variant="login" />
                </div>

                <p className="text-center text-xs mt-4" style={{ color: 'rgba(26,46,34,0.4)' }}>
                    © {new Date().getFullYear()} {brand?.legalName ?? '1Mahalla'} · {t('login.allRights')}
                </p>
            </div>
        </div>
    );
}
