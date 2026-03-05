'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.user) {
      if (data.user.identities?.length === 0) {
        setError('Bu e-posta adresi zaten kullanılıyor. Giriş yapmayı deneyin.');
        return;
      }
      setSuccess('E-postanıza gelen 8 haneli doğrulama kodunu aşağıya girin.');
      setStep('confirm');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otpCode.trim().replace(/\s/g, '');
    if (!code || code.length !== 8) {
      setError('8 haneli doğrulama kodunu girin.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setLoading(false);
    if (err) {
      setError(err.message || 'Kod geçersiz veya süresi dolmuş.');
      return;
    }
    setSuccess('Hesap doğrulandı. Yönlendiriliyorsunuz...');
    setTimeout(() => { window.location.href = '/dashboard'; }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Admin Panel - Kayıt</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {step === 'confirm' ? 'E-postanıza gelen 8 haneli kodu girin.' : 'İşletme sahibi hesabı oluşturun.'}
        </p>
        {step === 'confirm' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Doğrulama kodu</label>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50">
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setOtpCode(''); setError(''); setSuccess(''); }} className="w-full text-sm text-zinc-500 hover:underline">
              ← Kayıt formuna dön
            </button>
          </form>
        ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              placeholder="Adınız Soyadınız"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
            <input
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Şifre</label>
            <input
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        )}
        <p className="mt-4 text-center text-sm text-zinc-500">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="text-green-700 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
