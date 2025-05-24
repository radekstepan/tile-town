import { GridTile, TileType } from '../types';
import * as C from '../config/constants';
import { TILE_TYPES } from '../config/tileTypes';

export class GridController {
    public grid: GridTile[][] = [];

    constructor(skipInitialGeneration: boolean = false) {
        if (skipInitialGeneration) {
            this.resetGridToGrass();
        } else {
            this.initializeGrid();
        }
    }

    private createDefaultGridTile(tileType: TileType): GridTile {
        return {
            type: tileType,
            population: 0,
            tileValue: C.BASE_TILE_VALUE,
            pollution: 0,
            hasRoadAccess: false,
            isVisuallyStruggling: false,
            struggleTicks: 0,
        };
    }
    
    public resetGridToGrass(): void {
        this.grid = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.grid[y] = [];
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.grid[y][x] = this.createDefaultGridTile(TILE_TYPES.GRASS);
            }
        }
    }

    private initializeGrid(): void {
        this.resetGridToGrass(); 

        let generateTestTown = false;
        // In a test environment (Node.js), 'window' is not defined.
        // Conditional logic for browser-specific features.
        if (typeof window !== 'undefined' && window.location && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('town') === 'true') {
                generateTestTown = true;
            }
        }
        
        if (generateTestTown) {
            this.generateTestTownLayout();
        } else {
            // Only run random generation if not skipping and not generating test town
            // This avoids random generation during most unit tests unless specifically desired.
            if (typeof window !== 'undefined') { // Assume random generation only makes sense in browser context
                this.generateMountains();
                this.generateWater();
                this.generateInitialParks();
            }
        }
    }

    // Made public for testing or direct use if needed
    public generateTestTownLayout(): void {
        // console.log("Generating Test Town Layout...");
        this.resetGridToGrass(); // Ensure clean slate for test town

        const centerX = Math.floor(C.GRID_SIZE_X / 2);
        const centerY = Math.floor(C.GRID_SIZE_Y / 2);

        for (let i = -2; i <= 2; i++) {
            if (this.isValidCoordinate(centerX + i, centerY - 1)) this.setTileType(centerX + i, centerY - 1, TILE_TYPES.ROAD);
            if (this.isValidCoordinate(centerX + i, centerY + 1)) this.setTileType(centerX + i, centerY + 1, TILE_TYPES.ROAD);
        }
        if (this.isValidCoordinate(centerX, centerY)) this.setTileType(centerX, centerY, TILE_TYPES.ROAD);

        if (this.isValidCoordinate(centerX - 1, centerY - 2)) this.setTileType(centerX - 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        if (this.isValidCoordinate(centerX,     centerY - 2)) this.setTileType(centerX,     centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        if (this.isValidCoordinate(centerX + 1, centerY - 2)) this.setTileType(centerX + 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        
        if (this.isValidCoordinate(centerX - 2, centerY)) this.setTileType(centerX - 2, centerY, TILE_TYPES.COMMERCIAL_ZONE);
        if (this.isValidCoordinate(centerX - 1, centerY)) this.setTileType(centerX - 1, centerY, TILE_TYPES.COMMERCIAL_ZONE);

        if (this.isValidCoordinate(centerX + 1, centerY)) this.setTileType(centerX + 1, centerY, TILE_TYPES.INDUSTRIAL_ZONE);
        if (this.isValidCoordinate(centerX + 2, centerY)) this.setTileType(centerX + 2, centerY, TILE_TYPES.INDUSTRIAL_ZONE);

        if (this.isValidCoordinate(centerX -1, centerY + 2)) this.setTileType(centerX -1, centerY + 2, TILE_TYPES.PARK);
        if (this.isValidCoordinate(centerX,    centerY + 2)) this.setTileType(centerX,    centerY + 2, TILE_TYPES.PARK);
        if (this.isValidCoordinate(centerX +1, centerY + 2)) this.setTileType(centerX +1, centerY + 2, TILE_TYPES.PARK);
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
            } while (this.grid[seedY]?.[seedX]?.type !== TILE_TYPES.GRASS && attempts < 10);

            if (this.grid[seedY]?.[seedX]?.type === TILE_TYPES.GRASS) {
                const rangeSize = Math.floor(Math.random() * 15) + 10;
                let currentMountains = 0;
                const queue: { x: number; y: number }[] = [{x: seedX, y: seedY}];
                this.setTileType(seedX, seedY, TILE_TYPES.MOUNTAIN);
                currentMountains++;

                while(queue.length > 0 && currentMountains < rangeSize) {
                    const curr = queue.shift()!;
                    const neighbors = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
                    neighbors.sort(() => Math.random() - 0.5);
                    for (const n of neighbors) {
                        const nx = curr.x + n.dx;
                        const ny = curr.y + n.dy;
                        if (this.isValidCoordinate(nx, ny) && this.grid[ny][nx].type === TILE_TYPES.GRASS) {
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
            if (this.isValidCoordinate(currentX, currentY)) {
                 if (this.grid[currentY][currentX].type !== TILE_TYPES.MOUNTAIN) {
                    this.setTileType(currentX, currentY, TILE_TYPES.WATER);
                    if (Math.random() < 0.3 && this.isValidCoordinate(currentX + 1, currentY) && this.grid[currentY][currentX+1].type !== TILE_TYPES.MOUNTAIN) this.setTileType(currentX + 1, currentY, TILE_TYPES.WATER);
                    if (Math.random() < 0.3 && this.isValidCoordinate(currentX - 1, currentY) && this.grid[currentY][currentX-1].type !== TILE_TYPES.MOUNTAIN) this.setTileType(currentX - 1, currentY, TILE_TYPES.WATER);
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
                if (this.grid[y]?.[x]?.type === TILE_TYPES.WATER) {
                    return true;
                }
            }
        }
        return false;
    }

    private generateInitialParks(): void {
        const numParkClusters = Math.floor(Math.random() * 10) + 10;
        const waterProximityRadius = 2;
        const attemptsPerParkForWater = 5;
        const fallbackMaxAttempts = 30;

        for (let i = 0; i < numParkClusters; i++) {
            const clusterSizeX = Math.floor(Math.random() * 2) + 1;
            const clusterSizeY = Math.floor(Math.random() * 2) + 1;
            let parkPlaced = false;

            for (let attempt = 0; attempt < attemptsPerParkForWater; attempt++) {
                const seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - clusterSizeX));
                const seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - clusterSizeY));

                if (this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id]) &&
                    this.isAreaNearWater(seedX, seedY, clusterSizeX, clusterSizeY, waterProximityRadius)) {

                    for (let y = seedY; y < seedY + clusterSizeY; y++) {
                        for (let x = seedX; x < seedX + clusterSizeX; x++) {
                            if (this.isValidCoordinate(x,y) && this.grid[y][x].type === TILE_TYPES.GRASS) {
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
                            if (this.isValidCoordinate(x,y) && this.grid[y][x].type === TILE_TYPES.GRASS) {
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
                if (!this.isValidCoordinate(x,y) || !allowedTypes.includes(this.grid[y][x].type.id)) return false;
            }
        }
        return true;
    }

    public getTile(x: number, y: number): GridTile | undefined {
        if (this.isValidCoordinate(x, y)) {
            return this.grid[y][x];
        }
        return undefined;
    }

    public setTileType(x: number, y: number, tileType: TileType): void {
        if (this.isValidCoordinate(x,y)) {
            const oldTileData = this.grid[y][x];
            this.grid[y][x] = {
                ...this.createDefaultGridTile(tileType),
                pollution: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? 0 : oldTileData.pollution,
                tileValue: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? C.BASE_TILE_VALUE : oldTileData.tileValue,
            };

            if (tileType.isDevelopableZone) {
                this.grid[y][x].population = 0;
            }
            else if (tileType.zoneCategory && tileType.level === 1 && tileType.populationCapacity) {
                 this.grid[y][x].population = Math.floor(tileType.populationCapacity / 2);
            }
        }
    }

    public clearTileData(x: number, y: number): void {
        const tile = this.getTile(x,y);
        if (tile) {
            const grassTileDefaults = this.createDefaultGridTile(TILE_TYPES.GRASS);
            tile.population = grassTileDefaults.population;
            tile.tileValue = grassTileDefaults.tileValue;
            tile.pollution = grassTileDefaults.pollution;
            tile.hasRoadAccess = grassTileDefaults.hasRoadAccess;
            tile.isVisuallyStruggling = grassTileDefaults.isVisuallyStruggling;
            tile.struggleTicks = grassTileDefaults.struggleTicks;

            if (tile.developmentTimerId) {
                clearTimeout(tile.developmentTimerId);
                delete tile.developmentTimerId;
            }
        }
    }

    private isValidCoordinate(x: number, y: number): boolean {
        return x >= 0 && x < C.GRID_SIZE_X && y >= 0 && y < C.GRID_SIZE_Y && this.grid[y] !== undefined;
    }
}
