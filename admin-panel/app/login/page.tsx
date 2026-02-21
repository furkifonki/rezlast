import Link from 'next/link';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error ? decodeURIComponent(params.error) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-6">
          Admin Panel
        </h1>
        <form action="/api/auth/login" method="POST" className="space-y-4">
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
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
              Şifre
            </label>
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
            className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800"
          >
            Giriş Yap
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
      </div>
    </div>
  );
}
