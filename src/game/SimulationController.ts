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
                    // Move some pollution towards equilibrium with neighbors
                    const currentPollution = tempPollutionMap[x][y];
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
                    tile.population = TILE_TYPES[tile.type.developsInto].populationCapacity ? Math.floor(TILE_TYPES[tile.type.developsInto].populationCapacity! / 4) : 2; // Initial pop for L1
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
                    if (tile.type.isDevelopableZone && !tile.type.level) tile.population = 0; // Reset pop if reverted to empty zone
                } else {
                    // Could become rubble or just stay L1 empty
                }
            }
        }
        if (tile.population < 0) tile.population = 0;

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
                    tile.population = TILE_TYPES[tile.type.developsInto].populationCapacity ? Math.floor(TILE_TYPES[tile.type.developsInto].populationCapacity! / 4) : 1;
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
                     if (tile.type.isDevelopableZone && !tile.type.level) tile.population = 0;
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
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
                    tile.population = TILE_TYPES[tile.type.developsInto].populationCapacity ? Math.floor(TILE_TYPES[tile.type.developsInto].populationCapacity! / 4) : 2;
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
                    if (tile.type.isDevelopableZone && !tile.type.level) tile.population = 0;
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
    }
    
    private changeTileLevel(tile: GridTile, x: number, y: number, newType: TileType): void {
        if (tile.type.id === newType.id) return; // No change

        // console.log(`Changing tile (${x},${y}) from ${tile.type.id} to ${newType.id}`);
        this.gridController.setTileType(x, y, newType); // This resets some tile data by default
        
        // Re-fetch the tile as setTileType creates a new object or modifies it significantly
        const newGridTileState = this.gridController.getTile(x,y)!; 
        
        // Preserve/initialize important data after type change
        newGridTileState.pollution = tile.pollution; // Pollution stays
        newGridTileState.tileValue = tile.tileValue; // Tile value stays for now, may get re-evaluated
        newGridTileState.hasRoadAccess = tile.hasRoadAccess; // Road access stays
        
        if (newType.isDevelopableZone && !newType.level) { // Reverted to empty zone
            newGridTileState.population = 0;
        } else if (tile.population > 0 && newType.level && tile.type.level && newType.level < tile.type.level) { // Downgrade with some population
            newGridTileState.population = newType.populationCapacity ? Math.min(tile.population, newType.populationCapacity) : Math.floor(tile.population / 2);
        } else if (newType.level && newType.level > (tile.type.level || 0)) { // Upgrade, set starting population for new level
             newGridTileState.population = newType.populationCapacity ? Math.floor(newType.populationCapacity / 4) : tile.population; // Carry some pop over or start fresh
        } else {
            newGridTileState.population = tile.population; // Default carry over
        }
        if (newGridTileState.population < 0) newGridTileState.population = 0;

        this.gameInstance.drawGame(); // Visual update
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
                    if (tile.type.taxRatePerPopulation && tile.population > 0) {
                        totalTaxes += tile.population * tile.type.taxRatePerPopulation;
                    } else if (tile.type.baseTax) {
                        totalTaxes += tile.type.baseTax;
                    }

                    if (tile.type.zoneCategory === 'residential') {
                        totalPopulation += tile.population;
                    }
                    if (tile.type.jobsProvided) { // Assuming jobsProvided is per building, not per pop unit for C/I
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

        // Calculate average city satisfaction (e.g., average tile value of residential zones)
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

    // Exposed for potential use by UI or other systems
    public getPollutionAt(x: number, y: number): number {
        if (this.pollutionMap[y]) return this.pollutionMap[y][x] || 0;
        return 0;
    }
    public getTileValueAt(x: number, y: number): number {
        if (this.tileValueMap[y]) return this.tileValueMap[y][x] || 0;
        return 0;
    }

    // --- Old methods to be removed or integrated ---
    // calculateCityMetrics - largely replaced by calculateFinancesAndGlobalMetrics and direct updates
    // calculateTileSatisfaction, updateResidentialBuildingVisual - replaced by RCI growth logic
    // calculateCIOperationalScore, updateCIOperationalVisual - replaced by RCI growth logic
    // isConnectedToRoad - replaced by checkDirectRoadAccess and tile.hasRoadAccess
    // checkAndUpdateAdjacentBuildingsOnRoadChange - aspects covered by road access checks in growth logic
    // attemptZoneDevelopment - growth from zone to L1 is now part of RCI growth logic directly
}
