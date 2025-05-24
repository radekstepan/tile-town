// src/game/Renderer.ts
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

        this.tileContainer.sortableChildren = true;

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
        tileTypeToDisplay: TileType, 
        isBeingPreviewed: boolean = false,
        _gridX: number, 
        _gridY: number  
    ): void {
        graphics.clear();

        const HW = C.TILE_HALF_WIDTH_ISO; 
        const H = C.TILE_HEIGHT_ISO;    
        const HH = C.TILE_HALF_HEIGHT_ISO; 

        let featureColorHex = tileTypeToDisplay.color;
        // Apply struggle effect to the visual color if it's a structure and struggling (and not a preview)
        if (tileData.isVisuallyStruggling && !isBeingPreviewed && tileTypeToDisplay.renderHeight > 0.01 && !tileTypeToDisplay.isZone) {
            featureColorHex = darkenColor(tileTypeToDisplay.color, 35);
        }
        
        const baseMainFillAlpha = isBeingPreviewed ? 0.6 : 1.0;
        const baseSideFillAlpha = isBeingPreviewed ? baseMainFillAlpha * 0.3 : 1.0; 
        const baseOutlineAlpha = isBeingPreviewed ? baseMainFillAlpha * 0.5 : 1.0;

        let groundBlockColorSourceHex = tileData.type.color;
        if (tileTypeToDisplay.id === TILE_TYPES.WATER.id && isBeingPreviewed) { // If previewing water, make "ground" also water color
            groundBlockColorSourceHex = TILE_TYPES.WATER.color;
        }
        
        // --- 1. Draw Ground Block Sides (if elevated) ---
        if (tileData.elevation > 0) {
            const GH = tileData.elevation * C.ELEVATION_STEP_HEIGHT; 
            
            const groundSideColorLight = this.hexToPixiColor(lightenColor(groundBlockColorSourceHex, 10)); 
            const groundSideColorDark = this.hexToPixiColor(darkenColor(groundBlockColorSourceHex, 15)); 
            const groundOutline = this.hexToPixiColor(darkenColor(groundBlockColorSourceHex, 25));

            // Vertices of the top surface of the diamond base (relative to graphics object origin)
            const T_top    = { x: 0,   y: 0 };
            const T_left   = { x: -HW, y: HH };
            const T_bottom = { x: 0,   y: H };
            const T_right  = { x: HW,  y: HH };

            // Corresponding vertices at the bottom of the elevated block
            const B_top    = { x: T_top.x,    y: T_top.y + GH };
            const B_left   = { x: T_left.x,   y: T_left.y + GH };
            const B_bottom = { x: T_bottom.x, y: T_bottom.y + GH };
            const B_right  = { x: T_right.x,  y: T_right.y + GH };

            // Back-Left Face
            graphics.lineStyle(0.5, groundOutline, baseOutlineAlpha);
            graphics.beginFill(groundSideColorLight, baseSideFillAlpha);
            graphics.moveTo(T_top.x, T_top.y);
            graphics.lineTo(T_left.x, T_left.y);
            graphics.lineTo(B_left.x, B_left.y);
            graphics.lineTo(B_top.x, B_top.y);
            graphics.closePath();
            graphics.endFill();

            // Back-Right Face
            graphics.lineStyle(0.5, groundOutline, baseOutlineAlpha);
            graphics.beginFill(groundSideColorDark, baseSideFillAlpha);
            graphics.moveTo(T_top.x, T_top.y);
            graphics.lineTo(T_right.x, T_right.y);
            graphics.lineTo(B_right.x, B_right.y);
            graphics.lineTo(B_top.x, B_top.y);
            graphics.closePath();
            graphics.endFill();
            
            // Front-Left Face
            graphics.lineStyle(0.5, groundOutline, baseOutlineAlpha);
            graphics.beginFill(groundSideColorLight, baseSideFillAlpha);
            graphics.moveTo(T_left.x, T_left.y);
            graphics.lineTo(T_bottom.x, T_bottom.y);
            graphics.lineTo(B_bottom.x, B_bottom.y);
            graphics.lineTo(B_left.x, B_left.y);
            graphics.closePath();
            graphics.endFill();
            
            // Front-Right Face
            graphics.lineStyle(0.5, groundOutline, baseOutlineAlpha);
            graphics.beginFill(groundSideColorDark, baseSideFillAlpha);
            graphics.moveTo(T_right.x, T_right.y);
            graphics.lineTo(T_bottom.x, T_bottom.y);
            graphics.lineTo(B_bottom.x, B_bottom.y);
            graphics.lineTo(B_right.x, B_right.y);
            graphics.closePath();
            graphics.endFill();
        }

        // --- 2. Draw Top Surface of Ground/Feature ---
        let topSurfaceColorSourceHex = featureColorHex; // Default to the color of the item being displayed
        // If the item being displayed is a tall structure (not water, not zone), 
        // then the diamond base underneath it should use the *actual* ground tile's color.
        if (tileTypeToDisplay.renderHeight > 0.01 && !tileTypeToDisplay.isZone && tileTypeToDisplay.id !== TILE_TYPES.WATER.id) {
             topSurfaceColorSourceHex = tileData.type.color; 
        }
        // Ensure Mountain and Water tops always use their own feature color
        else if (tileTypeToDisplay.id === TILE_TYPES.MOUNTAIN.id || tileTypeToDisplay.id === TILE_TYPES.WATER.id) {
            topSurfaceColorSourceHex = featureColorHex; 
        }

        const topSurfacePixiColor = this.hexToPixiColor(topSurfaceColorSourceHex);
        const topSurfaceOutlinePixiColor = this.hexToPixiColor(darkenColor(topSurfaceColorSourceHex, 18));

        graphics.beginFill(topSurfacePixiColor, baseMainFillAlpha);
        graphics.lineStyle(0.7, topSurfaceOutlinePixiColor, baseOutlineAlpha); 
        graphics.moveTo(0, 0); 
        graphics.lineTo(HW, HH); 
        graphics.lineTo(0, H); 
        graphics.lineTo(-HW, HH); 
        graphics.closePath();
        graphics.endFill();

        // --- 3. Draw Structure on top (if it has height and is not water/zone) ---
        if (tileTypeToDisplay.renderHeight && tileTypeToDisplay.renderHeight > 0.01 && !tileTypeToDisplay.isZone && tileTypeToDisplay.id !== TILE_TYPES.WATER.id) { 
            const buildingColorHexForStructure = featureColorHex; // This already includes struggle effect
            const BH = tileTypeToDisplay.renderHeight * C.TILE_DEPTH_UNIT; // BuildingHeight

            const structTopColorPixi = this.hexToPixiColor(lightenColor(buildingColorHexForStructure, 12));
            const structSideLightPixi = this.hexToPixiColor(lightenColor(buildingColorHexForStructure, 5));  
            const structSideDarkPixi = this.hexToPixiColor(darkenColor(buildingColorHexForStructure, 12)); 
            const structOutlinePixiColor = this.hexToPixiColor(darkenColor(buildingColorHexForStructure, 20));
            
            // Vertices for the base of the structure (same as ground top surface)
            const S_base_top    = { x: 0,   y: 0 };
            const S_base_left   = { x: -HW, y: HH };
            const S_base_bottom = { x: 0,   y: H };
            const S_base_right  = { x: HW,  y: HH };

            // Vertices for the top of the structure (projected upwards by BH)
            const S_top_top    = { x: S_base_top.x,    y: S_base_top.y - BH };
            const S_top_left   = { x: S_base_left.x,   y: S_base_left.y - BH };
            const S_top_bottom = { x: S_base_bottom.x, y: S_base_bottom.y - BH };
            const S_top_right  = { x: S_base_right.x,  y: S_base_right.y - BH };
            
            // Structure's Back-Left Face
            graphics.lineStyle(0.5, structOutlinePixiColor, baseOutlineAlpha);
            graphics.beginFill(structSideLightPixi, baseSideFillAlpha);
            graphics.moveTo(S_base_top.x, S_base_top.y);
            graphics.lineTo(S_base_left.x, S_base_left.y);
            graphics.lineTo(S_top_left.x, S_top_left.y);
            graphics.lineTo(S_top_top.x, S_top_top.y);
            graphics.closePath();
            graphics.endFill();
            
            // Structure's Back-Right Face
            graphics.lineStyle(0.5, structOutlinePixiColor, baseOutlineAlpha);
            graphics.beginFill(structSideDarkPixi, baseSideFillAlpha); 
            graphics.moveTo(S_base_top.x, S_base_top.y);
            graphics.lineTo(S_base_right.x, S_base_right.y);
            graphics.lineTo(S_top_right.x, S_top_right.y);
            graphics.lineTo(S_top_top.x, S_top_top.y);   
            graphics.closePath();
            graphics.endFill();

            // Structure's Front-Left Face
            graphics.lineStyle(0.5, structOutlinePixiColor, baseOutlineAlpha);
            graphics.beginFill(structSideLightPixi, baseSideFillAlpha);
            graphics.moveTo(S_base_left.x, S_base_left.y);
            graphics.lineTo(S_base_bottom.x, S_base_bottom.y);
            graphics.lineTo(S_top_bottom.x, S_top_bottom.y);
            graphics.lineTo(S_top_left.x, S_top_left.y);
            graphics.closePath();
            graphics.endFill();

            // Structure's Front-Right Face
            graphics.lineStyle(0.5, structOutlinePixiColor, baseOutlineAlpha);
            graphics.beginFill(structSideDarkPixi, baseSideFillAlpha);
            graphics.moveTo(S_base_right.x, S_base_right.y);
            graphics.lineTo(S_base_bottom.x, S_base_bottom.y);
            graphics.lineTo(S_top_bottom.x, S_top_bottom.y);
            graphics.lineTo(S_top_right.x, S_top_right.y);
            graphics.closePath();
            graphics.endFill();
            
            // Structure's Top face
            graphics.lineStyle(0.7, structOutlinePixiColor, baseOutlineAlpha);
            graphics.beginFill(structTopColorPixi, baseMainFillAlpha); 
            graphics.moveTo(S_top_top.x, S_top_top.y); 
            graphics.lineTo(S_top_right.x, S_top_right.y); 
            graphics.lineTo(S_top_bottom.x, S_top_bottom.y); 
            graphics.lineTo(S_top_left.x, S_top_left.y); 
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
                const tileData = gridData[y][x];
                const tileGraphics = new PIXI.Graphics(); 
                
                tileGraphics.x = (x - y) * C.TILE_HALF_WIDTH_ISO;
                tileGraphics.y = (x + y) * C.TILE_HALF_HEIGHT_ISO - (tileData.elevation * C.ELEVATION_STEP_HEIGHT);
                
                tileGraphics.zIndex = tileGraphics.y + (tileData.elevation * C.ELEVATION_STEP_HEIGHT);

                this.drawPixiTileGraphics(tileGraphics, tileData, tileData.type, false, x, y); 
                this.tileContainer.addChild(tileGraphics);
            }
        }

        if (currentViewMode === 'tile_value_heatmap' || currentViewMode === 'pollution_heatmap') {
            for (let yLoc = 0; yLoc < C.GRID_SIZE_Y; yLoc++) { 
                for (let xLoc = 0; xLoc < C.GRID_SIZE_X; xLoc++) { 
                    const tileDataForHeatmap = gridData[yLoc][xLoc];
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
                            heatmapCellGraphics.y = (xLoc + yLoc) * C.TILE_HALF_HEIGHT_ISO - (tileDataForHeatmap.elevation * C.ELEVATION_STEP_HEIGHT);
                            
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
                    const tileScreenYBase = (hoveredTileForInfo.x + hoveredTileForInfo.y) * C.TILE_HALF_HEIGHT_ISO - (tile.elevation * C.ELEVATION_STEP_HEIGHT);
                    
                    const structureVisualHeight = (tile.type.renderHeight || 0) * C.TILE_DEPTH_UNIT;
                    
                    pixiText.x = tileScreenX;
                    pixiText.y = tileScreenYBase - structureVisualHeight - 8; 
                    pixiText.anchor.set(0.5, 1); 

                    this.hoverInfoContainer.addChild(pixiText);
                }
            }
        }

        if (currentBuildTypeForPreview && hoveredTileForPreview && currentViewMode === 'default') {
            const actualGridTileBelowPreview = gridData[hoveredTileForPreview.y]?.[hoveredTileForPreview.x];
            if (actualGridTileBelowPreview) { 
                const previewGraphics = new PIXI.Graphics();
                previewGraphics.x = (hoveredTileForPreview.x - hoveredTileForPreview.y) * C.TILE_HALF_WIDTH_ISO;
                previewGraphics.y = (hoveredTileForPreview.x + hoveredTileForPreview.y) * C.TILE_HALF_HEIGHT_ISO - (actualGridTileBelowPreview.elevation * C.ELEVATION_STEP_HEIGHT);
                
                this.drawPixiTileGraphics(previewGraphics, actualGridTileBelowPreview, currentBuildTypeForPreview, true, hoveredTileForPreview.x, hoveredTileForPreview.y); 
                this.previewContainer.addChild(previewGraphics);
            }
        }
    }
}
