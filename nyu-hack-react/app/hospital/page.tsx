import Link from 'next/link';
import { LabReportUpload } from '@/components/hospital/lab-report-upload';
import { Calendar, FileText, Upload } from 'lucide-react';

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  schedule: string[]; // e.g. ["Mon 9:00-12:00", "Wed 14:00-18:00"]
};

const DOCTORS: Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Alice Bennett',
    specialty: 'Cardiology',
    schedule: ['Mon 09:00–12:00', 'Wed 14:00–18:00'],
  },
  {
    id: 'd2',
    name: 'Dr. Omar Singh',
    specialty: 'Pediatrics',
    schedule: ['Tue 10:00–13:00', 'Thu 15:00–19:00'],
  },
  {
    id: 'd3',
    name: 'Dr. Nina Park',
    specialty: 'Dermatology',
    schedule: ['Mon 13:00–16:00', 'Fri 09:00–12:00'],
  },
];

export default function HospitalLandingPage() {
  return (
    <main className="container mx-auto space-y-12 px-6 py-12">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">MediVoice Hospital</h1>
            <p className="text-muted-foreground mt-2 max-w-prose">
              Hospital Administration Portal - Manage bookings, upload lab reports, and view
              patient information.
            </p>
          </div>
          <Link
            href="/api/logout"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Logout
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/hospital/bookings"
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <Calendar className="h-4 w-4" />
            View Bookings
          </Link>
          <Link
            href="/patient"
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <FileText className="h-4 w-4" />
            Patient Portal
          </Link>
        </div>
      </header>

      {/* Lab Report Upload Section */}
      <section>
        <LabReportUpload />
      </section>

      {/* Doctors Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Our Doctors</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {DOCTORS.map((d) => (
            <article key={d.id} className="space-y-3 rounded-xl border bg-white p-5 dark:bg-gray-800 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">{d.name}</h3>
                <p className="text-muted-foreground text-sm">{d.specialty}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Weekly Schedule</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {d.schedule.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">About Us</h2>
        <p className="text-muted-foreground max-w-prose">
          We are committed to delivering high-quality, accessible healthcare. Our AI assistant
          streamlines appointment booking, provides 24/7 help, and improves patient experience.
          Our advanced lab report analysis system helps doctors quickly understand patient test
          results.
        </p>
      </section>
    </main>
  );
}
