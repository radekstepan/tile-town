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
                // Initialize with grass, properties will be set by setTileType or generate methods
                this.grid[y][x] = this.createDefaultGridTile(TILE_TYPES.GRASS);
            }
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('town') === 'true') {
            this.generateTestTownLayout();
        } else {
            this.generateMountains();
            this.generateWater();
            this.generateInitialParks();
        }
    }

    private generateTestTownLayout(): void {
        console.log("Generating Test Town Layout...");
        // Ensure grid is clean grass first
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.setTileType(x, y, TILE_TYPES.GRASS);
                this.clearTileData(x, y); // Resets population, etc.
            }
        }

        const centerX = Math.floor(C.GRID_SIZE_X / 2);
        const centerY = Math.floor(C.GRID_SIZE_Y / 2);

        // Define a small RCI cluster
        // R R R
        // Road Road Road Road Road
        // C C C Road I I I
        // Road Road Road Road Road
        // P P P

        // Roads
        for (let i = -2; i <= 2; i++) {
            this.setTileType(centerX + i, centerY - 1, TILE_TYPES.ROAD); // Road above C/I
            this.setTileType(centerX + i, centerY + 1, TILE_TYPES.ROAD); // Road below C/I
        }
        this.setTileType(centerX, centerY, TILE_TYPES.ROAD); // Central road connecting R to C/I row

        // Residential (3 tiles above the main road)
        this.setTileType(centerX - 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        this.setTileType(centerX,     centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        this.setTileType(centerX + 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);

        // Commercial (3 tiles on the main C/I row)
        this.setTileType(centerX - 2, centerY, TILE_TYPES.COMMERCIAL_ZONE);
        this.setTileType(centerX - 1, centerY, TILE_TYPES.COMMERCIAL_ZONE);
        // this.setTileType(centerX, centerY, TILE_TYPES.COMMERCIAL_ZONE); // This is a road

        // Industrial (2 tiles on the main C/I row, further from R)
        this.setTileType(centerX + 1, centerY, TILE_TYPES.INDUSTRIAL_ZONE);
        this.setTileType(centerX + 2, centerY, TILE_TYPES.INDUSTRIAL_ZONE);

        // Park (below the lower road, near residential conceptually)
        this.setTileType(centerX -1, centerY + 2, TILE_TYPES.PARK);
        this.setTileType(centerX,    centerY + 2, TILE_TYPES.PARK);
        this.setTileType(centerX +1, centerY + 2, TILE_TYPES.PARK);

        // Note: The simulation will need a few ticks for these zones to develop into L1 buildings.
        // The road access flags and initial populations will be handled by the simulation controller.
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
                this.setTileType(seedX, seedY, TILE_TYPES.MOUNTAIN);
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
            const oldTileData = this.grid[y][x];
            this.grid[y][x] = {
                ...this.createDefaultGridTile(tileType),
                // Preserve pollution and tile value if it's not a totally new placement like grass
                pollution: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? 0 : oldTileData.pollution,
                tileValue: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? C.BASE_TILE_VALUE : oldTileData.tileValue,
            };

            if (tileType.isDevelopableZone) {
                this.grid[y][x].population = 0;
            }
            // Initial population for L1 buildings being directly placed (e.g. by a scenario, not through simulation growth)
            // This part is less critical now as `changeTileLevel` handles sim-driven L1 pop.
            else if (tileType.zoneCategory && tileType.level === 1 && tileType.populationCapacity) {
                 this.grid[y][x].population = Math.floor(tileType.populationCapacity / 2); // Start with half capacity
            }
        }
    }

    public clearTileData(x: number, y: number): void {
        const tile = this.getTile(x,y);
        if (tile) {
            const grassTileDefaults = this.createDefaultGridTile(TILE_TYPES.GRASS);
            tile.population = grassTileDefaults.population;
            tile.tileValue = grassTileDefaults.tileValue; // Reset tile value for cleared land
            tile.pollution = grassTileDefaults.pollution; // Reset pollution for cleared land
            tile.hasRoadAccess = grassTileDefaults.hasRoadAccess;

            if (tile.developmentTimerId) {
                clearTimeout(tile.developmentTimerId);
                delete tile.developmentTimerId;
            }
            tile.isVisuallyStruggling = false;
            tile.struggleTicks = 0;
        }
    }
}
