import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET() {
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  res.cookies.set('auth', '', { path: '/', maxAge: 0 });
  return res;
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', '', { path: '/', maxAge: 0 });
  return res;
}
