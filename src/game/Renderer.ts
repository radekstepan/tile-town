import * as PIXI from 'pixi.js';
import { GridTile, TileType, Coordinates, ViewMode } from '../types';
import * as C from '../config/constants';
import { lightenColor, darkenColor } from '../utils/colorUtils';
import { Game } from './Game'; 
import { TILE_TYPES } from '../config/tileTypes'; 

export class Renderer {
    private app: PIXI.Application;
    private gameInstanceGetter: () => Game;

    private tileContainer: PIXI.Container;
    private heatmapContainer: PIXI.Container;
    private previewContainer: PIXI.Container;
    private hoverInfoContainer: PIXI.Container; 

    constructor(app: PIXI.Application, gameInstanceGetter: () => Game) {
        this.app = app;
        this.gameInstanceGetter = gameInstanceGetter;

        this.tileContainer = new PIXI.Container();
        this.heatmapContainer = new PIXI.Container();
        this.previewContainer = new PIXI.Container();
        this.hoverInfoContainer = new PIXI.Container(); 

        this.app.stage.addChild(this.tileContainer);
        this.app.stage.addChild(this.heatmapContainer);
        this.app.stage.addChild(this.previewContainer);
        this.app.stage.addChild(this.hoverInfoContainer); 
    }

    private hexToPixiColor(hex: string): number {
        return parseInt(hex.replace('#', ''), 16);
    }

    private getHeatmapColor(value: number, maxValue: number, type: 'positive' | 'negative'): string | null {
        if (maxValue <= 0) return null;

        let r: number, g: number, b: number = 0;
        let alpha: number;

        if (type === 'positive') { 
            const normalizedValue = Math.min(Math.max(value, 0) / maxValue, 1);
            alpha = 0.2 + normalizedValue * 0.5; 

            if (normalizedValue < 0.5) { 
                r = 255;
                g = Math.floor(normalizedValue * 2 * 255);
                b = 0;
            } else { 
                r = Math.floor(255 - (normalizedValue - 0.5) * 2 * 255);
                g = 255;
                b = 0;
            }
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;

        } else { 
            if (value < 0.1) { 
                return null;
            }

            const normalizedValue = Math.min(Math.max(value, 0) / maxValue, 1);
            alpha = 0.2 + normalizedValue * 0.5; 
            
            r = 255; 
            g = Math.floor((1 - normalizedValue) * 255); 
            b = 0; 
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

        // Removed grass texture drawing logic

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
        currentViewMode: ViewMode,
        hoveredTileForInfo: Coordinates | null 
    ): void {
        this.tileContainer.removeChildren();
        this.heatmapContainer.removeChildren();
        this.previewContainer.removeChildren();
        this.hoverInfoContainer.removeChildren(); 

        this.tileContainer.x = cameraOffsetX;
        this.tileContainer.y = cameraOffsetY;
        this.heatmapContainer.x = cameraOffsetX;
        this.heatmapContainer.y = cameraOffsetY;
        this.previewContainer.x = cameraOffsetX;
        this.previewContainer.y = cameraOffsetY;
        this.hoverInfoContainer.x = cameraOffsetX; 
        this.hoverInfoContainer.y = cameraOffsetY; 


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
            for (let yLoc = 0; yLoc < C.GRID_SIZE_Y; yLoc++) { 
                for (let xLoc = 0; xLoc < C.GRID_SIZE_X; xLoc++) { 
                    const value = (currentViewMode === 'tile_value_heatmap')
                        ? game.simulationController.getTileValueAt(xLoc,yLoc)
                        : game.simulationController.getPollutionAt(xLoc,yLoc);
                    const maxValue = (currentViewMode === 'tile_value_heatmap')
                        ? C.MAX_TILE_VALUE
                        : C.MAX_POLLUTION;
                    
                    const heatmapType = (currentViewMode === 'pollution_heatmap') ? 'negative' : 'positive';
                    const colorString = this.getHeatmapColor(value, maxValue, heatmapType);

                    if (colorString) { 
                        const match = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                        if (match) {
                            const r_val = parseInt(match[1]);
                            const gVal = parseInt(match[2]);
                            const b_val = parseInt(match[3]);
                            const alpha_val = parseFloat(match[4]);
                            const pixiColor = (r_val << 16) + (gVal << 8) + b_val;

                            const heatmapCellGraphics = new PIXI.Graphics();
                            heatmapCellGraphics.x = (xLoc - yLoc) * C.TILE_HALF_WIDTH_ISO;
                            heatmapCellGraphics.y = (xLoc + yLoc) * C.TILE_HALF_HEIGHT_ISO;
                            
                            heatmapCellGraphics.beginFill(pixiColor, alpha_val);
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
        
        if (hoveredTileForInfo && currentViewMode === 'default') { 
            const tile = gridData[hoveredTileForInfo.y]?.[hoveredTileForInfo.x];
            if (tile && tile.type.zoneCategory && tile.type.level && tile.type.level > 0 && tile.type.populationCapacity) {
                let infoTextContent = "";
                let prefix = "";

                if (tile.type.zoneCategory === 'residential') {
                    prefix = "Pop: ";
                    infoTextContent = `${prefix}${tile.population}/${tile.type.populationCapacity}`;
                } else if (tile.type.zoneCategory === 'commercial' || tile.type.zoneCategory === 'industrial') {
                    prefix = "Op: "; 
                    infoTextContent = `${prefix}${tile.population}/${tile.type.populationCapacity}`;
                }

                if (infoTextContent) {
                    const textStyle = new PIXI.TextStyle({
                        fontFamily: 'Arial', 
                        fontSize: 14,       
                        fill: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 2, 
                        align: 'center'
                    });
                    const pixiText = new PIXI.Text(infoTextContent, textStyle);
                    pixiText.resolution = this.app.renderer.resolution * 2; 
                    pixiText.style.fontSize = Math.floor(textStyle.fontSize / pixiText.resolution * (this.app.renderer.resolution * 2));


                    const tileScreenX = (hoveredTileForInfo.x - hoveredTileForInfo.y) * C.TILE_HALF_WIDTH_ISO;
                    const tileScreenY = (hoveredTileForInfo.x + hoveredTileForInfo.y) * C.TILE_HALF_HEIGHT_ISO;
                    const buildingVisualHeight = (tile.type.renderHeight || 0) * C.TILE_DEPTH_UNIT;
                    
                    pixiText.x = tileScreenX;
                    pixiText.y = tileScreenY - (C.TILE_HALF_HEIGHT_ISO / 2) - buildingVisualHeight - 8; 
                    pixiText.anchor.set(0.5, 1); 

                    this.hoverInfoContainer.addChild(pixiText);
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
