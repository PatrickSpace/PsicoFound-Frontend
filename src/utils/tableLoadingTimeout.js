export const TABLE_LOADING_TIMEOUT_MS = 15000;
export const TABLE_LOADING_TIMEOUT_MESSAGE =
  "La tabla esta tardando demasiado en cargar. Intenta nuevamente.";

export class TableLoadingTimeoutError extends Error {
  constructor(message = TABLE_LOADING_TIMEOUT_MESSAGE) {
    super(message);
    this.name = "TableLoadingTimeoutError";
    this.code = "TABLE_LOADING_TIMEOUT";
  }
}

export function isTableLoadingTimeout(error) {
  return error?.code === "TABLE_LOADING_TIMEOUT";
}

export function notifyTableLoadingTimeout(
  message = TABLE_LOADING_TIMEOUT_MESSAGE
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("api-error", {
      detail: {
        message,
        code: "TABLE_LOADING_TIMEOUT",
      },
    })
  );
}

export function withTableLoadingTimeout(
  promise,
  {
    timeoutMs = TABLE_LOADING_TIMEOUT_MS,
    message = TABLE_LOADING_TIMEOUT_MESSAGE,
  } = {}
) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new TableLoadingTimeoutError(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}
