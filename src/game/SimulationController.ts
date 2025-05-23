import { GridTile, TileType } from '../types';
import { TILE_TYPES } from '../config/tileTypes';
import * as C from '../config/constants';
import { GridController } from './GridController';
import { Game } from './Game';

export class SimulationController {
    private gridController: GridController;
    private gameInstance: Game;

    // Micropolis data maps
    private pollutionMap: number[][] = [];
    private tileValueMap: number[][] = [];
    // private roadNetworkConnectivityMap: number[][] = []; // For more advanced road connection checks

    constructor(gridController: GridController, gameInstance: Game) {
        this.gridController = gridController;
        this.gameInstance = gameInstance;
        this.initializeMaps();
    }

    private initializeMaps(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.pollutionMap[y] = new Array(C.GRID_SIZE_X).fill(0);
            this.tileValueMap[y] = new Array(C.GRID_SIZE_X).fill(C.BASE_TILE_VALUE);
            // this.roadNetworkConnectivityMap[y] = new Array(C.GRID_SIZE_X).fill(0);
        }
    }
    
    public processGameTick(): { taxes: number, costs: number, net: number } {
        this.updatePollutionMap();
        this.updateTileValueMap();
        this.updateRoadAccessFlags(); // Must be after tileValue, before growth
        this.updateZoneGrowthAndDecline();
        
        // After all simulation, calculate finances and global metrics
        return this.calculateFinancesAndGlobalMetrics();
    }

    // Step 1: Update Pollution Map
    private updatePollutionMap(): void {
        const tempPollutionMap: number[][] = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            tempPollutionMap[y] = [...this.pollutionMap[y]];
        }

        // 1a. Reset/Decay
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                tempPollutionMap[y][x] *= C.POLLUTION_DECAY_FACTOR;
            }
        }

        // 1b. Sources (Industrial)
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (tile && tile.type.zoneCategory === 'industrial' && tile.type.level && tile.type.level > 0) {
                    const pollutionGenerated = tile.population * C.POLLUTION_PER_INDUSTRIAL_POPULATION_UNIT;
                    // Add pollution directly at the source and spread a bit initially
                    for (let dy = -C.INDUSTRIAL_POLLUTION_SPREAD_RADIUS; dy <= C.INDUSTRIAL_POLLUTION_SPREAD_RADIUS; dy++) {
                        for (let dx = -C.INDUSTRIAL_POLLUTION_SPREAD_RADIUS; dx <= C.INDUSTRIAL_POLLUTION_SPREAD_RADIUS; dx++) {
                            const dist = Math.abs(dx) + Math.abs(dy);
                            if (dist <= C.INDUSTRIAL_POLLUTION_SPREAD_RADIUS) {
                                const nx = x + dx;
                                const ny = y + dy;
                                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                                    tempPollutionMap[ny][nx] += pollutionGenerated / (dist + 1) ; // Diminishing with distance
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 1c. Sinks (Parks)
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (tile && (tile.type.id === 'park' || tile.type.id === 'natural_park')) {
                    for (let dy = -C.PARK_POLLUTION_REDUCTION_RADIUS; dy <= C.PARK_POLLUTION_REDUCTION_RADIUS; dy++) {
                        for (let dx = -C.PARK_POLLUTION_REDUCTION_RADIUS; dx <= C.PARK_POLLUTION_REDUCTION_RADIUS; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                                tempPollutionMap[ny][nx] -= C.PARK_POLLUTION_REDUCTION_AMOUNT / (Math.abs(dx) + Math.abs(dy) + 1);
                                if (tempPollutionMap[ny][nx] < 0) tempPollutionMap[ny][nx] = 0;
                            }
                        }
                    }
                }
            }
        }
        
        // 1d. Spread/Diffusion
        const newPollutionMap: number[][] = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            newPollutionMap[y] = [...tempPollutionMap[y]]; // Start with current values after decay, sources, sinks
        }

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                let neighborPollutionSum = 0;
                let neighborCount = 0;
                const neighbors = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
                for(const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;
                    if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                        neighborPollutionSum += tempPollutionMap[ny][nx]; // Use pollution *before* this pass's diffusion
                        neighborCount++;
                    }
                }
                if (neighborCount > 0) {
                    const avgNeighborPollution = neighborPollutionSum / neighborCount;
                    const currentPollution = tempPollutionMap[y][x]; // Corrected from tempPollutionMap[x][y]
                    newPollutionMap[y][x] = (currentPollution * (1 - C.POLLUTION_SPREAD_FACTOR)) + (avgNeighborPollution * C.POLLUTION_SPREAD_FACTOR);
                }
                 // Clamp pollution
                newPollutionMap[y][x] = Math.max(0, Math.min(C.MAX_POLLUTION, newPollutionMap[y][x]));
                this.pollutionMap[y][x] = newPollutionMap[y][x]; // Update main map
                
                // Update individual tile's pollution cache
                const gridCell = this.gridController.getTile(x,y);
                if(gridCell) gridCell.pollution = this.pollutionMap[y][x];
            }
        }
    }

    // Step 2: Update Tile Value Map
    private updateTileValueMap(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                let currentValue = C.BASE_TILE_VALUE;

                // Influence of Water & Parks (radius based)
                for (let dy = -Math.max(C.WATER_INFLUENCE_RADIUS, C.PARK_INFLUENCE_RADIUS); dy <= Math.max(C.WATER_INFLUENCE_RADIUS, C.PARK_INFLUENCE_RADIUS); dy++) {
                    for (let dx = -Math.max(C.WATER_INFLUENCE_RADIUS, C.PARK_INFLUENCE_RADIUS); dx <= Math.max(C.WATER_INFLUENCE_RADIUS, C.PARK_INFLUENCE_RADIUS); dx++) {
                        const dist = Math.sqrt(dx*dx + dy*dy); // Euclidean distance for falloff
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                            const neighborTile = this.gridController.getTile(nx, ny);
                            if (neighborTile) {
                                if (neighborTile.type.id === 'water' && dist <= C.WATER_INFLUENCE_RADIUS) {
                                    currentValue += C.WATER_TILE_VALUE_BONUS * (1 - dist / (C.WATER_INFLUENCE_RADIUS + 1));
                                }
                                if ((neighborTile.type.id === 'park' || neighborTile.type.id === 'natural_park') && dist <= C.PARK_INFLUENCE_RADIUS) {
                                    currentValue += C.PARK_TILE_VALUE_BONUS * (1 - dist / (C.PARK_INFLUENCE_RADIUS + 1));
                                }
                            }
                        }
                    }
                }
                
                // Influence of Mountains (direct adjacency) & Roads
                const directNeighbors = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
                for(const n of directNeighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;
                     if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                        const neighborTile = this.gridController.getTile(nx,ny);
                        if(neighborTile) {
                            if (neighborTile.type.id === 'mountain') currentValue += C.MOUNTAIN_TILE_VALUE_PENALTY;
                            if (neighborTile.type.id === 'road') currentValue += C.ROAD_ADJACENCY_TILE_VALUE_BONUS;
                            // RCI Proximity for Tile Value (simple direct adjacency check for now)
                            const currentTile = this.gridController.getTile(x,y);
                            if (currentTile?.type.zoneCategory === 'residential') {
                                if (neighborTile.type.zoneCategory === 'commercial') currentValue += C.R_NEAR_C_BONUS;
                                if (neighborTile.type.zoneCategory === 'industrial') currentValue += C.R_NEAR_I_PENALTY;
                            } else if (currentTile?.type.zoneCategory === 'commercial') {
                                if (neighborTile.type.zoneCategory === 'industrial') currentValue += C.C_NEAR_I_BONUS;
                            }
                        }
                    }
                }

                // Influence of Pollution
                currentValue += this.pollutionMap[y][x] * C.POLLUTION_TO_TILE_VALUE_MULTIPLIER;

                // Clamping
                this.tileValueMap[y][x] = Math.max(0, Math.min(C.MAX_TILE_VALUE, currentValue));
                
                // Update individual tile's value cache
                const gridCell = this.gridController.getTile(x,y);
                if(gridCell) gridCell.tileValue = this.tileValueMap[y][x];
            }
        }
    }

    // Step 3: Update Road Access Flags
    private updateRoadAccessFlags(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (tile && (tile.type.isDevelopableZone || tile.type.zoneCategory)) { // Check for zones and RCI buildings
                    tile.hasRoadAccess = this.checkDirectRoadAccess(x,y);
                } else if (tile) {
                    tile.hasRoadAccess = false; // Non-zoned tiles don't have "road access" in this context
                }
            }
        }
        // TODO: Advanced: Implement flood fill from roads to mark all connected buildable tiles for more robust checks.
    }
    
    private checkDirectRoadAccess(gridX: number, gridY: number): boolean {
        const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
        for (const neighbor of neighbors) {
            const nx = gridX + neighbor.dx;
            const ny = gridY + neighbor.dy;
            if (this.gridController.getTile(nx,ny)?.type.id === 'road') return true;
        }
        return false;
    }


    // Step 4: Zone Growth/Decline
    private updateZoneGrowthAndDecline(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (!tile) continue;

                if (tile.type.zoneCategory === 'residential') {
                    this.processResidentialGrowth(tile, x, y);
                } else if (tile.type.zoneCategory === 'commercial') {
                    this.processCommercialGrowth(tile, x, y);
                } else if (tile.type.zoneCategory === 'industrial') {
                    this.processIndustrialGrowth(tile, x, y);
                }
            }
        }
    }

    private scanRadiusForPop(centerX: number, centerY: number, radius: number, targetCategory: 'residential' | 'commercial' | 'industrial', roadConnectedOnly: boolean): number {
        let totalPop = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = centerX + dx;
                const ny = centerY + dy;
                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                    const t = this.gridController.getTile(nx, ny);
                    if (t && t.type.zoneCategory === targetCategory && t.type.level && t.type.level > 0) {
                        if (!roadConnectedOnly || (t.hasRoadAccess && this.gridController.getTile(centerX,centerY)!.hasRoadAccess)) { // Simplified road connection check
                            totalPop += t.population;
                        }
                    }
                }
            }
        }
        return totalPop;
    }
    
    private updateStruggleVisuals(tile: GridTile, isCurrentlyStruggling: boolean): void {
        if (isCurrentlyStruggling) {
            tile.struggleTicks = (tile.struggleTicks || 0) + 1;
        } else {
            tile.struggleTicks = 0;
            // Only turn off visual if it was on and state improved
            if (tile.isVisuallyStruggling) tile.isVisuallyStruggling = false;
        }

        if (tile.struggleTicks >= C.STRUGGLE_VISUAL_THRESHOLD_TICKS) {
            if (!tile.isVisuallyStruggling) tile.isVisuallyStruggling = true; // Set to true if newly struggling
        } else if (!isCurrentlyStruggling && tile.isVisuallyStruggling) {
            // If state improved AND it was visually struggling, turn it off
            tile.isVisuallyStruggling = false;
        }
    }
    
    private processResidentialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue; // From tileValueMap via tile.tileValue cache
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) {
            shouldDecline = true; // No road access = decline
        } else {
            const jobAccessScore = this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'commercial', true) + 
                                 this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'industrial', true);
            
            const growthFactor = desirability + jobAccessScore - (tile.population * C.R_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) { // Is an empty zone plot
                 if (growthFactor > C.R_GROWTH_THRESHOLD / 2 && desirability > C.R_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto) { // Lower threshold to develop L1
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    // Population for new L1 is set in changeTileLevel
                    return; // Done for this tick
                }
            } else if (tile.type.level && tile.type.level > 0) { // Is an existing building
                if (growthFactor > C.R_GROWTH_THRESHOLD && desirability > C.R_MIN_DESIRABILITY_FOR_GROWTH) {
                    shouldGrow = true;
                }
                if (desirability < C.R_DECLINE_DESIRABILITY_THRESHOLD || jobAccessScore < C.R_MIN_JOB_SCORE_FOR_NO_DECLINE) {
                    shouldDecline = true;
                }
            }
        }

        if (shouldGrow && !shouldDecline) {
            tile.population += C.R_GROWTH_POPULATION_RATE;
            if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) {
                tile.population = tile.type.populationCapacity;
                if (tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                }
            }
        } else if (shouldDecline) {
            tile.population -= C.R_DECLINE_POPULATION_RATE;
            if (tile.population <= 0) {
                tile.population = 0;
                if (tile.type.revertsTo && TILE_TYPES[tile.type.revertsTo]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.revertsTo]);
                } else {
                    // Could become rubble or just stay L1 empty
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
        if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) tile.population = tile.type.populationCapacity;


        // Update visual struggle state for Residential
        let isResStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.tileValue < C.R_VISUAL_STRUGGLE_TILE_VALUE_THRESHOLD) {
            isResStruggling = true;
        }
        this.updateStruggleVisuals(tile, isResStruggling);
    }

    private processCommercialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue;
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) {
            shouldDecline = true;
        } else {
            const customerAccessScore = this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'residential', true);
            const goodsWorkerAccessScore = this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'industrial', true); // Simplified: industrial provides goods & some workers

            const growthFactor = desirability + customerAccessScore + goodsWorkerAccessScore - (tile.population * C.C_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) {
                 if (growthFactor > C.C_GROWTH_THRESHOLD / 2 && desirability > C.C_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    return;
                }
            } else if (tile.type.level && tile.type.level > 0) {
                if (growthFactor > C.C_GROWTH_THRESHOLD && desirability > C.C_MIN_DESIRABILITY_FOR_GROWTH) {
                    shouldGrow = true;
                }
                if (desirability < C.C_DECLINE_DESIRABILITY_THRESHOLD || customerAccessScore < C.C_MIN_CUSTOMER_SCORE_FOR_NO_DECLINE) {
                    shouldDecline = true;
                }
            }
        }
        
        if (shouldGrow && !shouldDecline) {
            tile.population += C.C_GROWTH_POPULATION_RATE;
            if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) {
                tile.population = tile.type.populationCapacity;
                 if (tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                }
            }
        } else if (shouldDecline) {
            tile.population -= C.C_DECLINE_POPULATION_RATE;
            if (tile.population <= 0) {
                tile.population = 0;
                if (tile.type.revertsTo && TILE_TYPES[tile.type.revertsTo]) {
                     this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.revertsTo]);
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
        if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) tile.population = tile.type.populationCapacity;


        // Update visual struggle state for Commercial
        let isComStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.type.populationCapacity && tile.type.populationCapacity > 0 &&
            (tile.population / tile.type.populationCapacity) < C.CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD) {
            isComStruggling = true;
        }
        this.updateStruggleVisuals(tile, isComStruggling);
    }

    private processIndustrialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue; // Less sensitive, but still a factor
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) {
            shouldDecline = true;
        } else {
            const workerAccessScore = this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'residential', true);
            // Market access could be simplified: if it has road access and some C zones nearby or just good general road network (not implemented yet)
            const marketAccessScore = this.scanRadiusForPop(x, y, C.CONNECTIVITY_RADIUS, 'commercial', true) > 0 ? 50 : 0; 

            const growthFactor = desirability + workerAccessScore + marketAccessScore - (tile.population * C.I_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) {
                 if (growthFactor > C.I_GROWTH_THRESHOLD / 2 && desirability > C.I_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    return;
                }
            } else if (tile.type.level && tile.type.level > 0) {
                if (growthFactor > C.I_GROWTH_THRESHOLD && desirability > C.I_MIN_DESIRABILITY_FOR_GROWTH) {
                    shouldGrow = true;
                }
                // Industrial zones are primarily worker-dependent for decline
                if (workerAccessScore < C.I_MIN_WORKER_SCORE_FOR_NO_DECLINE) {
                    shouldDecline = true;
                }
            }
        }

        if (shouldGrow && !shouldDecline) {
            tile.population += C.I_GROWTH_POPULATION_RATE;
             if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) {
                tile.population = tile.type.populationCapacity;
                 if (tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                }
            }
        } else if (shouldDecline) {
            tile.population -= C.I_DECLINE_POPULATION_RATE;
            if (tile.population <= 0) {
                tile.population = 0;
                if (tile.type.revertsTo && TILE_TYPES[tile.type.revertsTo]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.revertsTo]);
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
        if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) tile.population = tile.type.populationCapacity;

        // Update visual struggle state for Industrial
        let isIndStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.type.populationCapacity && tile.type.populationCapacity > 0 &&
            (tile.population / tile.type.populationCapacity) < C.CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD) {
            isIndStruggling = true;
        }
        this.updateStruggleVisuals(tile, isIndStruggling);
    }
    
    private changeTileLevel(tile: GridTile, x: number, y: number, newType: TileType): void {
        if (tile.type.id === newType.id) return; // No change

        const oldType = tile.type;
        this.gridController.setTileType(x, y, newType); 
        
        const newGridTileState = this.gridController.getTile(x,y)!; 
        
        newGridTileState.pollution = tile.pollution; 
        newGridTileState.tileValue = tile.tileValue; 
        newGridTileState.hasRoadAccess = tile.hasRoadAccess; 
        newGridTileState.isVisuallyStruggling = false; 
        newGridTileState.struggleTicks = 0;
        
        if (newType.isDevelopableZone && !newType.level) { 
            newGridTileState.population = 0;
        } else if (newType.level && oldType.level && newType.level < oldType.level) { // Downgrade
            // Keep some population, capped by new capacity
            newGridTileState.population = newType.populationCapacity ? Math.min(tile.population, newType.populationCapacity) : Math.floor(tile.population / 2);
        } else if (newType.level && newType.level > (oldType.level || 0)) { // Upgrade or first build
            // Set initial population for new level, or carry over if already populated from a zone plot
            let initialPop = tile.population > 0 ? tile.population : 0; // Carry from zone plot if it had some conceptual pop
            if (newType.populationCapacity) {
                 initialPop = Math.max(initialPop, Math.floor(newType.populationCapacity / 4)); // Ensure at least some starting pop
                 newGridTileState.population = Math.min(initialPop, newType.populationCapacity);
            } else {
                newGridTileState.population = initialPop > 0 ? initialPop : (newType.zoneCategory === 'residential' ? 2 : 1) ; // Default small pop if no capacity defined
            }
        } else { // Other cases, like replacing a L1 with another L1 of different type (if allowed)
            newGridTileState.population = tile.population; 
        }

        if (newGridTileState.population < 0) newGridTileState.population = 0;
        if (newGridTileState.type.populationCapacity && newGridTileState.population > newGridTileState.type.populationCapacity) {
            newGridTileState.population = newGridTileState.type.populationCapacity;
        }


        this.gameInstance.drawGame(); 
    }


    private calculateFinancesAndGlobalMetrics(): { taxes: number, costs: number, net: number } {
        let totalCarryCosts = 0;
        let totalTaxes = 0;
        let totalPopulation = 0;
        let totalJobsAvailable = 0;

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (tile) {
                    totalCarryCosts += (tile.type.carryCost || 0);
                    let taxFromTile = 0;
                    if (tile.type.taxRatePerPopulation && tile.population > 0) {
                        taxFromTile = tile.population * tile.type.taxRatePerPopulation;
                    } else if (tile.type.baseTax) {
                        taxFromTile = tile.type.baseTax;
                    }

                    // Apply tax modifiers
                    if (tile.type.zoneCategory === 'residential' && taxFromTile > 0) {
                        if (tile.tileValue < C.R_TAX_DESIRABILITY_THRESHOLD_SEVERE) taxFromTile *= 0.05; 
                        else if (tile.tileValue < C.R_TAX_DESIRABILITY_THRESHOLD_LOW) taxFromTile *= 0.3; 
                    } else if ((tile.type.zoneCategory === 'commercial' || tile.type.zoneCategory === 'industrial') && taxFromTile > 0 && tile.type.populationCapacity && tile.type.populationCapacity > 0) {
                        const popRatio = tile.population / tile.type.populationCapacity;
                        if (popRatio < C.CI_TAX_POPULATION_RATIO_SEVERE) taxFromTile *= 0.05; 
                        else if (popRatio < C.CI_TAX_POPULATION_RATIO_LOW) taxFromTile *= 0.3; 
                    }
                    
                    if (tile.isVisuallyStruggling && taxFromTile > 0) {
                        taxFromTile *= C.STRUGGLING_TAX_MULTIPLIER; 
                    }
                    totalTaxes += taxFromTile;

                    if (tile.type.zoneCategory === 'residential') {
                        totalPopulation += tile.population;
                    }
                    // Jobs provided calculation now directly uses tile.type.jobsProvided (if defined)
                    // This assumes jobsProvided on TileType is the total for that building type/level
                    if (tile.type.jobsProvided && tile.type.level && tile.type.level > 0) {
                         totalJobsAvailable += tile.type.jobsProvided;
                    }
                }
            }
        }
        const netChange = totalTaxes - totalCarryCosts;
        this.gameInstance.playerBudget += netChange;
        this.gameInstance.totalPopulation = totalPopulation;
        
        const employedWorkforce = Math.min(totalJobsAvailable, totalPopulation);
        this.gameInstance.employmentRate = (totalPopulation > 0) ? (employedWorkforce / totalPopulation) * 100 : 100;

        let residentialTileValueSum = 0;
        let residentialTileCount = 0;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                 if (tile && tile.type.zoneCategory === 'residential' && tile.population > 0) {
                    residentialTileValueSum += tile.tileValue;
                    residentialTileCount++;
                }
            }
        }
        this.gameInstance.citySatisfaction = residentialTileCount > 0 ? (residentialTileValueSum / residentialTileCount / C.MAX_TILE_VALUE) * 100 : 50;


        return { taxes: totalTaxes, costs: totalCarryCosts, net: netChange };
    }

    public getPollutionAt(x: number, y: number): number {
        if (this.pollutionMap[y]) return this.pollutionMap[y][x] || 0;
        return 0;
    }
    public getTileValueAt(x: number, y: number): number {
        if (this.tileValueMap[y]) return this.tileValueMap[y][x] || 0;
        return 0;
    }
}
