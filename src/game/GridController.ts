import { GridTile, TileType } from '../types';
import * as C from '../config/constants';
import { TILE_TYPES } from '../config/tileTypes'; // Ensure TILE_TYPES is imported

export class GridController {
    public grid: GridTile[][] = [];

    constructor() {
        this.initializeGrid();
    }

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
                const queue: { x: number; y: number }[] = [{x: seedX, y: seedY}];
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

    public isAreaClearForFeature(startX: number, startY: number, sizeX: number, sizeY: number, allowedTypes: string[] = [TILE_TYPES.GRASS.id]): boolean {
        for (let y = startY; y < startY + sizeY; y++) {
            for (let x = startX; x < startX + sizeX; x++) {
                if (x < 0 || x >= C.GRID_SIZE_X || y < 0 || y >= C.GRID_SIZE_Y) return false;
                if (!allowedTypes.includes(this.grid[y][x].type.id)) return false;
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
            this.grid[y][x].type = tileType;
        }
    }
    
    public clearTileData(x: number, y: number): void {
        const tile = this.getTile(x,y);
        if (tile) {
            delete tile.satisfactionData;
            delete tile.operationalData;
            if (tile.developmentTimerId) {
                clearTimeout(tile.developmentTimerId);
                delete tile.developmentTimerId;
            }
        }
    }
}
