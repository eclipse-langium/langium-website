export function CommunitySection() {
  return (
    <section id="community" className="py-16 sm:py-24 px-10 lg:px-28 sm:px-12">
      <div id="community-title" className="text-center">
        <h2 className="text-2xl tracking-tight sm:text-3xl lg:text-4xl text-gray-900 dark:text-gray-100 mb-6">
          Join the Community
        </h2>
        <div className="flex flex-wrap justify-center gap-6 mt-8">
          <a
            href="https://www.npmjs.com/package/langium"
            target="_blank"
            rel="noreferrer"
            className="footer-item flex flex-col items-center"
          >
            <img src="/assets/npm-square-red-1.svg" alt="npm" className="h-12 w-auto" />
          </a>
          <a
            href="https://github.com/eclipse-langium/langium"
            target="_blank"
            rel="noreferrer"
            className="footer-item flex flex-col items-center"
          >
            <img src="/assets/GitHub-Mark-Light-120px-plus.png" alt="GitHub" className="h-12 w-auto" />
          </a>
          <a
            href="https://discord.gg/langium"
            target="_blank"
            rel="noreferrer"
            className="footer-item flex flex-col items-center"
          >
            <img src="/assets/discord-logo.svg" alt="Discord" className="h-12 w-auto" />
          </a>
        </div>
      </div>
    </section>
  );
}
