import { GridTile, TileType, Coordinates, ViewMode } from '../types';
import * as C from '../config/constants';
import { lightenColor, darkenColor } from '../utils/colorUtils';

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private gameInstanceGetter: () => any; // To get game instance for simulation data

    constructor(canvas: HTMLCanvasElement, gameInstanceGetter: () => any) {
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error("Could not get 2D rendering context from canvas.");
        }
        this.ctx = context;
        this.gameInstanceGetter = gameInstanceGetter;
    }

    private getHeatmapColor(value: number, maxValue: number, type: 'positive' | 'negative'): string | null {
        if (value < 0 && type === 'positive') return null; // No negative values for positive heatmaps like tile value
        if (value <= 0 && type === 'negative') return null; // No positive or zero values for negative heatmaps like pollution

        const normalizedValue = Math.min(Math.abs(value) / maxValue, 1);
        const alpha = 0.4 + normalizedValue * 0.3; // Vary alpha slightly with intensity

        if (type === 'positive') { // For Tile Value: Red (low value) -> Yellow (mid) -> Green (high value)
            if (normalizedValue < 0.33) return `rgba(255, ${Math.floor(normalizedValue*3 * 255)}, 0, ${alpha})`; // Red to Yellow
            else if (normalizedValue < 0.66) return `rgba(${Math.floor(255 - (normalizedValue-0.33)*3 * 255)}, 255, 0, ${alpha})`; // Yellow to Green
            else return `rgba(0, 255, ${Math.floor((normalizedValue-0.66)*3 * 128)}, ${alpha})`; // Green to Bright Green (slight blue tint for very high)

        } else { // For Pollution (Green=Low, Yellow=Mid, Red=High)
            const r = Math.floor(255 * normalizedValue);
            const g = Math.floor(255 * (1 - normalizedValue));
            return `rgba(${r}, ${g}, 0, ${alpha})`;
        }
    }

    private drawTileObject(
        gridX: number, gridY: number, tileData: GridTile, // Changed to take full GridTile
        cameraOffsetX: number, cameraOffsetY: number,
        customAlpha: number = 1.0, isSelected: boolean = false
    ): void {
        const tileType = tileData.type; // Extract TileType from GridTile
        const screenX = cameraOffsetX + (gridX - gridY) * C.TILE_HALF_WIDTH_ISO;
        const screenY = cameraOffsetY + (gridX + gridY) * C.TILE_HALF_HEIGHT_ISO;
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.globalAlpha = customAlpha;

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.lineTo(0, C.TILE_HEIGHT_ISO);
        this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.closePath();
        
        this.ctx.fillStyle = tileType.color; // Base tile color is always standard
        this.ctx.fill();

        if (isSelected) {
            this.ctx.strokeStyle = '#FFFF00'; 
            this.ctx.lineWidth = 2;          
        } else {
            this.ctx.lineWidth = customAlpha < 1.0 ? 0.35 : 0.7; 
            this.ctx.strokeStyle = customAlpha < 1.0 
                ? darkenColor(tileType.color, 12) 
                : darkenColor(tileType.color, 18); 
        }
        this.ctx.stroke(); 

        if (tileType.renderHeight && tileType.renderHeight > 0) {
            const isStruggling = tileData.isVisuallyStruggling === true;
            let buildingColor = tileType.color; // Start with the original tile type color for the building

            if (isStruggling) {
                // For struggling buildings, significantly darken their 3D parts
                // The base tile (ground part) keeps its original color
                buildingColor = darkenColor(tileType.color, 35); // Make it quite dark
            }

            const buildingVisualHeight = tileType.renderHeight * C.TILE_DEPTH_UNIT;
            const topColor = lightenColor(buildingColor, 15);
            const sideColorDark = darkenColor(buildingColor, 15); 
            const sideColorLight = darkenColor(buildingColor, 5);  

            // Line width is already set (either for selected or non-selected state from above).

            // --- Right Side ---
            this.ctx.fillStyle = sideColorDark;
            this.ctx.beginPath();
            this.ctx.moveTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
            this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, -buildingVisualHeight);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            if (!isSelected) { 
                this.ctx.strokeStyle = darkenColor(sideColorDark, 18); 
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
                this.ctx.strokeStyle = darkenColor(sideColorLight, 18); 
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
                this.ctx.strokeStyle = darkenColor(topColor, 18); 
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
        const game = this.gameInstanceGetter(); // Get fresh game instance (and thus simulation controller)

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const isSelected = selectedTileCoords?.x === x && selectedTileCoords?.y === y;
                this.drawTileObject(x, y, gridData[y][x], cameraOffsetX, cameraOffsetY, 1.0, isSelected); // Pass full GridTile
            }
        }

        if (currentViewMode === 'tile_value_heatmap' || currentViewMode === 'pollution_heatmap') {
            for (let y = 0; y < C.GRID_SIZE_Y; y++) {
                for (let x = 0; x < C.GRID_SIZE_X; x++) {
                    let value = 0;
                    let maxValue = 1;
                    let heatmapType: 'positive' | 'negative' = 'positive';

                    if (currentViewMode === 'tile_value_heatmap') {
                        value = game.simulationController.getTileValueAt(x,y);
                        maxValue = C.MAX_TILE_VALUE;
                        heatmapType = 'positive';
                    } else if (currentViewMode === 'pollution_heatmap') {
                        value = game.simulationController.getPollutionAt(x,y);
                        maxValue = C.MAX_POLLUTION;
                        heatmapType = 'negative';
                    }
                    
                    const color = this.getHeatmapColor(value, maxValue, heatmapType);
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
            // For preview, create a temporary GridTile-like structure.
            // Include default values for the new struggle-related fields.
            const previewTileData: GridTile = {
                type: currentBuildType,
                population: 0,
                tileValue: C.BASE_TILE_VALUE, // Use base for preview
                pollution: 0,
                hasRoadAccess: false, // Assume no road access for simple preview
                isVisuallyStruggling: false,
                struggleTicks: 0
            };
            this.drawTileObject(hoveredTile.x, hoveredTile.y, previewTileData, cameraOffsetX, cameraOffsetY, 0.5);
        }
    }
}
