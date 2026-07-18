// Публичная точка входа ядра. Клиент импортирует @inkarena/core только отсюда.
export { config } from './config.js';
export type { Config } from './config.js';
export { CORE_VERSION, coreVersion } from './version.js';
export * from './geometry/index.js';
export * from './recognition/index.js';
