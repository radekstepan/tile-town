import { TILE_TYPES } from '../config/tileTypes';
import * as C from '../config/constants';
import { GridTile, TileType, Coordinates, GameMode, ViewMode, SatisfactionData, OperationalData } from '../types';
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
    public isDragging: boolean = false; // Used for panning OR painting
    public lastMouseX: number = 0;
    public lastMouseY: number = 0;
    public lastTouchX: number | null = null;
    public lastTouchY: number | null = null;
    public hoveredTile: Coordinates | null = null;
    public selectedTileCoords: Coordinates | null = null;
    private gameTickIntervalId: number | null = null;
    public gameDay: number = 0;
    public citySatisfaction: number = 50;
    public employmentRate: number = 100;
    public lastBuiltTileDuringDrag: Coordinates | null = null; // For paint-build

    // UI Components
    public mainInfoPanel: MainInfoPanel;
    public buildToolbar: BuildToolbar;
    public messageBox: MessageBox;
    public tileInfoPane: TileInfoPane;

    // Controllers
    private gridController: GridController;
    private renderer: Renderer;
    private simulationController: SimulationController;
    private inputController: InputController;


    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

        // Initialize UI Components
        this.mainInfoPanel = new MainInfoPanel();
        this.buildToolbar = new BuildToolbar();
        this.messageBox = new MessageBox();
        this.tileInfoPane = new TileInfoPane();

        // Initialize Controllers
        this.gridController = new GridController();
        this.renderer = new Renderer(this.canvas);
        // Pass `this` (Game instance) to controllers that need to access its state or methods
        this.simulationController = new SimulationController(this.gridController, this);
        this.inputController = new InputController(this.canvas, this);
    }

    public initializeGame(): void {
        this.setupComponentInteractions();
        this.simulationController.calculateCityMetrics(); // Initial calculation based on generated grid
        this.updateAllUI();
        this.setCanvasSize(); 
        // InputController's constructor already calls setupEventListeners
        this.startGameLoop();
        this.buildToolbar.updateSelectedButtonVisuals(null, this.currentMode, this.currentBuildType);
        this.setCanvasCursor();
        // Add resize listener here, once, after everything is set up
        window.addEventListener('resize', () => this.handleResize());
    }

    private handleResize(): void {
        this.setCanvasSize();
        this.drawGame(); // Redraw with new dimensions and camera
    }

    private setupComponentInteractions(): void {
        this.buildToolbar.setupEventListeners(
            (toolType, tileType) => this.handleToolSelection(toolType as GameMode | 'build', tileType),
            () => this.toggleViewMode()
        );
        this.tileInfoPane.setupCloseButton(() => {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
            this.drawGame();
        });
    }
    
    public handleToolSelection(tool: GameMode | 'build', tileType: TileType | null): void {
        if (this.currentViewMode === 'satisfaction_heatmap' && tool !== 'pan' && tool !== 'select') {
            this.currentViewMode = 'default';
            this.buildToolbar.updateViewModeButtonText(this.currentViewMode);
        }

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
            this.messageBox.show(`Selected to build: ${this.currentBuildType.name}`, 1500);
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

    public toggleViewMode(): void {
        if (this.currentViewMode === 'default') {
            this.currentViewMode = 'satisfaction_heatmap';
            this.messageBox.show('Satisfaction heatmap active.', 2000);
        } else {
            this.currentViewMode = 'default';
            this.messageBox.show('Default view active.', 2000);
        }
        this.buildToolbar.updateViewModeButtonText(this.currentViewMode);
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
            this.canvas.style.cursor = 'pointer';
        }
    }

    public setCanvasSize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        const gridPixelWidth = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_WIDTH_ISO;
        const gridPixelHeight = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_HEIGHT_ISO;
        
        this.cameraOffsetX = (this.canvas.width - gridPixelWidth) / 2;
        this.cameraOffsetY = (this.canvas.height - gridPixelHeight) / 2 + C.TILE_HALF_HEIGHT_ISO * (Math.min(C.GRID_SIZE_X, C.GRID_SIZE_Y) / 2.0);
        
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
        let totalPopulation = 0;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                totalPopulation += (this.gridController.getTile(x,y)?.type.population || 0);
            }
        }
        this.mainInfoPanel.updateDisplay(
            this.gameDay, this.playerBudget, totalPopulation,
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
        this.selectedTileCoords = { x: gridX, y: gridY };
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

    /**
     * Handles a build interaction on a specific canvas tile.
     * @returns `true` if a tile was successfully placed/modified, `false` otherwise.
     */
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

        if (selectedTool.id === 'grass') { // Bulldozing
            if (tileData.type.id !== 'grass') {
                this.messageBox.show(`Cleared ${tileData.type.name}.`, 1500);
                this.gridController.clearTileData(gridX, gridY);
                this.gridController.setTileType(gridX, gridY, TILE_TYPES.GRASS);

                if (oldTileType.id === 'road') {
                    this.simulationController.checkAndUpdateAdjacentBuildingsOnRoadChange(gridX, gridY);
                } else {
                     this.simulationController.calculateCityMetrics(); 
                }
                this.updateAllUI();
                this.drawGame();
                return true; // Tile modified
            }
            return false; // Already grass, no change
        }

        // Building something else
        if (tileData.type.id === 'grass' || tileData.type.id !== selectedTool.id) { 
            if (this.playerBudget >= selectedTool.cost) {
                let messageAction = tileData.type.id === 'grass' ? "Built" : "Replaced";
                let oldTypeName = tileData.type.name;

                this.playerBudget -= selectedTool.cost;
                this.gridController.clearTileData(gridX, gridY);
                this.gridController.setTileType(gridX, gridY, selectedTool);
                
                const newTile = this.gridController.getTile(gridX, gridY)!;
                if (selectedTool.parentZoneCategory === 'residential' && selectedTool.isBuilding) {
                    newTile.satisfactionData = this.simulationController['getDefaultSatisfactionData']();
                } else if ((selectedTool.parentZoneCategory === 'commercial' || selectedTool.parentZoneCategory === 'industrial') && selectedTool.isBuilding) {
                    newTile.operationalData = this.simulationController['getDefaultOperationalData']();
                }

                this.messageBox.show(`${messageAction} ${oldTypeName && messageAction === "Replaced" ? oldTypeName : ""} with ${selectedTool.name} for $${selectedTool.cost}`.replace("  ", " "), 2500);

                if (oldTileType.id === 'road' && selectedTool.id !== 'road') {
                    this.simulationController.checkAndUpdateAdjacentBuildingsOnRoadChange(gridX, gridY);
                }

                if (selectedTool.isZone && selectedTool.developsInto) {
                    this.simulationController.attemptZoneDevelopment(gridX, gridY);
                } else if (selectedTool.id === 'road') { 
                    const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
                    for (const n of neighbors) {
                        const nx = gridX + n.dx;
                        const ny = gridY + n.dy;
                        if (this.gridController.getTile(nx,ny)?.type.isZone) {
                            this.simulationController.attemptZoneDevelopment(nx, ny); 
                        }
                    }
                }
                this.simulationController.calculateCityMetrics(); 
                this.updateAllUI();
                this.drawGame();
                return true; // Tile modified
            } else {
                this.messageBox.show(`Not enough funds for ${selectedTool.name}. Cost: $${selectedTool.cost}. Budget: $${this.playerBudget.toFixed(0)}`, 2500);
                return false; // Not enough funds
            }
        }
        // If trying to build the same tile type again (and not grass)
        if (tileData.type.id === selectedTool.id && selectedTool.id !== 'grass') {
            this.messageBox.show(`This is already a ${tileData.type.name}.`, 1500);
        }
        return false; // No change or action failed
    }

    private startGameLoop(): void {
        if (this.gameTickIntervalId) clearInterval(this.gameTickIntervalId);
        this.gameTickIntervalId = window.setInterval(() => this.processGameTick(), C.GAME_TICK_INTERVAL);
        console.log("Game loop started for economy and simulation.");
    }

    private processGameTick(): void {
        this.gameDay++;
        const economyUpdate = this.simulationController.processGameTick();
        // simulationController.calculateCityMetrics() is called within its processGameTick
        this.updateAllUI(economyUpdate.taxes, economyUpdate.costs, economyUpdate.net); 
    }
}
