// This route is now moved to /patient
// Redirect to login if not authenticated, or to patient portal if authenticated
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get('auth')?.value === 'true';

  if (isAuthed) {
    redirect('/patient');
  } else {
    redirect('/login');
  }
}
