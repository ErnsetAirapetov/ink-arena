// Заглушка клиента вехи 1: поднимает пустой канвас на всю страницу.
// Ввод, рендер, блокнот мага и экраны появятся в следующих задачах
// (tech/architecture.md, «client: тонкий слой»). Игровые правила — только
// в @inkarena/core.
import { coreVersion } from '@inkarena/core';

const canvas = document.getElementById('game');
if (canvas instanceof HTMLCanvasElement) {
  const resize = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);
}

// Пробная связь с ядром через workspace-зависимость — подтверждает, что
// клиент видит @inkarena/core. Позже сюда придёт настоящая петля игры.
console.info(`InkArena client, core ${coreVersion()}`);
