import Link from "next/link";

export default function NotFound() {
  return (
    <main id="not-found-page" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-black text-indigo-400">404</h1>
        <h2 className="text-lg font-bold text-white">Page Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested route does not exist in Vyrexo.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-indigo-600/20"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
