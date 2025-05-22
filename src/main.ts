import './style.css';
import { Game } from './game';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.initializeGame();
});
