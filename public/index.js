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

// Icon Box animation
function animateIconBox(container, start) {
    const itemContainer = document.querySelectorAll(`.${container}-item-container`);
    itemContainer.forEach((container, index) => {
        const item = container.firstElementChild;
        item.style.top = '500px';
        gsap.to(item, {
            top: 0,
            scrollTrigger: {
                trigger: container,
                start: `${start ? start(index) : (100 + (80 * (index % 3)))}px bottom`,
                toggleActions: 'play none none reverse'
            }
        });
    });
}
animateIconBox('about');
animateIconBox('compare');
animateIconBox('feature', index => 30 * index);

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
            start: '50% bottom',
            toggleActions: 'play none none reverse'
        }
    });
}

['feature-carussel', 'compare-text'].forEach(id => opacityPartsAnimation(id));

// Feature carussel scroll action
const carussel = document.querySelector('#feature-carussel');
gsap.to(carussel, {
    duration: 5.0,
    ease: 'power2',
    scrollTrigger: {
        trigger: carussel,
        start: '50% bottom',
        toggleActions: 'play none none reverse'
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
            start: '40px bottom',
            toggleAction: 'play none none reverse'
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
        delay: 0.2*index,
        scrollTrigger: {
            trigger: footerItem,
            start: '100px bottom',
            toggleAction: 'play none none reverse'
        }
    })
});
