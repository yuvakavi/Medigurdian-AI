import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>

      <h1 className="mt-5 text-[26px] font-extrabold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        The page you are looking for does not exist or has been moved. Use the
        navigation menu to find what you need.
      </p>

      <Link to="/" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
