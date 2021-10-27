// const aboutId = '#about';
// const aboutBtn = document.querySelector(aboutId + '-link');
// aboutBtn.addEventListener('click', () => {
//     gsap.to(window, {
//         duration: 1,
//         ease: "expo", 
//         scrollTo: aboutId
//     });
// });


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

// About title animation
const title = document.querySelector('#about-title');
const titleEnd = getEndVal(title);
title.style.paddingTop = '500px';
gsap.to('#about-title', {
    paddingTop: titleEnd,
    scrollTrigger: {
        trigger: '#about',
        start: '10% bottom',
        toggleActions: 'play none none reverse'
    }
})

// About item animation
const aboutItems = document.querySelectorAll('.about-item');
aboutItems.forEach((item, index) => {
    item.style.paddingTop = '500px';
    gsap.to(item, {
        paddingTop: 0,
        scrollTrigger: {
            trigger: '#about',
            start: `${220+150*index}px bottom`,
            toggleActions: 'play none none reverse'
        }
    });
});