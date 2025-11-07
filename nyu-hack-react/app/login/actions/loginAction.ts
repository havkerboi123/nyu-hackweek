'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: { error: string }, formData: FormData) {
  const id = formData.get('loginId')?.toString() ?? '';
  const pass = formData.get('password')?.toString() ?? '';
  const next = formData.get('next')?.toString() || '';

  if (pass === '12') {
    const cookieStore = await cookies();

    if (id === 'user') {
      cookieStore.set('auth', 'true', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
      redirect(next || '/patient');
    } else if (id === 'hos') {
      cookieStore.set('auth', 'true', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
      redirect(next || '/hospital');
    }
  }

  return { error: 'Invalid credentials' };
}
