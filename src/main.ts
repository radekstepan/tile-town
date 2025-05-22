import './style.css';
import { Game } from './game/Game'; // Updated import path

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.initializeGame();
});
