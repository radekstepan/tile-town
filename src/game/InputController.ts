import { Coordinates } from '../types';
import { getTileCoordinatesFromScreenPoint } from '../utils/geometryUtils';
import { Game } from './Game'; // Game type for gameInstance

export class InputController {
    private canvas: HTMLCanvasElement; // This will be Pixi's canvas
    private gameInstance: Game;

    constructor(canvas: HTMLCanvasElement, gameInstance: Game) {
        this.canvas = canvas; // Pixi's app.view is passed here
        this.gameInstance = gameInstance;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Standard DOM event listeners on the canvas element work fine with PixiJS
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
        // cameraOffset X and Y are world-space offsets for the tile container in Pixi
        // getTileCoordinatesFromScreenPoint expects canvas-relative mouse coords and world offsets
        const targetCoords = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);

        if (event.button === 0) { 
            if (this.gameInstance.currentMode === 'pan') {
                this.gameInstance.isDragging = true;
                this.gameInstance.setCanvasCursor(); 
            } else if (this.gameInstance.currentMode === 'build') {
                if (this.gameInstance.currentBuildType) {
                    const buildCoords = this.gameInstance.hoveredTile ? this.gameInstance.hoveredTile : targetCoords;
                    if (buildCoords) {
                        const built = this.gameInstance.handleCanvasBuildInteraction(buildCoords.x, buildCoords.y);
                        if (built) {
                            this.gameInstance.lastBuiltTileDuringDrag = { x: buildCoords.x, y: buildCoords.y };
                        }
                    }
                    this.gameInstance.isDragging = true; 
                } else {
                    // Inspect mode click - potentially select tile if that feature is re-added
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
        const currentMouseTile = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);

        this.gameInstance.handleMouseMoveHover(currentMouseTile);


        if (this.gameInstance.isDragging) {
            // Middle mouse button is 4 when event.buttons is checked
            if (this.gameInstance.currentMode === 'pan' || (event.buttons & 4) === 4 ) { 
                const dx = event.clientX - this.gameInstance.lastMouseX;
                const dy = event.clientY - this.gameInstance.lastMouseY;
                this.gameInstance.cameraOffsetX += dx;
                this.gameInstance.cameraOffsetY += dy;
                this.gameInstance.drawGame();
            } else if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
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
        
        this.gameInstance.lastMouseX = event.clientX;
        this.gameInstance.lastMouseY = event.clientY;
    }

    private handleMouseUp(event: MouseEvent): void { // Added event param
        if (this.gameInstance.isDragging) {
            if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null; 
            }
            this.gameInstance.isDragging = false;
            this.gameInstance.setCanvasCursor(); 
        }
    }

    private handleMouseLeave(): void {
        this.gameInstance.handleMouseMoveHover(null);

        if (this.gameInstance.isDragging) {
             if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null;
            }
            this.gameInstance.isDragging = false;
            this.gameInstance.setCanvasCursor();
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
            
            this.gameInstance.handleMouseMoveHover(targetCoords);


            if (this.gameInstance.currentMode === 'pan') {
                this.gameInstance.isDragging = true;
            } else if (this.gameInstance.currentMode === 'build') {
                if (this.gameInstance.currentBuildType && targetCoords) { 
                    const built = this.gameInstance.handleCanvasBuildInteraction(targetCoords.x, targetCoords.y);
                    if (built) {
                        this.gameInstance.lastBuiltTileDuringDrag = { x: targetCoords.x, y: targetCoords.y };
                    }
                }
                if (this.gameInstance.currentBuildType) {
                    this.gameInstance.isDragging = true; 
                }
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        } else if (event.touches.length > 1) {
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
            const rect = this.canvas.getBoundingClientRect(); 
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            const currentTouchTile = getTileCoordinatesFromScreenPoint(touchX, touchY, this.gameInstance.cameraOffsetX, this.gameInstance.cameraOffsetY);

            this.gameInstance.handleMouseMoveHover(currentTouchTile);

            if (this.gameInstance.currentMode === 'pan') {
                if (this.gameInstance.lastTouchX !== null && this.gameInstance.lastTouchY !== null) {
                    const dx = touch.clientX - this.gameInstance.lastTouchX;
                    const dy = touch.clientY - this.gameInstance.lastTouchY;
                    this.gameInstance.cameraOffsetX += dx;
                    this.gameInstance.cameraOffsetY += dy;
                    this.gameInstance.drawGame();
                }
            } else if (this.gameInstance.currentMode === 'build' && this.gameInstance.currentBuildType) {
                if (currentTouchTile) {
                    if (!this.gameInstance.lastBuiltTileDuringDrag || 
                        currentTouchTile.x !== this.gameInstance.lastBuiltTileDuringDrag.x || 
                        currentTouchTile.y !== this.gameInstance.lastBuiltTileDuringDrag.y) {
                        
                        const built = this.gameInstance.handleCanvasBuildInteraction(currentTouchTile.x, currentTouchTile.y);
                        if (built) {
                            this.gameInstance.lastBuiltTileDuringDrag = { x: currentTouchTile.x, y: currentTouchTile.y };
                        }
                    }
                }
            }
            this.gameInstance.lastTouchX = touch.clientX;
            this.gameInstance.lastTouchY = touch.clientY;
        }
    }

    private handleTouchEnd(event: TouchEvent): void { 
        if (event.touches.length === 0) {
            this.gameInstance.handleMouseMoveHover(null);
        }

        if (event.touches.length === 0 && this.gameInstance.isDragging) {
            if (this.gameInstance.currentMode === 'build') {
                this.gameInstance.lastBuiltTileDuringDrag = null;
            }
            this.gameInstance.isDragging = false;
        }
        if (!this.gameInstance.isDragging) { // This was checking isDragging, should likely always reset these on touch end if no touches remain
            this.gameInstance.lastTouchX = null;
            this.gameInstance.lastTouchY = null;
        }
    }
}
