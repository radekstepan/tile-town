import './style.css';
import { Game } from './game/Game';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game(); // Constructor now sets up Pixi
    game.initializeGame();   // Initialize game logic
  } catch (err) {
    console.error("Failed to initialize game:", err);
    // Optionally display an error message to the user in the DOM
    const errorDiv = document.createElement('div');
    errorDiv.textContent = `Fatal Error: Could not initialize game. ${err.message || err}`;
    errorDiv.style.color = 'red';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'white';
    errorDiv.style.border = '1px solid black';
    document.body.appendChild(errorDiv);
  }
});
