import LoginForm from './LoginForm';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialError = params?.error ? decodeURIComponent(params.error) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-zinc-900 mb-6">
          Admin Panel
        </h1>
        <LoginForm initialError={initialError} />
      </div>
    </div>
  );
}
