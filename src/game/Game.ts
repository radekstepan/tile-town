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

export class Game {
    public app: PIXI.Application;
    private canvasElement: HTMLCanvasElement; 
    
    // Game State
    public currentMode: GameMode = 'pan';
    public currentViewMode: ViewMode = 'default';
    public currentBuildType: TileType | null = null; 

    public playerBudget: number = C.INITIAL_BUDGET;
    public cameraOffsetX: number = 0;
    public cameraOffsetY: number = 0;
    public isDragging: boolean = false; 
    public lastMouseX: number = 0;
    public lastMouseY: number = 0;
    public lastTouchX: number | null = null;
    public lastTouchY: number | null = null;
    public hoveredTile: Coordinates | null = null; 
    private gameTickIntervalId: number | null = null;
    public gameDay: number = 0;
    
    public totalPopulation: number = 0;
    public citySatisfaction: number = 50; 
    public employmentRate: number = 100;
    
    public lastBuiltTileDuringDrag: Coordinates | null = null; 

    public mainInfoPanel: MainInfoPanel;
    public buildToolbar: BuildToolbar;
    public messageBox: MessageBox;
    public tileInfoPane: TileInfoPane;

    private gridController: GridController;
    private renderer: Renderer;
    public simulationController: SimulationController; 
    private inputController: InputController;

    // FPS Counter
    private fpsDisplayElement: HTMLElement | null = null;
    private showFps: boolean = false;
    private lastFpsUpdateTime: number = 0;
    private frameCount: number = 0;


    constructor() {
        this.mainInfoPanel = new MainInfoPanel();
        this.buildToolbar = new BuildToolbar();
        this.messageBox = new MessageBox();
        this.tileInfoPane = new TileInfoPane();
        this.gridController = new GridController();

        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x72a372, 
            antialias: true, 
        });

        this.canvasElement = this.app.view as HTMLCanvasElement; 
        
        const canvasContainer = document.getElementById('pixi-canvas-container');
        if (!canvasContainer) {
            throw new Error("pixi-canvas-container not found!");
        }
        this.canvasElement.style.width = '100%';
        this.canvasElement.style.height = '100%';
        canvasContainer.appendChild(this.canvasElement);

        this.renderer = new Renderer(this.app, () => this); 
        this.simulationController = new SimulationController(this.gridController, this);
        this.inputController = new InputController(this.canvasElement, this);

        // Check for FPS parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.showFps = urlParams.get('fps') === 'true';
    }

    public initializeGame(): void {
        this.setupComponentInteractions();
        
        if (this.showFps) {
            this.setupFpsCounter();
        }

        const initialFinance = this.simulationController.processGameTick(); 
        this.updateAllUI(initialFinance.taxes, initialFinance.costs, initialFinance.net); 
        this.setCanvasSize(); 
        
        this.currentMode = 'pan'; 
        this.currentBuildType = null; 
        this.messageBox.show('Pan mode active. Select a tool or pan the map.', 1500);

        this.startGameLoop();
        this.buildToolbar.updateSelectedButtonVisuals(this.currentMode, this.currentBuildType);
        this.setCanvasCursor();
        
        window.addEventListener('resize', () => this.handleResize());
        
        this.drawGame(); 
    }

    private setupFpsCounter(): void {
        this.fpsDisplayElement = document.createElement('div');
        this.fpsDisplayElement.id = 'fpsDisplay';
        // Basic styling, can be enhanced with CSS
        this.fpsDisplayElement.textContent = 'FPS: -';
        document.body.appendChild(this.fpsDisplayElement);

        this.lastFpsUpdateTime = performance.now();
        this.frameCount = 0;

        this.app.ticker.add(() => {
            if (!this.fpsDisplayElement) return;

            this.frameCount++;
            const currentTime = performance.now();
            if (currentTime >= this.lastFpsUpdateTime + 1000) { // Update every second
                const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdateTime));
                this.fpsDisplayElement.textContent = `FPS: ${fps}`;
                this.lastFpsUpdateTime = currentTime;
                this.frameCount = 0;
            }
        });
    }

    private handleResize(): void {
        this.setCanvasSize();
        this.drawGame(); 
    }

    private setupComponentInteractions(): void {
        this.buildToolbar.setupEventListeners(
            (toolAction, tileType) => this.handleToolSelection(toolAction, tileType), 
            (newMode) => this.setViewMode(newMode) 
        );
    }
    
    public handleToolSelection(toolAction: string, tileType: TileType | null): void {
        let needsRedrawForBuildPreview = false;
        const oldBuildPreviewActive = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;

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

        this.buildToolbar.updateSelectedButtonVisuals(this.currentMode, this.currentBuildType);
        this.setCanvasCursor();

        const newBuildPreviewActive = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        if (oldBuildPreviewActive !== newBuildPreviewActive) {
            needsRedrawForBuildPreview = true;
        }
        
        this.updateHoveredTileDisplay(this.hoveredTile);

        if (needsRedrawForBuildPreview) {
            this.drawGame();
        }
    }

    public setViewMode(newMode: ViewMode): void {
        const oldViewMode = this.currentViewMode;
        this.currentViewMode = newMode;
        this.buildToolbar.updateViewModeButtonText(this.currentViewMode); 

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
        if (this.canvasElement) {
            this.canvasElement.classList.remove('pan-mode-active', 'pan-mode-dragging'); 
            if (this.currentMode === 'pan') {
                this.canvasElement.classList.add('pan-mode-active');
                this.canvasElement.style.cursor = this.isDragging ? 'grabbing' : 'grab';
            } else { 
                 this.canvasElement.style.cursor = 'default'; 
            }
        }
    }

    public setCanvasSize(): void {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        
        const gridPixelHeight = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_HEIGHT_ISO;
        this.cameraOffsetX = this.app.screen.width / 2 - (C.GRID_SIZE_X - C.GRID_SIZE_Y) * C.TILE_HALF_WIDTH_ISO / 2;
        this.cameraOffsetY = this.app.screen.height / 2 - gridPixelHeight / 2;
        
        this.setCanvasCursor();
    }

    public drawGame(): void {
        // The actual drawing is handled by Pixi's ticker automatically.
        // This method updates the state of the Pixi objects for the renderer.
        this.renderer.render(
            this.gridController.grid,
            this.cameraOffsetX, this.cameraOffsetY,
            (this.currentMode === 'build' && this.currentViewMode === 'default' && this.currentBuildType) ? this.hoveredTile : null,
            this.currentBuildType,
            this.currentViewMode
        );
    }
    
    public updateAllUI(taxes: number = 0, costs: number = 0, net: number = 0): void {
        this.mainInfoPanel.updateDisplay(
            this.gameDay, this.playerBudget, this.totalPopulation,
            this.employmentRate, this.citySatisfaction,
            taxes, costs, net
        );
    }
    
    public updateHoveredTileDisplay(coords: Coordinates | null): void {
        let needsCanvasRedrawForBuildPreview = false;
        const oldHoveredTileForPreview = this.hoveredTile;
        const shouldShowBuildPreviewNow = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        
        if ((oldHoveredTileForPreview?.x !== coords?.x || oldHoveredTileForPreview?.y !== coords?.y) ||
            (shouldShowBuildPreviewNow !== (!!this.currentBuildType && !!oldHoveredTileForPreview && this.currentMode === 'build' && this.currentViewMode === 'default'))) {
             if(shouldShowBuildPreviewNow || (this.currentMode === 'build' && this.currentBuildType && oldHoveredTileForPreview && !coords) ) {
                needsCanvasRedrawForBuildPreview = true;
             }
        }
        this.hoveredTile = coords;

        if (this.currentViewMode === 'default') {
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
        } else { 
            this.tileInfoPane.hide(); 
        }
        
        if (needsCanvasRedrawForBuildPreview) { 
            // Calling drawGame ensures the renderer updates its containers for the next Pixi tick
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

        if (selectedTool.id === TILE_TYPES.GRASS.id) { 
            if (tileData.type.id !== TILE_TYPES.GRASS.id) { 
                if (this.playerBudget < C.BULLDOZE_COST && oldTileType.id !== TILE_TYPES.ROAD.id) { 
                     this.messageBox.show(`Not enough funds to bulldoze. Cost: $${C.BULLDOZE_COST}`, 2000);
                     return false;
                }
                if (oldTileType.id !== TILE_TYPES.ROAD.id) { 
                    this.playerBudget -= C.BULLDOZE_COST;
                }

                this.messageBox.show(`Cleared ${tileData.type.name}.`, 1500);
                this.gridController.clearTileData(gridX, gridY); 
                this.gridController.setTileType(gridX, gridY, TILE_TYPES.GRASS);
                
                this.updateAllUI(); 
                this.drawGame();
                return true;
            }
            return false; 
        }

        if (tileData.type.id === TILE_TYPES.GRASS.id || 
            (!tileData.type.isObstacle && tileData.type.id !== selectedTool.id)) { 
            
            if (this.playerBudget >= selectedTool.cost) {
                let messageAction = tileData.type.id === TILE_TYPES.GRASS.id ? "Built" : "Replaced";
                let oldTypeName = tileData.type.name;

                this.playerBudget -= selectedTool.cost;
                
                if (messageAction === "Replaced") {
                     this.gridController.clearTileData(gridX, gridY);
                }
                this.gridController.setTileType(gridX, gridY, selectedTool);
                
                this.messageBox.show(`${messageAction} ${oldTypeName && messageAction === "Replaced" ? oldTypeName : ""} with ${selectedTool.name} for $${selectedTool.cost}`.replace("  ", " "), 2500);
                
                this.updateAllUI(); 
                this.drawGame();
                return true;
            } else {
                this.messageBox.show(`Not enough funds for ${selectedTool.name}. Cost: $${selectedTool.cost}. Budget: $${this.playerBudget.toFixed(0)}`, 2500);
                return false;
            }
        }
        
        if (tileData.type.id === selectedTool.id && selectedTool.id !== TILE_TYPES.GRASS.id) {
            // this.messageBox.show(`This is already a ${tileData.type.name}.`, 1500); 
        }
        return false;
    }

    private startGameLoop(): void {
        if (this.gameTickIntervalId) clearInterval(this.gameTickIntervalId);
        // Game simulation tick
        this.gameTickIntervalId = window.setInterval(() => this.gameTick(), C.GAME_TICK_INTERVAL);
        console.log("Game simulation loop started.");
    }

    private gameTick(): void {
        this.gameDay++;
        const economyUpdate = this.simulationController.processGameTick();
        this.updateAllUI(economyUpdate.taxes, economyUpdate.costs, economyUpdate.net); 
        // Request the renderer to update the state of Pixi objects for the next render frame
        this.drawGame(); 
    }
}
