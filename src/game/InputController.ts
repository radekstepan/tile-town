import { Coordinates } from '../types';
import { getTileCoordinatesFromScreenPoint } from '../utils/geometryUtils';
import { Game } from './Game'; // Forward declaration for type hinting

export class InputController {
    private canvas: HTMLCanvasElement;
    private gameInstance: Game;

    constructor(canvas: HTMLCanvasElement, gameInstance: Game) {
        this.canvas = canvas;
        this.gameInstance = gameInstance;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    private handleMouseDown(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const targetCoords = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);

        if (event.button === 0) { 
            if (this.gameInstance.currentMode === 'pan') {
                this.gameInstance.isDragging = true;
                this.gameInstance.setCanvasCursor(); 
            } else if (this.gameInstance.currentMode === 'select') {
                this.gameInstance.handleSelectInteraction(targetCoords);
            } else if (this.gameInstance.currentMode === 'build') {
                const buildCoords = this.gameInstance.hoveredTile ? this.gameInstance.hoveredTile : targetCoords;
                if (buildCoords) {
                    this.gameInstance.handleCanvasBuildInteraction(buildCoords.x, buildCoords.y);
                }
            }
        } else if (event.button === 1) { 
            this.gameInstance.isDragging = true; 
            this.gameInstance.setCanvasCursor(); 
        }
        this.gameInstance.lastMouseX = event.clientX;
        this.gameInstance.lastMouseY = event.clientY;
    }

    private handleMouseMove(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (this.gameInstance.isDragging) {
            const dx = event.clientX - this.gameInstance.lastMouseX;
            const dy = event.clientY - this.gameInstance.lastMouseY;
            this.gameInstance.cameraOffsetX += dx;
            this.gameInstance.cameraOffsetY += dy;
            this.gameInstance.lastMouseX = event.clientX;
            this.gameInstance.lastMouseY = event.clientY;
            this.gameInstance.drawGame();
        } else if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
            const currentMouseTile = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);
            this.gameInstance.updateHoveredTile(currentMouseTile);
        } else { 
            if (this.gameInstance.hoveredTile) { 
                this.gameInstance.updateHoveredTile(null);
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0 || event.button === 1) {
            this.gameInstance.isDragging = false;
            this.gameInstance.setCanvasCursor(); 
        }
    }

    private handleMouseLeave(): void {
        this.gameInstance.isDragging = false;
        this.gameInstance.setCanvasCursor();
        if (this.gameInstance.hoveredTile) {
            this.gameInstance.updateHoveredTile(null);
        }
    }
    
    private handleTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            event.preventDefault(); 
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            const targetCoords = getTileCoordinatesFromScreenPoint(touchX, touchY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);

            if (this.gameInstance.currentMode === 'pan') {
                this.gameInstance.isDragging = true;
            } else if (this.gameInstance.currentMode === 'select') {
                this.gameInstance.handleSelectInteraction(targetCoords);
            } else if (this.gameInstance.currentMode === 'build') {
                if (targetCoords) {
                    this.gameInstance.handleCanvasBuildInteraction(targetCoords.x, targetCoords.y);
                }
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        } else if (event.touches.length > 1) {
            this.gameInstance.isDragging = false; 
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        if (this.gameInstance.isDragging && event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            if (this.gameInstance.lastTouchX !== null && this.gameInstance.lastTouchY !== null) {
                const dx = touch.clientX - this.gameInstance.lastTouchX;
                const dy = touch.clientY - this.gameInstance.lastTouchY;
                this.gameInstance.cameraOffsetX += dx;
                this.gameInstance.cameraOffsetY += dy;
                this.gameInstance.drawGame();
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        }
    }

    private handleTouchEnd(): void { // Removed event: TouchEvent as it's not used
        this.gameInstance.isDragging = false;
        this.gameInstance.lastTouchX = null;
        this.gameInstance.lastTouchY = null;
    }
}
