'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
      <div className="max-w-md w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-semibold text-[#0f172a] mb-2">Bir hata oluştu</h1>
        <p className="text-sm text-[#64748b] mb-6">
          Site yeni domain (rezvio.com) ile güncellendiyse, Supabase ve Vercel ayarlarını kontrol edin.
          Tarayıcı konsolunda (F12) daha ayrıntılı hata görebilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-xl font-medium bg-[#15803d] text-white hover:bg-[#166534]"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-medium bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
