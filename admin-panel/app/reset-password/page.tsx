'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
      if (!session) setError('Geçersiz veya süresi dolmuş link. Yeni bir sıfırlama linki isteyin.');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/login');
    router.refresh();
  };

  if (!ready && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow text-center text-zinc-500">
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Yeni şifre belirle</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Hesabınız için yeni bir şifre girin.
        </p>
        {error ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
            <Link href="/forgot-password" className="block text-center text-sm text-green-700 hover:underline">
              Yeni sıfırlama linki iste
            </Link>
            <Link href="/login" className="block text-center text-sm text-zinc-500 hover:underline">
              Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
                Yeni şifre
              </label>
              <input
                id="password"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-zinc-700 mb-1">
                Şifre (tekrar)
              </label>
              <input
                id="confirm"
                type="password"
                placeholder="Şifreyi tekrar girin"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
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
