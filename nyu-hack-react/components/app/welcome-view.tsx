import { Activity, Clock, Phone, Shield, Stethoscope } from 'lucide-react';
import { Button } from '@/components/livekit/button';

function HospitalLogo() {
  return (
    <div className="mb-8">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
        <Stethoscope className="h-12 w-12 text-white" />
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div
      ref={ref}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">MediVoice AI</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <HospitalLogo />

          <div className="space-y-4">
            <h1 className="text-5xl leading-tight font-bold text-gray-900 md:text-6xl dark:text-white">
              AI Voice Assistant for
              <span className="text-blue-600 dark:text-blue-400"> Modern Healthcare</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Streamline patient communication, reduce administrative burden, and provide 24/7
              support with our intelligent voice assistant.
            </p>
          </div>

          <div className="pt-6">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartCall}
              className="h-auto transform bg-blue-600 px-12 py-6 font-mono text-lg text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-blue-700 hover:shadow-2xl"
            >
              <Phone className="mr-3 inline-block h-6 w-6" />
              {startButtonText}
            </Button>
          </div>

          <div className="grid gap-6 pt-16 md:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-8 w-8" />}
              title="24/7 Availability"
              description="Always available to assist patients with inquiries, appointment scheduling, and basic triage."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="HIPAA Compliant"
              description="Built with security and privacy in mind. Your patient data is always protected."
            />
            <FeatureCard
              icon={<Activity className="h-8 w-8" />}
              title="Real-time Response"
              description="Instant voice interaction with natural conversation flow and medical knowledge."
            />
          </div>

          <div className="space-y-6 pt-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              How It Helps Your Hospital
            </h2>
            <div className="mx-auto grid max-w-3xl gap-4 text-left md:grid-cols-2">
              <UseCase text="Appointment scheduling and reminders" />
              <UseCase text="Basic symptom assessment and triage" />
              <UseCase text="Medication reminders and instructions" />
              <UseCase text="Post-discharge follow-up calls" />
              <UseCase text="General hospital information" />
              <UseCase text="Emergency department wait times" />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-blue-100 dark:border-gray-700">
        <div className="container mx-auto px-6 py-8 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">© 2024 MediVoice AI. Transforming healthcare communication.</p>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function UseCase({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-gray-800/50">
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-gray-700 dark:text-gray-300">{text}</span>
    </div>
  );
}
