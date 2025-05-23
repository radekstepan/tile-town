import * as PIXI from 'pixi.js';
import { GridTile, TileType, Coordinates, ViewMode } from '../types';
import * as C from '../config/constants';
import { lightenColor, darkenColor } from '../utils/colorUtils';
import { Game } from './Game'; // For type hint of gameInstanceGetter

export class Renderer {
    private app: PIXI.Application;
    private gameInstanceGetter: () => Game; 

    private tileContainer: PIXI.Container;
    private heatmapContainer: PIXI.Container;
    private previewContainer: PIXI.Container;

    constructor(app: PIXI.Application, gameInstanceGetter: () => Game) {
        this.app = app;
        this.gameInstanceGetter = gameInstanceGetter;

        this.tileContainer = new PIXI.Container();
        this.heatmapContainer = new PIXI.Container();
        this.previewContainer = new PIXI.Container();

        this.app.stage.addChild(this.tileContainer);
        this.app.stage.addChild(this.heatmapContainer);
        this.app.stage.addChild(this.previewContainer);
    }

    private hexToPixiColor(hex: string): number {
        return parseInt(hex.replace('#', ''), 16);
    }

    private getHeatmapColor(value: number, maxValue: number, type: 'positive' | 'negative'): string | null {
        // Ensure value is within expected range for heatmap type
        if (type === 'positive' && value < 0) value = 0; // Cap negative values for positive heatmaps
        if (type === 'negative' && value <= 0 && maxValue > 0) return null; // No positive/zero values for strictly positive-is-bad heatmaps (like pollution)
        if (maxValue <= 0) return null; // Avoid division by zero or meaningless heatmap


        const normalizedValue = Math.min(Math.abs(value) / maxValue, 1);
        const alpha = 0.3 + normalizedValue * 0.35; // Vary alpha slightly with intensity

        if (type === 'positive') { // For Tile Value: Red (low value) -> Yellow (mid) -> Green (high value)
            if (normalizedValue < 0.01) return null; // Don't show for very low/zero positive values
            let r, g, b;
            if (normalizedValue < 0.5) { // Red to Yellow
                r = 255;
                g = Math.floor(normalizedValue * 2 * 255);
                b = 0;
            } else { // Yellow to Green
                r = Math.floor(255 - (normalizedValue - 0.5) * 2 * 255);
                g = 255;
                b = 0;
            }
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;

        } else { // For Pollution (Green=Low, Yellow=Mid, Red=High)
             if (normalizedValue < 0.01 && value <=0) return null; // Don't show for very low/zero negative values if it means "good"
            const r = Math.floor(255 * normalizedValue);
            const g = Math.floor(255 * (1 - normalizedValue));
            return `rgba(${r}, ${g}, 0, ${alpha})`;
        }
    }
    
    private drawPixiTileGraphics(
        graphics: PIXI.Graphics,
        tileData: GridTile,
        isBeingPreviewed: boolean = false // Renamed from isSelected, as selection is not visually distinct on map now
    ): void {
        const tileType = tileData.type;
        graphics.clear(); // Clear previous drawings

        const TILE_HALF_WIDTH = C.TILE_HALF_WIDTH_ISO;
        const TILE_HEIGHT = C.TILE_HEIGHT_ISO;
        const TILE_HALF_HEIGHT = C.TILE_HALF_HEIGHT_ISO;

        const baseColorHex = tileType.color;
        const baseColorPixi = this.hexToPixiColor(baseColorHex);
        
        // For preview, use the tile's alpha, otherwise default to 1
        const fillAlpha = isBeingPreviewed ? 0.5 : 1.0; 

        graphics.beginFill(baseColorPixi, fillAlpha);
        
        // Outline for the base tile: darker version of its own color
        // No special outline for previewed base, it's handled by overall alpha
        const outlineColorPixi = this.hexToPixiColor(darkenColor(baseColorHex, 18));
        graphics.lineStyle(0.7, outlineColorPixi, fillAlpha);

        graphics.moveTo(0, 0); // Top point of diamond
        graphics.lineTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
        graphics.lineTo(0, TILE_HEIGHT);
        graphics.lineTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
        graphics.closePath();
        graphics.endFill();

        if (tileType.renderHeight && tileType.renderHeight > 0.001) { // Check for meaningful height
            const isStruggling = tileData.isVisuallyStruggling === true;
            let buildingColorHex = tileType.color;
            if (isStruggling && !isBeingPreviewed) { // Don't apply struggle look to preview
                buildingColorHex = darkenColor(tileType.color, 35);
            }

            const buildingVisualHeight = tileType.renderHeight * C.TILE_DEPTH_UNIT;
            const topColorPixi = this.hexToPixiColor(lightenColor(buildingColorHex, 15));
            const sideColorDarkPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 15));
            const sideColorLightPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 5));
            
            // Outline for 3D parts: even darker version of the building's (potentially struggled) color
            const buildingOutlineColorPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 25));
            graphics.lineStyle(1, buildingOutlineColorPixi, fillAlpha);

            // Right Side
            graphics.beginFill(sideColorDarkPixi, fillAlpha);
            graphics.moveTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
            graphics.lineTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.lineTo(0, -buildingVisualHeight);
            graphics.lineTo(0, 0);
            graphics.closePath();
            graphics.endFill();

            // Left Side
            graphics.beginFill(sideColorLightPixi, fillAlpha);
            graphics.moveTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
            graphics.lineTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.lineTo(0, -buildingVisualHeight);
            graphics.lineTo(0, 0);
            graphics.closePath();
            graphics.endFill();
            
            // Top Face
            graphics.beginFill(topColorPixi, fillAlpha);
            graphics.moveTo(0, -buildingVisualHeight);
            graphics.lineTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.lineTo(0, TILE_HEIGHT - buildingVisualHeight);
            graphics.lineTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.closePath();
            graphics.endFill();
        }
    }

    public render(
        gridData: GridTile[][],
        cameraOffsetX: number, cameraOffsetY: number,
        hoveredTileForPreview: Coordinates | null,
        currentBuildTypeForPreview: TileType | null,
        currentViewMode: ViewMode
    ): void {
        this.tileContainer.removeChildren(); 
        this.heatmapContainer.removeChildren();
        this.previewContainer.removeChildren();

        this.tileContainer.x = cameraOffsetX;
        this.tileContainer.y = cameraOffsetY;
        this.heatmapContainer.x = cameraOffsetX;
        this.heatmapContainer.y = cameraOffsetY;
        this.previewContainer.x = cameraOffsetX;
        this.previewContainer.y = cameraOffsetY;

        const game = this.gameInstanceGetter();

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tileGraphics = new PIXI.Graphics();
                tileGraphics.x = (x - y) * C.TILE_HALF_WIDTH_ISO;
                tileGraphics.y = (x + y) * C.TILE_HALF_HEIGHT_ISO;
                
                this.drawPixiTileGraphics(tileGraphics, gridData[y][x], false);
                this.tileContainer.addChild(tileGraphics);
            }
        }

        if (currentViewMode === 'tile_value_heatmap' || currentViewMode === 'pollution_heatmap') {
            for (let y = 0; y < C.GRID_SIZE_Y; y++) {
                for (let x = 0; x < C.GRID_SIZE_X; x++) {
                    const value = (currentViewMode === 'tile_value_heatmap') 
                        ? game.simulationController.getTileValueAt(x,y) 
                        : game.simulationController.getPollutionAt(x,y);
                    const maxValue = (currentViewMode === 'tile_value_heatmap') 
                        ? C.MAX_TILE_VALUE 
                        : C.MAX_POLLUTION;
                    const heatmapType = (currentViewMode === 'tile_value_heatmap') ? 'positive' : 'negative';
                    const colorString = this.getHeatmapColor(value, maxValue, heatmapType);

                    if (colorString) {
                        const match = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const r = parseInt(match[1]);
                            const gVal = parseInt(match[2]); // g is a reserved keyword
                            const b = parseInt(match[3]);
                            const alpha = parseFloat(match[4]);
                            const pixiColor = (r << 16) + (gVal << 8) + b;

                            const heatmapCellGraphics = new PIXI.Graphics();
                            heatmapCellGraphics.x = (x - y) * C.TILE_HALF_WIDTH_ISO;
                            heatmapCellGraphics.y = (x + y) * C.TILE_HALF_HEIGHT_ISO;
                            
                            heatmapCellGraphics.beginFill(pixiColor, alpha);
                            heatmapCellGraphics.moveTo(0, 0);
                            heatmapCellGraphics.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
                            heatmapCellGraphics.lineTo(0, C.TILE_HEIGHT_ISO);
                            heatmapCellGraphics.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
                            heatmapCellGraphics.closePath();
                            heatmapCellGraphics.endFill();
                            this.heatmapContainer.addChild(heatmapCellGraphics);
                        }
                    }
                }
            }
        }
        
        if (currentBuildTypeForPreview && hoveredTileForPreview && currentViewMode === 'default') {
            const previewTileData: GridTile = {
                type: currentBuildTypeForPreview,
                population: 0,
                tileValue: C.BASE_TILE_VALUE, 
                pollution: 0,
                hasRoadAccess: false, 
                isVisuallyStruggling: false, // Preview doesn't show struggle state
                struggleTicks: 0
            };
            const previewGraphics = new PIXI.Graphics();
            previewGraphics.x = (hoveredTileForPreview.x - hoveredTileForPreview.y) * C.TILE_HALF_WIDTH_ISO;
            previewGraphics.y = (hoveredTileForPreview.x + hoveredTileForPreview.y) * C.TILE_HALF_HEIGHT_ISO;
            
            this.drawPixiTileGraphics(previewGraphics, previewTileData, true); // Pass true for isBeingPreviewed
            this.previewContainer.addChild(previewGraphics);
        }
    }
}
