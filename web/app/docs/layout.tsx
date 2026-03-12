import { Sidebar } from '@/components/Sidebar';
import { docsNav } from '@/lib/docs-nav';

export default function DocsLayout({ children }: LayoutProps<'/docs'>) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-8">
      <Sidebar nav={docsNav} />
      <div className="flex-1 min-w-0 py-6">
        {children}
      </div>
    </div>
  );
}
