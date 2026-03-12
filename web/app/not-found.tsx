import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-mono text-emerald-langium mb-4">404</h1>
      <h2 className="text-2xl text-white mb-6">Page not found</h2>
      <p className="text-gray-400 mb-8">The page you are looking for does not exist.</p>
      <Link href="/" className="border-2 border-emerald-langium text-emerald-langium px-6 py-3 rounded-xl hover:bg-emerald-langium hover:text-white transition-colors">
        Go home
      </Link>
    </div>
  );
}
