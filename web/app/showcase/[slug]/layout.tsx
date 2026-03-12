// Showcase pages are full-viewport, no sidebar, minimal chrome
export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-96px)] w-full overflow-hidden">
      {children}
    </div>
  );
}
