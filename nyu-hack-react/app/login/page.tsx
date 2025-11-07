'use client';

import { Suspense } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions/loginAction';
import { Stethoscope } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useFormState(loginAction, { error: '' });
  const next = searchParams.get('next') || '';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MediVoice Hospital</h1>
          <p className="text-muted-foreground text-sm">Login to access your portal</p>
        </div>

        {/* Login Form */}
        <form action={formAction} className="w-full space-y-5 rounded-xl border bg-white p-8 shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Login ID
            </label>
            <input
              name="loginId"
              placeholder="Enter 'user' or 'hos'"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use 'user' for patient portal or 'hos' for hospital admin
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Enter password"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
              required
            />
          </div>

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Secure healthcare portal - Patients & Hospital Staff
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
