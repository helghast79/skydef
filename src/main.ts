import { GameApp } from './game/GameApp';
import './style.css';

const boot = async (): Promise<void> => {
  const game = new GameApp();
  await game.start();
};

void boot();

if (import.meta.hot) {
  import.meta.hot.accept();
}
