import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $ } from '../core/dom.js';
import { debounce } from '../core/events.js';
import { dismissLoader } from './loader.js';
import { getLenis } from './smoothScroll.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero frame sequence. Frames live in `public/site/hero-images` (webp).
 * Locally the repo root is the web root, so that folder is
 * `public/site/hero-images`. On Laravel, `public/` is the web root and this
 * bundle is served from `/site/dist/js/main.js`, so the same folder is
 * `/site/hero-images`. `data-hero-path` on `[data-hero-sequence]` overrides both.
 * Lenis ↔ ScrollTrigger sync already lives in initSmoothScroll().
 */
const HERO_SEQUENCE = {
  frameCount: 218,
  extension: 'webp',
  scrollLength: '500vh',
  scrub: 0.4,
  concurrency: 10,
  maxDpr: 2,
};

const LOCAL_FRAME_PREFIX = 'public/site/hero-images/frame_';

let framePrefix = LOCAL_FRAME_PREFIX;

/** Captured while this classic bundle is still executing. */
const entryScriptSrc = (() => {
  if (document.currentScript?.src) {
    return document.currentScript.src;
  }

  const script = Array.from(document.scripts).find((node) =>
    /\/dist\/js\/main\.js(?:[?#]|$)/.test(node.src),
  );

  return script?.src || '';
})();

const state = { frame: 0 };

let canvas = null;
let ctx = null;
let frames = [];
let tween = null;
let drawnFrame = -1;
let destroyed = false;
let active = false;

let onResize = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Local pages request `public/site/hero-images/frame_0001.webp`.
 * Once the bundle is loaded from `/site/dist/js/main.js`, frames are requested
 * from the sibling folder `/site/hero-images/`.
 */
function resolveFramePrefix(root) {
  const explicit = root?.getAttribute('data-hero-path')?.trim();

  if (explicit) {
    return explicit;
  }

  if (/\/site\/dist\/js\/main\.js(?:[?#]|$)/.test(entryScriptSrc)) {
    return entryScriptSrc.replace(/dist\/js\/main\.js(?:[?#].*)?$/, 'hero-images/frame_');
  }

  return LOCAL_FRAME_PREFIX;
}

function frameUrl(index) {
  const number = String(index + 1).padStart(4, '0');
  return `${framePrefix}${number}.${HERO_SEQUENCE.extension}`;
}

function closeBitmap(bitmap) {
  if (bitmap && typeof bitmap.close === 'function') {
    bitmap.close();
  }
}

function decodeImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      img
        .decode()
        .then(() => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        })
        .catch(() => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not decode frame'));
        });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode frame'));
    };

    img.src = objectUrl;
  });
}

async function loadBitmap(url, highPriority = false) {
  const response = await fetch(url, highPriority ? { priority: 'high' } : undefined);

  if (!response.ok) {
    throw new Error('Frame request failed');
  }

  const blob = await response.blob();

  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      return decodeImage(blob);
    }
  }

  return decodeImage(blob);
}

async function loadFrame(url, highPriority = false) {
  try {
    const bitmap = await loadBitmap(url, highPriority);
    return bitmap;
  } catch {
    const bitmap = await loadBitmap(url, highPriority);
    return bitmap;
  }
}

/** A frame that fails twice reuses the nearest decoded bitmap so playback never gaps. */
function resolveFrames(list) {
  const resolved = list.slice();
  let previous = null;

  resolved.forEach((bitmap, index) => {
    if (bitmap) {
      previous = bitmap;
      return;
    }

    if (previous) {
      resolved[index] = previous;
    }
  });

  const fallback = resolved.find(Boolean);

  if (!fallback) {
    return resolved;
  }

  return resolved.map((bitmap) => bitmap || fallback);
}

function setProgress(loaded, total) {
  const label = $('[data-loader-progress]');

  if (!label) {
    return;
  }

  const percent = Math.min(100, Math.round((loaded / total) * 100));
  label.textContent = `Loading... ${percent}%`;
}

function drawFrame(index) {
  const source = frames[index];

  if (!ctx || !source || destroyed) {
    return;
  }

  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;

  if (!sourceWidth || !sourceHeight) {
    return;
  }

  const { width, height } = canvas;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  drawnFrame = index;
}

function resizeCanvas() {
  if (!canvas || destroyed) {
    return;
  }

  const rect = canvas.getBoundingClientRect();

  if (rect.width < 1 || rect.height < 1) {
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, HERO_SEQUENCE.maxDpr);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    drawnFrame = -1;
  }

  const index = Math.min(
    Math.max(frames.length - 1, 0),
    Math.max(0, Math.round(state.frame)),
  );

  if (frames[index]) {
    drawFrame(index);
  }
}

onResize = debounce(() => {
  if (destroyed) {
    return;
  }

  resizeCanvas();
  ScrollTrigger.refresh();
}, 150);

function renderFrame() {
  if (destroyed || !frames.length) {
    return;
  }

  const index = Math.min(frames.length - 1, Math.max(0, Math.round(state.frame)));

  if (index === drawnFrame || !frames[index]) {
    return;
  }

  drawFrame(index);
}

function preloadFrames() {
  const { frameCount, concurrency } = HERO_SEQUENCE;
  let settled = 0;
  let cursor = 1;

  frames = new Array(frameCount);

  function store(index, bitmap) {
    if (destroyed) {
      closeBitmap(bitmap);
      return;
    }

    frames[index] = bitmap;
    settled += 1;
    setProgress(settled, frameCount);

    if (!bitmap) {
      return;
    }

    // Paint the first decoded frame under the loader; don't flash the rest.
    if (index === 0 || drawnFrame < 0) {
      resizeCanvas();
      drawFrame(index);
    }
  }

  function pump() {
    if (destroyed || cursor >= frameCount) {
      return Promise.resolve();
    }

    const index = cursor;
    cursor += 1;

    return loadFrame(frameUrl(index))
      .then((bitmap) => {
        store(index, bitmap);
      })
      .catch(() => {
        store(index, null);
      })
      .then(pump);
  }

  return loadFrame(frameUrl(0), true)
    .then((bitmap) => {
      store(0, bitmap);
    })
    .catch(() => {
      store(0, null);
    })
    .then(() => {
      if (destroyed) {
        return Promise.resolve();
      }

      const workers = Math.min(concurrency, Math.max(0, frameCount - 1));
      return Promise.all(Array.from({ length: workers }, () => pump()));
    })
    .then(() => {
      if (destroyed) {
        return;
      }

      frames = resolveFrames(frames);
      drawnFrame = -1;
      resizeCanvas();
    });
}

function applyScrollLength() {
  const track = $('[data-hero-track]');

  if (!track) {
    return;
  }

  track.style.height = prefersReducedMotion() ? '0px' : HERO_SEQUENCE.scrollLength;
}

function lockScroll() {
  document.documentElement.classList.add('is-loading');
  document.body.classList.add('is-loading');

  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
    lenis.stop();
  }

  window.scrollTo(0, 0);
}

function unlockScroll() {
  const lenis = getLenis();

  if (lenis) {
    lenis.start();
  }

  ScrollTrigger.refresh();
}

/**
 * The hero is position: sticky, so it is a bad ScrollTrigger (its rect sticks
 * to the viewport). The track is in normal flow: its top meets the viewport
 * bottom at scroll 0, and its bottom meeting the viewport bottom is 500vh later.
 */
function initScrollTrigger() {
  const track = $('[data-hero-track]');

  if (!track || prefersReducedMotion()) {
    return;
  }

  tween = gsap.fromTo(
    state,
    { frame: 0 },
    {
      frame: HERO_SEQUENCE.frameCount - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: HERO_SEQUENCE.scrub,
      },
      onUpdate: renderFrame,
    },
  );
}

function closeBitmaps() {
  const seen = new Set();

  frames.forEach((bitmap) => {
    if (!bitmap || seen.has(bitmap)) {
      return;
    }

    seen.add(bitmap);
    closeBitmap(bitmap);
  });

  frames = [];
  drawnFrame = -1;
}

function mountStill() {
  loadFrame(frameUrl(0), true)
    .then((bitmap) => {
      if (destroyed) {
        closeBitmap(bitmap);
        return;
      }

      frames = [bitmap];
      resizeCanvas();
      drawFrame(0);
    })
    .catch(() => {
      // The hero keeps its flat background color when the still frame fails.
    });
}

function reveal() {
  if (destroyed) {
    return Promise.resolve();
  }

  initScrollTrigger();

  return dismissLoader().then(() => {
    if (destroyed) {
      return;
    }

    unlockScroll();
  });
}

function destroy() {
  if (!active) {
    return;
  }

  destroyed = true;
  active = false;

  if (onResize) {
    window.removeEventListener('resize', onResize);
  }

  if (tween) {
    if (tween.scrollTrigger) {
      tween.scrollTrigger.kill();
    }
    tween.kill();
    tween = null;
  }

  closeBitmaps();
  ctx = null;
  canvas = null;
  unlockScroll();
  dismissLoader();
}

/**
 * Decodes every hero frame before scroll is enabled, then scrubs them on the canvas.
 * Returns a controller with `destroy()`.
 */
export function initHeroSequence() {
  const root = $('[data-hero-sequence]');
  const nextCanvas = $('[data-hero-canvas]');

  if (!root || !nextCanvas || active) {
    return { destroy };
  }

  active = true;
  destroyed = false;
  state.frame = 0;
  drawnFrame = -1;
  framePrefix = resolveFramePrefix(root);
  canvas = nextCanvas;
  ctx = canvas.getContext('2d');
  applyScrollLength();
  window.addEventListener('resize', onResize);

  if (!ctx) {
    dismissLoader().then(unlockScroll);
    return { destroy };
  }

  resizeCanvas();

  if (prefersReducedMotion()) {
    mountStill();
    return { destroy };
  }

  lockScroll();

  preloadFrames()
    .then(reveal)
    .catch(() => reveal());

  return { destroy };
}
