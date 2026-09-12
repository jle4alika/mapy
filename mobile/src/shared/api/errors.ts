/** Русские тексты ошибок API и сети */

export class ApiError extends Error {
  status: number;
  code?: string;
  detail: string;

  constructor(status: number, detail: string, code?: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

const FALLBACK_RU: Record<number, string> = {
  400: 'Некорректный запрос. Проверьте данные и попробуйте снова.',
  401: 'Нужно войти в аккаунт.',
  403: 'Недостаточно прав для этого действия.',
  404: 'Запрошенные данные не найдены.',
  408: 'Сервер слишком долго не отвечал. Попробуйте ещё раз.',
  409: 'Конфликт данных. Возможно, запись уже существует.',
  413: 'Слишком большой объём данных.',
  415: 'Неподдерживаемый формат данных.',
  422: 'Проверьте введённые данные.',
  429: 'Слишком много запросов. Подождите немного.',
  500: 'Ошибка на сервере. Попробуйте позже.',
  502: 'Сервер временно недоступен.',
  503: 'Сервис временно недоступен. Попробуйте позже.',
  504: 'Сервер не ответил вовремя.',
};

/** Частые английские / FastAPI формулировки → русский */
const DETAIL_MAP: Array<[RegExp, string]> = [
  [/^not authenticated$/i, 'Нужно войти в аккаунт.'],
  [/^could not validate credentials$/i, 'Сессия истекла. Войдите снова.'],
  [/^incorrect (email|username) or password$/i, 'Неверный email, ник или пароль.'],
  [/^invalid credentials$/i, 'Неверный email, ник или пароль.'],
  [/^LOGIN_BAD_CREDENTIALS$/i, 'Неверный email, ник или пароль.'],
  [/^Неверный email или пароль$/i, 'Неверный email, ник или пароль.'],
  [/^user already exists$/i, 'Такой пользователь уже зарегистрирован.'],
  [/^email already (registered|exists)$/i, 'Этот email уже занят.'],
  [/^username already (taken|exists)$/i, 'Этот ник уже занят.'],
  [/^user not found$/i, 'Пользователь не найден.'],
  [/^friend(ship)? (already|request).*$/i, 'Заявка в друзья уже отправлена или вы уже друзья.'],
  [/^not found$/i, 'Не найдено.'],
  [/^forbidden$/i, 'Недостаточно прав для этого действия.'],
  [/^unauthorized$/i, 'Нужно войти в аккаунт.'],
  [/^validation error$/i, 'Проверьте введённые данные.'],
  [/^internal server error$/i, 'Ошибка на сервере. Попробуйте позже.'],
  [/^bad request$/i, 'Некорректный запрос.'],
  [/^field required$/i, 'Заполните обязательные поля.'],
  [/^value is not a valid email/i, 'Введите корректный email.'],
  [/^string should have at least/i, 'Слишком короткое значение.'],
  [/^string should have at most/i, 'Слишком длинное значение.'],
  [/^ensure this value has at least/i, 'Слишком короткое значение.'],
  [/^ensure this value has at most/i, 'Слишком длинное значение.'],
  [/^failed to fetch$/i, 'Нет связи с сервером. Проверьте интернет или что API запущен.'],
  [/^network ?request failed$/i, 'Нет связи с сервером. Проверьте интернет.'],
  [/^load failed$/i, 'Не удалось загрузить данные.'],
  [/^aborted$/i, 'Запрос отменён.'],
  [/^timeout$/i, 'Превышено время ожидания ответа.'],
];

function looksEnglish(text: string): boolean {
  const letters = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
  if (!letters) return false;
  const latin = (letters.match(/[a-zA-Z]/g) || []).length;
  return latin / letters.length > 0.55;
}

export function translateDetail(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed) return 'Что-то пошло не так.';
  for (const [re, ru] of DETAIL_MAP) {
    if (re.test(trimmed)) return ru;
  }
  // FastAPI loc messages like "body -> email: ..."
  if (/^(body|query|path)\s*->/i.test(trimmed) || /value_error/i.test(trimmed)) {
    return 'Проверьте введённые данные.';
  }
  if (looksEnglish(trimmed)) {
    return 'Произошла ошибка. Попробуйте ещё раз.';
  }
  return trimmed;
}

export function mapStatusToRussian(status: number, detail?: string): string {
  if (detail && typeof detail === 'string' && detail.trim()) {
    return translateDetail(detail);
  }
  return FALLBACK_RU[status] ?? `Ошибка ${status}. Попробуйте позже.`;
}

export type FormattedError = {
  title: string;
  message: string;
  status?: number;
};

export function describeError(error: unknown): FormattedError {
  if (error instanceof ApiError) {
    const title =
      error.status >= 500
        ? 'Сервер недоступен'
        : error.status === 401
          ? 'Авторизация'
          : error.status === 0
            ? 'Нет связи'
            : 'Ошибка';
    return {
      title,
      message: translateDetail(error.detail) || mapStatusToRussian(error.status),
      status: error.status,
    };
  }

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed') ||
      msg.includes('load')
    ) {
      return {
        title: 'Нет связи',
        message:
          'Не удалось связаться с сервером. Проверьте интернет или что backend запущен.',
        status: 0,
      };
    }
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const raw = String((error as { message: unknown }).message || '');
    const lower = raw.toLowerCase();
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
      return {
        title: 'Нет связи',
        message:
          'Не удалось связаться с сервером. Проверьте интернет или что backend запущен.',
        status: 0,
      };
    }
    return {
      title: 'Ошибка',
      message: translateDetail(raw) || 'Что-то пошло не так.',
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Ошибка',
      message: translateDetail(error.message) || 'Что-то пошло не так.',
    };
  }

  return {
    title: 'Ошибка',
    message: 'Что-то пошло не так. Попробуйте ещё раз.',
  };
}

export function formatApiError(error: unknown): string {
  return describeError(error).message;
}
