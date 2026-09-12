/**
 * Motion-токены Mapy — мягкие spring, без рваных keyframe-петель.
 */
export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.45, 0, 0.55, 1],
  soft: [0.25, 1, 0.5, 1],
  map: [0.33, 1, 0.68, 1],
  expo: [0.16, 1, 0.3, 1],
  spring: { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.9 },
  springSoft: { type: 'spring' as const, stiffness: 90, damping: 20, mass: 1 },
  springSnappy: { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.8 },
};

export const transitions = {
  /** Вход блоков */
  reveal: {
    type: 'spring' as const,
    stiffness: 110,
    damping: 22,
    mass: 0.95,
  },
  revealSlow: {
    type: 'spring' as const,
    stiffness: 80,
    damping: 20,
    mass: 1.05,
  },
  revealFast: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 24,
    mass: 0.85,
  },
  sheet: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 26,
    mass: 0.85,
  },
  tap: { type: 'spring' as const, stiffness: 420, damping: 32 },
  hover: { duration: 0.25, ease: easings.soft as number[] },
  /**
   * Мягкий float: один target + mirror (не keyframe [0,x,0] —
   * иначе петля рывками на стыке).
   * animate={{ y: -6 }} + float
   */
  float: {
    duration: 6.5,
    ease: easings.inOut as number[],
    repeat: Infinity,
    repeatType: 'mirror' as const,
  },
  floatSlow: {
    duration: 8.5,
    ease: easings.inOut as number[],
    repeat: Infinity,
    repeatType: 'mirror' as const,
  },
  glow: {
    duration: 10,
    ease: easings.inOut as number[],
    repeat: Infinity,
    repeatType: 'mirror' as const,
  },
  pulse: {
    duration: 3.6,
    ease: 'easeInOut' as const,
    repeat: Infinity,
    repeatType: 'mirror' as const,
  },
  stagger: { staggerChildren: 0.08, delayChildren: 0.06 },
  staggerFast: { staggerChildren: 0.05, delayChildren: 0.04 },
  spring: easings.spring,
  springSoft: easings.springSoft,
  springSnappy: easings.springSnappy,
};

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  },
  fadeUpSoft: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  },
  fadeScale: {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1 },
  },
  nav: {
    hidden: { opacity: 0, y: -8 },
    show: { opacity: 1, y: 0 },
  },
  sheetUp: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0 },
  },
  push: {
    hidden: { opacity: 0, y: 12, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
  floatIn: {
    hidden: { opacity: 0, y: 28, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
};

export const viewportOnce = { once: true, amount: 0.2, margin: '0px 0px -60px 0px' };

export const gradients = {
  text: ['#0066FF', '#4C8DFF', '#90CAF9'] as const,
};
