'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CommunitySection } from '@/components/home/CommunitySection';

const aboutItems = [
  { icon: '/assets/TypeScript.svg', iconClass: 'h-20', title: '_ TypeScript integration', text: 'Langium generates a typed abstract syntax tree (AST) definition that perfectly fits your grammar and provides utility functions to help you navigate and process the AST.' },
  { icon: '/assets/experience.svg', iconClass: 'h-40', title: '_ Quality based on experience', text: 'Langium was developed on the basis of years of practical use of Xtext, which is an integral part of numerous projects and products worldwide.' },
  { icon: '/assets/low barrier.svg', iconClass: 'h-32', title: '_ Low barrier to entry', text: 'The main goal of Langium is to lower the barrier of creating a DSL or low-code platform. We achieve this by providing a special DSL that describes the syntax and structure of your language.' },
  { icon: '/assets/everywere.png', iconClass: 'h-36', title: '_ Your language, everywhere', text: 'Built exclusively on web technologies, Langium is not only available for Node.js based environments but works just as well in your browser.' },
  { icon: '/assets/Customize.svg', iconClass: 'h-20', title: '_ Lean by default, customizable by design', text: 'Exploiting the power of the Language Server Protocol, Langium provides useful default implementations for most features.' },
  { icon: '/assets/Versatile.svg', iconClass: 'h-40', title: '_ Versatile use', text: 'You can easily package a Langium-based DSL as a command line interface (CLI) to create a rich set of interconnected tools.' },
];

const featureItems = [
  { title: '_ Simple and direct integration', accent: 'dark:text-accent-violet', text: '.... with the VS Code extension API' },
  { title: '_ Well-known technology stack', accent: 'dark:text-accent-blue', text: '.... implemented in TypeScript, runs in Node.js' },
  { title: '_ Proven quality on a next level', accent: 'dark:text-accent-green', text: '.... with a grammar declaration language similar to Xtext' },
  { title: '_ Declarative approach', accent: 'dark:text-accent-violet', text: '.... derives a parser and abstract syntax tree from a grammar declaration' },
  { title: '_ High performance', accent: 'dark:text-accent-blue', text: '... by using Chevrotain—the blazing fast parser library—under the hood' },
  { title: '_ Scale it', accent: 'dark:text-accent-green', text: '.... with high out-of-the-box functionality and high extensibility' },
];

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 640px)').matches;
    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/ScrollToPlugin'),
      import('gsap/Draggable'),
    ]).then(([gsapMod, stMod, stoMod, dragMod]) => {
      const gsap = gsapMod.gsap;
      const { ScrollTrigger } = stMod;
      const { ScrollToPlugin } = stoMod;
      const { Draggable } = dragMod;
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Draggable);

      if (isDesktop) {
        const teaserBg = document.querySelector<HTMLElement>('.teaser-bg');
        if (teaserBg) {
          teaserBg.style.backgroundPosition = '50% 0';
          gsap.to(teaserBg, { backgroundPosition: '50% -450px', ease: 'none', scrollTrigger: { scrub: true } });
        }
        ['about', 'features', 'compare'].forEach((name) => {
          const titleContainer = document.querySelector<HTMLElement>(`#${name}-title-container`);
          const content = document.querySelector<HTMLElement>(`#${name}-content`);
          const title = document.querySelector<HTMLElement>(`#${name}-title`);
          if (!titleContainer || !title) return;
          title.style.top = '200px';
          gsap.to(title, { top: 0, scrollTrigger: { trigger: titleContainer, start: '180px bottom' }, onComplete: () => { titleContainer.style.height = 'auto'; title.style.position = 'relative'; if (content) content.style.marginTop = '0px'; } });
        });
        const animateIconBox = (cls: string, delayFn?: (i: number) => number) => {
          document.querySelectorAll<HTMLElement>(`.${cls}-item-container`).forEach((el, i) => {
            const item = el.firstElementChild as HTMLElement;
            if (!item) return;
            item.style.top = '500px';
            gsap.to(item, { top: 0, duration: 0.8, ease: 'power3', delay: delayFn ? delayFn(i) : 0, scrollTrigger: { trigger: el, start: `${100 + 80 * (i % 3)}px bottom` } });
          });
        };
        animateIconBox('about');
        animateIconBox('compare', (i) => 0.15 * i);
        animateIconBox('feature', (i) => 0.15 * i);
        ['feature-carussel', 'compare-content'].forEach((id) => {
          const el = document.querySelector<HTMLElement>(`#${id}`);
          if (!el) return;
          el.style.opacity = '0';
          gsap.to(el, { opacity: 1, duration: 5, ease: 'expo', scrollTrigger: { trigger: el, start: '50% bottom' } });
        });
        document.querySelectorAll<HTMLElement>('.animText').forEach((el, i) => {
          el.style.opacity = '0';
          gsap.to(el, { opacity: 1, duration: 4, ease: 'power3', delay: i * 0.08, scrollTrigger: { trigger: el, start: '40px bottom' } });
        });
        document.querySelector('#scroll-down')?.addEventListener('click', () => {
          gsap.to(window, { duration: 1.5, ease: 'power3', scrollTo: { y: '#about', autoKill: true } });
        });
      } else {
        document.querySelectorAll<HTMLElement>('.about-item, .compare-item').forEach((el) => {
          const text = el.querySelector<HTMLElement>('.item-text');
          if (!text) return;
          text.style.display = 'none';
          el.addEventListener('click', () => { text.style.display = text.style.display === 'none' ? 'flex' : 'none'; });
        });
      }
    });
  }, []);

  return (
    <div ref={pageRef}>
      {/* Teaser */}
      <section id="teaser" className="relative sm:h-teaser">
        <div className="teaser-bg absolute top-0 left-0 w-full sm:h-full sm:dark:bg-emerald-langium-darkest sm:bg-[url('/assets/office.jpg')] bg-fixed bg-blend-multiply bg-cover bg-center bg-no-repeat" />
        <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:pt-32 lg:px-8">
          <h2 className="text-center text-2xl tracking-tight sm:text-3xl lg:text-4xl">
            <span className="block lg:inline dark:text-gray-100">Built to bring</span>{' '}
            <span className="block lg:inline dark:text-emerald-langium">language engineering</span>{' '}
            <span className="block lg:inline dark:text-gray-100">to</span>
            <span className="ml-10 flex items-center justify-center dark:text-emerald-langium">
              the next level<span className="dark:text-gray-100">_</span>
              <Image className="pb-2" src="/assets/nib.svg" alt="" width={40} height={40} />
            </span>
          </h2>
          <p className="mt-6 max-w-lg mx-auto text-center dark:text-gray-100 sm:max-w-3xl">
            Langium is an open source language engineering tool with first-class support for the{' '}
            <span className="text-accent-green">Language Server Protocol</span>, written in{' '}
            <span className="text-accent-violet">TypeScript</span> and running in{' '}
            <span className="text-accent-blue">Node.js</span>.
            <br /><br />
            This future-proof technology stack enables domain-specific languages<br />
            in VS Code, Eclipse Theia, web applications, and more.
          </p>
        </div>
        <div className="relative sm:flex justify-center items-center pt-10 text-base">
          <div className="mx-2 max-w-sm h-14 sm:max-w-none sm:flex sm:justify-center">
            <Link href="/playground/" className="rounded-xl flex items-center justify-center px-4 py-3 border-2 border-emerald-langium font-medium text-gray-100 hover:bg-emerald-langium bg-emerald-langium sm:bg-transparent sm:px-8">Try it!</Link>
          </div>
          <div className="mt-2 sm:mt-0 mx-2 max-w-sm h-14 sm:max-w-none sm:flex sm:justify-center">
            <Link href="/docs/learn/workflow/" className="rounded-xl flex items-center justify-center px-4 py-3 border-2 border-emerald-langium font-medium text-gray-100 hover:bg-emerald-langium bg-emerald-langium sm:bg-transparent sm:px-8">Learn</Link>
          </div>
          <div id="scroll-down" className="mx-2 hidden cursor-pointer relative sm:flex">
            <svg className="w-14 h-14" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(0.965517,0,0,0.965517,1.03448,1.03448)">
                <circle cx="30" cy="30" r="29" style={{ fill: 'none', stroke: 'white', strokeWidth: 2 }} />
              </g>
              <g transform="matrix(0.535417,0.535417,-0.535417,0.535417,30,-2.72295)">
                <path d="M14.5,45.5L45.5,45.5L45.5,14.5" style={{ fill: 'none', stroke: 'white', strokeWidth: 3 }} />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about">
        <div id="about-title-container" className="relative sm:h-80 sm:overflow-hidden">
          <div id="about-title" className="sm:absolute sm:left-0 pt-16 pb-4 px-6 py-8 sm:px-10 lg:pt-16 lg:px-16">
            <h2 className="text-gray-900 dark:text-gray-100 text-2xl tracking-tight sm:text-3xl lg:text-4xl text-center sm:text-left">Why Langium?</h2>
          </div>
        </div>
        <div id="about-content" className="sm:-mt-48 grid gap-8 px-16 lg:px-28 sm:px-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {aboutItems.map((item, i) => (
            <div key={i} className="about-item-container">
              <div className="about-item">
                <div className="about-item-icon-container">
                  <Image src={item.icon} alt="" className={item.iconClass} width={80} height={80} unoptimized />
                </div>
                <h3 className="about-item-title">{item.title}</h3>
                <div className="item-text"><p>{item.text}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <div id="features">
        <div id="features-title-container" className="relative sm:h-80 sm:overflow-hidden">
          <div id="features-title" className="sm:absolute sm:left-0 pt-16 pb-4 px-6 sm:px-10 lg:pt-16 lg:px-16">
            <h2 className="text-gray-900 dark:text-gray-100 text-2xl tracking-tight sm:text-3xl lg:text-4xl">Features</h2>
          </div>
        </div>
        <div id="features-content" className="sm:-mt-40">
          <div className="flex h-60 sm:h-44 overflow-hidden">
            <div id="features-left" className="feature-direction w-120 cursor-pointer sm:w-48 relative sm:overflow-hidden">
              <div className="sm:absolute right-0 h-full w-16 p-2 flex items-center justify-center">
                <Image src="/assets/carousel-left-light.svg" alt="Previous" width={32} height={32} />
              </div>
            </div>
            <div id="feature-carussel" className="h-full mx-2 w-max overflow-hidden relative flex items-center">
              {featureItems.map((f, i) => (
                <div key={i} className="feature-item-container">
                  <div className="feature-item-content">
                    <h3 className={`mt-6 text-lg font-medium text-gray-100 tracking-tight ${f.accent}`}>{f.title}</h3>
                    <p className="mt-6 text-base text-gray-100 font-body tracking-wide">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div id="features-right" className="feature-direction w-120 sm:w-48 cursor-pointer relative sm:overflow-hidden">
              <div className="sm:absolute left-0 h-full w-16 p-2 flex items-center justify-center">
                <Image src="/assets/carousel-right-light.svg" alt="Next" width={32} height={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Langium vs Xtext */}
      <div id="VS">
        <div id="compare-title-container" className="relative sm:h-80 sm:overflow-hidden">
          <div id="compare-title" className="sm:absolute sm:left-0 pt-20 px-6 sm:px-10 lg:pt-28 lg:px-16">
            <h2 className="text-gray-900 dark:text-gray-100 text-2xl tracking-tight sm:text-3xl lg:text-4xl">Langium vs. Xtext</h2>
          </div>
        </div>
        <p id="compare-content" className="sm:-mt-40 font-body px-10 lg:px-28 sm:px-12 dark:text-gray-100">
          Despite its age, <a className="external-link" href="https://www.eclipse.org/Xtext/" target="_blank" rel="noreferrer">Xtext</a> is still an excellent basis for building languages and related tools with a Java technology stack.<br /><br />
          This is why Langium has been created. It enables language engineering in <a className="external-link" href="https://www.typescriptlang.org" target="_blank" rel="noreferrer">TypeScript</a>.<br /><br />
          The differences at a glance:
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 px-10 lg:px-28 sm:px-40 lg:grid-cols-2">
        {[{ icon: '/assets/clear.svg', title: '_ Langium is clear', text: 'Building a tool that uses an Xtext-based language server with VS Code or Theia means creating a hybrid technology stack. Langium uses a coherent, pure TypeScript technology stack.' }, { icon: '/assets/simple.svg', title: '_ Langium is simple', text: 'Xtext is heavily based on EMF. Langium uses the simplest possible solution to describe an AST: TypeScript interfaces.' }].map((item, i) => (
          <div key={i} className="compare-item-container relative h-80 sm:h-120 sm:overflow-hidden">
            <div className="compare-item sm:absolute flow-root px-6">
              <div className="flex items-center justify-center">
                <Image className="mt-8 w-auto" style={{ height: '9rem' }} src={item.icon} alt="" width={144} height={144} unoptimized />
              </div>
              <h3 className="text-center sm:text-left mt-10 text-lg font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
              <div className="item-text sm:mt-10"><p>{item.text}</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="py-16 sm:py-24 lg:pt-8 lg:pb-10 px-10 lg:px-28 sm:px-12">
        <h3 className="text-gray-900 dark:text-gray-100 tracking-tight text-base text-center md:text-lg lg:text-xl">
          <span className="italic">In short</span>{' '}
          {[':', 'Langium', 'wants', 'to', 'keep', 'the', 'concepts', 'that', 'have', 'made', 'Xtext', 'successful,'].map((w, i) => <span key={i} className="animText">{w} </span>)}
          <br />
          {['but', 'lift', 'them', 'onto', 'another', 'platform.'].map((w, i) => <span key={i} className="animText">{w} </span>)}
        </h3>
      </div>

      <CommunitySection />
    </div>
  );
}
