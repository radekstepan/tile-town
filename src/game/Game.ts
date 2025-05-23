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
    private canvas: HTMLCanvasElement;
    
    // Game State
    public currentMode: GameMode = 'pan'; // Start in pan mode
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


    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

        this.mainInfoPanel = new MainInfoPanel();
        this.buildToolbar = new BuildToolbar();
        this.messageBox = new MessageBox();
        this.tileInfoPane = new TileInfoPane();

        this.gridController = new GridController();
        this.renderer = new Renderer(this.canvas, () => this); 
        this.simulationController = new SimulationController(this.gridController, this);
    }

    public initializeGame(): void {
        this.setupComponentInteractions();
        const initialFinance = this.simulationController.processGameTick(); 
        this.updateAllUI(initialFinance.taxes, initialFinance.costs, initialFinance.net); 
        this.setCanvasSize(); 
        
        this.inputController = new InputController(this.canvas, this);

        this.currentMode = 'pan'; 
        this.currentBuildType = null; 
        this.messageBox.show('Pan mode active. Select a tool or pan the map.', 1500);

        this.startGameLoop();
        this.buildToolbar.updateSelectedButtonVisuals(this.currentMode, this.currentBuildType);
        this.setCanvasCursor();
        
        window.addEventListener('resize', () => this.handleResize());
        
        this.drawGame(); 
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

        // Determine if build preview state changed *after* mode/tool update
        const newBuildPreviewActive = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        if (oldBuildPreviewActive !== newBuildPreviewActive) {
            needsRedrawForBuildPreview = true;
        }
        
        // Update hover tile display based on the new state
        this.updateHoveredTileDisplay(this.hoveredTile); // Pass current hovered coords

        if (needsRedrawForBuildPreview) {
            this.drawGame(); // Redraw if build preview changed
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
        
        // If view mode changed, this might affect info pane or build preview
        this.updateHoveredTileDisplay(this.hoveredTile); 
        if (oldViewMode !== newMode) { // Always redraw if view mode actually changed
            this.drawGame();
        }
    }


    public setCanvasCursor(): void {
        this.canvas.classList.remove('pan-mode-active', 'pan-mode-dragging'); 
        if (this.currentMode === 'pan') {
            this.canvas.classList.add('pan-mode-active');
            this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        } else { 
             this.canvas.style.cursor = 'default'; 
        }
    }

    public setCanvasSize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        const gridPixelHeight = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_HEIGHT_ISO;
        
        this.cameraOffsetX = this.canvas.width / 2 - (C.GRID_SIZE_X - C.GRID_SIZE_Y) * C.TILE_HALF_WIDTH_ISO / 2;
        this.cameraOffsetY = this.canvas.height / 2 - gridPixelHeight / 2;
        
        this.setCanvasCursor();
    }

    public drawGame(): void {
        this.renderer.render(
            this.gridController.grid,
            this.cameraOffsetX, this.cameraOffsetY,
            null, 
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
    
    // Renamed from updateHoveredTile to make its purpose clearer: updating display based on hover
    public updateHoveredTileDisplay(coords: Coordinates | null): void {
        // Build Preview Redraw Check (if coords or preview status changed)
        // This part only determines if the *canvas* needs a redraw due to build preview.
        let needsCanvasRedrawForBuildPreview = false;
        const oldHoveredTileForPreview = this.hoveredTile; // Store what the game *thinks* is hovered before updating it
        const shouldShowBuildPreviewNow = this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType;
        
        // If the hovered tile itself has changed OR if the status of whether a build preview should show has changed
        if ((oldHoveredTileForPreview?.x !== coords?.x || oldHoveredTileForPreview?.y !== coords?.y) ||
            (shouldShowBuildPreviewNow !== (this.currentMode === 'build' && this.currentViewMode === 'default' && !!this.currentBuildType && !!oldHoveredTileForPreview))) {
             if(shouldShowBuildPreviewNow || (this.currentMode === 'build' && this.currentBuildType && oldHoveredTileForPreview && !coords) ) { // if preview should show now, or was showing and mouse left
                needsCanvasRedrawForBuildPreview = true;
             }
        }
        this.hoveredTile = coords; // Officially update the game's hoveredTile state

        // Tile Info Pane Logic: Show if in default view AND mouse is over grid.
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
            this.drawGame();
        }
    }
    
    // This method is called by InputController on mousemove
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
        this.gameTickIntervalId = window.setInterval(() => this.gameTick(), C.GAME_TICK_INTERVAL);
        console.log("Game loop started.");
    }

    private gameTick(): void {
        this.gameDay++;
        const economyUpdate = this.simulationController.processGameTick();
        this.updateAllUI(economyUpdate.taxes, economyUpdate.costs, economyUpdate.net); 
        this.drawGame(); 
    }
}
