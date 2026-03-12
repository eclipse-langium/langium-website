export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-96px)] w-full overflow-hidden">
      {children}
    </div>
  );
}
