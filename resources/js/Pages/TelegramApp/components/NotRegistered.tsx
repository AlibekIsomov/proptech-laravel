import { Smartphone } from 'lucide-react';

export default function NotRegistered() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}
        >
          <Smartphone className="w-6 h-6" style={{ color: '#10b981' }} />
        </div>
        <h1 className="text-base font-bold text-slate-800 mb-2">Ro'yxatdan o'tilmagan</h1>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          Davom etish uchun botga qaytib, <b>"📱 Raqamni ulashish"</b> tugmasi orqali telefon raqamingizni
          yuboring. Raqamingiz bizning bazamizda (aholi yoki pudratchi sifatida) mavjud bo'lishi kerak.
        </p>
      </div>
    </div>
  );
}
