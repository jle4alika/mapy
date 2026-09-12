import React from 'react';

import { MotionView } from './MotionView';
import { transitions, viewportOnce } from './tokens';

type Props = {
  children?: React.ReactNode;
  style?: object | object[];
  delay?: number;
  y?: number;
  scale?: number;
  eager?: boolean;
};

/** Плавный spring-reveal без blur/двойных обёрток */
export function Reveal({
  children,
  style,
  delay = 0,
  y = 14,
  scale = 1,
  eager = false,
}: Props) {
  const hidden = {
    opacity: 0,
    y,
    ...(scale !== 1 ? { scale } : {}),
  };
  const show = {
    opacity: 1,
    y: 0,
    ...(scale !== 1 ? { scale: 1 } : {}),
  };
  const transition = { ...transitions.revealSlow, delay };

  if (eager) {
    return (
      <MotionView
        initial={hidden}
        animate={show}
        transition={transition}
        style={style}
      >
        {children}
      </MotionView>
    );
  }

  return (
    <MotionView
      initial={hidden}
      whileInView={show}
      viewport={viewportOnce}
      transition={transition}
      style={style}
    >
      {children}
    </MotionView>
  );
}
