'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('E-posta adresi girin.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '';
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: redirectTo || undefined,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Şifremi unuttum</h1>
        <p className="text-sm text-zinc-500 mb-6">
          E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
        </p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700">
              E-posta gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin. Linke tıklayarak yeni şifre belirleyebilirsiniz.
            </p>
            <Link href="/login" className="block text-center text-sm text-green-700 hover:underline">
              Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama linki gönder'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-green-700 hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
}
