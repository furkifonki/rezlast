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
    console.error(error);
  }, [error]);

  const isSupabaseError =
    error?.message?.includes('Supabase') ||
    error?.message?.includes('NEXT_PUBLIC_SUPABASE');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          {isSupabaseError ? 'Supabase yapılandırması eksik' : 'Bir hata oluştu'}
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {isSupabaseError ? (
            <>
              Canlı ortamda (Vercel vb.) ortam değişkenleri tanımlanmamış olabilir.
              <br />
              <strong>NEXT_PUBLIC_SUPABASE_URL</strong> ve{' '}
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> değerlerini hosting panelinde (Environment Variables) ekleyin.
              Değerler için Supabase Dashboard → Project Settings → API kullanın.
            </>
          ) : (
            error?.message || 'Beklenmeyen bir hata oluştu.'
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
