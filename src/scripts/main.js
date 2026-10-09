import '../styles/fonts.css';
import '../styles/main.scss';
import { initLoader } from './modules/loader.js';
import { initNavigation } from './modules/navigation.js';
import { initSmoothScroll } from './modules/smoothScroll.js';
import { initParallax } from './modules/parallax.js';
import { initLineReveal } from './modules/lineReveal.js';
import { initAnimateOnScroll } from './modules/animateOnScroll.js';
import { initLivingCarousel } from './modules/livingCarousel.js';
import { initArchitectureReveal } from './modules/architectureReveal.js';
import { initFooter } from './modules/footer.js';
import { initHeroSequence } from './modules/heroSequence.js';
import { initHome } from './pages/home.js';
import { initAbout } from './pages/about.js';
import { initContact } from './pages/contact.js';

const page = document.body?.dataset.page ?? 'home';

document.documentElement.dataset.page = page;

initLoader();
initNavigation();
initSmoothScroll();
initParallax();
initLineReveal();
initAnimateOnScroll();
initFooter();

if (page === 'home' || page === 'about') {
  initHome();
  initLivingCarousel();
  initArchitectureReveal();
}

if (page === 'home') {
  initHeroSequence();
}

if (page === 'about') {
  initAbout();
}

if (page === 'contact') {
  initContact();
}
