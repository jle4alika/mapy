# Дизайн Blink20

Ориентир: [blinkmap.com/ru](https://blinkmap.com/ru). Свои тексты и марка, не копируем логотип Blink.

## Язык Blink (не «нейро»)

- Чёрный `#000`, белый текст, серый `#999` для подзаголовков
- CTA плоский `#FFE600` + чёрный текст — без градиентов, бликов и hover-scale
- Glow только за телефоном: `#FFE600`(+cyan wash) и `#FF00D5` с `filter: blur(30–38px)`
- Бренд «blink20» — градиент текста `#F1F399 → #83E1FF → #FFA4F0`
- Пуши: сплошные `#969696 / #787878 / #5A5A5A`, tilt, без glass blur
- Montserrat, «привет / это blink20», lowercase в UI
- Карточки плоские белые/серые — без glassmorphism и aurora-орбов

## Темы

Три темы в профиле: **день** / **ночь** / **аврора** (палитры + карта OpenFreeMap без ключа). Fade при смене.

## Анимации

Framer Motion на вебе: reveal, float телефона, pulse glow, stagger пушей, spring на переключателе тем.
