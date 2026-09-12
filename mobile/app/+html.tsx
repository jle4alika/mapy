import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#F1F2F4" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
:root {
  color-scheme: light;
  --mapy-canvas: #F1F2F4;
  --mapy-scroll-size: 7px;
  --mapy-scroll-track: transparent;
  --mapy-scroll-thumb: rgba(110, 110, 118, 0.45);
  --mapy-scroll-thumb-hover: rgba(20, 20, 22, 0.7);
}
html[data-theme="midnight"] {
  color-scheme: dark;
  --mapy-canvas: #121212;
  --mapy-scroll-track: transparent;
  --mapy-scroll-thumb: rgba(200, 200, 200, 0.32);
  --mapy-scroll-thumb-hover: rgba(240, 240, 240, 0.5);
}
html[data-theme="aurora"],
html[data-theme="day"] {
  color-scheme: light;
  --mapy-scroll-track: transparent;
  --mapy-scroll-thumb: rgba(110, 110, 118, 0.45);
  --mapy-scroll-thumb-hover: rgba(20, 20, 22, 0.7);
}
body {
  background-color: var(--mapy-canvas, #F1F2F4);
}
html, body, #root {
  min-height: 100%;
}

/* Все скроллбары — кастом под тему (Firefox / Chromium standard API) */
html, body, #root,
*,
*::before,
*::after {
  scrollbar-width: thin;
  scrollbar-color: var(--mapy-scroll-thumb) var(--mapy-scroll-track);
}

/* WebKit / Blink (и RN Web ScrollView / FlatList / textarea) */
*::-webkit-scrollbar {
  width: var(--mapy-scroll-size) !important;
  height: var(--mapy-scroll-size) !important;
}
*::-webkit-scrollbar-track {
  background: var(--mapy-scroll-track) !important;
  border-radius: 999px;
}
*::-webkit-scrollbar-thumb {
  background-color: var(--mapy-scroll-thumb) !important;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  min-height: 28px;
}
*::-webkit-scrollbar-thumb:hover {
  background-color: var(--mapy-scroll-thumb-hover) !important;
  background-clip: padding-box;
  border: 2px solid transparent;
}
*::-webkit-scrollbar-corner {
  background: transparent !important;
}

textarea,
[contenteditable="true"],
.mapy-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--mapy-scroll-thumb) var(--mapy-scroll-track);
}
`;
