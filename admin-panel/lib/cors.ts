import { NextResponse, type NextRequest } from 'next/server';

const parseOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  if (raw) return raw.split(',').map((o) => o.trim()).filter(Boolean);
  const panelUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return panelUrl ? [panelUrl] : [];
};

export function setCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const allowed = parseOrigins();
  const origin = request.headers.get('origin') ?? '';

  if (allowed.length === 0 || allowed.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Vary', 'Origin');
  return response;
}

export function corsOptions(request: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  return setCorsHeaders(res, request);
}
