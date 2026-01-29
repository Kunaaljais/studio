import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Waves } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
       <header className="flex items-center gap-2 mb-8">
            <Waves className="w-8 h-8 text-primary" />
            <p className="text-2xl sm:text-3xl font-bold text-primary-foreground font-headline">
                RandomTalk.online
            </p>
        </header>
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold mt-4 mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8">
        Sorry, the page you are looking for does not exist.
      </p>
      <Button asChild>
        <Link href="/">Go back to Homepage</Link>
      </Button>
    </div>
  );
}
