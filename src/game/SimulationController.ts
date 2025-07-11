import { GridTile, TileType } from '../types';
import { TILE_TYPES } from '../config/tileTypes';
import * as C from '../config/constants';
import { GridController } from './GridController';
import { Game } from './Game';

type ZoneCategoryType = 'residential' | 'commercial' | 'industrial';

interface QueueNode {
    x: number;
    y: number;
    // path: {x: number, y: number}[]; 
}


export class SimulationController {
    private gridController: GridController;
    private gameInstance: Game;

    private pollutionMap: number[][] = [];
    private waterPollutionMap: number[][] = [];
    private tileValueMap: number[][] = [];

    constructor(gridController: GridController, gameInstance: Game) {
        this.gridController = gridController;
        this.gameInstance = gameInstance;
        this.initializeMaps();
    }

    private initializeMaps(): void {
        this.pollutionMap = [];
        this.waterPollutionMap = [];
        this.tileValueMap = [];
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            this.pollutionMap[y] = new Array(C.GRID_SIZE_X).fill(0);
            this.waterPollutionMap[y] = new Array(C.GRID_SIZE_X).fill(0);
            this.tileValueMap[y] = new Array(C.GRID_SIZE_X).fill(C.BASE_TILE_VALUE);
        }
    }
    
    public resetMaps(): void { 
        this.initializeMaps();
    }

    public processGameTick(): { taxes: number, costs: number, net: number } {
        this.updateCityTotalPopulation();

        this._updatePollutionSystem(); 
        this.updateTileValueMap();    
        this.updateRoadAccessFlags(); 

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const gridCell = this.gridController.getTile(x, y);
                if (gridCell) {
                    gridCell.pollution = this.pollutionMap[y][x];
                    gridCell.tileValue = this.tileValueMap[y][x];
                }
            }
        }
        
        this.updateZoneGrowthAndDecline(); 

        return this.calculateFinancesAndGlobalMetrics(); 
    }

    private updateCityTotalPopulation(): void {
        let cityTotalPopulation = 0;
        for (let y_coord = 0; y_coord < C.GRID_SIZE_Y; y_coord++) {
            for (let x_coord = 0; x_coord < C.GRID_SIZE_X; x_coord++) {
                const tile = this.gridController.getTile(x_coord, y_coord);
                if (tile && tile.type.zoneCategory === 'residential' && this.isConnectedToCityHall(x_coord, y_coord)) {
                    cityTotalPopulation += tile.population;
                }
            }
        }
        this.gameInstance.totalPopulation = cityTotalPopulation;
    }


    public _updatePollutionSystem(): void {
        const tempLandPollutionMap: number[][] = this.pollutionMap.map(arr => [...arr]);
        const tempWaterPollutionMap: number[][] = this.waterPollutionMap.map(arr => [...arr]);

        this._decayPollution(tempLandPollutionMap, C.POLLUTION_DECAY_FACTOR);
        this._decayPollution(tempWaterPollutionMap, C.WATER_POLLUTION_DECAY_FACTOR);
        this._generateIndustrialPollution(tempLandPollutionMap, tempWaterPollutionMap);
        this._spreadPollutionInWater(tempWaterPollutionMap);
        this._transferPollutionFromWaterToLand(tempWaterPollutionMap, tempLandPollutionMap);
        this._spreadPollutionOnLand(tempLandPollutionMap);
        this._applyParkReduction(tempLandPollutionMap); 

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                this.pollutionMap[y][x] = Math.max(0, Math.min(C.MAX_POLLUTION, tempLandPollutionMap[y][x]));
                this.waterPollutionMap[y][x] = Math.max(0, Math.min(C.MAX_POLLUTION, tempWaterPollutionMap[y][x]));
            }
        }
    }

    private _decayPollution(map: number[][], decayFactor: number): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                map[y][x] *= decayFactor;
            }
        }
    }

    private _generateIndustrialPollution(landMap: number[][], waterMap: number[][]): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x, y);
                if (tile && tile.type.zoneCategory === 'industrial' && tile.type.level && tile.type.level > 0 && tile.population > 0) {
                    if (!this.isConnectedToCityHall(x,y)) continue; 

                    const pollutionGenerated = tile.population * C.POLLUTION_PER_INDUSTRIAL_POPULATION_UNIT;
                    landMap[y][x] += pollutionGenerated;
                    const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
                    for (const n of neighbors) {
                        const nx = x + n.dx;
                        const ny = y + n.dy;
                        if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                            const neighborTile = this.gridController.getTile(nx, ny);
                            if (neighborTile && neighborTile.type.id === TILE_TYPES.WATER.id) {
                                waterMap[ny][nx] += pollutionGenerated * C.INDUSTRIAL_POLLUTION_TRANSFER_TO_WATER_FACTOR;
                            }
                        }
                    }
                }
            }
        }
    }

    private _spreadPollutionInWater(waterMap: number[][]): void {
        const nextWaterPollutionMap = waterMap.map(arr => [...arr]);
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (!tile || tile.type.id !== TILE_TYPES.WATER.id) continue;
                let neighborWaterPollutionSum = 0;
                let waterNeighborCount = 0;
                const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
                for (const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;
                    if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                        const neighborTile = this.gridController.getTile(nx, ny);
                        if (neighborTile && neighborTile.type.id === TILE_TYPES.WATER.id) {
                            neighborWaterPollutionSum += waterMap[ny][nx];
                            waterNeighborCount++;
                        }
                    }
                }
                if (waterNeighborCount > 0) {
                    const avgNeighborPollution = neighborWaterPollutionSum / waterNeighborCount;
                    const currentPollution = waterMap[y][x];
                    nextWaterPollutionMap[y][x] = (currentPollution * (1 - C.WATER_POLLUTION_SPREAD_FACTOR)) + (avgNeighborPollution * C.WATER_POLLUTION_SPREAD_FACTOR);
                }
            }
        }
        for (let y = 0; y < C.GRID_SIZE_Y; y++) waterMap[y] = [...nextWaterPollutionMap[y]];
    }

    private _transferPollutionFromWaterToLand(waterMap: number[][], landMap: number[][]): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y);
                if (tile && tile.type.id === TILE_TYPES.WATER.id && waterMap[y][x] > 0.1) {
                    const waterPollutionSource = waterMap[y][x];
                    for (let dy_offset = -C.WATER_POLLUTION_AFFECTS_LAND_RADIUS; dy_offset <= C.WATER_POLLUTION_AFFECTS_LAND_RADIUS; dy_offset++) {
                        for (let dx_offset = -C.WATER_POLLUTION_AFFECTS_LAND_RADIUS; dx_offset <= C.WATER_POLLUTION_AFFECTS_LAND_RADIUS; dx_offset++) {
                            if (dx_offset === 0 && dy_offset === 0) continue;
                            const dist = Math.sqrt(dx_offset * dx_offset + dy_offset * dy_offset);
                            if (dist <= C.WATER_POLLUTION_AFFECTS_LAND_RADIUS) {
                                const nx = x + dx_offset;
                                const ny = y + dy_offset;
                                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                                    const targetTile = this.gridController.getTile(nx, ny);
                                    if (targetTile && targetTile.type.id !== TILE_TYPES.WATER.id && !targetTile.type.isObstacle) {
                                        landMap[ny][nx] += (waterPollutionSource * C.WATER_POLLUTION_TO_LAND_FACTOR) / (dist + 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private _spreadPollutionOnLand(landMap: number[][]): void {
        const nextLandPollutionMap = landMap.map(arr => [...arr]);
        const numCardinalNeighbors = 4.0;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const currentTile = this.gridController.getTile(x,y);
                if (!currentTile || currentTile.type.isObstacle) {
                    if(currentTile && currentTile.type.isObstacle) nextLandPollutionMap[y][x] = 0;
                    continue;
                }
                let neighborPollutionSum = 0;
                let effectiveNeighborCountForSpread = 0;
                let adjacentMountainCount = 0;
                const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
                for (const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dy;
                    if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                        const neighborTile = this.gridController.getTile(nx, ny);
                        if (neighborTile) {
                            if (neighborTile.type.isObstacle) { adjacentMountainCount++; }
                            else if (neighborTile.type.id === TILE_TYPES.PARK.id || neighborTile.type.id === TILE_TYPES.NATURAL_PARK.id) {
                                neighborPollutionSum += landMap[ny][nx] * C.PARK_SPREAD_DAMPENING_FACTOR;
                                effectiveNeighborCountForSpread++;
                            } else {
                                neighborPollutionSum += landMap[ny][nx];
                                effectiveNeighborCountForSpread++;
                            }
                        }
                    }
                }
                const currentPollution = landMap[y][x];
                let diffusedPollution = currentPollution;
                if (effectiveNeighborCountForSpread > 0) {
                    const avgNeighborPollution = neighborPollutionSum / effectiveNeighborCountForSpread;
                    diffusedPollution = (currentPollution * (1 - C.POLLUTION_SPREAD_FACTOR)) + (avgNeighborPollution * C.POLLUTION_SPREAD_FACTOR);
                }
                if (adjacentMountainCount > 0 && currentPollution > 0.1) {
                    const reflectedAmount = currentPollution * C.POLLUTION_SPREAD_FACTOR * C.MOUNTAIN_POLLUTION_REFLECTION_FACTOR * (adjacentMountainCount / numCardinalNeighbors);
                    diffusedPollution += reflectedAmount;
                }
                nextLandPollutionMap[y][x] = diffusedPollution;
            }
        }
        for (let y = 0; y < C.GRID_SIZE_Y; y++) landMap[y] = [...nextLandPollutionMap[y]];
    }

    private _applyParkReduction(landMap: number[][]): void { 
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x, y);
                if (tile && (tile.type.id === TILE_TYPES.PARK.id || tile.type.id === TILE_TYPES.NATURAL_PARK.id)) {
                    for (let dy_offset = -C.PARK_POLLUTION_REDUCTION_RADIUS; dy_offset <= C.PARK_POLLUTION_REDUCTION_RADIUS; dy_offset++) {
                        for (let dx_offset = -C.PARK_POLLUTION_REDUCTION_RADIUS; dx_offset <= C.PARK_POLLUTION_REDUCTION_RADIUS; dx_offset++) {
                            const dist = Math.abs(dx_offset) + Math.abs(dy_offset);
                            if (dist <= C.PARK_POLLUTION_REDUCTION_RADIUS) {
                                const nx = x + dx_offset;
                                const ny = y + dy_offset;
                                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                                    const targetTile = this.gridController.getTile(nx,ny);
                                    if(targetTile && !targetTile.type.isObstacle) {
                                        landMap[ny][nx] -= C.PARK_POLLUTION_REDUCTION_AMOUNT / (dist + 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public updateTileValueMap(): void { 
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                let currentValue = C.BASE_TILE_VALUE;
                const tileBeingEvaluated = this.gridController.getTile(x, y);

                // City Hall Influence
                if (this.gridController.cityHallCoords) {
                    const chX = this.gridController.cityHallCoords.x;
                    const chY = this.gridController.cityHallCoords.y;
                    const distToCH = Math.sqrt(Math.pow(x - chX, 2) + Math.pow(y - chY, 2));
                    if (distToCH <= C.CITY_HALL_INFLUENCE_RADIUS) {
                        currentValue += C.CITY_HALL_TILE_VALUE_BONUS * (1 - distToCH / (C.CITY_HALL_INFLUENCE_RADIUS + 1));
                    }
                }

                const maxInfluenceRadius = Math.max(C.WATER_INFLUENCE_RADIUS, C.PARK_INFLUENCE_RADIUS);
                for (let dy_influence = -maxInfluenceRadius; dy_influence <= maxInfluenceRadius; dy_influence++) {
                    for (let dx_influence = -maxInfluenceRadius; dx_influence <= maxInfluenceRadius; dx_influence++) {
                        const neighborX = x + dx_influence;
                        const neighborY = y + dy_influence;

                        if (neighborX >= 0 && neighborX < C.GRID_SIZE_X && neighborY >= 0 && neighborY < C.GRID_SIZE_Y) {
                            const neighborTile = this.gridController.getTile(neighborX, neighborY);
                            if (neighborTile) {
                                const dist = Math.sqrt(dx_influence * dx_influence + dy_influence * dy_influence);
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

                const directNeighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
                for (const n of directNeighbors) {
                    const neighborX = x + n.dx;
                    const neighborY = y + n.dy;
                    if (neighborX >= 0 && neighborX < C.GRID_SIZE_X && neighborY >= 0 && neighborY < C.GRID_SIZE_Y) {
                        const neighborTile = this.gridController.getTile(neighborX, neighborY);
                        if (neighborTile) {
                            if (neighborTile.type.id === 'mountain') currentValue += C.MOUNTAIN_TILE_VALUE_BONUS;
                            if (neighborTile.type.id === 'road') currentValue += C.ROAD_ADJACENCY_TILE_VALUE_BONUS;
                            
                            if (tileBeingEvaluated?.type.zoneCategory === 'residential') {
                                if (neighborTile.type.zoneCategory === 'commercial') currentValue += C.R_NEAR_C_BONUS;
                                if (neighborTile.type.zoneCategory === 'industrial') currentValue += C.R_NEAR_I_PENALTY;
                            } else if (tileBeingEvaluated?.type.zoneCategory === 'commercial') {
                                if (neighborTile.type.zoneCategory === 'industrial') currentValue += C.C_NEAR_I_BONUS;
                            }
                        }
                    }
                }

                let pollutionDebuffMultiplier = C.POLLUTION_TO_TILE_VALUE_MULTIPLIER;
                if (tileBeingEvaluated?.type.zoneCategory === 'industrial') {
                    pollutionDebuffMultiplier = C.INDUSTRIAL_ZONE_POLLUTION_TO_OWN_TILE_VALUE_MULTIPLIER;
                }
                currentValue += this.pollutionMap[y][x] * pollutionDebuffMultiplier;
                
                this.tileValueMap[y][x] = Math.max(0, Math.min(C.MAX_TILE_VALUE, currentValue));
            }
        }
    }

    private updateRoadAccessFlags(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x, y);
                if (tile && (tile.type.isDevelopableZone || tile.type.zoneCategory || tile.type.id === TILE_TYPES.CITY_HALL.id)) {
                    tile.hasRoadAccess = this.checkDirectRoadAccess(x, y);
                } else if (tile) {
                    tile.hasRoadAccess = false;
                }
            }
        }
    }

    private checkDirectRoadAccess(gridX: number, gridY: number): boolean {
        const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        for (const neighbor of neighbors) {
            const nx = gridX + neighbor.dx;
            const ny = gridY + neighbor.dy;
            if (this.gridController.getTile(nx, ny)?.type.id === TILE_TYPES.ROAD.id) return true;
        }
        return false;
    }

    private hasRoadPath(startX: number, startY: number, endX: number, endY: number): boolean {
        const startTile = this.gridController.getTile(startX, startY);
        const endTile = this.gridController.getTile(endX, endY);

        if (!startTile || !endTile) return false;
        
        const queue: QueueNode[] = [];
        const visited: boolean[][] = Array(C.GRID_SIZE_Y).fill(false).map(() => Array(C.GRID_SIZE_X).fill(false));
        const roadOffsets = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

        if (startTile.type.id === TILE_TYPES.ROAD.id) {
            queue.push({ x: startX, y: startY });
            visited[startY][startX] = true;
        } else if (startTile.hasRoadAccess) {
            for (const offset of roadOffsets) {
                const roadX = startX + offset.dx;
                const roadY = startY + offset.dy;
                const roadTile = this.gridController.getTile(roadX, roadY);
                if (roadTile && roadTile.type.id === TILE_TYPES.ROAD.id && !visited[roadY][roadX]) {
                    queue.push({ x: roadX, y: roadY });
                    visited[roadY][roadX] = true;
                }
            }
        }
         if (queue.length === 0) return false;


        while (queue.length > 0) {
            const current = queue.shift()!; 

            if (endTile.type.id !== TILE_TYPES.ROAD.id) {
                for (const offset of roadOffsets) {
                    if (current.x + offset.dx === endX && current.y + offset.dy === endY) {
                        return true; 
                    }
                }
            } else { 
                if (current.x === endX && current.y === endY) return true;
            }


            for (const offset of roadOffsets) {
                const nextX = current.x + offset.dx;
                const nextY = current.y + offset.dy;

                if (nextX >= 0 && nextX < C.GRID_SIZE_X && nextY >= 0 && nextY < C.GRID_SIZE_Y && !visited[nextY][nextX]) {
                    const nextTile = this.gridController.getTile(nextX, nextY);
                    if (nextTile && nextTile.type.id === TILE_TYPES.ROAD.id) { 
                        visited[nextY][nextX] = true;
                        queue.push({ x: nextX, y: nextY });
                    }
                }
            }
        }
        return false; 
    }

    private isConnectedToCityHall(tileX: number, tileY: number): boolean {
        if (!this.gridController.cityHallCoords) return false; 
        const tile = this.gridController.getTile(tileX, tileY);
        if (!tile) return false;
        if (tile.type.id === TILE_TYPES.CITY_HALL.id) return tile.hasRoadAccess;
        return this.hasRoadPath(tileX, tileY, this.gridController.cityHallCoords.x, this.gridController.cityHallCoords.y);
    }


    public scanRadiusForAttribute(
        centerX: number, centerY: number, radius: number,
        targetCategory: ZoneCategoryType | ZoneCategoryType[], 
        attributeGetter: (tile: GridTile) => number,
        roadConnectedOnly: boolean, 
        scaleByEfficiency: boolean = false 
    ): number {
        let totalValue = 0;
        const categories = Array.isArray(targetCategory) ? targetCategory : [targetCategory];
        const sourceTile = this.gridController.getTile(centerX, centerY);

        if (!sourceTile) return 0;
        
        if (roadConnectedOnly && sourceTile.type.id !== TILE_TYPES.CITY_HALL.id && !this.isConnectedToCityHall(centerX, centerY)) {
            return 0;
        }

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue; 
                const nx = centerX + dx;
                const ny = centerY + dy;

                if (nx >= 0 && nx < C.GRID_SIZE_X && ny >= 0 && ny < C.GRID_SIZE_Y) {
                    const targetTile = this.gridController.getTile(nx, ny);

                    if (targetTile && targetTile.type.zoneCategory && categories.includes(targetTile.type.zoneCategory) && targetTile.type.level && targetTile.type.level > 0) {
                        let isEffectivelyConnected = !roadConnectedOnly; 
                        if (roadConnectedOnly) {
                            if (targetTile.type.id !== TILE_TYPES.CITY_HALL.id && !this.isConnectedToCityHall(nx, ny)){
                                isEffectivelyConnected = false;
                            } else {
                                isEffectivelyConnected = this.hasRoadPath(centerX, centerY, nx, ny);
                            }
                        }

                        if (isEffectivelyConnected) {
                            let value = attributeGetter(targetTile);
                            if (scaleByEfficiency && (targetTile.type.zoneCategory === 'commercial' || targetTile.type.zoneCategory === 'industrial')) {
                                let efficiency = 0; 
                                if (targetTile.type.populationCapacity && targetTile.type.populationCapacity > 0 && targetTile.population > 0) {
                                    const baseEfficiency = 0.4; 
                                    const scalingFactor = 0.6;
                                    efficiency = baseEfficiency + scalingFactor * (targetTile.population / targetTile.type.populationCapacity);
                                    efficiency = Math.max(0, Math.min(1, efficiency));
                                }
                                value *= efficiency;
                            }
                            totalValue += value;
                        }
                    }
                }
            }
        }
        return totalValue;
    }


    private updateZoneGrowthAndDecline(): void {
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x, y);
                if (!tile || tile.type.id === TILE_TYPES.CITY_HALL.id) continue; 

                let isRCIZoneOrBuilding = !!tile.type.zoneCategory || tile.type.isDevelopableZone;
                
                if (isRCIZoneOrBuilding) {
                    const connectedToCH = this.isConnectedToCityHall(x, y);
                    if (!connectedToCH) {
                        if (tile.type.level && tile.type.level > 0 && tile.type.revertsTo) { 
                            tile.population = Math.max(0, tile.population - C.R_DECLINE_POPULATION_RATE); 
                             if (tile.population <= 0) {
                                tile.population = 0; 
                                this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.revertsTo]);
                             }
                        }
                        this.updateStruggleVisuals(tile, true); 
                        continue; 
                    }
                    // If it is connected, then specific RCI logic applies
                     if (tile.type.zoneCategory === 'residential') {
                        this.processResidentialGrowth(tile, x, y);
                    } else if (tile.type.zoneCategory === 'commercial') {
                        this.processCommercialGrowth(tile, x, y);
                    } else if (tile.type.zoneCategory === 'industrial') {
                        this.processIndustrialGrowth(tile, x, y);
                    }
                } else {
                     // For non-RCI tiles (like Park, Water, Mountain), reset struggle if it was somehow set
                     if(tile.isVisuallyStruggling) this.updateStruggleVisuals(tile, false);
                }
            }
        }
    }

    private updateStruggleVisuals(tile: GridTile, isCurrentlyStruggling: boolean): void {
        if (isCurrentlyStruggling) {
            tile.struggleTicks = (tile.struggleTicks || 0) + 1;
        } else {
            tile.struggleTicks = 0;
            if (tile.isVisuallyStruggling) tile.isVisuallyStruggling = false;
        }

        if (tile.struggleTicks >= C.STRUGGLE_VISUAL_THRESHOLD_TICKS) {
            if (!tile.isVisuallyStruggling) tile.isVisuallyStruggling = true;
        } else if (!isCurrentlyStruggling && tile.isVisuallyStruggling) {
            tile.isVisuallyStruggling = false;
        }
    }

    private processResidentialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue;
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) { 
            shouldDecline = true;
        } else { 
            const jobAccessScore = this.scanRadiusForAttribute(x, y, C.CONNECTIVITY_RADIUS, ['commercial', 'industrial'],
                (t) => { 
                    let actualJobs = 0;
                    if (t.type.jobsProvided && t.type.populationCapacity && t.type.populationCapacity > 0 && t.population > 0) {
                        const baseEfficiency = 0.4;
                        const scalingFactor = 0.6;
                        const efficiency = baseEfficiency + scalingFactor * (t.population / t.type.populationCapacity);
                        actualJobs = (t.type.jobsProvided || 0) * Math.max(0, Math.min(1, efficiency));
                    } else if (t.type.jobsProvided && t.population > 0) {
                         actualJobs = t.type.jobsProvided;
                    }
                    return actualJobs;
                }, true, false);  

            const growthFactor = desirability + jobAccessScore - (tile.population * C.R_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) { 
                 if (!this.isConnectedToCityHall(x,y)) return; 
                if (growthFactor > C.R_GROWTH_THRESHOLD / 2 && desirability > C.R_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    return;
                }
            } else if (tile.type.level && tile.type.level > 0) { 
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
            if (tile.type.populationCapacity && tile.population >= tile.type.populationCapacity) {
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
                }
            }
        }
        if (tile.population < 0) tile.population = 0;
        if (tile.type.populationCapacity && tile.population > tile.type.populationCapacity) tile.population = tile.type.populationCapacity;

        let isLocallyStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.tileValue < C.R_VISUAL_STRUGGLE_TILE_VALUE_THRESHOLD) isLocallyStruggling = true;
        this.updateStruggleVisuals(tile, isLocallyStruggling || !this.isConnectedToCityHall(x,y));
    }

    private processCommercialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue;
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) {
            shouldDecline = true;
        } else {
            if (tile.type.isDevelopableZone && !tile.type.level) { 
                if (this.gameInstance.totalPopulation === 0 || !this.isConnectedToCityHall(x,y)) return; 
            }

            const customerAccessScore = this.scanRadiusForAttribute(x, y, C.CONNECTIVITY_RADIUS, 'residential',
                (t) => t.population, true, false); 
            const goodsAccessScore = this.scanRadiusForAttribute(x, y, C.CONNECTIVITY_RADIUS, 'industrial',
                (t) => t.population, true, true); 

            const growthFactor = desirability + customerAccessScore + goodsAccessScore - (tile.population * C.C_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) { 
                if (growthFactor > C.C_GROWTH_THRESHOLD / 2 && desirability > C.C_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    return;
                }
            } else if (tile.type.level && tile.type.level > 0) { 
                if (growthFactor > C.C_GROWTH_THRESHOLD && desirability > C.C_MIN_DESIRABILITY_FOR_GROWTH) {
                    shouldGrow = true;
                }
                if (desirability < C.C_DECLINE_DESIRABILITY_THRESHOLD || customerAccessScore < C.C_MIN_CUSTOMER_SCORE_FOR_NO_DECLINE || goodsAccessScore < C.C_MIN_GOODS_ACCESS_FOR_NO_DECLINE) {
                    shouldDecline = true;
                }
            }
        }

        if (shouldGrow && !shouldDecline) {
            tile.population += C.C_GROWTH_POPULATION_RATE;
            if (tile.type.populationCapacity && tile.population >= tile.type.populationCapacity) {
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

        let isLocallyStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.type.populationCapacity && tile.type.populationCapacity > 0 && (tile.population / tile.type.populationCapacity) < C.CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD) isLocallyStruggling = true;
        this.updateStruggleVisuals(tile, isLocallyStruggling || !this.isConnectedToCityHall(x,y));
    }

    private processIndustrialGrowth(tile: GridTile, x: number, y: number): void {
        const desirability = tile.tileValue; 
        let shouldGrow = false;
        let shouldDecline = false;

        if (!tile.hasRoadAccess) {
            shouldDecline = true;
        } else {
             if (tile.type.isDevelopableZone && !tile.type.level) { 
                if (this.gameInstance.totalPopulation === 0 || !this.isConnectedToCityHall(x,y)) return;
            }

            const workerAccessScore = this.scanRadiusForAttribute(x, y, C.CONNECTIVITY_RADIUS, 'residential',
                (t) => t.population, true, false); 
            const marketAccessScore = this.scanRadiusForAttribute(x, y, C.CONNECTIVITY_RADIUS, 'commercial',
                (t) => t.population, true, true); 

            const growthFactor = desirability + workerAccessScore + marketAccessScore - (tile.population * C.I_DENSITY_PENALTY_FACTOR);

            if (tile.type.isDevelopableZone && !tile.type.level) { 
                if (growthFactor > C.I_GROWTH_THRESHOLD / 2 && desirability > C.I_MIN_DESIRABILITY_FOR_GROWTH / 2 && tile.type.developsInto && TILE_TYPES[tile.type.developsInto]) {
                    this.changeTileLevel(tile, x, y, TILE_TYPES[tile.type.developsInto]);
                    return;
                }
            } else if (tile.type.level && tile.type.level > 0) { 
                if (growthFactor > C.I_GROWTH_THRESHOLD && desirability > C.I_MIN_DESIRABILITY_FOR_GROWTH) {
                    shouldGrow = true;
                }
                if (desirability < C.I_DECLINE_DESIRABILITY_THRESHOLD || workerAccessScore < C.I_MIN_WORKER_SCORE_FOR_NO_DECLINE || marketAccessScore < C.I_MIN_MARKET_ACCESS_FOR_NO_DECLINE) {
                    shouldDecline = true;
                }
            }
        }

        if (shouldGrow && !shouldDecline) {
            tile.population += C.I_GROWTH_POPULATION_RATE;
            if (tile.type.populationCapacity && tile.population >= tile.type.populationCapacity) {
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

        let isLocallyStruggling = false;
        if (tile.type.level && tile.type.level > 0 && tile.type.populationCapacity && tile.type.populationCapacity > 0 && (tile.population / tile.type.populationCapacity) < C.CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD) isLocallyStruggling = true;
        this.updateStruggleVisuals(tile, isLocallyStruggling || !this.isConnectedToCityHall(x,y));
    }

    private changeTileLevel(tile: GridTile, x: number, y: number, newType: TileType): void {
        if (!newType || tile.type.id === newType.id) return;

        const oldType = tile.type;
        const oldPopulation = tile.population; 
        this.gridController.setTileType(x, y, newType); 

        const newGridTileState = this.gridController.getTile(x, y)!; 

        newGridTileState.pollution = tile.pollution; 
        newGridTileState.tileValue = tile.tileValue; 
        newGridTileState.hasRoadAccess = tile.hasRoadAccess;
        newGridTileState.isVisuallyStruggling = false;
        newGridTileState.struggleTicks = 0;
        
        let initialPopOnUpgrade = 0;

        if (newType.isDevelopableZone && !newType.level) { 
            newGridTileState.population = 0;
        } else if (newType.zoneCategory === 'commercial' || newType.zoneCategory === 'industrial') {
            if (this.gameInstance.totalPopulation === 0 && newType.level && newType.level > 0) {
                 // C/I developing into L1 in an empty city *should* result in 0 op level,
                 // as the development check in processGrowth itself prevents this.
                 // If somehow reached, set to 0 or 1.
                initialPopOnUpgrade = 0; 
            } else if (oldType.isDevelopableZone && !oldType.level) { 
                initialPopOnUpgrade = newType.populationCapacity ? Math.floor(newType.populationCapacity * 0.50) : 1; 
            } else { 
                let basePopFraction = (newType.level && oldType.level && newType.level < oldType.level) ? 0.60 : 0.30; 
                initialPopOnUpgrade = Math.max(1, newType.populationCapacity ? Math.floor(newType.populationCapacity * basePopFraction) : 1);
                if (oldPopulation > initialPopOnUpgrade && newType.level && oldType.level && newType.level > oldType.level) { 
                     initialPopOnUpgrade = Math.max(initialPopOnUpgrade, Math.floor(oldPopulation * 0.8)); 
                } else if (oldPopulation > initialPopOnUpgrade) { 
                    initialPopOnUpgrade = oldPopulation;
                }
            }
            newGridTileState.population = newType.populationCapacity ? Math.min(initialPopOnUpgrade, newType.populationCapacity) : initialPopOnUpgrade;
        } else if (newType.zoneCategory === 'residential') { 
            if (oldType.isDevelopableZone && !oldType.level) { 
                initialPopOnUpgrade = newType.populationCapacity ? Math.floor(newType.populationCapacity * 0.25) : 1;
            } else { 
                initialPopOnUpgrade = Math.max(oldPopulation, newType.populationCapacity ? Math.floor(newType.populationCapacity * 0.25) : 1);
            }
            newGridTileState.population = newType.populationCapacity ? Math.min(initialPopOnUpgrade, newType.populationCapacity) : initialPopOnUpgrade;
        } else { 
            newGridTileState.population = oldPopulation;
        }

        if (newGridTileState.population < 0) newGridTileState.population = 0;
        if (newType.populationCapacity && newGridTileState.population > newType.populationCapacity) {
            newGridTileState.population = newType.populationCapacity;
        }
        
        // If a building L1+ just formed and has 0 pop, but has capacity, give it 1 (unless C/I in empty city)
        if (newType.level && newType.level > 0 && newGridTileState.population === 0 && newType.populationCapacity && newType.populationCapacity > 0) {
            if (!((newType.zoneCategory === 'commercial' || newType.zoneCategory === 'industrial') && this.gameInstance.totalPopulation === 0)) {
                 newGridTileState.population = 1;
            }
        }
        
        if (this.gameInstance && typeof this.gameInstance.drawGame === 'function') {
            this.gameInstance.drawGame();
        }
    }


    private calculateFinancesAndGlobalMetrics(): { taxes: number, costs: number, net: number } {
        let totalCarryCosts = 0;
        let totalTaxes = 0;
        let totalJobsAvailable = 0;

        const cityTotalPopulation = this.gameInstance.totalPopulation;

        for (let y_coord = 0; y_coord < C.GRID_SIZE_Y; y_coord++) {
            for (let x_coord = 0; x_coord < C.GRID_SIZE_X; x_coord++) {
                const tile = this.gridController.getTile(x_coord, y_coord);
                if (tile) {
                    totalCarryCosts += (tile.type.carryCost || 0); // All tiles have carry costs

                    // Taxes and Jobs only from RCI tiles connected to City Hall
                    if ((tile.type.zoneCategory || tile.type.isDevelopableZone) && 
                        tile.type.id !== TILE_TYPES.CITY_HALL.id && 
                        this.isConnectedToCityHall(x_coord, y_coord)) {
                        
                        let taxFromTile = 0;
                        if (tile.type.taxRatePerPopulation && tile.population > 0) { 
                            taxFromTile = tile.population * tile.type.taxRatePerPopulation;
                        } else if (tile.type.baseTax) {
                            taxFromTile = tile.type.baseTax;
                        }

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

                        if (tile.type.jobsProvided && tile.type.level && tile.type.level > 0 && cityTotalPopulation > 0) { 
                            let jobEfficiency = 0; 
                            if ((tile.type.zoneCategory === 'commercial' || tile.type.zoneCategory === 'industrial') &&
                                tile.type.populationCapacity && tile.type.populationCapacity > 0 && tile.population > 0) { 
                                
                                const baseEfficiency = 0.4; 
                                const scalingFactor = 0.6; 
                                jobEfficiency = baseEfficiency + scalingFactor * (tile.population / tile.type.populationCapacity);
                                jobEfficiency = Math.max(0, Math.min(1, jobEfficiency)); 
                            }
                            totalJobsAvailable += ((tile.type.jobsProvided || 0) * jobEfficiency);
                        }
                    }
                }
            }
        }
        
        if (cityTotalPopulation === 0) { 
            totalJobsAvailable = 0;
        }

        const netChange = totalTaxes - totalCarryCosts;
        this.gameInstance.playerBudget += netChange;

        const employedWorkforce = Math.min(totalJobsAvailable, cityTotalPopulation);
        this.gameInstance.employmentRate = (cityTotalPopulation > 0) ? (employedWorkforce / cityTotalPopulation) * 100 : 0; 

        let residentialTileValueSum = 0;
        let residentialTileCount = 0;
        for (let y_coord = 0; y_coord < C.GRID_SIZE_Y; y_coord++) {
            for (let x_coord = 0; x_coord < C.GRID_SIZE_X; x_coord++) {
                const tile = this.gridController.getTile(x_coord, y_coord);
                if (tile && tile.type.zoneCategory === 'residential' && tile.population > 0 && this.isConnectedToCityHall(x_coord, y_coord)) {
                    residentialTileValueSum += tile.tileValue;
                    residentialTileCount++;
                }
            }
        }
        this.gameInstance.citySatisfaction = residentialTileCount > 0 ? (residentialTileValueSum / residentialTileCount / C.MAX_TILE_VALUE) * 100 : 50;


        return { taxes: totalTaxes, costs: totalCarryCosts, net: netChange };
    }

    public getPollutionAt(x: number, y: number): number {
        if (x >= 0 && x < C.GRID_SIZE_X && y >= 0 && y < C.GRID_SIZE_Y && this.pollutionMap[y]) {
            return this.pollutionMap[y][x] || 0;
        }
        return 0;
    }
    public getTileValueAt(x: number, y: number): number {
         if (x >= 0 && x < C.GRID_SIZE_X && y >= 0 && y < C.GRID_SIZE_Y && this.tileValueMap[y]) {
            return this.tileValueMap[y][x] || 0;
        }
        return 0;
    }
}
