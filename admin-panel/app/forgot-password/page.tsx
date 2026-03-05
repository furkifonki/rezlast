'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('E-posta adresi girin.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otpCode.trim().replace(/\s/g, '');
    if (!code || code.length !== 8) {
      setError('8 haneli doğrulama kodunu girin.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message || 'Kod geçersiz veya süresi dolmuş.');
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Şifremi unuttum</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {done ? 'Şifreniz güncellendi.' : sent ? 'E-postanıza gelen 8 haneli kodu ve yeni şifrenizi girin.' : 'E-posta adresinizi girin, size 8 haneli doğrulama kodu gönderelim.'}
        </p>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700">Giriş sayfasına yönlendiriliyorsunuz...</p>
            <Link href="/login" className="block text-center text-sm text-green-700 hover:underline">
              Giriş sayfasına dön
            </Link>
          </div>
        ) : sent ? (
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
              <input type="email" value={email} readOnly className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Doğrulama kodu (8 hane)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                autoComplete="one-time-code"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 text-center text-lg tracking-widest focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Yeni şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Şifre (tekrar)</label>
              <input
                type="password"
                placeholder="Şifreyi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50">
              {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
            </button>
            <button type="button" onClick={() => { setSent(false); setOtpCode(''); setPassword(''); setConfirmPassword(''); setError(null); }} className="w-full text-sm text-zinc-500 hover:underline">
              ← Yeni kod iste
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
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
              {loading ? 'Gönderiliyor...' : 'Doğrulama kodu gönder'}
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
