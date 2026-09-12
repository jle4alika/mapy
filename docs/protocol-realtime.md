# Протокол реального времени

Шлюз: `WS /api/v1/ws/gateway?token=<JWT>`

Кадр: `{"type": "...", "payload": {...}}`

## Presence (гео)

| type | направление | payload |
|------|-------------|---------|
| `location.update` | клиент → сервер | lat, lon, accuracy_m?, speed_mps?, heading_deg?, battery_percent?, is_moving?, recorded_at?, client_seq? |
| `location.ack` | сервер → клиент | ok, client_seq?, derived_status |
| `friend.location` | сервер → друзьям | user_id, lat, lon, derived_status, speed_mps?, battery_percent?, recorded_at?, accuracy_mode |

`accuracy_mode`: `precise` | `approximate` | `stale` (заморозка выглядит как precise «застрявшая» точка).

## Чаты

| type | направление | payload |
|------|-------------|---------|
| `message.send` | клиент → сервер | chat_id, body, client_message_id?, reply_to_id? |
| `message.ack` | сервер → отправителю | ok, id, client_message_id? |
| `message.new` | сервер → участникам | id, chat_id, author_id, body, … |
| `typing` | клиент → сервер | chat_id |
| `typing` | сервер → другим | chat_id, user_id |
| `read.update` | клиент → сервер | chat_id, message_id |
| `read.update` | сервер → другим | chat_id, user_id, message_id |
| `ping` / `pong` | keep-alive | |

Ошибки: `{"type":"error","payload":{"detail":"..."}}`.
