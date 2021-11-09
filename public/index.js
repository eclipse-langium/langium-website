function init(size) {
    if(size !== 'mobile') {
        // Teaser BG parallax effect
        const teaser = gsap.utils.selector('#teaser');
        const teaserBg = teaser('.teaser-bg');
        teaserBg[0].style.backgroundPosition = "50% 0";
        gsap.to(teaserBg, {
            backgroundPosition: `50% -450px`,
            ease: "none",
            scrollTrigger: {
                scrub: true
            }
        });
    
        // title animations
        function animateTitle(name) {
            const containerId = `#${name}-title-container`;
            const contentId = `#${name}-content`;
            const titleContainer = document.querySelector(containerId);
            const content = document.querySelector(contentId);
            const title = titleContainer.firstElementChild;
            title.style.top = '200px';
            gsap.to(`#${name}-title`, {
                top: 0,
                scrollTrigger: {
                    trigger: containerId,
                    start: '180px bottom'
                },
                onComplete: () => {
                    titleContainer.style.height = 'auto';
                    title.style.position = 'relative';
                    content.style.marginTop = '0px';
                }
            });
        }
        ['about', 'features', 'compare'].forEach(name => animateTitle(name));
    
        // Icon Box animation
        function animateIconBox(container, start, delay) {
            const itemContainer = document.querySelectorAll(`.${container}-item-container`);
            itemContainer.forEach((container, index) => {
                const item = container.firstElementChild;
                item.style.top = '500px';
                gsap.to(item, {
                    top: 0,
                    duration: 0.8,
                    ease: 'power3',
                    delay: delay ? delay(index) : 0,
    
                    scrollTrigger: {
                        trigger: container,
                        start: `${start ? start(index) : (100 + (80 * (index % 3)))}px bottom`
                    }
                });
            });
        }
        animateIconBox('about');
        animateIconBox('compare', index => 100, index => 0.15 * index);
        animateIconBox('feature', index => 100, index => 0.15 * index);
    
        // Feature direction button animation
        const featureDirection = document.querySelectorAll('.feature-direction');
        featureDirection.forEach((container, index) => {
            const item = container.firstElementChild;
    
            const toObj = {
                scrollTrigger: {
                    trigger: container,
                    start: `${100 + (80 * (index % (size === 'lg' ? 3 : 2)))}px bottom`
                }
            }
            if (index === 0) {
                item.style.right = '100px';
                toObj['right'] = 0;
            } else {
                item.style.left = '100px';
                toObj['left'] = 0;
            }
            gsap.to(item, toObj);
        });
    
        // Content opacity animation
        function opacityPartsAnimation(name) {
            const el = document.querySelector('#' + name);
            el.style.opacity = '0.0';
            gsap.to(el, {
                opacity: 1.0,
                duration: 5.0,
                ease: 'expo',
                scrollTrigger: {
                    trigger: el,
                    start: '50% bottom'
                }
            });
        }
    
        ['feature-carussel', 'compare-content'].forEach(id => opacityPartsAnimation(id));
    
        // Feature carussel scroll action
        const carussel = document.querySelector('#feature-carussel');
        gsap.to(carussel, {
            duration: 5.0,
            ease: 'power2',
            scrollTrigger: {
                trigger: carussel,
                start: '50% bottom'
            },
            scrollTo: {
                x: 400,
                autoKill: true
            }
        })
    
        // animated opacity
        function animateOpacity(el, additionalProps) {
            const props = Object.assign({
                duration: 4,
                opacity: 1.0,
                ease: 'power3',
                scrollTrigger: {
                    trigger: el,
                    start: '40px bottom'
                }
            }, additionalProps);
            el.style.opacity = 0.0;
            gsap.to(el, props);
        }
        const textParts = document.querySelectorAll('.animText');
        textParts.forEach((textPart, index) => {
            animateOpacity(textPart, {
                delay: index * 0.08
            })
        });
    
        const feder = document.querySelector('#feder');
        animateOpacity(feder);
        const communityTitle = document.querySelector('#community-title');
        animateOpacity(communityTitle);
    
        const footerItems = document.querySelectorAll('.footer-item');
        footerItems.forEach((footerItem, index) => {
            const icon = footerItem.firstChild;
            icon.style.top = "200px";
            gsap.to(icon, {
                top: "0px",
                delay: 0.2 * index,
                scrollTrigger: {
                    trigger: footerItem,
                    start: '100px bottom'
                }
            })
        });
    } else {
        const featureItems = document.querySelectorAll('.feature-item-container');
        featureItems.forEach(e => e.style.minWidth = `${(window.innerWidth - 144)}px`);

        const aboutText = document.querySelectorAll('.about-item');
        const compareText = document.querySelectorAll('.compare-item');
        const forEachText = e => {
            const p = e.querySelector('.item-text');
            p.style.display = 'none';
            e.addEventListener('click', () => {
                p.style.display = p.style.display === 'none' ? 'flex' : 'none';
            });
        };
        aboutText.forEach(forEachText);
        compareText.forEach(forEachText);
    }
}

const sm = window.matchMedia('(min-width: 640px)');
const md = window.matchMedia('(min-width: 768px)');
const lg = window.matchMedia('(min-width: 1024px)');

function mediaChanged() {
    const size = lg.matches ? 'lg' : md.matches ? 'md' :  sm.matches ? 'sm' : 'mobile';
    init(size);
}
mediaChanged();

sm.addEventListener('change', mediaChanged);
md.addEventListener('change', mediaChanged);
lg.addEventListener('change', mediaChanged);

const scrollDown = document.querySelector('#scroll-down');
scrollDown.addEventListener('click', () => {
    gsap.to(window, {
        duration: 1.5,
        ease: 'power3',
        scrollTo: {
            y: "#about",
            autoKill: true
        }
    })
})