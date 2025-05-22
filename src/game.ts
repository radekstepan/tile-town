import { TILE_TYPES } from './config/tileTypes';
import * as C from './config/constants';
import { GridTile, TileType, Coordinates, GameMode, ViewMode, SatisfactionData, OperationalData } from './types';
import { lightenColor, darkenColor } from './utils/colorUtils';
import { getTileCoordinatesFromScreenPoint } from './utils/geometryUtils';
import { MainInfoPanel } from './components/MainInfoPanel';
import { BuildToolbar } from './components/BuildToolbar';
import { MessageBox } from './components/MessageBox';
import { TileInfoPane } from './components/TileInfoPane';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grid: GridTile[][] = [];
    
    private currentMode: GameMode = 'pan';
    private currentViewMode: ViewMode = 'default';
    private currentBuildType: TileType | null = null;
    
    private playerBudget: number = C.INITIAL_BUDGET;
    private cameraOffsetX: number = 0;
    private cameraOffsetY: number = 0;
    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private lastTouchX: number | null = null;
    private lastTouchY: number | null = null;
    
    private hoveredTile: Coordinates | null = null;
    private selectedTileCoords: Coordinates | null = null;
    
    private gameTickIntervalId: number | null = null;
    private gameDay: number = 0;
    private citySatisfaction: number = 50; // Initial average satisfaction
    private employmentRate: number = 100; // Initial employment rate

    // UI Components
    private mainInfoPanel: MainInfoPanel;
    private buildToolbar: BuildToolbar;
    private messageBox: MessageBox;
    private tileInfoPane: TileInfoPane;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error("Could not get 2D rendering context from canvas.");
        }

        this.mainInfoPanel = new MainInfoPanel();
        this.buildToolbar = new BuildToolbar();
        this.messageBox = new MessageBox();
        this.tileInfoPane = new TileInfoPane();
    }

    public initializeGame(): void {
        this.setupComponentInteractions();
        this.initializeGrid();
        this.calculateCityMetrics(); // Initial calculation
        this.updateAllUI();
        this.setCanvasSize(); // Initial size and center
        this.setupEventListeners();
        this.startGameLoop();
        this.buildToolbar.updateSelectedButtonVisuals(null, this.currentMode, this.currentBuildType); // Set initial button state
        this.setCanvasCursor();
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
    
    private handleToolSelection(tool: GameMode | 'build', tileType: TileType | null): void {
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

    private toggleViewMode(): void {
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

    private setCanvasCursor(): void {
        this.canvas.classList.remove('pan-mode-active', 'pan-mode-dragging', 'select-mode-active');
        if (this.currentMode === 'pan') {
            this.canvas.classList.add('pan-mode-active');
            this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        } else if (this.currentMode === 'select') {
            this.canvas.classList.add('select-mode-active');
            this.canvas.style.cursor = 'crosshair';
        } else { // build mode
            this.canvas.style.cursor = 'pointer';
        }
    }

    private setCanvasSize(): void {
        const gameContainer = document.getElementById('gameContainer') as HTMLElement;
        const titleElement = gameContainer.querySelector('h1') as HTMLElement;

        const container = document.getElementById('gameContainer');
        if (!container || !titleElement) return;

        const toolbarHeight = this.buildToolbar.getElement().offsetHeight;
        const titleHeight = titleElement.offsetHeight;
        const mainInfoPanelHeight = this.mainInfoPanel.getElement().offsetHeight;
        
        let newCanvasWidth = Math.min(900, window.innerWidth * 0.92);
        let availableHeight = window.innerHeight - (mainInfoPanelHeight + 20) - toolbarHeight - titleHeight - 60;
        let newCanvasHeight = Math.min(600, availableHeight);
        
        newCanvasWidth = Math.max(300, newCanvasWidth);
        newCanvasHeight = Math.max(200, newCanvasHeight);
        
        this.canvas.width = newCanvasWidth;
        this.canvas.height = newCanvasHeight;
        
        const gridPixelWidth = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_WIDTH_ISO;
        const gridPixelHeight = (C.GRID_SIZE_X + C.GRID_SIZE_Y) * C.TILE_HALF_HEIGHT_ISO;
        
        this.cameraOffsetX = (this.canvas.width - gridPixelWidth) / 2;
        this.cameraOffsetY = (this.canvas.height - gridPixelHeight) / 2 + C.TILE_HALF_HEIGHT_ISO * (Math.min(C.GRID_SIZE_X, C.GRID_SIZE_Y) / 2.5);
        
        this.setCanvasCursor();
        this.drawGame();
    }

    // --- Map Generation ---
    private initializeGrid(): void {
        this.grid = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.grid[y] = [];
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.grid[y][x] = { type: TILE_TYPES.GRASS };
            }
        }
        this.generateMountains();
        this.generateWater();
        this.generateInitialParks();
    }

    private generateMountains(): void {
        const numRanges = Math.floor(Math.random() * 2) + 1;
        for (let r = 0; r < numRanges; r++) {
            let attempts = 0;
            let seedX: number, seedY: number;
            do {
                seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - 8)) + 4;
                seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - 8)) + 4;
                attempts++;
            } while (this.grid[seedY][seedX].type !== TILE_TYPES.GRASS && attempts < 10);

            if (this.grid[seedY][seedX].type === TILE_TYPES.GRASS) {
                const rangeSize = Math.floor(Math.random() * 15) + 10;
                let currentMountains = 0;
                const queue: Coordinates[] = [{x: seedX, y: seedY}];
                this.grid[seedY][seedX].type = TILE_TYPES.MOUNTAIN;
                currentMountains++;

                while(queue.length > 0 && currentMountains < rangeSize) {
                    const curr = queue.shift()!;
                    const neighbors = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
                    neighbors.sort(() => Math.random() - 0.5);
                    for (const n of neighbors) {
                        const nx = curr.x + n.dx;
                        const ny = curr.y + n.dy;
                        if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y && this.grid[ny][nx].type === TILE_TYPES.GRASS) {
                            if (Math.random() < 0.6) {
                                this.grid[ny][nx].type = TILE_TYPES.MOUNTAIN;
                                currentMountains++;
                                queue.push({x: nx, y: ny});
                                if (currentMountains >= rangeSize) break;
                            }
                        }
                    }
                }
            }
        }
    }

    private generateWater(): void {
        let currentX = Math.floor(Math.random() * C.GRID_SIZE_X);
        let currentY = 0;
        const riverLength = C.GRID_SIZE_Y + Math.floor(Math.random() * 5);
        for (let i = 0; i < riverLength; i++) {
            if (currentY >= 0 && currentY < C.GRID_SIZE_Y && currentX >=0 && currentX < C.GRID_SIZE_X) {
                 if (this.grid[currentY][currentX].type !== TILE_TYPES.MOUNTAIN) {
                    this.grid[currentY][currentX].type = TILE_TYPES.WATER;
                    if (Math.random() < 0.3 && currentX + 1 < C.GRID_SIZE_X && this.grid[currentY][currentX+1].type !== TILE_TYPES.MOUNTAIN) this.grid[currentY][currentX+1].type = TILE_TYPES.WATER;
                    if (Math.random() < 0.3 && currentX - 1 >= 0 && this.grid[currentY][currentX-1].type !== TILE_TYPES.MOUNTAIN) this.grid[currentY][currentX-1].type = TILE_TYPES.WATER;
                 }
            }
            currentY++;
            if (Math.random() < 0.4) {
                currentX += (Math.random() < 0.5 ? 1 : -1);
                currentX = Math.max(0, Math.min(C.GRID_SIZE_X - 1, currentX));
            }
             if (currentY >= C.GRID_SIZE_Y) break;
        }
    }

    private generateInitialParks(): void {
        const numParkClusters = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numParkClusters; i++) {
            const clusterSizeX = Math.floor(Math.random() * 2) + 1;
            const clusterSizeY = Math.floor(Math.random() * 2) + 1;
            let attempts = 0;
            let seedX: number, seedY: number;
             do {
                seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - clusterSizeX));
                seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - clusterSizeY));
                attempts++;
            } while (!this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id]) && attempts < 20);

            if(this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id])){
                for (let y = seedY; y < seedY + clusterSizeY; y++) {
                    for (let x = seedX; x < seedX + clusterSizeX; x++) {
                        if (x < C.GRID_SIZE_X && y < C.GRID_SIZE_Y && this.grid[y][x].type === TILE_TYPES.GRASS) {
                            this.grid[y][x].type = TILE_TYPES.NATURAL_PARK;
                        }
                    }
                }
            }
        }
    }

    private isAreaClearForFeature(startX: number, startY: number, sizeX: number, sizeY: number, allowedTypes: string[] = [TILE_TYPES.GRASS.id]): boolean {
        for (let y = startY; y < startY + sizeY; y++) {
            for (let x = startX; x < startX + sizeX; x++) {
                if (x < 0 || x >= C.GRID_SIZE_X || y < 0 || y >= C.GRID_SIZE_Y) return false;
                if (!allowedTypes.includes(this.grid[y][x].type.id)) return false;
            }
        }
        return true;
    }

    private updateAllUI(taxes: number = 0, costs: number = 0, net: number = 0): void {
        let totalPopulation = 0;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                totalPopulation += (this.grid[y][x].type.population || 0);
            }
        }
        this.mainInfoPanel.updateDisplay(
            this.gameDay,
            this.playerBudget,
            totalPopulation,
            this.employmentRate,
            this.citySatisfaction,
            taxes,
            costs,
            net
        );
        if (this.selectedTileCoords) {
            this.updateTileInfoPaneContents(this.selectedTileCoords.x, this.selectedTileCoords.y);
        }
    }

    // --- Drawing ---
    private getHeatmapColor(score: number): string | null {
        if (score < 0) return null;
        const alpha = 0.4;
        if (score < C.SATISFACTION_LOW_THRESHOLD) return `rgba(255, 0, 0, ${alpha})`;
        if (score > C.SATISFACTION_HIGH_THRESHOLD) return `rgba(0, 255, 0, ${alpha})`;
        return `rgba(255, 255, 0, ${alpha})`;
    }

    private drawTileObject(gridX: number, gridY: number, tileType: TileType, customAlpha: number = 1.0, isSelected: boolean = false): void {
        const screenX = this.cameraOffsetX + (gridX - gridY) * C.TILE_HALF_WIDTH_ISO;
        const screenY = this.cameraOffsetY + (gridX + gridY) * C.TILE_HALF_HEIGHT_ISO;
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.globalAlpha = customAlpha;

        // Base tile
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.lineTo(0, C.TILE_HEIGHT_ISO);
        this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
        this.ctx.closePath();
        
        this.ctx.fillStyle = tileType.color;
        this.ctx.fill();

        if (isSelected && this.currentViewMode === 'default') {
            this.ctx.strokeStyle = '#FFFF00'; // Bright yellow for selected
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = customAlpha < 1.0 ? darkenColor(tileType.color, 5) : darkenColor(tileType.color, 15);
            this.ctx.lineWidth = customAlpha < 1.0 ? 0.5 : 0.75;
        }
        this.ctx.stroke();

        // 3D Part (Building/Object)
        if (tileType.renderHeight && tileType.renderHeight > 0) {
            const buildingVisualHeight = tileType.renderHeight * C.TILE_DEPTH_UNIT;
            const topColor = lightenColor(tileType.color, 15);
            const sideColorDark = darkenColor(tileType.color, 15);
            const sideColorLight = darkenColor(tileType.color, 5);

            // Right Side
            this.ctx.fillStyle = sideColorDark;
            this.ctx.beginPath();
            this.ctx.moveTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
            this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, -buildingVisualHeight);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Left Side
            this.ctx.fillStyle = sideColorLight;
            this.ctx.beginPath();
            this.ctx.moveTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO);
            this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, -buildingVisualHeight);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Top
            this.ctx.fillStyle = topColor;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -buildingVisualHeight);
            this.ctx.lineTo(C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(0, C.TILE_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.lineTo(-C.TILE_HALF_WIDTH_ISO, C.TILE_HALF_HEIGHT_ISO - buildingVisualHeight);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    public drawGame(): void {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const isSelected = this.selectedTileCoords?.x === x && this.selectedTileCoords?.y === y;
                this.drawTileObject(x, y, this.grid[y][x].type, 1.0, isSelected);
            }
        }

        if (this.currentViewMode === 'satisfaction_heatmap') {
            for (let y = 0; y < C.GRID_SIZE_Y; y++) {
                for (let x = 0; x < C.GRID_SIZE_X; x++) {
                    let score = -1;
                    const tileData = this.grid[y][x];
                    if (tileData.type.parentZoneCategory === 'residential' && tileData.type.isBuilding && tileData.satisfactionData) {
                        score = tileData.satisfactionData.score;
                    }
                    const color = this.getHeatmapColor(score);
                    if (color) {
                        const screenX = this.cameraOffsetX + (x - y) * C.TILE_HALF_WIDTH_ISO;
                        const screenY = this.cameraOffsetY + (x + y) * C.TILE_HALF_HEIGHT_ISO;
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
        
        if (this.currentMode === 'build' && this.currentBuildType && this.hoveredTile && this.currentViewMode === 'default') {
            this.drawTileObject(this.hoveredTile.x, this.hoveredTile.y, this.currentBuildType, 0.5);
        }
    }

    // --- Road Connectivity and Building Update Logic ---
    private isConnectedToRoad(gridX: number, gridY: number): boolean {
        const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
        for (const neighbor of neighbors) {
            const nx = gridX + neighbor.dx;
            const ny = gridY + neighbor.dy;
            if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                if (this.grid[ny][nx].type.id === 'road') return true;
            }
        }
        return false;
    }

    private checkAndUpdateAdjacentBuildingsOnRoadChange(changedTileX: number, changedTileY: number): void {
        const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
        let needsCityRecalc = false;
        for (const neighborOffset of neighbors) {
            const nx = changedTileX + neighborOffset.dx;
            const ny = changedTileY + neighborOffset.dy;
            if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                const adjacentTileData = this.grid[ny][nx];
                if (adjacentTileData.type.isBuilding) {
                    if (!this.isConnectedToRoad(nx, ny)) {
                        const revertToTypeKey = adjacentTileData.type.revertsTo;
                        if (revertToTypeKey && TILE_TYPES[revertToTypeKey]) {
                            this.messageBox.show(`${adjacentTileData.type.name} at (${nx},${ny}) lost road access and reverted.`, 3500);
                            adjacentTileData.type = TILE_TYPES[revertToTypeKey];
                            if (adjacentTileData.satisfactionData) {
                                adjacentTileData.satisfactionData = this.getDefaultSatisfactionData();
                            }
                            if (adjacentTileData.operationalData) {
                                adjacentTileData.operationalData = this.getDefaultOperationalData();
                            }
                            needsCityRecalc = true;
                        }
                    }
                }
            }
        }
        if (needsCityRecalc) {
            this.calculateCityMetrics();
            this.updateAllUI(); // Recalculates totals for main info panel
            this.drawGame();
        }
    }
    
    // --- Satisfaction & Operational Calculation & Visual Update ---
    private getDefaultSatisfactionData(): SatisfactionData {
        return { score: 50, currentTargetVisualLevel: 'MED', ticksInCurrentTargetLevel: 0, work: 0, nature: 0, density: 0, parkBonus: 0, waterBonus: 0, mountainBonus: 0, employmentPenalty: 0, industrialPenalty: 0 };
    }
    private getDefaultOperationalData(): OperationalData {
        return { score: 50, currentTargetVisualLevel: 'MED', ticksInCurrentTargetLevel: 0, workerAccess: 0, customerAccess: 0 };
    }

    private calculateTileSatisfaction(resX: number, resY: number): number {
        const tileData = this.grid[resY][resX];
        if (!tileData.satisfactionData) { // Should already be initialized when building is placed
            tileData.satisfactionData = this.getDefaultSatisfactionData();
        }

        let workScore = 0;
        let natureScore = 0;
        let densityScore = 0;
        let employmentPenalty = 0;
        let industrialPenaltyScore = 0;
        let baseSatisfaction = 50;

        if (this.employmentRate < C.LOW_EMPLOYMENT_THRESHOLD) {
            employmentPenalty = C.LOW_EMPLOYMENT_SATISFACTION_PENALTY;
        }

        let minDistToWork = Infinity;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                if (this.grid[y][x].type.id.includes('commercial_lvl1') || this.grid[y][x].type.id.includes('industrial_lvl1')) {
                    const dist = Math.abs(x - resX) + Math.abs(y - resY);
                    if (dist < minDistToWork) minDistToWork = dist;
                }
            }
        }
        if (minDistToWork <= C.WORK_PROXIMITY_RADIUS) workScore = C.WORK_PROXIMITY_MAX_BONUS * (1 - (minDistToWork / C.WORK_PROXIMITY_RADIUS));
        else workScore = -10;

        let parksNearby = 0, waterNearby = 0, mountainsNearby = 0;
        for (let dy = -C.NATURE_PROXIMITY_RADIUS; dy <= C.NATURE_PROXIMITY_RADIUS; dy++) {
            for (let dx = -C.NATURE_PROXIMITY_RADIUS; dx <= C.NATURE_PROXIMITY_RADIUS; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = resX + dx; const ny = resY + dy;
                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                    const neighborType = this.grid[ny][nx].type.id;
                    if (neighborType === 'park' || neighborType === 'natural_park') parksNearby++;
                    if (neighborType === 'water') waterNearby++;
                    if (neighborType === 'mountain') mountainsNearby++;
                }
            }
        }
        let parkBonus = Math.min(parksNearby * C.PARK_PROXIMITY_BONUS, C.PARK_PROXIMITY_BONUS * 2);
        let waterBonus = Math.min(waterNearby * C.WATER_PROXIMITY_BONUS, C.WATER_PROXIMITY_BONUS * 2);
        let mountainBonus = Math.min(mountainsNearby * C.MOUNTAIN_PROXIMITY_BONUS, C.MOUNTAIN_PROXIMITY_BONUS * 2);
        natureScore = parkBonus + waterBonus + mountainBonus;

        let minDistToIndustry = Infinity;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                if (this.grid[y][x].type.id.includes('industrial_lvl1')) {
                    const dist = Math.abs(x - resX) + Math.abs(y - resY);
                    if (dist < minDistToIndustry) minDistToIndustry = dist;
                }
            }
        }
        if (minDistToIndustry <= C.INDUSTRIAL_POLLUTION_RADIUS) {
            industrialPenaltyScore = C.INDUSTRIAL_POLLUTION_PENALTY_MAX * (1 - (minDistToIndustry / C.INDUSTRIAL_POLLUTION_RADIUS));
        }

        let neighbors = 0;
        for (let dy = -C.DENSITY_RADIUS; dy <= C.DENSITY_RADIUS; dy++) {
            for (let dx = -C.DENSITY_RADIUS; dx <= C.DENSITY_RADIUS; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = resX + dx; const ny = resY + dy;
                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y && this.grid[ny][nx].type.parentZoneCategory === 'residential') neighbors++;
            }
        }
        if (neighbors < C.DENSITY_IDEAL_MIN) densityScore = C.DENSITY_PENALTY_LOW;
        else if (neighbors <= C.DENSITY_IDEAL_MAX) densityScore = C.DENSITY_BONUS;
        else densityScore = C.DENSITY_PENALTY_HIGH * (neighbors - C.DENSITY_IDEAL_MAX);

        let totalScore = baseSatisfaction + workScore + natureScore + densityScore + employmentPenalty + industrialPenaltyScore;
        totalScore = Math.max(0, Math.min(C.MAX_SATISFACTION, totalScore));
        
        tileData.satisfactionData!.score = totalScore;
        tileData.satisfactionData!.work = workScore;
        tileData.satisfactionData!.nature = natureScore;
        tileData.satisfactionData!.density = densityScore;
        tileData.satisfactionData!.parkBonus = parkBonus;
        tileData.satisfactionData!.waterBonus = waterBonus;
        tileData.satisfactionData!.mountainBonus = mountainBonus;
        tileData.satisfactionData!.employmentPenalty = employmentPenalty;
        tileData.satisfactionData!.industrialPenalty = industrialPenaltyScore;
        
        return totalScore;
    }

    private updateResidentialBuildingVisual(resX: number, resY: number): void {
        const tileData = this.grid[resY][resX];
        if (!tileData || tileData.type.parentZoneCategory !== 'residential' || !tileData.satisfactionData) return;

        const score = tileData.satisfactionData.score;
        let newTargetVisualLevel: 'LOW' | 'MED' | 'HIGH';
        if (score < C.SATISFACTION_LOW_THRESHOLD) newTargetVisualLevel = 'LOW';
        else if (score > C.SATISFACTION_HIGH_THRESHOLD) newTargetVisualLevel = 'HIGH';
        else newTargetVisualLevel = 'MED';

        if (newTargetVisualLevel !== tileData.satisfactionData.currentTargetVisualLevel) {
            tileData.satisfactionData.currentTargetVisualLevel = newTargetVisualLevel;
            tileData.satisfactionData.ticksInCurrentTargetLevel = 1;
        } else {
            tileData.satisfactionData.ticksInCurrentTargetLevel++;
        }

        if (tileData.satisfactionData.ticksInCurrentTargetLevel >= C.SATISFACTION_VISUAL_CHANGE_THRESHOLD) {
            const currentVisualTypeId = tileData.type.id;
            const targetTypeId = `RESIDENTIAL_LVL1_${newTargetVisualLevel}`;
            if (TILE_TYPES[targetTypeId] && currentVisualTypeId !== targetTypeId) {
                tileData.type = TILE_TYPES[targetTypeId];
                this.drawGame();
            }
        }
    }

    private calculateCIOperationalScore(ciX: number, ciY: number): number {
        const tileData = this.grid[ciY][ciX];
        const tileType = tileData.type;
        if (!tileData.operationalData) { // Should already be initialized
            tileData.operationalData = this.getDefaultOperationalData();
        }

        let baseScore = 50;
        let workerAccessScore = 0;
        let customerAccessScore = 0;

        let nearbyWorkforce = 0;
        for (let y = Math.max(0, ciY - C.WORKER_ACCESS_RADIUS); y <= Math.min(C.GRID_SIZE_Y - 1, ciY + C.WORKER_ACCESS_RADIUS); y++) {
            for (let x = Math.max(0, ciX - C.WORKER_ACCESS_RADIUS); x <= Math.min(C.GRID_SIZE_X - 1, ciX + C.WORKER_ACCESS_RADIUS); x++) {
                const dist = Math.abs(x - ciX) + Math.abs(y - ciY);
                if (dist <= C.WORKER_ACCESS_RADIUS) {
                    nearbyWorkforce += (this.grid[y][x].type.population || 0);
                }
            }
        }
        workerAccessScore = Math.min((nearbyWorkforce / 10) * C.WORKER_ACCESS_MAX_BONUS, C.WORKER_ACCESS_MAX_BONUS);
        if (nearbyWorkforce === 0) workerAccessScore = -20;

        if (tileType.parentZoneCategory === 'commercial') {
            let nearbyCustomers = 0;
            for (let y = Math.max(0, ciY - C.CUSTOMER_ACCESS_RADIUS); y <= Math.min(C.GRID_SIZE_Y - 1, ciY + C.CUSTOMER_ACCESS_RADIUS); y++) {
                for (let x = Math.max(0, ciX - C.CUSTOMER_ACCESS_RADIUS); x <= Math.min(C.GRID_SIZE_X - 1, ciX + C.CUSTOMER_ACCESS_RADIUS); x++) {
                    const dist = Math.abs(x - ciX) + Math.abs(y - ciY);
                    if (dist <= C.CUSTOMER_ACCESS_RADIUS) {
                        nearbyCustomers += (this.grid[y][x].type.population || 0);
                    }
                }
            }
            customerAccessScore = Math.min((nearbyCustomers / 20) * C.CUSTOMER_ACCESS_MAX_BONUS, C.CUSTOMER_ACCESS_MAX_BONUS);
            if (nearbyCustomers === 0) customerAccessScore = -20;
        }

        let totalScore = baseScore + workerAccessScore + (tileType.parentZoneCategory === 'commercial' ? customerAccessScore : 0);
        totalScore = Math.max(0, Math.min(C.MAX_OPERATIONAL_SCORE, totalScore));
        
        tileData.operationalData!.score = totalScore;
        tileData.operationalData!.workerAccess = workerAccessScore;
        tileData.operationalData!.customerAccess = customerAccessScore;
        
        return totalScore;
    }

    private updateCIOperationalVisual(ciX: number, ciY: number): void {
        const tileData = this.grid[ciY][ciX];
        if (!tileData || !tileData.type.isBuilding || (tileData.type.parentZoneCategory !== 'commercial' && tileData.type.parentZoneCategory !== 'industrial') || !tileData.operationalData) return;

        const score = tileData.operationalData.score;
        let newTargetVisualLevel: 'LOW' | 'MED' | 'HIGH';
        if (score < C.OP_LOW_THRESHOLD) newTargetVisualLevel = 'LOW';
        else if (score > C.OP_HIGH_THRESHOLD) newTargetVisualLevel = 'HIGH';
        else newTargetVisualLevel = 'MED';

        if (newTargetVisualLevel !== tileData.operationalData.currentTargetVisualLevel) {
            tileData.operationalData.currentTargetVisualLevel = newTargetVisualLevel;
            tileData.operationalData.ticksInCurrentTargetLevel = 1;
        } else {
            tileData.operationalData.ticksInCurrentTargetLevel++;
        }

        if (tileData.operationalData.ticksInCurrentTargetLevel >= C.OPERATIONAL_VISUAL_CHANGE_THRESHOLD) {
            const currentVisualTypeId = tileData.type.id;
            const targetTypeId = `${tileData.type.parentZoneCategory!.toUpperCase()}_LVL1_${newTargetVisualLevel}`;
            if (TILE_TYPES[targetTypeId] && currentVisualTypeId !== targetTypeId) {
                tileData.type = TILE_TYPES[targetTypeId];
                this.drawGame();
            }
        }
    }

    private calculateCityMetrics(): void {
        let totalSatisfactionPoints = 0;
        let residentialBuildingCount = 0;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tileData = this.grid[y][x];
                if (tileData.type.parentZoneCategory === 'residential' && tileData.type.isBuilding) {
                    if (!tileData.satisfactionData) {
                        tileData.satisfactionData = this.getDefaultSatisfactionData();
                    }
                    totalSatisfactionPoints += this.calculateTileSatisfaction(x, y);
                    this.updateResidentialBuildingVisual(x,y);
                    residentialBuildingCount++;
                }
            }
        }
        this.citySatisfaction = residentialBuildingCount > 0 ? totalSatisfactionPoints / residentialBuildingCount : 50;

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tileData = this.grid[y][x];
                if (tileData.type.isBuilding && (tileData.type.parentZoneCategory === 'commercial' || tileData.type.parentZoneCategory === 'industrial')) {
                    if (!tileData.operationalData) {
                        tileData.operationalData = this.getDefaultOperationalData();
                    }
                    this.calculateCIOperationalScore(x, y);
                    this.updateCIOperationalVisual(x, y);
                }
            }
        }

        let totalJobsAvailable = 0;
        let totalWorkforce = 0; // Population that can work
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                totalJobsAvailable += (this.grid[y][x].type.jobsProvided || 0);
                totalWorkforce += (this.grid[y][x].type.population || 0);
            }
        }
        const employedWorkforce = Math.min(totalJobsAvailable, totalWorkforce);
        this.employmentRate = (totalWorkforce > 0) ? (employedWorkforce / totalWorkforce) * 100 : 100;
    }

    // --- Tile Info Pane Logic ---
    private updateTileInfoPaneContents(gridX: number, gridY: number): void {
        if (gridX < 0 || gridX >= C.GRID_SIZE_X || gridY < 0 || gridY >= C.GRID_SIZE_Y) {
            this.tileInfoPane.hide();
            this.selectedTileCoords = null;
            return;
        }
        const tile = this.grid[gridY][gridX];
        this.tileInfoPane.update(tile, {x: gridX, y: gridY});
        this.tileInfoPane.show();
        this.selectedTileCoords = { x: gridX, y: gridY };
        this.drawGame(); // Redraw to highlight selected tile
    }

    // --- Event Handling ---
    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        window.addEventListener('resize', () => this.setCanvasSize());
    }

    private handleMouseDown(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const targetCoords = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.cameraOffsetX, this.cameraOffsetY);

        if (event.button === 0) { // Left click
            if (this.currentMode === 'pan') {
                this.isDragging = true;
                this.setCanvasCursor(); // To grabbing
            } else if (this.currentMode === 'select') {
                if (targetCoords) {
                    this.updateTileInfoPaneContents(targetCoords.x, targetCoords.y);
                } else {
                    this.tileInfoPane.hide();
                    this.selectedTileCoords = null;
                    this.drawGame();
                }
            } else if (this.currentMode === 'build') {
                const buildCoords = this.hoveredTile ? this.hoveredTile : targetCoords;
                if (buildCoords) {
                    this.handleCanvasBuildInteraction(buildCoords.x, buildCoords.y);
                }
            }
        } else if (event.button === 1) { // Middle mouse button
            this.isDragging = true; // Allow panning with middle mouse
            this.setCanvasCursor(); // To grabbing
        }
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    private handleMouseMove(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (this.isDragging) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;
            this.cameraOffsetX += dx;
            this.cameraOffsetY += dy;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.drawGame();
        } else if (this.currentMode === 'build' && this.currentBuildType) {
            const currentMouseTile = getTileCoordinatesFromScreenPoint(mouseX, mouseY, this.cameraOffsetX, this.cameraOffsetY);
            let needsRedraw = false;
            if (currentMouseTile) {
                if (!this.hoveredTile || this.hoveredTile.x !== currentMouseTile.x || this.hoveredTile.y !== currentMouseTile.y) {
                    this.hoveredTile = currentMouseTile;
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
        } else { // Not dragging, not build mode with build type
            if (this.hoveredTile) { // Clear any lingering hover highlight if mode changed
                this.hoveredTile = null;
                this.drawGame();
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0 || event.button === 1) {
            this.isDragging = false;
            this.setCanvasCursor(); // Reset to grab if pan mode
        }
    }

    private handleMouseLeave(): void {
        this.isDragging = false;
        this.setCanvasCursor();
        if (this.hoveredTile) {
            this.hoveredTile = null;
            this.drawGame();
        }
    }
    
    private attemptZoneDevelopment(zoneX: number, zoneY: number): void {
        const tileData = this.grid[zoneY][zoneX];
        if (!tileData.type.isZone || tileData.developmentTimerId) return;

        const builtZoneId = tileData.type.id;
        tileData.developmentTimerId = window.setTimeout(() => {
            delete tileData.developmentTimerId;

            if (this.grid[zoneY][zoneX].type.id === builtZoneId) { // Check if zone still exists and hasn't been bulldozed
                if (this.isConnectedToRoad(zoneX, zoneY)) {
                    const originalZoneType = TILE_TYPES[builtZoneId.toUpperCase()];
                    if (originalZoneType && originalZoneType.developsInto) {
                        const developedTypeKey = originalZoneType.developsInto;
                        if (TILE_TYPES[developedTypeKey]) {
                            this.grid[zoneY][zoneX].type = TILE_TYPES[developedTypeKey];
                            // Initialize satisfaction/operational data for the new building
                            if (this.grid[zoneY][zoneX].type.parentZoneCategory === 'residential') {
                                this.grid[zoneY][zoneX].satisfactionData = this.getDefaultSatisfactionData();
                            } else if (this.grid[zoneY][zoneX].type.parentZoneCategory === 'commercial' || this.grid[zoneY][zoneX].type.parentZoneCategory === 'industrial') {
                                this.grid[zoneY][zoneX].operationalData = this.getDefaultOperationalData();
                            }
                            this.messageBox.show(`${originalZoneType.name} at (${zoneX},${zoneY}) developed!`, 2500);
                            this.calculateCityMetrics();
                            this.updateAllUI();
                            this.drawGame();
                        }
                    }
                }
            }
        }, 5000 + Math.random() * 5000); // 5-10 seconds
    }

    private handleCanvasBuildInteraction(gridX: number, gridY: number): boolean {
        if (this.currentMode !== 'build' || !this.currentBuildType) return false;
        
        const tileData = this.grid[gridY][gridX];
        const selectedTool = this.currentBuildType;
        const oldTileType = tileData.type;

        if (tileData.type.isObstacle && selectedTool.id !== tileData.type.id) {
            this.messageBox.show("Cannot build on mountains.", 2000);
            return true;
        }
        if (selectedTool.id === 'grass' && tileData.type.isObstacle) {
            this.messageBox.show("Mountains cannot be removed.", 2000);
            return true;
        }

        // Bulldozing (building grass)
        if (selectedTool.id === 'grass') {
            if (tileData.type.id !== 'grass') {
                this.messageBox.show(`Cleared ${tileData.type.name}.`, 1500);
                // No cost to bulldoze to grass in this version, but could add one
                // Clear any specific data associated with the old tile
                if (tileData.satisfactionData) delete tileData.satisfactionData;
                if (tileData.operationalData) delete tileData.operationalData;
                if (tileData.developmentTimerId) {
                    clearTimeout(tileData.developmentTimerId);
                    delete tileData.developmentTimerId;
                }
                tileData.type = TILE_TYPES.GRASS;

                if (oldTileType.id === 'road') {
                    this.checkAndUpdateAdjacentBuildingsOnRoadChange(gridX, gridY);
                } else {
                     this.calculateCityMetrics(); // Recalculate if a building was removed
                }
                this.updateAllUI();
                this.drawGame();
            }
            return true;
        }

        // Building something else
        if (tileData.type.id === 'grass' || tileData.type.id !== selectedTool.id) { // Allow replacing existing, non-grass tiles
            if (this.playerBudget >= selectedTool.cost) {
                let messageAction = tileData.type.id === 'grass' ? "Built" : "Replaced";
                let oldTypeName = tileData.type.name;

                this.playerBudget -= selectedTool.cost;

                // Clear data from previous tile if it's being replaced
                if (tileData.satisfactionData) delete tileData.satisfactionData;
                if (tileData.operationalData) delete tileData.operationalData;
                if (tileData.developmentTimerId) {
                    clearTimeout(tileData.developmentTimerId);
                    delete tileData.developmentTimerId;
                }
                
                tileData.type = selectedTool;

                // Initialize data for new building/zone
                if (selectedTool.parentZoneCategory === 'residential' && selectedTool.isBuilding) {
                    tileData.satisfactionData = this.getDefaultSatisfactionData();
                } else if ((selectedTool.parentZoneCategory === 'commercial' || selectedTool.parentZoneCategory === 'industrial') && selectedTool.isBuilding) {
                    tileData.operationalData = this.getDefaultOperationalData();
                }

                this.messageBox.show(`${messageAction} ${oldTypeName && messageAction === "Replaced" ? oldTypeName : ""} with ${selectedTool.name} for $${selectedTool.cost}`.replace("  ", " "), 2500);

                if (oldTileType.id === 'road' && selectedTool.id !== 'road') {
                    this.checkAndUpdateAdjacentBuildingsOnRoadChange(gridX, gridY);
                }

                if (selectedTool.isZone && selectedTool.developsInto) {
                    this.attemptZoneDevelopment(gridX, gridY);
                } else if (selectedTool.id === 'road') { // Check if new road connects to existing zones
                    const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
                    for (const n of neighbors) {
                        const nx = gridX + n.dx;
                        const ny = gridY + n.dy;
                        if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                            if (this.grid[ny][nx].type.isZone) {
                                this.attemptZoneDevelopment(nx, ny); // Trigger development check for adjacent zones
                            }
                        }
                    }
                }
                this.calculateCityMetrics(); // Recalculate city metrics after build
                this.updateAllUI();
                this.drawGame();
            } else {
                this.messageBox.show(`Not enough funds for ${selectedTool.name}. Cost: $${selectedTool.cost}. Budget: $${this.playerBudget.toFixed(0)}`, 2500);
            }
            return true;
        }
        this.messageBox.show(`This is already a ${tileData.type.name}.`, 1500);
        return true;
    }

    // --- Touch Event Handling ---
    private handleTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            event.preventDefault(); // Prevent default touch actions like scrolling
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            const targetCoords = getTileCoordinatesFromScreenPoint(touchX, touchY, this.cameraOffsetX, this.cameraOffsetY);

            if (this.currentMode === 'pan') {
                this.isDragging = true;
            } else if (this.currentMode === 'select') {
                if (targetCoords) {
                    this.updateTileInfoPaneContents(targetCoords.x, targetCoords.y);
                } else {
                    this.tileInfoPane.hide();
                    this.selectedTileCoords = null;
                    this.drawGame();
                }
            } else if (this.currentMode === 'build') {
                // For touch, place immediately on tap, hover preview is less practical
                if (targetCoords) {
                    this.handleCanvasBuildInteraction(targetCoords.x, targetCoords.y);
                }
            }
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
        } else if (event.touches.length > 1) {
            // Could implement pinch-to-zoom here later
            this.isDragging = false; // Stop panning if multi-touch
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        if (this.isDragging && event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            if (this.lastTouchX !== null && this.lastTouchY !== null) {
                const dx = touch.clientX - this.lastTouchX;
                const dy = touch.clientY - this.lastTouchY;
                this.cameraOffsetX += dx;
                this.cameraOffsetY += dy;
                this.drawGame();
            }
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
        }
    }

    private handleTouchEnd(event: TouchEvent): void {
        // if (event.touches.length === 0) { // Last finger lifted
            this.isDragging = false;
            this.lastTouchX = null;
            this.lastTouchY = null;
        // }
    }

    // --- Game Loop for Economy & Simulation Updates ---
    private startGameLoop(): void {
        if (this.gameTickIntervalId) clearInterval(this.gameTickIntervalId);
        this.gameTickIntervalId = window.setInterval(() => this.processGameTick(), C.GAME_TICK_INTERVAL);
        console.log("Game loop started for economy and simulation.");
    }

    private processGameTick(): void {
        this.gameDay++;
        let totalCarryCosts = 0;
        let totalTaxes = 0;
        
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.grid[y][x].type;
                totalCarryCosts += (tile.carryCost || 0);
                totalTaxes += (tile.taxRate || 0);
            }
        }
        const netChange = totalTaxes - totalCarryCosts;
        this.playerBudget += netChange;

        this.calculateCityMetrics(); // Recalculate satisfaction, operation, employment, etc.
        this.updateAllUI(totalTaxes, totalCarryCosts, netChange); // Update main panel, and if tile info is open
    }
}
