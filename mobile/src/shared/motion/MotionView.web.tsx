/**
 * Web: настоящий motion.div — плавные GPU-трансформы без дёрганья RN View.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { motion } from 'framer-motion';

type MotionValue = Record<string, unknown> | false | undefined;

type Props = {
  children?: React.ReactNode;
  style?: object | object[];
  initial?: MotionValue;
  animate?: MotionValue;
  whileInView?: MotionValue;
  transition?: Record<string, unknown>;
  [key: string]: unknown;
};

function toCssStyle(flat: Record<string, unknown> | undefined) {
  if (!flat) return undefined;
  const out: Record<string, unknown> = { ...flat };
  // RN View defaults — иначе flex* на голом div не работают
  if (out.display == null) out.display = 'flex';
  if (out.flexDirection == null) out.flexDirection = 'column';
  // RN → CSS
  if (out.marginHorizontal != null) {
    out.marginLeft = out.marginHorizontal;
    out.marginRight = out.marginHorizontal;
    delete out.marginHorizontal;
  }
  if (out.marginVertical != null) {
    out.marginTop = out.marginVertical;
    out.marginBottom = out.marginVertical;
    delete out.marginVertical;
  }
  if (out.paddingHorizontal != null) {
    out.paddingLeft = out.paddingHorizontal;
    out.paddingRight = out.paddingHorizontal;
    delete out.paddingHorizontal;
  }
  if (out.paddingVertical != null) {
    out.paddingTop = out.paddingVertical;
    out.paddingBottom = out.paddingVertical;
    delete out.paddingVertical;
  }
  return out;
}

export function MotionView({ children, style, initial, animate, whileInView, ...rest }: Props) {
  const flat = style
    ? (StyleSheet.flatten(style as object[]) as Record<string, unknown>)
    : undefined;
  const css = {
    ...toCssStyle(flat),
    backfaceVisibility: 'hidden' as const,
  };
  const pe = flat?.pointerEvents;
  return (
    <motion.div
      style={css as React.CSSProperties}
      // явно: иначе pe:auto на потомках пробивает parent pe:none и ест скролл
      {...(pe != null ? { pointerEvents: pe as React.CSSProperties['pointerEvents'] } : {})}
      initial={(initial === false ? undefined : initial) as never}
      animate={(animate === false ? undefined : animate) as never}
      whileInView={(whileInView === false ? undefined : whileInView) as never}
      {...(rest as object)}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
