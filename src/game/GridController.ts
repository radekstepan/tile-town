// src/game/GridController.ts
import { GridTile, TileType, Coordinates } from '../types';
import * as C from '../config/constants';
import { TILE_TYPES } from '../config/tileTypes';

export class GridController {
    public grid: GridTile[][] = [];
    public cityHallCoords: Coordinates | null = null;

    constructor(skipInitialGeneration: boolean = false) {
        if (skipInitialGeneration) {
            this.resetGridToGrass(); 
            if (typeof window === 'undefined') { 
                this.placeCityHall(Math.floor(C.GRID_SIZE_X / 2), Math.floor(C.GRID_SIZE_Y / 2) -2);
            }
        } else {
            this.initializeGrid();
        }
    }

    private createDefaultGridTile(tileType: TileType): GridTile {
        return {
            type: tileType,
            elevation: C.DEFAULT_ELEVATION,
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
        this.cityHallCoords = null; 
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.grid[y] = [];
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.grid[y][x] = this.createDefaultGridTile(TILE_TYPES.GRASS);
            }
        }
    }

    private placeCityHall(x: number, y: number): boolean {
        if (this.isValidCoordinate(x, y) && this.grid[y][x].type.id === TILE_TYPES.GRASS.id) { 
            const baseTileElevation = this.grid[y][x].elevation;
            this.setTileType(x, y, TILE_TYPES.CITY_HALL);
            this.grid[y][x].elevation = baseTileElevation; 
            this.cityHallCoords = { x, y };
            
            const roadOffsets = [{dx:0, dy:1}, {dx:1, dy:0}, {dx:0, dy:-1}, {dx:-1, dy:0}]; 
            let roadPlaced = false;
            for(const offset of roadOffsets) {
                const rx = x + offset.dx;
                const ry = y + offset.dy;
                const roadTile = this.getTile(rx,ry);
                if(this.isValidCoordinate(rx,ry) && roadTile && roadTile.type.id === TILE_TYPES.GRASS.id) {
                    const roadBaseElevation = roadTile.elevation;
                    this.setTileType(rx,ry, TILE_TYPES.ROAD);
                    this.grid[ry][rx].elevation = roadBaseElevation;
                    roadPlaced = true;
                    break; 
                }
                if(this.isValidCoordinate(rx,ry) && roadTile && roadTile.type.id === TILE_TYPES.ROAD.id) {
                    roadPlaced = true;
                    break;
                }
            }
            if (!roadPlaced) {
                console.warn(`City Hall placed at ${x},${y} but could not place an adjacent road for initial access.`);
            }
            return true;
        } else {
            return false;
        }
    }

    private generateTerrainElevation(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.getTile(x, y);
                if (tile) {
                    // Elevation rises as grid y DECREASES (towards screen top-right)
                    // and as grid x DECREASES (towards screen top-left)
                    // This creates a ramp from bottom-front (low elev) to top-back (high elev)
                    const normalizedY = (C.GRID_SIZE_Y - 1 - y) / (C.GRID_SIZE_Y - 1); // 1 at y=0 (top), 0 at y=GRID_SIZE_Y-1 (bottom)
                    const normalizedX = (C.GRID_SIZE_X - 1 - x) / (C.GRID_SIZE_X - 1); // 1 at x=0 (left), 0 at x=GRID_SIZE_X-1 (right)
                    
                    let combinedFactor = (normalizedY + normalizedX) / 2; // Average, ranges 0 to 1

                    tile.elevation = Math.floor(combinedFactor * C.MAX_ELEVATION_LEVEL);

                    if (tile.type.id === TILE_TYPES.WATER.id) { 
                        tile.elevation = 0;
                    }
                }
            }
        }
        // Smoothing pass
        for (let pass = 0; pass < 1; pass++) { 
            const tempElevations: number[][] = this.grid.map(row => row.map(tile => tile.elevation));
            for (let y = 0; y < C.GRID_SIZE_Y; y++) {
                for (let x = 0; x < C.GRID_SIZE_X; x++) {
                    if(this.grid[y][x].type.id === TILE_TYPES.WATER.id) continue;

                    let sumElev = tempElevations[y][x]; 
                    let count = 1;
                    const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                    for (const n of neighbors) {
                        const nx = x + n.dx;
                        const ny = y + n.dy;
                        if (this.isValidCoordinate(nx, ny) && this.grid[ny][nx].type.id !== TILE_TYPES.WATER.id) {
                            sumElev += tempElevations[ny][nx];
                            count++;
                        }
                    }
                    this.grid[y][x].elevation = Math.round(sumElev / count);
                    this.grid[y][x].elevation = Math.min(C.MAX_ELEVATION_LEVEL, Math.max(0, this.grid[y][x].elevation));
                }
            }
        }
    }


    private initializeGrid(): void {
        this.resetGridToGrass(); 

        if (typeof window !== 'undefined') { 
            this.generateTerrainElevation(); 
            this.generateWater();          
            this.generateMountains();      
            this.generateInitialParks();   
        }

        let cityHallX = Math.floor(C.GRID_SIZE_X / 2);
        let cityHallY = Math.floor(C.GRID_SIZE_Y / 2) - 2; 

        let chPlaced = false;
        // Try to place City Hall on a tile that's not too high or too low, preferentially
        // This is a simple heuristic; a more complex one might find an average elevation area.
        const idealElevation = Math.floor(C.MAX_ELEVATION_LEVEL / 3); 
        let bestSpot: {x: number, y: number, diff: number} | null = null;

        for (let y_ch = 0; y_ch < C.GRID_SIZE_Y; y_ch++) {
            for (let x_ch = 0; x_ch < C.GRID_SIZE_X; x_ch++) {
                const tile = this.getTile(x_ch, y_ch);
                if (tile && tile.type.id === TILE_TYPES.GRASS.id) {
                    const diff = Math.abs(tile.elevation - idealElevation);
                    if (!bestSpot || diff < bestSpot.diff) {
                        bestSpot = {x: x_ch, y: y_ch, diff: diff};
                    }
                }
            }
        }
        
        if (bestSpot && this.placeCityHall(bestSpot.x, bestSpot.y)) {
            chPlaced = true;
        } else { // Fallback to original placement if preferred spot fails
            for (let i = 0; i < 5; i++) { 
                const tryY = Math.max(0, cityHallY - i);
                const tryX = cityHallX;
                if (this.placeCityHall(tryX, tryY)) {
                    chPlaced = true;
                    break;
                }
            }
        }

        if (!chPlaced) { 
             if(!this.placeCityHall(Math.floor(C.GRID_SIZE_X / 2), Math.floor(C.GRID_SIZE_Y / 2))) {
                console.error("CRITICAL: Could not place City Hall even at map center.");
             }
        }
    }

    public generateTestTownLayout(): void {
        this.resetGridToGrass(); 
        this.generateTerrainElevation(); 

        const centerX = Math.floor(C.GRID_SIZE_X / 2);
        const centerY = Math.floor(C.GRID_SIZE_Y / 2);

        this.placeCityHall(centerX, centerY -3); 

        for (let i = -2; i <= 2; i++) { 
            if (this.isValidCoordinate(centerX + i, centerY - 1)) {
                const baseElev = this.getTile(centerX + i, centerY -1)!.elevation;
                this.setTileType(centerX + i, centerY - 1, TILE_TYPES.ROAD);
                this.getTile(centerX+i, centerY-1)!.elevation = baseElev;
            }
        }
        const chRoadY = (this.cityHallCoords?.y ?? centerY -3) +1; 
        const chRoadTile = this.getTile(centerX, chRoadY);
        if(this.isValidCoordinate(centerX, chRoadY) && chRoadTile && chRoadTile.type.id === TILE_TYPES.GRASS.id){
            const baseElev = chRoadTile.elevation;
            this.setTileType(centerX, chRoadY, TILE_TYPES.ROAD);
            this.getTile(centerX, chRoadY)!.elevation = baseElev;
        }
        for (let i = centerY - 2; i <= centerY; i++) { 
             if (this.isValidCoordinate(centerX, i )) {
                const baseElev = this.getTile(centerX, i)!.elevation;
                this.setTileType(centerX, i, TILE_TYPES.ROAD);
                this.getTile(centerX,i)!.elevation = baseElev;
             }
        }

        const setZoneWithElevation = (x: number, y: number, type: TileType) => {
            if (this.isValidCoordinate(x, y)) {
                const baseElev = this.getTile(x, y)!.elevation;
                this.setTileType(x, y, type);
                this.getTile(x, y)!.elevation = baseElev;
            }
        };

        setZoneWithElevation(centerX - 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        setZoneWithElevation(centerX + 1, centerY - 2, TILE_TYPES.RESIDENTIAL_ZONE);
        setZoneWithElevation(centerX - 2, centerY -1, TILE_TYPES.COMMERCIAL_ZONE);
        setZoneWithElevation(centerX + 2, centerY-1, TILE_TYPES.INDUSTRIAL_ZONE);
        setZoneWithElevation(centerX, centerY + 1, TILE_TYPES.PARK);
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
            } while (this.grid[seedY]?.[seedX]?.type.id !== TILE_TYPES.GRASS.id && attempts < 20); 

            if (this.grid[seedY]?.[seedX]?.type.id === TILE_TYPES.GRASS.id) {
                const rangeSize = Math.floor(Math.random() * 15) + 10; 
                let currentMountains = 0;
                const queue: { x: number; y: number }[] = [{x: seedX, y: seedY}];
                
                const baseElev = this.grid[seedY][seedX].elevation; 
                this.setTileType(seedX, seedY, TILE_TYPES.MOUNTAIN);
                this.grid[seedY][seedX].elevation = baseElev;
                currentMountains++;

                while(queue.length > 0 && currentMountains < rangeSize) {
                    const curr = queue.shift()!;
                    const neighbors = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
                    neighbors.sort(() => Math.random() - 0.5); 
                    for (const n of neighbors) {
                        const nx = curr.x + n.dx;
                        const ny = curr.y + n.dy;
                        if (this.isValidCoordinate(nx, ny) && this.grid[ny][nx].type.id === TILE_TYPES.GRASS.id) {
                            if (Math.random() < 0.6) { 
                                const nBaseElev = this.grid[ny][nx].elevation;
                                this.setTileType(nx, ny, TILE_TYPES.MOUNTAIN);
                                this.grid[ny][nx].elevation = nBaseElev;
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
        const riverLength = C.GRID_SIZE_Y + Math.floor(Math.random() * 10) + 5;
        let riverWidth = 1;
        if (Math.random() < 0.3) riverWidth = 2;

        for (let i = 0; i < riverLength; i++) {
            for (let w = 0; w < riverWidth; w++) {
                const placeX = currentX + w;
                 if (this.isValidCoordinate(placeX, currentY)) {
                     if (this.grid[currentY][placeX].type.id !== TILE_TYPES.WATER.id) { 
                        this.setTileType(placeX, currentY, TILE_TYPES.WATER);
                        
                        if (riverWidth === 1 && Math.random() < 0.15 && this.isValidCoordinate(placeX + 1, currentY) && this.grid[currentY][placeX+1].type.id !== TILE_TYPES.WATER.id) {
                            this.setTileType(placeX + 1, currentY, TILE_TYPES.WATER);
                        }
                        if (riverWidth === 1 && Math.random() < 0.15 && this.isValidCoordinate(placeX - 1, currentY) && this.grid[currentY][placeX-1].type.id !== TILE_TYPES.WATER.id) {
                             this.setTileType(placeX - 1, currentY, TILE_TYPES.WATER);
                        }
                     }
                }
            }
           
            currentY++;
            if (Math.random() < 0.4) { 
                currentX += (Math.random() < 0.5 ? 1 : -1);
                currentX = Math.max(0, Math.min(C.GRID_SIZE_X - riverWidth, currentX)); 
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
        const checkEndX = Math.min(C.GRID_SIZE_X - 1, startX + sizeX -1 + proximityRadius);
        const checkEndY = Math.min(C.GRID_SIZE_Y - 1, startY + sizeY -1 + proximityRadius);

        for (let y = checkStartY; y <= checkEndY; y++) {
            for (let x = checkStartX; x <= checkEndX; x++) {
                if (this.grid[y]?.[x]?.type.id === TILE_TYPES.WATER.id) {
                    const parkRect = {x1: startX, y1: startY, x2: startX + sizeX -1, y2: startY + sizeY -1};
                    const dx = Math.max(parkRect.x1 - x, 0, x - parkRect.x2);
                    const dy = Math.max(parkRect.y1 - y, 0, y - parkRect.y2);
                    if (dx <= proximityRadius && dy <= proximityRadius) {
                         return true;
                    }
                }
            }
        }
        return false;
    }

    private generateInitialParks(): void {
        const numParkClusters = Math.floor(Math.random() * 6) + 5;
        const waterProximityRadius = 2; 
        const attemptsPerParkForWater = 25;
        const fallbackMaxAttempts = 15; 

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
                            if (this.isValidCoordinate(x,y) && this.grid[y][x].type.id === TILE_TYPES.GRASS.id) { 
                                const baseElev = this.grid[y][x].elevation;
                                this.setTileType(x, y, TILE_TYPES.NATURAL_PARK);
                                this.grid[y][x].elevation = baseElev;
                            }
                        }
                    }
                    parkPlaced = true;
                    break; 
                }
            }

            if (!parkPlaced) {
                for (let attempt = 0; attempt < fallbackMaxAttempts; attempt++) {
                    const seedX = Math.floor(Math.random() * (C.GRID_SIZE_X - clusterSizeX));
                    const seedY = Math.floor(Math.random() * (C.GRID_SIZE_Y - clusterSizeY));
                    if (this.isAreaClearForFeature(seedX, seedY, clusterSizeX, clusterSizeY, [TILE_TYPES.GRASS.id])) {
                        for (let y = seedY; y < seedY + clusterSizeY; y++) {
                            for (let x = seedX; x < seedX + clusterSizeX; x++) {
                                if (this.isValidCoordinate(x,y) && this.grid[y][x].type.id === TILE_TYPES.GRASS.id) {
                                    const baseElev = this.grid[y][x].elevation;
                                    this.setTileType(x, y, TILE_TYPES.NATURAL_PARK);
                                    this.grid[y][x].elevation = baseElev;
                                }
                            }
                        }
                        break; 
                    }
                }
            }
        }
    }

    public isAreaClearForFeature(startX: number, startY: number, sizeX: number, sizeY: number, allowedTypes: string[] = [TILE_TYPES.GRASS.id]): boolean {
        for (let y = startY; y < startY + sizeY; y++) {
            for (let x = startX; x < startX + sizeX; x++) {
                if (!this.isValidCoordinate(x,y)) return false; 
                const tile = this.grid[y][x];
                if (!allowedTypes.includes(tile.type.id) || tile.type.isObstacle) return false;
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
            if (this.grid[y][x].type.id === TILE_TYPES.CITY_HALL.id && tileType.id !== TILE_TYPES.CITY_HALL.id) {
                return; 
            }
            if (tileType.id === TILE_TYPES.CITY_HALL.id && this.cityHallCoords && (this.cityHallCoords.x !== x || this.cityHallCoords.y !== y)) {
                console.warn("Attempted to place a second City Hall. Operation blocked.");
                return;
            }

            const oldTileData = this.grid[y][x];
            const newTileDefaults = this.createDefaultGridTile(tileType);
            
            this.grid[y][x] = {
                ...newTileDefaults, 
                elevation: oldTileData.elevation, 
                pollution: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? 0 : oldTileData.pollution,
                tileValue: (tileType.id === TILE_TYPES.GRASS.id || tileType.isObstacle) ? C.BASE_TILE_VALUE : oldTileData.tileValue,
                hasRoadAccess: oldTileData.hasRoadAccess, 
            };
            
            if (tileType.id === TILE_TYPES.WATER.id) {
                this.grid[y][x].elevation = 0; 
            }


            if (tileType.isDevelopableZone) {
                this.grid[y][x].population = 0;
            }
        }
    }

    public clearTileData(x: number, y: number): void {
        const tile = this.getTile(x,y);
        if (tile) {
            if (tile.type.id === TILE_TYPES.CITY_HALL.id) return;

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
