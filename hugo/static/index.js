function init(size) {
    if(size !== 'mobile') {
        // Teaser BG parallax effect
        const teaser = gsap.utils.selector('#teaser');
        const teaserBg = teaser('.teaser-bg');
        if(teaserBg && teaserBg.length) {
            teaserBg[0].style.backgroundPosition = "50% 0";
            gsap.to(teaserBg, {
                backgroundPosition: `50% -450px`,
                ease: "none",
                scrollTrigger: {
                    scrub: true
                }
            });
        }
    
        // title animations
        function animateTitle(name) {
            const containerId = `#${name}-title-container`;
            const contentId = `#${name}-content`;
            const titleContainer = document.querySelector(containerId);
            if(titleContainer) {
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
            if(el && el.style) el.style.opacity = '0.0';
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
            if(el && el.style) el.style.opacity = 0.0;
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
scrollDown?.addEventListener('click', () => {
    gsap.to(window, {
        duration: 1.5,
        ease: 'power3',
        scrollTo: {
            y: "#about",
            autoKill: true
        }
    })
})

gsap.registerPlugin(Draggable);

const wrapper = document.querySelector(".feature-carussel");
const boxes = gsap.utils.toArray(".feature-item-container");

if(Array.isArray(boxes) && boxes.length && boxes.every(b => b && 'offsetLeft' in b)) {
    const loop = horizontalLoop(boxes, {paused: true, draggable: true});
    boxes.forEach((box, i) => box.addEventListener("click", () => loop.toIndex(i, {duration: 0.8, ease: "power1.inOut"})));    
    document.querySelector("#features-right")?.addEventListener("click", () => loop.next({duration: 0.4, ease: "power1.inOut"}));
    document.querySelector("#features-left")?.addEventListener("click", () => loop.previous({duration: 0.4, ease: "power1.inOut"}));
}

// copied from here: https://greensock.com/docs/v3/HelperFunctions
/*
This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.

Features:
 - Uses xPercent so that even if the widths change (like if the window gets resized), it should still work in most cases.
 - When each item animates to the left or right enough, it will loop back to the other side
 - Optionally pass in a config object with values like draggable: true, speed (default: 1, which travels at roughly 100 pixels per second), paused (boolean), repeat, reversed, and paddingRight.
 - The returned timeline will have the following methods added to it:
   - next() - animates to the next element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - previous() - animates to the previous element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - toIndex() - pass in a zero-based index value of the element that it should animate to, and optionally pass in a vars object to control duration, easing, etc. Always goes in the shortest direction
   - current() - returns the current index (if an animation is in-progress, it reflects the final index)
   - times - an Array of the times on the timeline where each element hits the "starting" spot. There's also a label added accordingly, so "label1" is when the 2nd element reaches the start.
 */
function horizontalLoop(items, config) {
	items = gsap.utils.toArray(items);
	config = config || {};
	let tl = gsap.timeline({repeat: config.repeat, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
		length = items.length,
		startX = items[0].offsetLeft,
		times = [],
		widths = [],
		xPercents = [],
		curIndex = 0,
		pixelsPerSecond = (config.speed || 1) * 100,
		snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
		populateWidths = () => items.forEach((el, i) => {
      widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
      xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
    }),
    getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      totalWidth, curX, distanceToStart, distanceToLoop, item, i;
	populateWidths();
  gsap.set(items, { // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
		xPercent: i => xPercents[i]
	});
	gsap.set(items, {x: 0});
	totalWidth = getTotalWidth();
	for (i = 0; i < length; i++) {
		item = items[i];
		curX = xPercents[i] / 100 * widths[i];
		distanceToStart = item.offsetLeft + curX - startX;
		distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
		tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
		  .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
		  .add("label" + i, distanceToStart / pixelsPerSecond);
		times[i] = distanceToStart / pixelsPerSecond;
	}
	function toIndex(index, vars) {
		vars = vars || {};
		(Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
		let newIndex = gsap.utils.wrap(0, length, index),
			time = times[newIndex];
		if (time > tl.time() !== index > curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
			vars.modifiers = {time: gsap.utils.wrap(0, tl.duration())};
			time += tl.duration() * (index > curIndex ? 1 : -1);
		}
		curIndex = newIndex;
		vars.overwrite = true;
		return tl.tweenTo(time, vars);
	}
	tl.next = vars => toIndex(curIndex+1, vars);
	tl.previous = vars => toIndex(curIndex-1, vars);
	tl.current = () => curIndex;
	tl.toIndex = (index, vars) => toIndex(index, vars);
  tl.updateIndex = () => curIndex = Math.round(tl.progress() * (items.length - 1));
	tl.times = times;
  tl.progress(1, true).progress(0, true); // pre-render for performance
  if (config.reversed) {
    tl.vars.onReverseComplete();
    tl.reverse();
  }
  if (config.draggable && typeof(Draggable) === "function") {
    let proxy = document.createElement("div"),
        wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, roundFactor,
        align = () => loop.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
        syncIndex = () => tl.updateIndex();
    draggable = Draggable.create(proxy, {
      trigger: "#feature-carussel",
      type: "x",
      onPress() {
        startProgress = loop.progress();
        loop.progress(0);
        populateWidths();
        totalWidth = getTotalWidth();
        ratio = 1 / totalWidth;
        dragSnap = totalWidth / items.length;
        roundFactor = Math.pow(10, ((dragSnap + "").split(".")[1] || "").length);
        loop.progress(startProgress);
      },
      onDrag: align,
      onThrowUpdate: align,
      snap: value => {
        let n = Math.round(parseFloat(value) / dragSnap) * dragSnap * roundFactor;
        return (n - n % 1) / roundFactor;
      },
      onRelease: syncIndex,
      onThrowComplete: () => gsap.set(proxy, {x: 0}) && syncIndex()
    })[0];
  }
  
	return tl;
}