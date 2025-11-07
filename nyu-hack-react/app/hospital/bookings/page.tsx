'use client';

import { useEffect, useMemo, useState } from 'react';

type Appointment = {
  timestamp: string;
  name: string;
  email: string;
  appointmentType: string;
  date: string;
  time: string;
};

export default function BookingsDashboardPage() {
  const [data, setData] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/appointments', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json: Appointment[]) => {
        if (mounted) setData(json);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to load appointments';
        if (mounted) setError(msg);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((a) => {
      const matchQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.appointmentType.toLowerCase().includes(q);
      const matchDate = !dateFilter || a.date === dateFilter;
      return matchQuery && matchDate;
    });
  }, [data, query, dateFilter]);

  return (
    <main className="container mx-auto space-y-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Bookings Dashboard</h1>
        <p className="text-muted-foreground">Live view of patient bookings from Google Sheets.</p>
      </header>

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Search</label>
          <input
            placeholder="Search name, email, type..."
            className="w-full rounded-lg border px-3 py-2 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <label className="text-sm font-medium">Filter by Date (YYYY-MM-DD)</label>
          <input
            placeholder="2025-11-06"
            className="w-full rounded-lg border px-3 py-2 outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="rounded-lg border p-4 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Appointment Type</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => (
              <tr key={`${a.timestamp}-${idx}`} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{a.timestamp}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.email}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.appointmentType}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.date}</td>
                <td className="px-4 py-3 whitespace-nowrap">{a.time}</td>
              </tr>
            ))}
            {!error && data && filtered.length === 0 && (
              <tr>
                <td className="text-muted-foreground px-4 py-6 text-center" colSpan={6}>
                  No bookings match your filters.
                </td>
              </tr>
            )}
            {!error && !data && (
              <tr>
                <td className="text-muted-foreground px-4 py-6 text-center" colSpan={6}>
                  Loading bookings…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
