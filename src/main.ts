import { GameApp } from './game/GameApp';
import './style.css';

void (async () => {
  const game = new GameApp();
  await game.start();
})();
