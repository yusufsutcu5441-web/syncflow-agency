import Link from 'next/link';
import './globals.css';

/** Fallback for requests that never reach a locale (for example a missing static file, or a language that is not public). */
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body>
        <main className="grid min-h-dvh place-items-center px-6">
          <div>
            <p className="label">404</p>
            <h1 className="display mt-6 text-headline">This page doesn’t exist.</h1>
            <Link href="/" className="btn btn-primary mt-10">
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
