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
    public selectedTileCoords: Coordinates | null = null;
    private gameTickIntervalId: number | null = null;
    public gameDay: number = 0;
    
    // City-wide stats (updated by SimulationController)
    public totalPopulation: number = 0;
    public citySatisfaction: number = 50; // Now an aggregate of residential tile values
    public employmentRate: number = 100;
    
    public lastBuiltTileDuringDrag: Coordinates | null = null; 

    // UI Components
    public mainInfoPanel: MainInfoPanel;
    public buildToolbar: BuildToolbar;
    public messageBox: MessageBox;
    public tileInfoPane: TileInfoPane;

    // Controllers
    private gridController: GridController;
    private renderer: Renderer;
    public simulationController: SimulationController; // Made public for Renderer to access map data
    private inputController: InputController;


    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

        this.mainInfoPanel = new MainInfoPanel();
        this.buildToolbar = new BuildToolbar();
        this.messageBox = new MessageBox();
        this.tileInfoPane = new TileInfoPane();

        this.gridController = new GridController();
        // Pass a getter for 'this' to renderer for late-binding access to simulationController
        this.renderer = new Renderer(this.canvas, () => this); 
        this.simulationController = new SimulationController(this.gridController, this);
    }

    public initializeGame(): void {
        this.setupComponentInteractions();
        const initialFinance = this.simulationController.processGameTick(); // Run initial simulation pass for map data
        this.updateAllUI(initialFinance.taxes, initialFinance.costs, initialFinance.net); // Update UI with initial state
        this.setCanvasSize(); 
        
        this.inputController = new InputController(this.canvas, this);

        this.startGameLoop();
        this.buildToolbar.updateSelectedButtonVisuals(null, this.currentMode, this.currentBuildType);
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
            (toolType, tileType) => this.handleToolSelection(toolType as GameMode | 'build', tileType),
            (newMode) => this.setViewMode(newMode) // Updated to receive new mode
        );
        this.tileInfoPane.setupCloseButton(() => {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
            this.drawGame();
        });
    }
    
    public handleToolSelection(tool: GameMode | 'build', tileType: TileType | null): void {
        // No automatic view mode change on tool selection, keep current view mode
        // if (this.currentViewMode !== 'default' && tool !== 'pan' && tool !== 'select') {
        //     this.setViewMode('default');
        // }

        if (tool === 'pan') {
            this.currentMode = 'pan';
            this.currentBuildType = null;
            this.messageBox.show('Pan mode activated.', 2000);
        } else if (tool === 'select') {
            this.currentMode = 'select';
            this.currentBuildType = null;
            this.messageBox.show('Select mode activated. Click a tile for info.', 2000);
        } else if (tool === 'build' && tileType) {
            this.currentMode = 'build';
            this.currentBuildType = tileType;
            this.messageBox.show(`Selected to build: ${this.currentBuildType.name} ($${this.currentBuildType.cost})`, 1500);
        }

        if (this.hoveredTile && this.currentMode !== 'build') {
            this.hoveredTile = null;
        }
        if (this.currentMode !== 'select') {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
        }
        this.buildToolbar.updateSelectedButtonVisuals(
            this.currentMode === 'build' && this.currentBuildType ? this.currentBuildType.id : this.currentMode,
            this.currentMode,
            this.currentBuildType
        );
        this.setCanvasCursor();
        this.drawGame();
    }

    public setViewMode(newMode: ViewMode): void {
        this.currentViewMode = newMode;
        let modeName = "Default";
        if (newMode === 'tile_value_heatmap') modeName = "Tile Value Heatmap";
        else if (newMode === 'pollution_heatmap') modeName = "Pollution Heatmap";
        this.messageBox.show(`${modeName} view active.`, 2000);
        this.buildToolbar.updateViewModeButtonText(this.currentViewMode); // Ensure button text is updated
        this.drawGame();
    }


    public setCanvasCursor(): void {
        this.canvas.classList.remove('pan-mode-active', 'pan-mode-dragging', 'select-mode-active');
        if (this.currentMode === 'pan') {
            this.canvas.classList.add('pan-mode-active');
            this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        } else if (this.currentMode === 'select') {
            this.canvas.classList.add('select-mode-active');
            this.canvas.style.cursor = 'crosshair';
        } else { 
            this.canvas.style.cursor = 'pointer'; // Default for build mode
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
            this.selectedTileCoords,
            this.hoveredTile,
            this.currentBuildType,
            this.currentViewMode
        );
    }
    
    public updateAllUI(taxes: number = 0, costs: number = 0, net: number = 0): void {
        // totalPopulation is now a direct member of Game, updated by sim controller
        this.mainInfoPanel.updateDisplay(
            this.gameDay, this.playerBudget, this.totalPopulation,
            this.employmentRate, this.citySatisfaction,
            taxes, costs, net
        );
        if (this.selectedTileCoords) {
            this.updateTileInfoPaneContents(this.selectedTileCoords.x, this.selectedTileCoords.y);
        }
    }

    private updateTileInfoPaneContents(gridX: number, gridY: number): void {
        const tile = this.gridController.getTile(gridX, gridY);
        if (!tile) {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
            return;
        }
        this.tileInfoPane.update(tile, {x: gridX, y: gridY});
        this.tileInfoPane.show();
        this.selectedTileCoords = { x: gridX, y: gridY }; // Ensure this is set
        this.drawGame(); 
    }
    
    public handleSelectInteraction(coords: Coordinates | null): void {
        if (coords) {
            this.updateTileInfoPaneContents(coords.x, coords.y);
        } else {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
            this.drawGame();
        }
    }

    public updateHoveredTile(coords: Coordinates | null): void {
        let needsRedraw = false;
        if (coords) {
            if (!this.hoveredTile || this.hoveredTile.x !== coords.x || this.hoveredTile.y !== coords.y) {
                this.hoveredTile = coords;
                needsRedraw = true;
            }
        } else {
            if (this.hoveredTile) {
                this.hoveredTile = null;
                needsRedraw = true;
            }
        }
        if (needsRedraw) {
            this.drawGame();
        }
    }

    public handleCanvasBuildInteraction(gridX: number, gridY: number): boolean {
        if (this.currentMode !== 'build' || !this.currentBuildType) return false;
        
        const tileData = this.gridController.getTile(gridX, gridY);
        if (!tileData) return false;

        const selectedTool = this.currentBuildType;
        const oldTileType = tileData.type;

        if (tileData.type.isObstacle && selectedTool.id !== tileData.type.id) {
            this.messageBox.show("Cannot build on mountains.", 2000);
            return false;
        }
        if (selectedTool.id === 'grass' && tileData.type.isObstacle) {
            this.messageBox.show("Mountains cannot be removed.", 2000);
            return false;
        }
        // Prevent building zones/roads on water/mountains directly, unless it's water itself or grass for clearing
        if ((tileData.type.id === 'water' || tileData.type.isObstacle) && 
            !(selectedTool.id === 'water' || selectedTool.id === 'grass')) {
            this.messageBox.show(`Cannot build ${selectedTool.name} on ${tileData.type.name}.`, 2500);
            return false;
        }


        if (selectedTool.id === 'grass') { // Bulldozing
            if (tileData.type.id !== 'grass') {
                // Calculate refund? Micropolis gives back some money. For now, no refund.
                const costToClear = 5; // Small cost to bulldoze
                if (this.playerBudget < costToClear && oldTileType.id !== TILE_TYPES.ROAD.id) { // Free to bulldoze roads
                     this.messageBox.show(`Not enough funds to bulldoze. Cost: $${costToClear}`, 2000);
                     return false;
                }
                if (oldTileType.id !== TILE_TYPES.ROAD.id) this.playerBudget -= costToClear;


                this.messageBox.show(`Cleared ${tileData.type.name}.`, 1500);
                this.gridController.clearTileData(gridX, gridY); // Resets pop, pollution etc.
                this.gridController.setTileType(gridX, gridY, TILE_TYPES.GRASS);

                // If a road was destroyed, or a building, simulation needs to react
                // The general simulation tick will handle most knock-on effects.
                // Explicitly trigger UI update if that's not happening fast enough.
                // this.simulationController.processGameTick(); // Optionally run a quick update
                this.updateAllUI(); // Update budget display immediately
                this.drawGame();
                return true;
            }
            return false; 
        }

        // Building something else
        // Allow building on grass, or replacing existing non-obstacle tiles if it's not the same type
        if (tileData.type.id === 'grass' || (tileData.type.id !== selectedTool.id && !tileData.type.isObstacle)) { 
            if (this.playerBudget >= selectedTool.cost) {
                let messageAction = tileData.type.id === 'grass' ? "Built" : "Replaced";
                let oldTypeName = tileData.type.name;

                this.playerBudget -= selectedTool.cost;
                
                // Preserve some data if it's just a zone being replaced by another zone?
                // For now, clearTileData resets everything before setting new type.
                if (messageAction === "Replaced") {
                     this.gridController.clearTileData(gridX, gridY);
                }
                this.gridController.setTileType(gridX, gridY, selectedTool);
                
                this.messageBox.show(`${messageAction} ${oldTypeName && messageAction === "Replaced" ? oldTypeName : ""} with ${selectedTool.name} for $${selectedTool.cost}`.replace("  ", " "), 2500);
                
                // No need for immediate sim recalculation here as the main game tick will pick it up.
                this.updateAllUI(); // Update budget display
                this.drawGame();
                return true;
            } else {
                this.messageBox.show(`Not enough funds for ${selectedTool.name}. Cost: $${selectedTool.cost}. Budget: $${this.playerBudget.toFixed(0)}`, 2500);
                return false;
            }
        }
        
        if (tileData.type.id === selectedTool.id && selectedTool.id !== 'grass') {
            this.messageBox.show(`This is already a ${tileData.type.name}.`, 1500);
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
        this.drawGame(); // Redraw to show any visual changes from simulation (e.g. heatmaps if active)
    }
}
