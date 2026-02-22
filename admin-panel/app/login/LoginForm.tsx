'use client';

import Link from 'next/link';
import { useState } from 'react';

type Props = { initialError?: string | null };

export default function LoginForm({ initialError }: Props) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;
    if (!email || !password) {
      setError('E-posta ve şifre gerekli.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız.');
        setLoading(false);
        return;
      }
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="ornek@email.com"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Şifre
            </label>
            <Link href="/forgot-password" className="text-sm text-green-700 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
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
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Hesabınız yok mu?{' '}
        <Link href="/register" className="text-green-700 hover:underline">
          Kayıt ol
        </Link>
        {' · '}
        <Link href="/" className="text-green-700 hover:underline">
          Ana sayfa
        </Link>
      </p>
    </>
  );
}
