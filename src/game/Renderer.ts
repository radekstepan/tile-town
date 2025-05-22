import { GridTile, TileType, Coordinates, ViewMode } from '../types';
import * as C from '../config/constants';
import { lightenColor, darkenColor } from '../utils/colorUtils';

export class Renderer {
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error("Could not get 2D rendering context from canvas.");
        }
        this.ctx = context;
    }

    private getHeatmapColor(score: number): string | null {
        if (score < 0) return null;
        const alpha = 0.4;
        if (score < C.SATISFACTION_LOW_THRESHOLD) return `rgba(255, 0, 0, ${alpha})`;
        if (score > C.SATISFACTION_HIGH_THRESHOLD) return `rgba(0, 255, 0, ${alpha})`;
        return `rgba(255, 255, 0, ${alpha})`;
    }

    private drawTileObject(
        gridX: number, gridY: number, tileType: TileType,
        cameraOffsetX: number, cameraOffsetY: number,
        customAlpha: number = 1.0, isSelected: boolean = false
    ): void {
        const screenX = cameraOffsetX + (gridX - gridY) * C.TILE_HALF_WIDTH_ISO;
        const screenY = cameraOffsetY + (gridX + gridY) * C.TILE_HALF_HEIGHT_ISO;
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.globalAlpha = customAlpha;

        // --- Base tile ---
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.lineTo(0, C.TILE_HEIGHT_ISO);
        this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.closePath();
        
        this.ctx.fillStyle = tileType.color;
        this.ctx.fill();

        // --- Border style setup ---
        if (isSelected) {
            this.ctx.strokeStyle = '#FFFF00'; // Bright yellow for selected
            this.ctx.lineWidth = 2;          // Keep selected thicker
        } else {
            // "A smidgen more" prominent borders, still matching tile color
            this.ctx.lineWidth = customAlpha < 1.0 ? 0.35 : 0.7; // Another slight increase
            // For base tile, border is an even more noticeably darker version of tileType.color
            this.ctx.strokeStyle = customAlpha < 1.0 
                ? darkenColor(tileType.color, 12)  // For translucent preview
                : darkenColor(tileType.color, 18); // For regular tiles
        }
        // Stroke for the base tile
        this.ctx.stroke(); 

        // --- 3D Part (Building/Object) ---
        if (tileType.renderHeight && tileType.renderHeight > 0) {
            const buildingVisualHeight = tileType.renderHeight * C.TILE_DEPTH_UNIT;
            const topColor = lightenColor(tileType.color, 15);
            const sideColorDark = darkenColor(tileType.color, 15); 
            const sideColorLight = darkenColor(tileType.color, 5);  

            // Line width is already set (either for selected or non-selected state from above).
            // For non-selected 3D parts, their stroke color should be a darker version of their own fill.

            // --- Right Side ---
            this.ctx.fillStyle = sideColorDark;
            this.ctx.beginPath();
            this.ctx.moveTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
            this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, -buildingVisualHeight);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            if (!isSelected) { // Only change strokeStyle if not selected
                this.ctx.strokeStyle = darkenColor(sideColorDark, 18); // Match base tile's relative darkness
            }
            this.ctx.stroke(); 

            // --- Left Side ---
            this.ctx.fillStyle = sideColorLight;
            this.ctx.beginPath();
            this.ctx.moveTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
            this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, -buildingVisualHeight);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            if (!isSelected) {
                this.ctx.strokeStyle = darkenColor(sideColorLight, 18); // Match base tile's relative darkness
            }
            this.ctx.stroke(); 
            
            // --- Top Face ---
            this.ctx.fillStyle = topColor;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -buildingVisualHeight);
            this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, C.TILE_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.closePath();
            this.ctx.fill();
            if (!isSelected) {
                this.ctx.strokeStyle = darkenColor(topColor, 18); // Match base tile's relative darkness
            }
            this.ctx.stroke(); 
        }
        this.ctx.restore();
    }

    public render(
        gridData: GridTile[][],
        cameraOffsetX: number, cameraOffsetY: number,
        selectedTileCoords: Coordinates | null,
        hoveredTile: Coordinates | null,
        currentBuildType: TileType | null,
        currentViewMode: ViewMode
    ): void {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const isSelected = selectedTileCoords?.x === x && selectedTileCoords?.y === y;
                this.drawTileObject(x, y, gridData[y][x].type, cameraOffsetX, cameraOffsetY, 1.0, isSelected);
            }
        }

        if (currentViewMode === 'satisfaction_heatmap') {
            for (let y = 0; y < C.GRID_SIZE_Y; y++) {
                for (let x = 0; x < C.GRID_SIZE_X; x++) {
                    let score = -1;
                    const tileData = gridData[y][x];
                    if (tileData.type.parentZoneCategory === 'residential' && tileData.type.isBuilding && tileData.satisfactionData) {
                        score = tileData.satisfactionData.score;
                    }
                    const color = this.getHeatmapColor(score);
                    if (color) {
                        const screenX = cameraOffsetX + (x - y) * C.TILE_HALF_WIDTH_ISO;
                        const screenY = cameraOffsetY + (x + y) * C.TILE_HALF_HEIGHT_ISO;
                        this.ctx.save();
                        this.ctx.translate(screenX, screenY);
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, 0);
                        this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
                        this.ctx.lineTo(0, C.TILE_HEIGHT_ISO);
                        this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
                        this.ctx.closePath();
                        this.ctx.fillStyle = color;
                        this.ctx.fill();
                        this.ctx.restore();
                    }
                }
            }
        }
        
        if (currentBuildType && hoveredTile && currentViewMode === 'default') {
            this.drawTileObject(hoveredTile.x, hoveredTile.y, currentBuildType, cameraOffsetX, cameraOffsetY, 0.5); 
        }
    }
}
