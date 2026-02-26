'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eVal = email.trim();
    if (!eVal) {
      setError('E-posta adresi girin.');
      return;
    }
    if (!supabase) {
      setError('Bağlantı yapılandırılmamış.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(eVal, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
      <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Şifremi unuttum</h1>
      <p className="text-sm text-[#64748b] mb-6">
        E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
      </p>
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-[#15803d]">
            E-posta gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
          </p>
          <Link href="/login" className="block text-center text-[#15803d] font-semibold hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          {error && <p className="text-sm text-[#dc2626] mb-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-70"
          >
            {loading ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
      )}
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm text-[#15803d] hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    </div>
  );
}
