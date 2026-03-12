export function Footer() {
  return (
    <footer
      id="website-footer"
      className="font-mono block md:flex md:flex-wrap dark:text-gray-100 justify-center items-center mt-12 mb-6"
    >
      <div className="px-4 block text-left md:text-center m-4" style={{ width: 180 }}>
        <a href="https://projects.eclipse.org/projects/ecd.langium/" className="hover:underline">About</a>
      </div>
      <span className="text-lg hidden md:inline">|</span>
      <div className="px-4 block text-left md:text-center m-4" style={{ width: 180 }}>
        <a href="http://www.eclipse.org/legal/privacy.php" className="hover:underline">Privacy Policy</a>
      </div>
      <span className="text-lg hidden md:inline">|</span>
      <div className="px-4 block text-left md:text-center m-4" style={{ width: 180 }}>
        <a href="http://www.eclipse.org/legal/termsofuse.php" className="hover:underline">Terms of Use</a>
      </div>
      <span className="text-lg hidden md:inline">|</span>
      <div className="px-4 block text-left md:text-center m-4" style={{ width: 180 }}>
        <a href="http://www.eclipse.org/legal/copyright.php" className="hover:underline">Copyright Agent</a>
      </div>
      <div className="basis-full h-0" />
      <div className="px-4 block text-left md:text-center">
        © 2024 by{' '}
        <a href="https://www.eclipse.org/org/" target="_blank" rel="noreferrer" className="hover:underline">
          Eclipse Foundation
        </a>
      </div>
    </footer>
  );
}
