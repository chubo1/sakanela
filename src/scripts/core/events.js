export function debounce(fn, wait = 150) {
  let timer;

  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 150) {
  let last = 0;
  let timer;

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);

    if (remaining <= 0) {
      window.clearTimeout(timer);
      last = now;
      fn(...args);
      return;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      last = Date.now();
      fn(...args);
    }, remaining);
  };
}

export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);

  return () => target.removeEventListener(event, handler, options);
}
