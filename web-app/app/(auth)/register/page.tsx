'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [otpCode, setOtpCode] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    const eVal = email.trim();
    const p = password;
    if (!name) {
      setError('Ad soyad girin.');
      return;
    }
    if (!eVal || !p) {
      setError('E-posta ve şifre girin.');
      return;
    }
    if (p.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (!kvkkAccepted) {
      setError('Üyelik için KVKK aydınlatma metnini kabul etmeniz gerekmektedir.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signUp(eVal, p, name);
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    setLoading(false);
    setStep('confirm');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.trim().replace(/\s/g, '');
    if (!code || code.length !== 8) {
      setError('8 haneli doğrulama kodunu girin.');
      return;
    }
    if (!supabase) {
      setError('Bağlantı yapılandırılmamış.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message || 'Kod geçersiz veya süresi dolmuş.');
      return;
    }
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') ?? '';
    const payload: Record<string, unknown> = {
      kvkk_accepted_at: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
    };
    if (emailConsent || smsConsent) {
      payload.etk_accepted_at = new Date().toISOString();
      payload.email_marketing_consent = emailConsent;
      payload.sms_marketing_consent = smsConsent;
      payload.marketing_consent_at = new Date().toISOString();
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      await supabase.from('users').update(payload).eq('id', userId);
    }
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
        <h1 className="text-xl font-bold text-[#0f172a] mb-2">Kayıt başarılı</h1>
        <p className="text-sm text-[#64748b] mb-4">Hesabınız doğrulandı. Giriş yapabilirsiniz.</p>
        <Link href="/login" className="block text-center text-[#15803d] font-semibold hover:underline">
          Giriş sayfasına git
        </Link>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Doğrulama kodu</h1>
        <p className="text-sm text-[#64748b] mb-6">E-postanıza gelen 8 haneli kodu girin.</p>
        <form onSubmit={handleVerifyOtp}>
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
          {error && <p className="text-sm text-[#dc2626] mb-2">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-70">
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
        </form>
        <button type="button" onClick={() => { setStep('form'); setOtpCode(''); setError(null); }} className="w-full mt-3 text-sm text-[#64748b] hover:underline">
          ← Kayıt formuna dön
        </button>
        <div className="mt-5 text-center">
          <Link href="/login" className="text-sm text-[#15803d] hover:underline">
            Zaten hesabınız var mı? Giriş yapın
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
      <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Kayıt Ol</h1>
      <p className="text-sm text-[#64748b] mb-6">Rezvio hesabı oluşturun</p>

      <form onSubmit={handleRegister}>
        <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Ad Soyad *</label>
        <input
          type="text"
          placeholder="Ad Soyad *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
          disabled={loading}
        />
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
          disabled={loading}
        />
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={kvkkAccepted}
            onChange={(e) => setKvkkAccepted(e.target.checked)}
            className="rounded border-[#e2e8f0]"
          />
          <span className="text-sm text-[#0f172a]">KVKK aydınlatma metnini kabul ediyorum *</span>
        </label>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={emailConsent}
            onChange={(e) => setEmailConsent(e.target.checked)}
            className="rounded border-[#e2e8f0]"
          />
          <span className="text-sm text-[#0f172a]">E-posta ile ticari ileti almak istiyorum</span>
        </label>
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="rounded border-[#e2e8f0]"
          />
          <span className="text-sm text-[#0f172a]">SMS ile ticari ileti almak istiyorum</span>
        </label>
        {error && <p className="text-sm text-[#dc2626] mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-70"
        >
          {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
        </button>
      </form>
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm text-[#15803d] hover:underline">
          Zaten hesabınız var mı? Giriş yapın
        </Link>
      </div>
    </div>
  );
}
