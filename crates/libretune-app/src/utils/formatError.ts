/**
 * Format an error from a Tauri command into a user-friendly message + details.
 * Detects common Rust panic patterns and parse errors.
 */
export function formatError(e: unknown): { message: string; details: string } {
  const errorStr = String(e);
  // Check for panic messages (Rust panics often contain "panicked" or stack traces)
  if (errorStr.includes("panicked") || errorStr.includes("overflow") || errorStr.includes("thread")) {
    return {
      message: "Внутренняя ошибка при обработке файла тюна. Возможно, определение INI несовместимо с файлом тюна.",
      details: errorStr,
    };
  }
  // Check for parse errors
  if (errorStr.includes("parse") || errorStr.includes("Parse") || errorStr.includes("invalid")) {
    return {
      message: "Не удалось разобрать файл тюна. Он может быть повреждён или иметь неподдерживаемый формат.",
      details: errorStr,
    };
  }
  // Default error format
  return {
    message: errorStr,
    details: "",
  };
}
