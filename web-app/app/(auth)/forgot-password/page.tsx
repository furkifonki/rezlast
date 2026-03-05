'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
    const { error: err } = await supabase.auth.resetPasswordForEmail(eVal);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!supabase) {
      setError('Bağlantı yapılandırılmamış.');
      return;
    }
    setError(null);
    setLoading(true);
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
    <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
      <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Şifremi unuttum</h1>
      <p className="text-sm text-[#64748b] mb-6">
        {done ? 'Şifreniz güncellendi.' : sent ? 'E-postanıza gelen 8 haneli kodu ve yeni şifrenizi girin.' : 'E-posta adresinizi girin, size 8 haneli doğrulama kodu gönderelim.'}
      </p>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-[#15803d]">Giriş sayfasına yönlendiriliyorsunuz.</p>
          <Link href="/login" className="block text-center text-[#15803d] font-semibold hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      ) : sent ? (
        <form onSubmit={handleVerifyAndReset}>
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">E-posta</label>
          <input type="email" value={email} readOnly className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#64748b] mb-3 bg-[#f8fafc]" />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Doğrulama kodu (8 hane)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="00000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            autoComplete="one-time-code"
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-center text-lg tracking-widest text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Yeni şifre</label>
          <input
            type="password"
            placeholder="En az 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Şifre (tekrar)</label>
          <input
            type="password"
            placeholder="Şifreyi tekrar girin"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          {error && <p className="text-sm text-[#dc2626] mb-2">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-70">
            {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
          </button>
          <button type="button" onClick={() => { setSent(false); setOtpCode(''); setPassword(''); setConfirmPassword(''); setError(null); }} className="w-full mt-2 text-sm text-[#64748b] hover:underline">
            ← Yeni kod iste
          </button>
        </form>
      ) : (
        <form onSubmit={handleSendCode}>
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
            {loading ? 'Gönderiliyor...' : 'Doğrulama kodu gönder'}
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
