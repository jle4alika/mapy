# Тени и тема

Палитра Blink: см. `docs/dizayn-blink20.md` и `src/shared/ui/theme.ts`.

`createShadow(level)`:

| Уровень | Назначение |
|---------|------------|
| `none` | без тени |
| `soft` | лёгкий подъём |
| `card` | телефон / модалки |
| `pin` | пины |
| `fab` | жёлтые CTA |
| `glow` | розовое свечение |

Веб → `boxShadow`, iOS → shadow*, Android → elevation.
