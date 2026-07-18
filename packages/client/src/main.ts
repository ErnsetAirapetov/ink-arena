// Точка входа клиента: находит канвас и запускает петлю игры. Вся логика —
// в game.ts и модулях render/input; игровые правила — только в @inkarena/core.
import { coreVersion } from '@inkarena/core';
import { startGame } from './game';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Не найден canvas#game');
}
startGame(canvas);

console.info(`InkArena client, core ${coreVersion()}`);
