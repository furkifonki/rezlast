'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const eVal = email.trim();
    const p = password;
    if (!eVal || !p) {
      setError('E-posta ve şifre girin.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(eVal, p);
    setLoading(false);
    if (err) setError(err.message);
    else router.replace('/app');
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#e2e8f0]">
      <div className="flex justify-center mb-4">
        <div className="w-[72px] h-[72px] bg-[#f1f5f9] rounded-xl flex items-center justify-center text-3xl">
          📱
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Giriş Yap</h1>
      <p className="text-sm text-[#64748b] mb-6">Rezvio ile giriş yapın</p>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
          disabled={loading}
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          disabled={loading}
          aria-label="Şifre"
          className="mb-3"
        />
        {error && <p className="text-sm text-[#dc2626] mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base mt-2 disabled:opacity-70"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <div className="mt-3 text-center">
        <Link href="/forgot-password" className="text-sm text-[#15803d] hover:underline">
          Şifremi unuttum
        </Link>
      </div>
      <div className="mt-5 text-center">
        <Link href="/register" className="text-sm text-[#15803d] hover:underline">
          Hesabınız yok mu? Kayıt olun
        </Link>
      </div>
    </div>
  );
}
