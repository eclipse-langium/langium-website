// Teaser BG parallax effect
const teaser = gsap.utils.selector('#teaser');
const teaserBg = teaser('.teaser-bg');
console.log("innerheight", innerHeight);
teaserBg[0].style.backgroundPosition = "50% 0";
gsap.to(teaserBg, {
    backgroundPosition: `50% -450px`,
    ease: "none",
    scrollTrigger: {
        scrub: true
    }
});

// Enter animations
function getEndVal(el) {
    const style = getComputedStyle(el);
    const end = style.paddingTop;
    return end;
}

// title animations
function animateTitle(name) {
    const containerId = `#${name}-title-container`;
    const titleContainer = document.querySelector(containerId);
    const title = titleContainer.firstElementChild;
    title.style.top = '200px';
    gsap.to(`#${name}-title`, {
        top: 0,
        scrollTrigger: {
            trigger: containerId,
            start: '180px bottom',
            toggleActions: 'play none none reverse'
        }
    });
}
['about', 'features', 'compare'].forEach(name => animateTitle(name));

// About item animation
const aboutItemContainer = document.querySelectorAll('.about-item-container');
aboutItemContainer.forEach((container, index) => {
    const item = container.firstElementChild;
    item.style.top = '500px';
    gsap.to(item, {
        top: 0,
        scrollTrigger: {
            trigger: container,
            start: `${100 + (80 * (index % 3))}px bottom`,
            toggleActions: 'play none none reverse'
        }
    });
});

// Feature direction button animation
const featureDirection = document.querySelectorAll('.feature-direction');
featureDirection.forEach((container, index) => {
    const item = container.firstElementChild;

    const toObj = {
        scrollTrigger: {
            trigger: container,
            start: `${100 + (80 * (index % 3))}px bottom`,
            toggleActions: 'play none none reverse'
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

// Features opacity animation
function opacityPartsAnimation(name) {
    const el = document.querySelector('#' + name);
        el.style.opacity = '0.0';
        gsap.to(el, {
            opacity: 1.0,
            duration: 2.5,
            scrollTrigger: {
                trigger: el,
                start: '20px bottom',
                toggleActions: 'play none none reverse'
            }
        });
}

['feature-carussel', 'compare-text'].forEach(id => opacityPartsAnimation(id));