import { GridTile, TileType, SatisfactionData, OperationalData } from '../types';
import { TILE_TYPES } from '../config/tileTypes';
import * as C from '../config/constants';
import { GridController } from './GridController';
import { Game } from './Game'; // Forward declaration for type hinting

export class SimulationController {
    private gridController: GridController;
    private gameInstance: Game; // To access messageBox, playerBudget, etc.

    constructor(gridController: GridController, gameInstance: Game) {
        this.gridController = gridController;
        this.gameInstance = gameInstance;
    }

    public processGameTick(): { taxes: number, costs: number, net: number } {
        let totalCarryCosts = 0;
        let totalTaxes = 0;
        
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = this.gridController.getTile(x,y)?.type;
                if (tile) {
                    totalCarryCosts += (tile.carryCost || 0);
                    totalTaxes += (tile.taxRate || 0);
                }
            }
        }
        const netChange = totalTaxes - totalCarryCosts;
        this.gameInstance.playerBudget += netChange;
        
        this.calculateCityMetrics(); // This will also update visuals if necessary by calling gameInstance.drawGame()
        return { taxes: totalTaxes, costs: totalCarryCosts, net: netChange };
    }
    
    private getDefaultSatisfactionData(): SatisfactionData {
        return { score: 50, currentTargetVisualLevel: 'MED', ticksInCurrentTargetLevel: 0, work: 0, nature: 0, density: 0, parkBonus: 0, waterBonus: 0, mountainBonus: 0, employmentPenalty: 0, industrialPenalty: 0 };
    }
    private getDefaultOperationalData(): OperationalData {
        return { score: 50, currentTargetVisualLevel: 'MED', ticksInCurrentTargetLevel: 0, workerAccess: 0, customerAccess: 0 };
    }

    public calculateCityMetrics(): void {
        let totalSatisfactionPoints = 0;
        let residentialBuildingCount = 0;
        const grid = this.gridController.grid;

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tileData = grid[y][x];
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
        this.gameInstance.citySatisfaction = residentialBuildingCount > 0 ? totalSatisfactionPoints / residentialBuildingCount : 50;

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tileData = grid[y][x];
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
        let totalWorkforce = 0; 
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                totalJobsAvailable += (grid[y][x].type.jobsProvided || 0);
                totalWorkforce += (grid[y][x].type.population || 0);
            }
        }
        const employedWorkforce = Math.min(totalJobsAvailable, totalWorkforce);
        this.gameInstance.employmentRate = (totalWorkforce > 0) ? (employedWorkforce / totalWorkforce) * 100 : 100;
    }

    private calculateTileSatisfaction(resX: number, resY: number): number {
        const tileData = this.gridController.getTile(resX, resY);
        if (!tileData || !tileData.satisfactionData) return 50;


        let workScore = 0, natureScore = 0, densityScore = 0, employmentPenalty = 0, industrialPenaltyScore = 0;
        let baseSatisfaction = 50;

        if (this.gameInstance.employmentRate < C.LOW_EMPLOYMENT_THRESHOLD) {
            employmentPenalty = C.LOW_EMPLOYMENT_SATISFACTION_PENALTY;
        }

        let minDistToWork = Infinity;
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const otherTileType = this.gridController.getTile(x,y)?.type;
                if (otherTileType && (otherTileType.id.includes('commercial_lvl1') || otherTileType.id.includes('industrial_lvl1'))) {
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
                const neighborType = this.gridController.getTile(nx, ny)?.type.id;
                if (neighborType) {
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
                const otherTileType = this.gridController.getTile(x,y)?.type;
                if (otherTileType && otherTileType.id.includes('industrial_lvl1')) {
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
                if (this.gridController.getTile(nx,ny)?.type.parentZoneCategory === 'residential') neighbors++;
            }
        }
        if (neighbors < C.DENSITY_IDEAL_MIN) densityScore = C.DENSITY_PENALTY_LOW;
        else if (neighbors <= C.DENSITY_IDEAL_MAX) densityScore = C.DENSITY_BONUS;
        else densityScore = C.DENSITY_PENALTY_HIGH * (neighbors - C.DENSITY_IDEAL_MAX);

        let totalScore = baseSatisfaction + workScore + natureScore + densityScore + employmentPenalty + industrialPenaltyScore;
        totalScore = Math.max(0, Math.min(C.MAX_SATISFACTION, totalScore));
        
        tileData.satisfactionData.score = totalScore;
        tileData.satisfactionData.work = workScore;
        tileData.satisfactionData.nature = natureScore;
        tileData.satisfactionData.density = densityScore;
        tileData.satisfactionData.parkBonus = parkBonus;
        tileData.satisfactionData.waterBonus = waterBonus;
        tileData.satisfactionData.mountainBonus = mountainBonus;
        tileData.satisfactionData.employmentPenalty = employmentPenalty;
        tileData.satisfactionData.industrialPenalty = industrialPenaltyScore;
        
        return totalScore;
    }

    private updateResidentialBuildingVisual(resX: number, resY: number): void {
        const tileData = this.gridController.getTile(resX, resY);
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
                this.gridController.setTileType(resX, resY, TILE_TYPES[targetTypeId]);
                this.gameInstance.drawGame();
            }
        }
    }

    private calculateCIOperationalScore(ciX: number, ciY: number): number {
        const tileData = this.gridController.getTile(ciX, ciY);
        if (!tileData || !tileData.operationalData) return 50;
        const tileType = tileData.type;

        let baseScore = 50, workerAccessScore = 0, customerAccessScore = 0;
        let nearbyWorkforce = 0;
        for (let y = Math.max(0, ciY - C.WORKER_ACCESS_RADIUS); y <= Math.min(C.GRID_SIZE_Y - 1, ciY + C.WORKER_ACCESS_RADIUS); y++) {
            for (let x = Math.max(0, ciX - C.WORKER_ACCESS_RADIUS); x <= Math.min(C.GRID_SIZE_X - 1, ciX + C.WORKER_ACCESS_RADIUS); x++) {
                const dist = Math.abs(x - ciX) + Math.abs(y - ciY);
                if (dist <= C.WORKER_ACCESS_RADIUS) {
                    nearbyWorkforce += (this.gridController.getTile(x,y)?.type.population || 0);
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
                        nearbyCustomers += (this.gridController.getTile(x,y)?.type.population || 0);
                    }
                }
            }
            customerAccessScore = Math.min((nearbyCustomers / 20) * C.CUSTOMER_ACCESS_MAX_BONUS, C.CUSTOMER_ACCESS_MAX_BONUS);
            if (nearbyCustomers === 0) customerAccessScore = -20;
        }

        let totalScore = baseScore + workerAccessScore + (tileType.parentZoneCategory === 'commercial' ? customerAccessScore : 0);
        totalScore = Math.max(0, Math.min(C.MAX_OPERATIONAL_SCORE, totalScore));
        
        tileData.operationalData.score = totalScore;
        tileData.operationalData.workerAccess = workerAccessScore;
        tileData.operationalData.customerAccess = customerAccessScore;
        
        return totalScore;
    }

    private updateCIOperationalVisual(ciX: number, ciY: number): void {
        const tileData = this.gridController.getTile(ciX, ciY);
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
            const category = tileData.type.parentZoneCategory!;
            const targetTypeId = `${category.toUpperCase()}_LVL1_${newTargetVisualLevel}`;
            if (TILE_TYPES[targetTypeId] && currentVisualTypeId !== targetTypeId) {
                this.gridController.setTileType(ciX, ciY, TILE_TYPES[targetTypeId]);
                this.gameInstance.drawGame();
            }
        }
    }

    public isConnectedToRoad(gridX: number, gridY: number): boolean {
        const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
        for (const neighbor of neighbors) {
            const nx = gridX + neighbor.dx;
            const ny = gridY + neighbor.dy;
            if (this.gridController.getTile(nx,ny)?.type.id === 'road') return true;
        }
        return false;
    }

    public checkAndUpdateAdjacentBuildingsOnRoadChange(changedTileX: number, changedTileY: number): void {
        const neighbors = [{ dx: 0, dy: -1 },{ dx: 0, dy: 1 },{ dx: -1, dy: 0 },{ dx: 1, dy: 0 }];
        let needsCityRecalc = false;
        for (const neighborOffset of neighbors) {
            const nx = changedTileX + neighborOffset.dx;
            const ny = changedTileY + neighborOffset.dy;
            const adjacentTileData = this.gridController.getTile(nx, ny);

            if (adjacentTileData && adjacentTileData.type.isBuilding) {
                if (!this.isConnectedToRoad(nx, ny)) {
                    const revertToTypeKey = adjacentTileData.type.revertsTo;
                    if (revertToTypeKey && TILE_TYPES[revertToTypeKey]) {
                        this.gameInstance.messageBox.show(`${adjacentTileData.type.name} at (${nx},${ny}) lost road access and reverted.`, 3500);
                        this.gridController.setTileType(nx, ny, TILE_TYPES[revertToTypeKey]);
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
        if (needsCityRecalc) {
            this.calculateCityMetrics();
            this.gameInstance.updateAllUI(); 
            this.gameInstance.drawGame();
        }
    }

    public attemptZoneDevelopment(zoneX: number, zoneY: number): void {
        const tileData = this.gridController.getTile(zoneX, zoneY);
        if (!tileData || !tileData.type.isZone || tileData.developmentTimerId) return;

        const builtZoneId = tileData.type.id;
        tileData.developmentTimerId = window.setTimeout(() => {
            const currentTile = this.gridController.getTile(zoneX, zoneY); // Re-fetch in case it was cleared
            if (currentTile) delete currentTile.developmentTimerId;

            if (currentTile && currentTile.type.id === builtZoneId) { 
                if (this.isConnectedToRoad(zoneX, zoneY)) {
                    const originalZoneType = TILE_TYPES[builtZoneId.toUpperCase()];
                    if (originalZoneType && originalZoneType.developsInto) {
                        const developedTypeKey = originalZoneType.developsInto;
                        if (TILE_TYPES[developedTypeKey]) {
                            this.gridController.setTileType(zoneX, zoneY, TILE_TYPES[developedTypeKey]);
                            const newTile = this.gridController.getTile(zoneX, zoneY)!; // Should exist
                            if (newTile.type.parentZoneCategory === 'residential') {
                                newTile.satisfactionData = this.getDefaultSatisfactionData();
                            } else if (newTile.type.parentZoneCategory === 'commercial' || newTile.type.parentZoneCategory === 'industrial') {
                                newTile.operationalData = this.getDefaultOperationalData();
                            }
                            this.gameInstance.messageBox.show(`${originalZoneType.name} at (${zoneX},${zoneY}) developed!`, 2500);
                            this.calculateCityMetrics();
                            this.gameInstance.updateAllUI();
                            this.gameInstance.drawGame();
                        }
                    }
                }
            }
        }, 5000 + Math.random() * 5000);
    }
}
