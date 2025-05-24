// src/game/Game.ts
import * as PIXI from 'pixi.js';
import { TILE_TYPES } from '../config/tileTypes';
import * as C from '../config/constants';
import { GridTile, TileType, Coordinates, GameMode, ViewMode } from '../types';
// UI Components
import { MainInfoPanel } from '../components/MainInfoPanel';
import { BuildToolbar } from '../components/BuildToolbar';
import { MessageBox } from '../components/MessageBox';
import { TileInfoPane } from '../components/TileInfoPane';
// Controllers
import { GridController } from './GridController';
import { Renderer } from './Renderer';
import { SimulationController } from './SimulationController';
import { InputController } from './InputController';

export interface GameDependencies {
    mainInfoPanel?: MainInfoPanel;
    buildToolbar?: BuildToolbar;
    messageBox?: MessageBox;
    tileInfoPane?: TileInfoPane;
    pixiApplication?: PIXI.Application;
    renderer?: Renderer;
    inputController?: InputController;
    gridController?: GridController;
    simulationController?: SimulationController;
}

export class Game {
    public app: PIXI.Application;
    private canvasElement: HTMLCanvasElement | {}; 
    
    public currentMode: GameMode = 'pan';
    public currentViewMode: ViewMode = 'default';
    public currentBuildType: TileType | null = null; 

    public playerBudget: number;
    public cameraOffsetX: number = 0;
    public cameraOffsetY: number = 0;
    public isDragging: boolean = false; 
    public lastMouseX: number = 0;
    public lastMouseY: number = 0;
    public lastTouchX: number | null = null;
    public lastTouchY: number | null = null;
    public hoveredTile: Coordinates | null = null; 
    private gameTickIntervalId: NodeJS.Timeout | number | null = null; // Consistent type for interval ID
    public gameDay: number = 0;
    
    public totalPopulation: number = 0;
    public citySatisfaction: number = 50; 
    public employmentRate: number = 100;
    
    public lastBuiltTileDuringDrag: Coordinates | null = null; 

    public mainInfoPanel: MainInfoPanel;
    public buildToolbar: BuildToolbar;
    public messageBox: MessageBox;
    public tileInfoPane: TileInfoPane;

    public gridController: GridController;
    private renderer: Renderer;
    public simulationController: SimulationController; 
    private inputController: InputController;

    private fpsDisplayElement: HTMLElement | null = null;
    private showFps: boolean = false;
    private lastFpsUpdateTime: number = 0;
    private frameCount: number = 0;

    private isHeadless: boolean;


    constructor(dependencies: Partial<GameDependencies> = {}, initialBudget: number = C.INITIAL_BUDGET) {
        this.isHeadless = typeof window === 'undefined' || (dependencies.pixiApplication && !(dependencies.pixiApplication instanceof PIXI.Application));
        this.playerBudget = initialBudget;

        this.gridController = dependencies.gridController || new GridController(this.isHeadless);

        if (!this.isHeadless && typeof window !== 'undefined') {
            this.mainInfoPanel = dependencies.mainInfoPanel || new MainInfoPanel();
            this.buildToolbar = dependencies.buildToolbar || new BuildToolbar();
            this.messageBox = dependencies.messageBox || new MessageBox();
            this.tileInfoPane = dependencies.tileInfoPane || new TileInfoPane();
            
            this.app = dependencies.pixiApplication || new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x72a372, // Default grass color, or a neutral sky color
                antialias: true, 
            });
            this.canvasElement = this.app.view as HTMLCanvasElement; 
            const canvasContainer = document.getElementById('pixi-canvas-container');
            if (canvasContainer) {
                (this.canvasElement as HTMLCanvasElement).style.width = '100%';
                (this.canvasElement as HTMLCanvasElement).style.height = '100%';
                canvasContainer.appendChild(this.canvasElement as HTMLCanvasElement);
            } else if (!dependencies.pixiApplication && document.getElementById('pixi-canvas-container')) { 
                throw new Error("pixi-canvas-container not found!");
            }

            this.renderer = dependencies.renderer || new Renderer(this.app, () => this); 
            this.inputController = dependencies.inputController || new InputController(this.canvasElement as HTMLCanvasElement, this);

            const urlParams = new URLSearchParams(window.location.search);
            this.showFps = urlParams.get('fps') === 'true';
        } else {
            this.mainInfoPanel = dependencies.mainInfoPanel || ({ updateDisplay: jest.fn() } as any);
            this.buildToolbar = dependencies.buildToolbar || ({ setupEventListeners: jest.fn(), updateSelectedButtonVisuals: jest.fn(), updateViewModeButtonText: jest.fn() } as any);
            this.messageBox = dependencies.messageBox || ({ show: jest.fn() } as any);
            this.tileInfoPane = dependencies.tileInfoPane || ({ update: jest.fn(), show: jest.fn(), hide: jest.fn() } as any);
            
            this.app = dependencies.pixiApplication || ({ 
                stage: { addChild: jest.fn(), removeChildren: jest.fn() }, 
                ticker: { add: jest.fn(), remove: jest.fn() }, 
                renderer: { resize: jest.fn(), view: {} },
                view: {}
            } as any);
            this.canvasElement = this.app.view || {};
            this.renderer = dependencies.renderer || ({ render: jest.fn() } as any);
            this.inputController = dependencies.inputController || ({} as any); 
        }
        
        this.simulationController = dependencies.simulationController || new SimulationController(this.gridController, this);
    }

    public initializeGame(): void {
        if (!this.isHeadless && typeof window !== 'undefined') {
            this.setupComponentInteractions();
            if (this.showFps) {
                this.setupFpsCounter();
            }
            this.setCanvasSize(); 
            window.addEventListener('resize', () => this.handleResize());
        }
        
        const initialFinance = this.simulationController.processGameTick(); 
        this.updateAllUI(initialFinance.taxes, initialFinance.costs, initialFinance.net); 
        
        this.currentMode = 'pan'; 
        this.currentBuildType = null; 
        if (!this.isHeadless) {
            this.messageBox.show('Pan mode active. Select a tool or pan the map.', 1500);
            this.buildToolbar.updateSelectedButtonVisuals(this.currentMode, this.currentBuildType);
            this.setCanvasCursor();
        }

        this.startGameLoop();
        this.drawGame(); 
    }

    private setupFpsCounter(): void {
        if (this.isHeadless || typeof document === 'undefined') return;
        this.fpsDisplayElement = document.createElement('div');
        this.fpsDisplayElement.id = 'fpsDisplay';
        this.fpsDisplayElement.textContent = 'FPS: -';
        document.body.appendChild(this.fpsDisplayElement);

        this.lastFpsUpdateTime = performance.now();
        this.frameCount = 0;

        this.app.ticker.add(() => {
            if (!this.fpsDisplayElement || typeof performance === 'undefined') return;
            this.frameCount++;
            const currentTime = performance.now();
            if (currentTime >= this.lastFpsUpdateTime + 1000) {
                const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdateTime));
                this.fpsDisplayElement.textContent = `FPS: ${fps}`;
                this.lastFpsUpdateTime = currentTime;
                this.frameCount = 0;
            }
        });
    }

    private handleResize(): void {
        if (this.isHeadless) return;
        this.setCanvasSize();
        this.drawGame(); 
    }

    private setupComponentInteractions(): void {
        if (this.isHeadless) return;
        this.buildToolbar.setupEventListeners(
            (toolAction, tileType) => this.handleToolSelection(toolAction, tileType), 
            (newMode) => this.setViewMode(newMode) 
        );
    }
    
    public handleToolSelection(toolAction: string, tileType: TileType | null): void {
        let needsRedrawForBuildPreviewOrHoverInfo = false;
        const oldBuildPreviewActive = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        const oldHoverInfoActive = this.currentViewMode === 'default' && !!this.hoveredTile;


        if (toolAction === 'pan_toggle') {
            if (this.currentMode === 'pan') {
                this.currentMode = 'build';
                this.currentBuildType = null; 
                this.messageBox.show('Inspect mode. Hover for info or select a build tool.', 2000);
            } else {
                this.currentMode = 'pan';
                this.currentBuildType = null; 
                this.messageBox.show('Pan mode activated.', 2000);
            }
        } else if (toolAction === 'build' && tileType) {
            this.currentMode = 'build';       
            this.currentBuildType = tileType;  
            this.messageBox.show(`Selected to build: ${this.currentBuildType.name} ($${this.currentBuildType.cost})`, 1500);
        }

        if(!this.isHeadless) {
            this.buildToolbar.updateSelectedButtonVisuals(this.currentMode, this.currentBuildType);
            this.setCanvasCursor();
        }

        const newBuildPreviewActive = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        const newHoverInfoActive = this.currentViewMode === 'default' && !!this.hoveredTile;

        if (oldBuildPreviewActive !== newBuildPreviewActive || oldHoverInfoActive !== newHoverInfoActive) {
            needsRedrawForBuildPreviewOrHoverInfo = true;
        }
        
        this.updateHoveredTileDisplay(this.hoveredTile); 

        if (needsRedrawForBuildPreviewOrHoverInfo && !this.hoveredTile) {
            this.drawGame();
        }
    }

    public setViewMode(newMode: ViewMode): void {
        const oldViewMode = this.currentViewMode;
        this.currentViewMode = newMode;
        
        if(!this.isHeadless) {
            this.buildToolbar.updateViewModeButtonText(this.currentViewMode); 
        }

        let modeName = "Default";
        if (newMode === 'tile_value_heatmap') modeName = "Tile Value Heatmap";
        else if (newMode === 'pollution_heatmap') modeName = "Pollution Heatmap";
        this.messageBox.show(`${modeName} view active.`, 2000);
        
        this.updateHoveredTileDisplay(this.hoveredTile); 
        if (oldViewMode !== newMode) { 
            this.drawGame();
        }
    }


    public setCanvasCursor(): void {
        if (this.isHeadless || !(this.canvasElement instanceof HTMLCanvasElement)) return;
        
        this.canvasElement.classList.remove('pan-mode-active', 'pan-mode-dragging'); 
        if (this.currentMode === 'pan') {
            this.canvasElement.classList.add('pan-mode-active');
            this.canvasElement.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        } else { 
             this.canvasElement.style.cursor = 'default'; 
        }
    }

    public setCanvasSize(): void {
        if (this.isHeadless || !this.app || !this.app.renderer || typeof window === 'undefined') return;
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        
        // Center camera considering average elevation to keep visual center somewhat stable
        // This is a rough estimate; perfect centering with dynamic elevation is complex.
        let avgElevation = 0;
        // let tileCount = 0;
        // for (let y = 0; y < C.GRID_SIZE_Y; y++) {
        //     for (let x = 0; x < C.GRID_SIZE_X; x++) {
        //         const tile = this.gridController.getTile(x,y);
        //         if(tile) {
        //             avgElevation += tile.elevation;
        //             tileCount++;
        //         }
        //     }
        // }
        // if (tileCount > 0) avgElevation /= tileCount;
        // For simplicity, let's use a fixed offset or a smaller portion of MAX_ELEVATION
        avgElevation = C.MAX_ELEVATION_LEVEL / 3;


        const gridPixelHeight = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_HEIGHT_ISO - (avgElevation * C.ELEVATION_STEP_HEIGHT * C.GRID_SIZE_Y * 0.5);
        this.cameraOffsetX = this.app.screen.width / 2 - (C.GRID_SIZE_X - C.GRID_SIZE_Y) * C.TILE_HALF_WIDTH_ISO / 2;
        this.cameraOffsetY = this.app.screen.height / 2 - gridPixelHeight / 2 + (C.MAX_ELEVATION_LEVEL * C.ELEVATION_STEP_HEIGHT)/2; // Try to keep center mass around screen center
        
        this.setCanvasCursor();
    }

    public drawGame(): void {
        if (this.isHeadless || !this.renderer || typeof this.renderer.render !== 'function') return;
        this.renderer.render(
            this.gridController.grid,
            this.cameraOffsetX, this.cameraOffsetY,
            (this.currentMode === 'build' && this.currentViewMode === 'default' && this.currentBuildType) ? this.hoveredTile : null,
            this.currentBuildType,
            this.currentViewMode,
            this.hoveredTile 
        );
    }
    
    public updateAllUI(taxes: number = 0, costs: number = 0, net: number = 0): void {
        if (this.isHeadless || typeof this.mainInfoPanel.updateDisplay !== 'function') return;
        this.mainInfoPanel.updateDisplay(
            this.gameDay, this.playerBudget, this.totalPopulation,
            this.employmentRate, this.citySatisfaction,
            taxes, costs, net
        );
    }
    
    public updateHoveredTileDisplay(coords: Coordinates | null): void {
        let needsCanvasRedraw = false;
        const oldHoveredTile = this.hoveredTile;
        
        const shouldShowBuildPreviewNow = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        const wasShowingBuildPreview = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType && !!oldHoveredTile;

        if (shouldShowBuildPreviewNow !== wasShowingBuildPreview || (shouldShowBuildPreviewNow && (oldHoveredTile?.x !== coords?.x || oldHoveredTile?.y !== coords?.y))) {
            needsCanvasRedraw = true;
        }

        const shouldShowInfoAvatarNow = !!coords && this.currentViewMode === 'default';
        const wasShowingInfoAvatar = !!oldHoveredTile && this.currentViewMode === 'default'; 
        
        if (shouldShowInfoAvatarNow !== wasShowingInfoAvatar || (shouldShowInfoAvatarNow && (oldHoveredTile?.x !== coords?.x || oldHoveredTile?.y !== coords?.y))) {
             needsCanvasRedraw = true;
        }


        this.hoveredTile = coords;

        if (!this.isHeadless && typeof this.tileInfoPane.update === 'function') {
            if (coords) {
                const tileData = this.gridController.getTile(coords.x, coords.y);
                if (tileData) {
                    this.tileInfoPane.update(tileData, coords);
                    this.tileInfoPane.show();
                } else {
                    this.tileInfoPane.hide();
                }
            } else {
                this.tileInfoPane.hide();
            }
        }
        
        if (needsCanvasRedraw) { 
            this.drawGame();
        }
    }
    
    public handleMouseMoveHover(coords: Coordinates | null): void {
        this.updateHoveredTileDisplay(coords);
    }


    public handleCanvasBuildInteraction(gridX: number, gridY: number): boolean {
        if (this.currentMode !== 'build' || !this.currentBuildType) {
            return false;
        }
        
        const tileData = this.gridController.getTile(gridX, gridY);
        if (!tileData) return false;

        const selectedTool = this.currentBuildType; 
        const oldTileType = tileData.type;

        if (tileData.type.isObstacle && selectedTool.id !== TILE_TYPES.GRASS.id) {
            this.messageBox.show("Cannot build on mountains.", 2000);
            return false;
        }
        if (selectedTool.id === TILE_TYPES.GRASS.id && tileData.type.isObstacle) {
            this.messageBox.show("Mountains cannot be removed.", 2000);
            return false;
        }
        
        if (tileData.type.id === TILE_TYPES.WATER.id && 
            !(selectedTool.id === TILE_TYPES.WATER.id || selectedTool.id === TILE_TYPES.GRASS.id)) {
            this.messageBox.show(`Cannot build ${selectedTool.name} on ${tileData.type.name}.`, 2500);
            return false;
        }

        // Calculate actual cost considering slope
        let actualCost = selectedTool.cost;
        let slopeMessagePart = "";

        if (selectedTool.id !== TILE_TYPES.GRASS.id) { // Don't apply slope cost to bulldozing
            let maxAbsElevationDifference = 0;
            const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (const offset of neighbors) {
                const nx = gridX + offset.dx;
                const ny = gridY + offset.dy;
                const neighborTile = this.gridController.getTile(nx, ny);
                if (neighborTile) {
                    // Only consider difference if neighbor is not water (unless current is also water)
                    // or if neighbor is not an obstacle (unless current is also obstacle - though this case is blocked above)
                    if ( (neighborTile.type.id !== TILE_TYPES.WATER.id || selectedTool.id === TILE_TYPES.WATER.id) && !neighborTile.type.isObstacle) {
                        const diff = Math.abs(tileData.elevation - neighborTile.elevation);
                        if (diff > maxAbsElevationDifference) {
                            maxAbsElevationDifference = diff;
                        }
                    }
                }
            }
            if (maxAbsElevationDifference > 0) {
                const slopePenalty = selectedTool.cost * maxAbsElevationDifference * C.SLOPE_COST_FACTOR;
                actualCost += slopePenalty;
                actualCost = Math.round(actualCost);
                if (slopePenalty > 0) {
                    slopeMessagePart = ` (slope +$${slopePenalty.toFixed(0)})`;
                }
            }
        }


        if (selectedTool.id === TILE_TYPES.GRASS.id) { 
            if (tileData.type.id !== TILE_TYPES.GRASS.id) { 
                // Bulldoze cost is flat, not affected by slope for removal
                const bulldozeCost = (oldTileType.id === TILE_TYPES.ROAD.id) ? 0 : C.BULLDOZE_COST;
                if (this.playerBudget < bulldozeCost ) { 
                     this.messageBox.show(`Not enough funds to bulldoze. Cost: $${bulldozeCost}`, 2000);
                     return false;
                }
                this.playerBudget -= bulldozeCost;

                this.messageBox.show(`Cleared ${tileData.type.name}.`, 1500);
                // Preserve elevation when clearing to grass
                const currentElevation = tileData.elevation;
                this.gridController.clearTileData(gridX, gridY); 
                this.gridController.setTileType(gridX, gridY, TILE_TYPES.GRASS);
                tileData.elevation = currentElevation; // Re-apply elevation after setType potentially resets it based on default
                
                this.updateAllUI(); 
                this.drawGame();
                return true;
            }
            return false; 
        }

        if (tileData.type.id === TILE_TYPES.GRASS.id || 
            (!tileData.type.isObstacle && tileData.type.id !== selectedTool.id)) { 
            
            if (this.playerBudget >= actualCost) {
                let messageAction = tileData.type.id === TILE_TYPES.GRASS.id ? "Built" : "Replaced";
                let oldTypeName = tileData.type.name;

                this.playerBudget -= actualCost;
                
                const currentElevation = tileData.elevation; // Preserve elevation
                if (messageAction === "Replaced") {
                     this.gridController.clearTileData(gridX, gridY); // clearTileData preserves elevation
                }
                this.gridController.setTileType(gridX, gridY, selectedTool);
                // Ensure elevation is preserved after setTileType if it defaults to 0 for the new type
                this.gridController.getTile(gridX, gridY)!.elevation = currentElevation; 
                
                this.messageBox.show(`${messageAction} ${oldTypeName && messageAction === "Replaced" ? oldTypeName : ""} with ${selectedTool.name} for $${actualCost}${slopeMessagePart}`.replace("  ", " "), 2500);
                
                this.updateAllUI(); 
                this.drawGame();
                return true;
            } else {
                this.messageBox.show(`Not enough funds for ${selectedTool.name}. Cost: $${actualCost}${slopeMessagePart}. Budget: $${this.playerBudget.toFixed(0)}`, 2500);
                return false;
            }
        }
        
        return false;
    }

    private startGameLoop(): void {
        if (this.gameTickIntervalId) {
            clearInterval(this.gameTickIntervalId as any);
        }
        const interval = (this.isHeadless || typeof window === 'undefined') ? C.TEST_GAME_TICK_INTERVAL : C.GAME_TICK_INTERVAL;
        
        this.gameTickIntervalId = globalThis.setInterval(() => this.gameTick(), interval);
    }
    
    public stopGameLoop(): void { 
        if (this.gameTickIntervalId) {
            globalThis.clearInterval(this.gameTickIntervalId as any);
            this.gameTickIntervalId = null;
        }
    }

    private gameTick(): void {
        this.gameDay++;
        const economyUpdate = this.simulationController.processGameTick();
        this.updateAllUI(economyUpdate.taxes, economyUpdate.costs, economyUpdate.net); 
        this.drawGame(); 
    }
}
