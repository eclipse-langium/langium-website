import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Showcase',
  description: 'Example languages created using Langium, all running in the browser.',
};

const showcaseItems = [
  {
    slug: 'statemachine',
    title: 'State Machine',
    img: '/assets/Langium_Statemachine.svg',
    description: 'A language that captures the functionality of a state machine. Demonstrated by modeling a traffic light.',
  },
  {
    slug: 'minilogo',
    title: 'MiniLogo',
    img: '/assets/Langium_MiniLogo.svg',
    description: 'A miniature version of the Logo programming language for drawing graphics in the browser.',
  },
  {
    slug: 'domainmodel',
    title: 'Domain Model',
    img: '/assets/Langium_DomainModel.svg',
    description: 'A language to describe simple class-based domain models, visualized as a tree.',
  },
  {
    slug: 'arithmetics',
    title: 'Arithmetics',
    img: '/assets/Langium_Arithmetics.svg',
    description: 'A simple arithmetic expression language with real-time evaluation.',
  },
  {
    slug: 'sql',
    title: 'SQL',
    img: '/assets/Langium_SQL.svg',
    description: 'A subset of SQL with schema-driven validation and syntax highlighting.',
  },
  {
    title: 'OpenAPI DSL',
    img: '/assets/Langium_OpenAPI.svg',
    description: 'A domain-specific language for describing OpenAPI specifications.',
    externalUrl: 'https://bestsolution-at.github.io/openapi-dsl/',
  },
];

export default function ShowcasePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h2 className="text-center text-white text-3xl mb-6">Showcase</h2>
      <p className="text-center text-white mb-12 mx-12">
        Welcome to Langium&apos;s showcase! Here you can find examples of languages created using Langium,
        all running in the browser (no backend involved).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcaseItems.map((item) => {
          const href = item.externalUrl ?? `/showcase/${item.slug}/`;
          const isExternal = !!item.externalUrl;
          return (
            <a
              key={item.slug ?? item.title}
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="group block rounded-xl border-2 border-emerald-langium bg-emerald-langium-darker hover:border-accent-blue transition-colors p-4"
            >
              <div className="flex items-center justify-center h-32 mb-4">
                <Image
                  src={item.img}
                  alt={item.title}
                  width={120}
                  height={120}
                  className="object-contain h-full w-auto"
                  unoptimized
                />
              </div>
              <h3 className="text-white text-lg font-medium text-center mb-2">{item.title}</h3>
              <p className="text-gray-300 text-sm line-clamp-3 text-center">{item.description}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
