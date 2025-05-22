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
                    const built = this.gameInstance.handleCanvasBuildInteraction(buildCoords.x, buildCoords.y);
                    if (built) {
                        this.gameInstance.lastBuiltTileDuringDrag = { x: buildCoords.x, y: buildCoords.y };
                    }
                }
                this.gameInstance.isDragging = true; // Enable painting
            }
        } else if (event.button === 1) { // Middle mouse for panning
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
            if (this.gameInstance.currentMode === 'pan' || event.buttons === 4) { // Pan if in pan mode OR middle mouse button is held
                const dx = event.clientX - this.gameInstance.lastMouseX;
                const dy = event.clientY - this.gameInstance.lastMouseY;
                this.gameInstance.cameraOffsetX += dx;
                this.gameInstance.cameraOffsetY += dy;
                this.gameInstance.drawGame();
            } else if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
                // Paint-build logic
                const currentMouseTile = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);
                if (currentMouseTile) {
                    if (!this.gameInstance.lastBuiltTileDuringDrag || 
                        currentMouseTile.x !== this.gameInstance.lastBuiltTileDuringDrag.x || 
                        currentMouseTile.y !== this.gameInstance.lastBuiltTileDuringDrag.y) {
                        
                        const built = this.gameInstance.handleCanvasBuildInteraction(currentMouseTile.x, currentMouseTile.y);
                        if (built) {
                            this.gameInstance.lastBuiltTileDuringDrag = { x: currentMouseTile.x, y: currentMouseTile.y };
                        }
                    }
                }
            }
        }
        
        // Update hovered tile for visual feedback regardless of dragging state in build mode
        if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
            const currentMouseTile = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);
            this.gameInstance.updateHoveredTile(currentMouseTile);
        } else if (!this.gameInstance.isDragging) { // Clear hover if not dragging and not in build mode
             if (this.gameInstance.hoveredTile) { 
                this.gameInstance.updateHoveredTile(null);
            }
        }
        
        this.gameInstance.lastMouseX = event.clientX;
        this.gameInstance.lastMouseY = event.clientY;
    }

    private handleMouseUp(event: MouseEvent): void {
        if (this.gameInstance.isDragging) {
            if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null; // Reset for next paint action
            }
            this.gameInstance.isDragging = false;
            this.gameInstance.setCanvasCursor(); 
        }
    }

    private handleMouseLeave(): void {
        if (this.gameInstance.isDragging) {
             if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null;
            }
            this.gameInstance.isDragging = false;
            this.gameInstance.setCanvasCursor();
        }
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
                    const built = this.gameInstance.handleCanvasBuildInteraction(targetCoords.x, targetCoords.y);
                    if (built) {
                        this.gameInstance.lastBuiltTileDuringDrag = { x: targetCoords.x, y: targetCoords.y };
                    }
                }
                this.gameInstance.isDragging = true; // Enable painting for touch
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        } else if (event.touches.length > 1) {
            // Stop painting/panning if multi-touch (could be pinch-zoom later)
            if (this.gameInstance.isDragging) {
                if (this.gameInstance.currentMode === 'build') {
                    this.gameInstance.lastBuiltTileDuringDrag = null;
                }
                this.gameInstance.isDragging = false;
            }
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        if (this.gameInstance.isDragging && event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect(); // Recalculate rect in case of scroll/resize
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;

            if (this.gameInstance.currentMode === 'pan') {
                if (this.gameInstance.lastTouchX !== null && this.gameInstance.lastTouchY !== null) {
                    const dx = touch.clientX - this.gameInstance.lastTouchX;
                    const dy = touch.clientY - this.gameInstance.lastTouchY;
                    this.gameInstance.cameraOffsetX += dx;
                    this.gameInstance.cameraOffsetY += dy;
                    this.gameInstance.drawGame();
                }
            } else if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
                const currentTouchTile = getTileCoordinatesFromScreenPoint(touchX, touchY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);
                if (currentTouchTile) {
                    if (!this.gameInstance.lastBuiltTileDuringDrag || 
                        currentTouchTile.x !== this.gameInstance.lastBuiltTileDuringDrag.x || 
                        currentTouchTile.y !== this.gameInstance.lastBuiltTileDuringDrag.y) {
                        
                        const built = this.gameInstance.handleCanvasBuildInteraction(currentTouchTile.x, currentTouchTile.y);
                        if (built) {
                            this.gameInstance.lastBuiltTileDuringDrag = { x: currentTouchTile.x, y: currentTouchTile.y };
                        }
                    }
                    this.gameInstance.updateHoveredTile(currentTouchTile); // Show hover preview for touch drag too
                }
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        }
    }

    private handleTouchEnd(event: TouchEvent): void { 
        // Check touches.length because another finger might still be down for multi-touch gestures
        if (event.touches.length === 0 && this.gameInstance.isDragging) {
            if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null;
            }
            this.gameInstance.isDragging = false;
        }
        // Reset last touch position if no fingers are down, or if the specific dragging finger was lifted.
        // Simpler to reset if isDragging becomes false.
        if (!this.gameInstance.isDragging) {
            this.gameInstance.lastTouchX = null;
            this.gameInstance.lastTouchY = null;
        }
        if (this.gameInstance.hoveredTile && this.gameInstance.currentMode === 'build'){
             // Keep hover for a moment if lifting finger from a build drag, or clear it.
             // For now, let's clear it, mouse equivalent is mouseleave.
            // this.gameInstance.updateHoveredTile(null);
        }
    }
}
