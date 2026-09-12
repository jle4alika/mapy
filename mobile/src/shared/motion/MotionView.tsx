/**
 * Native fallback: Reanimated (Framer Motion — DOM-only на вебе).
 * Пропсы намеренно loose, чтобы совпадать с API Framer Motion.
 */
import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type MotionState = Record<string, unknown> | false | undefined;

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[] | object;
  initial?: MotionState;
  animate?: MotionState;
  transition?: Record<string, unknown>;
  whileHover?: Record<string, unknown>;
  whileTap?: Record<string, unknown>;
  whileInView?: MotionState;
  viewport?: unknown;
  variants?: unknown;
  layout?: boolean;
  [key: string]: unknown;
};

function firstNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (Array.isArray(v) && typeof v[0] === 'number') return v[0];
  return fallback;
}

function parseRotate(v: unknown): number {
  if (v == null) return 0;
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function animateValue(
  sv: { value: number },
  target: unknown,
  transition?: Record<string, unknown>,
) {
  if (target === undefined) return;
  const delay = typeof transition?.delay === 'number' ? transition.delay * 1000 : 0;
  const duration =
    typeof transition?.duration === 'number' ? transition.duration * 1000 : 750;
  const ease = Easing.bezier(0.16, 1, 0.3, 1);

  if (Array.isArray(target) && target.length > 1 && target.every((n) => typeof n === 'number')) {
    const nums = target as number[];
    const steps = nums.map((to) =>
      withTiming(to, { duration: duration / (nums.length - 1), easing: ease }),
    );
    const seq = withSequence(...steps);
    const looped = withRepeat(seq, -1, false);
    sv.value = delay ? withDelay(delay, looped) : looped;
    return;
  }

  const to = Array.isArray(target) ? Number(target[0]) : Number(target);
  if (!Number.isFinite(to)) return;

  if (transition?.type === 'spring' || typeof transition?.stiffness === 'number') {
    const spring = withSpring(to, {
      stiffness: (transition?.stiffness as number) ?? 280,
      damping: (transition?.damping as number) ?? 28,
      mass: (transition?.mass as number) ?? 0.9,
    });
    sv.value = delay ? withDelay(delay, spring) : spring;
    return;
  }

  const timed = withTiming(to, { duration, easing: ease });
  if (transition?.repeat === Infinity || (typeof transition?.repeat === 'number' && transition.repeat < 0)) {
    const mirrored = transition.repeatType === 'mirror' || transition.repeatType === 'reverse';
    sv.value = delay
      ? withDelay(delay, withRepeat(timed, -1, !!mirrored))
      : withRepeat(timed, -1, !!mirrored);
    return;
  }
  sv.value = delay ? withDelay(delay, timed) : timed;
}

export function MotionView({
  children,
  initial,
  animate,
  whileInView,
  transition,
  style,
}: Props) {
  const init = initial && typeof initial === 'object' ? initial : undefined;
  const targetRaw = animate ?? whileInView;
  const target = targetRaw && typeof targetRaw === 'object' ? targetRaw : undefined;
  const opacity = useSharedValue(firstNum(init?.opacity, 1));
  const y = useSharedValue(firstNum(init?.y, 0));
  const x = useSharedValue(firstNum(init?.x, 0));
  const scale = useSharedValue(firstNum(init?.scale, 1));
  const rotate = useSharedValue(parseRotate(init?.rotate));

  useEffect(() => {
    if (!target) return;
    animateValue(opacity, target.opacity, transition);
    animateValue(y, target.y, transition);
    animateValue(x, target.x, transition);
    animateValue(scale, target.scale, transition);
    if (target.rotate != null) {
      if (Array.isArray(target.rotate)) {
        animateValue(
          rotate,
          (target.rotate as unknown[]).map((r) => parseRotate(r)),
          transition,
        );
      } else {
        animateValue(rotate, parseRotate(target.rotate), transition);
      }
    }
  }, [target, transition, opacity, y, x, scale, rotate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={[style as ViewStyle, animStyle]}>{children}</Animated.View>;
}

export const motion = { create: () => Animated.View };
export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function useReducedMotion() {
  return false;
}
export function LayoutGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
