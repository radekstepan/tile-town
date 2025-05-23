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
        if (maxValue <= 0) return null;

        // Lower the threshold for not drawing, to catch fainter pollution
        // For 'positive' type (used for both tile value and pollution now):
        // value < 0.5 means don't draw extremely low values. This ensures that "almost zero" is not drawn.
        // This threshold can be tuned. If 0.5 is too high and hides faint pollution, try 0.1 or 0.01.
        if (value < 0.5) { // Adjusted threshold
             return null;
        }

        const normalizedValue = Math.min(Math.max(value, 0) / maxValue, 1);
        
        // Adjusted alpha for better visual decay: starts a bit more opaque, full range.
        const alpha = 0.2 + normalizedValue * 0.5; // Range 0.2 to 0.7

        if (type === 'positive') { // Red (low value on scale) -> Yellow (mid) -> Green (high value on scale)
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

        } else { // 'negative' type: Green (low value on scale) -> Yellow (mid) -> Red (high value on scale)
            // This 'negative' branch is effectively not used if both heatmaps use 'positive'
            const r = Math.floor(255 * normalizedValue); 
            const g = Math.floor(255 * (1 - normalizedValue)); 
            return `rgba(${r}, ${g}, 0, ${alpha})`;
        }
    }

    private drawPixiTileGraphics(
        graphics: PIXI.Graphics,
        tileData: GridTile,
        isBeingPreviewed: boolean = false
    ): void {
        const tileType = tileData.type;
        graphics.clear();

        const TILE_HALF_WIDTH = C.TILE_HALF_WIDTH_ISO;
        const TILE_HEIGHT = C.TILE_HEIGHT_ISO;
        const TILE_HALF_HEIGHT = C.TILE_HALF_HEIGHT_ISO;

        const baseColorHex = tileType.color;
        const baseColorPixi = this.hexToPixiColor(baseColorHex);
        
        const fillAlpha = isBeingPreviewed ? 0.5 : 1.0;

        graphics.beginFill(baseColorPixi, fillAlpha);
        
        const outlineColorPixi = this.hexToPixiColor(darkenColor(baseColorHex, 18));
        graphics.lineStyle(0.7, outlineColorPixi, fillAlpha);

        graphics.moveTo(0, 0);
        graphics.lineTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
        graphics.lineTo(0, TILE_HEIGHT);
        graphics.lineTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
        graphics.closePath();
        graphics.endFill();

        if (tileType.renderHeight && tileType.renderHeight > 0.001) {
            const isStruggling = tileData.isVisuallyStruggling === true;
            let buildingColorHex = tileType.color;
            if (isStruggling && !isBeingPreviewed) {
                buildingColorHex = darkenColor(tileType.color, 35);
            }

            const buildingVisualHeight = tileType.renderHeight * C.TILE_DEPTH_UNIT;
            const topColorPixi = this.hexToPixiColor(lightenColor(buildingColorHex, 15));
            const sideColorDarkPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 15));
            const sideColorLightPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 5));
            
            const buildingOutlineColorPixi = this.hexToPixiColor(darkenColor(buildingColorHex, 25));
            graphics.lineStyle(1, buildingOutlineColorPixi, fillAlpha);

            graphics.beginFill(sideColorDarkPixi, fillAlpha);
            graphics.moveTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
            graphics.lineTo(TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.lineTo(0, -buildingVisualHeight);
            graphics.lineTo(0, 0);
            graphics.closePath();
            graphics.endFill();

            graphics.beginFill(sideColorLightPixi, fillAlpha);
            graphics.moveTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT);
            graphics.lineTo(-TILE_HALF_WIDTH, TILE_HALF_HEIGHT - buildingVisualHeight);
            graphics.lineTo(0, -buildingVisualHeight);
            graphics.lineTo(0, 0);
            graphics.closePath();
            graphics.endFill();
            
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
            for (let yLoc = 0; yLoc < C.GRID_SIZE_Y; yLoc++) { // Renamed y to yLoc to avoid conflict
                for (let xLoc = 0; xLoc < C.GRID_SIZE_X; xLoc++) { // Renamed x to xLoc
                    const value = (currentViewMode === 'tile_value_heatmap')
                        ? game.simulationController.getTileValueAt(xLoc,yLoc)
                        : game.simulationController.getPollutionAt(xLoc,yLoc);
                    const maxValue = (currentViewMode === 'tile_value_heatmap')
                        ? C.MAX_TILE_VALUE
                        : C.MAX_POLLUTION;
                    
                    const heatmapType = 'positive';
                    const colorString = this.getHeatmapColor(value, maxValue, heatmapType);

                    if (colorString) {
                        const match = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const r = parseInt(match[1]);
                            const gVal = parseInt(match[2]);
                            const b = parseInt(match[3]);
                            const alpha = parseFloat(match[4]);
                            const pixiColor = (r << 16) + (gVal << 8) + b;

                            const heatmapCellGraphics = new PIXI.Graphics();
                            heatmapCellGraphics.x = (xLoc - yLoc) * C.TILE_HALF_WIDTH_ISO;
                            heatmapCellGraphics.y = (xLoc + yLoc) * C.TILE_HALF_HEIGHT_ISO;
                            
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
                isVisuallyStruggling: false,
                struggleTicks: 0
            };
            const previewGraphics = new PIXI.Graphics();
            previewGraphics.x = (hoveredTileForPreview.x - hoveredTileForPreview.y) * C.TILE_HALF_WIDTH_ISO;
            previewGraphics.y = (hoveredTileForPreview.x + hoveredTileForPreview.y) * C.TILE_HALF_HEIGHT_ISO;
            
            this.drawPixiTileGraphics(previewGraphics, previewTileData, true);
            this.previewContainer.addChild(previewGraphics);
        }
    }
}
