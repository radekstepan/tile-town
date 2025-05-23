import { GridTile, TileType } from '../types';
import * as C from '../config/constants';
import { TILE_TYPES } from '../config/tileTypes';

export class GridController {
    public grid: GridTile[][] = [];

    constructor() {
        this.initializeGrid();
    }

    private createDefaultGridTile(tileType: TileType): GridTile {
        return {
            type: tileType,
            population: 0,
            tileValue: C.BASE_TILE_VALUE,
            pollution: 0,
            hasRoadAccess: false,
        };
    }

    private initializeGrid(): void {
        this.grid = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.grid[y] = [];
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.grid[y][x] = this.createDefaultGridTile(TILE_TYPES.GRASS);
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
                const queue: { x: number; y: number }[] = [{x: seedX, y: seedY}];
                this.setTileType(seedX, seedY, TILE_TYPES.MOUNTAIN); // Use setTileType to ensure proper init
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
                                this.setTileType(nx, ny, TILE_TYPES.MOUNTAIN);
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
                    this.setTileType(currentX, currentY, TILE_TYPES.WATER);
                    if (Math.random() < 0.3 && currentX + 1 < C.GRID_SIZE_X && this.grid[currentY][currentX+1].type !== TILE_TYPES.MOUNTAIN) this.setTileType(currentX + 1, currentY, TILE_TYPES.WATER);
                    if (Math.random() < 0.3 && currentX - 1 >= 0 && this.grid[currentY][currentX-1].type !== TILE_TYPES.MOUNTAIN) this.setTileType(currentX - 1, currentY, TILE_TYPES.WATER);
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

    private isAreaNearWater(
        startX: number, 
        startY: number, 
        sizeX: number, 
        sizeY: number, 
        proximityRadius: number
    ): boolean {
        const checkStartX = Math.max(0, startX - proximityRadius);
        const checkStartY = Math.max(0, startY - proximityRadius);
        const checkEndX = Math.min(C.GRID_SIZE_X - 1, startX + sizeX - 1 + proximityRadius);
        const checkEndY = Math.min(C.GRID_SIZE_Y - 1, startY + sizeY - 1 + proximityRadius);

        for (let y = checkStartY; y <= checkEndY; y++) {
            for (let x = checkStartX; x <= checkEndX; x++) {
                if (this.grid[y] && this.grid[y][x] && this.grid[y][x].type === TILE_TYPES.WATER) {
                    return true;
                }
            }
        }
        return false;
    }

    private generateInitialParks(): void {
        const numParkClusters = Math.floor(Math.random() * 10) + 10; // e.g., 10 to 19 clusters
        const waterProximityRadius = 2; // How close to water to be considered "near"
        const attemptsPerParkForWater = 5; // Try this many times to place a park near water
        const fallbackMaxAttempts = 30; // Max attempts for fallback random placement

        for (let i = 0; i < numParkClusters; i++) {
            const clusterSizeX = Math.floor(Math.random() * 2) + 1; // 1 or 2
            const clusterSizeY = Math.floor(Math.random() * 2) + 1; // 1 or 2
            let parkPlaced = false;

            // Attempt 1: Try to place near water
            for (let attempt = 0; attempt < attemptsPerParkForWater; attempt++) {
                const seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - clusterSizeX));
                const seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - clusterSizeY));

                if (this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id]) &&
                    this.isAreaNearWater(seedX, seedY, clusterSizeX, clusterSizeY, waterProximityRadius)) {
                    
                    for (let y = seedY; y < seedY + clusterSizeY; y++) {
                        for (let x = seedX; x < seedX + clusterSizeX; x++) {
                            if (x < C.GRID_SIZE_X && y < C.GRID_SIZE_Y && this.grid[y][x].type === TILE_TYPES.GRASS) {
                                this.setTileType(x, y, TILE_TYPES.NATURAL_PARK);
                            }
                        }
                    }
                    parkPlaced = true;
                    break; 
                }
            }

            if (!parkPlaced) {
                let fallbackAttempts = 0;
                let seedX: number = 0, seedY: number = 0; 
                let foundClearSpot = false;

                do {
                    seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - clusterSizeX));
                    seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - clusterSizeY));
                    if (this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id])) {
                        foundClearSpot = true;
                        break;
                    }
                    fallbackAttempts++;
                } while (fallbackAttempts < fallbackMaxAttempts);

                if (foundClearSpot) {
                    for (let y = seedY; y < seedY + clusterSizeY; y++) {
                        for (let x = seedX; x < seedX + clusterSizeX; x++) {
                            if (x < C.GRID_SIZE_X && y < C.GRID_SIZE_Y && this.grid[y][x].type === TILE_TYPES.GRASS) {
                                this.setTileType(x, y, TILE_TYPES.NATURAL_PARK);
                            }
                        }
                    }
                }
            }
        }
    }

    public isAreaClearForFeature(startX: number, startY: number, sizeX: number, sizeY: number, allowedTypes: string[] = [TILE_TYPES.GRASS.id]): boolean {
        for (let y = startY; y < startY + sizeY; y++) {
            for (let x = startX; x < startX + sizeX; x++) {
                if (x < 0 || x >= C.GRID_SIZE_X || y < 0 || y >= C.GRID_SIZE_Y) return false;
                if (!this.grid[y] || !this.grid[y][x] || !allowedTypes.includes(this.grid[y][x].type.id)) return false;
            }
        }
        return true;
    }

    public getTile(x: number, y: number): GridTile | undefined {
        if (x >= 0 && x < C.GRID_SIZE_X && y >= 0 && y < C.GRID_SIZE_Y) {
            return this.grid[y][x];
        }
        return undefined;
    }

    public setTileType(x: number, y: number, tileType: TileType): void {
        if (this.grid[y] && this.grid[y][x]) {
            // Preserve some data if it's just a level change, or reset for entirely new type
            const oldTileData = this.grid[y][x];
            this.grid[y][x] = {
                ...this.createDefaultGridTile(tileType), // sets new defaults
                // Carry over relevant data if applicable (e.g. if oldTileData.type.zoneCategory === tileType.zoneCategory)
                // For now, we do a full reset which is safer with the new model.
                // Specific data like population might be set by the SimulationController after a level change.
            };
            
            // If it's a zone that just got placed, initialize population and level
            if (tileType.isDevelopableZone) {
                this.grid[y][x].population = 0;
            } else if (tileType.zoneCategory && tileType.level === 1) { // First level building
                 // Initial population for L1 buildings can be small, or 0 and let growth logic handle it
                 this.grid[y][x].population = tileType.populationCapacity ? Math.floor(tileType.populationCapacity / 4) : 1;
            }
        }
    }
    
    public clearTileData(x: number, y: number): void {
        const tile = this.getTile(x,y);
        if (tile) {
            // Reset to defaults for a grass tile essentially
            const grassTileDefaults = this.createDefaultGridTile(TILE_TYPES.GRASS);
            tile.population = grassTileDefaults.population;
            tile.tileValue = grassTileDefaults.tileValue;
            tile.pollution = grassTileDefaults.pollution;
            tile.hasRoadAccess = grassTileDefaults.hasRoadAccess;
            
            if (tile.developmentTimerId) {
                clearTimeout(tile.developmentTimerId);
                delete tile.developmentTimerId;
            }
        }
    }
}
