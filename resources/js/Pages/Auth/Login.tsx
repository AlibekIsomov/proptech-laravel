import { FormEvent, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';

interface Props {
    portal: 'sales' | 'pm';
    errors?: { email?: string; password?: string };
}

interface SharedProps {
    brand: { name: string; tagline: string; legalName: string };
}

export default function Login({ portal, errors }: Props) {
    const { brand } = usePage<SharedProps>().props;

    const [email,        setEmail]        = useState('');
    const [password,     setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading,      setLoading]      = useState(false);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        router.post(
            portal === 'pm' ? '/pm/login' : '/login',
            { email, password },
            {
                onFinish: () => setLoading(false),
            }
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
            style={{ backgroundColor: '#080b14' }}
        >
            {/* Animated gradient orbs */}
            <div className="orb-1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
            <div className="orb-2 absolute -bottom-48 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
            <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />

            {/* Glass card */}
            <div
                className="relative z-10 w-full max-w-md rounded-3xl p-8"
                style={{
                    background: 'rgba(13,17,23,0.85)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                }}
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                        }}
                    >
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl text-white font-bold" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {brand?.name ?? 'PropTech UZ'}
                    </h1>
                    <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {portal === 'pm' ? 'Property Management Portal' : (brand?.tagline ?? 'Real Estate Suite')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1.5"
                            style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.uz"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                        />
                        {errors?.email && <p className="text-xs mt-1.5" style={{ color: '#fca5a5' }}>{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1.5"
                            style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Password
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
                                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        id="login-submit-btn"
                        className="btn-shine w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign in'}
                    </button>
                </form>

                {/* Portal switch link */}
                <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {portal === 'sales' ? (
                        <a href="/pm/login" className="text-xs font-medium transition-colors hover:underline" style={{ color: '#34d399' }}>
                            Property Management Portal →
                        </a>
                    ) : (
                        <a href="/login" className="text-xs font-medium transition-colors hover:underline" style={{ color: '#6366f1' }}>
                            ← Sales Portal
                        </a>
                    )}
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.18)' }}>
                    © {new Date().getFullYear()} {brand?.legalName ?? 'PropTech UZ'} · All rights reserved
                </p>
            </div>
        </div>
    );
}
