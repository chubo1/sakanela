export const site = {
  name: 'Sakanela',
  tagline: 'Spatial design for rooms that know how to wait.',
  email: 'hello@sakanela.ge',
  phone: '+995 47 474 47',
  address: '3 Tengiz Abuladze, Batumi, Georgia',
  // Set to a real URL (e.g. '/api/contact') when a backend exists.
  formEndpoint: '',
};

export const validationMessages = {
  required: 'This field is required.',
  email: 'Enter a valid email address.',
  min: (count) => `Please use at least ${count} characters.`,
  formInvalid: 'Please fix the highlighted fields.',
  network: 'Something went wrong. Try again in a moment.',
  success: 'Message received. We will write back shortly.',
};

export const nav = [
  { href: '/index.html', label: 'Home' },
  { href: '/src/pages/about.html', label: 'About' },
  { href: '/src/pages/contact.html', label: 'Contact' },
];
