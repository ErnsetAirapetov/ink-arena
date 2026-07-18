// Заглушечный чистый модуль ядра: без DOM, Date.now, Math.random и side
// effects — только детерминированная функция. Существует, чтобы у пакета был
// собираемый экспорт и предмет для теста, пока не появились настоящие модули
// (geometry, recognition, spellcraft, sim).
export const CORE_VERSION = '0.0.0';

export function coreVersion(): string {
  return CORE_VERSION;
}
