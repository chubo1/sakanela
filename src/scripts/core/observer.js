export function createObserver(callback, options = {}) {
  const config = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.15,
    ...options,
  };

  const observer = new IntersectionObserver((entries, instance) => {
    callback(entries, instance);
  }, config);

  return {
    observe(elements) {
      const list = Array.isArray(elements) ? elements : [elements];
      list.filter(Boolean).forEach((el) => observer.observe(el));
    },
    unobserve(el) {
      observer.unobserve(el);
    },
    disconnect() {
      observer.disconnect();
    },
    instance: observer,
  };
}
