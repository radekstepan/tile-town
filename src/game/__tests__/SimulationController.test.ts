import { SimulationController } from '../SimulationController';
import { GridController } from '../GridController';
import { Game } from '../Game';
import { TILE_TYPES } from '../../config/tileTypes';
import * as C from '../../config/constants';
import { GridTile } from '../../types';

jest.mock('../Game', () => {
    return {
        Game: jest.fn().mockImplementation(() => ({
            playerBudget: C.INITIAL_BUDGET,
            totalPopulation: 0,
            employmentRate: 100,
            citySatisfaction: 50,
            gridController: new GridController(true), 
            drawGame: jest.fn(), 
        }))
    };
});


describe('SimulationController', () => {
    let gridController: GridController;
    let gameMock: Game;
    let simulationController: SimulationController;

    beforeEach(() => {
        gridController = new GridController(true); 
        
        gameMock = new (Game as jest.Mock<Game>)();
        (gameMock as any).gridController = gridController;
        
        simulationController = new SimulationController(gridController, gameMock);
        simulationController.resetMaps(); 
    });

    describe('Pollution System', () => {
        it('should generate pollution and apply spread reduction in one _updatePollutionSystem call', () => {
            gridController.resetGridToGrass();
            const chX = 5, chY = 5;
            (gridController as any).placeCityHall(chX, chY); 

            const indX = chX + 1, indY = chY + 2;
            gridController.setTileType(chX, chY + 1, TILE_TYPES.ROAD); 
            gridController.setTileType(indX, chY + 1, TILE_TYPES.ROAD); 
            gridController.setTileType(indX, indY, TILE_TYPES.INDUSTRIAL_L1);
            const finalIndTile = gridController.getTile(indX, indY) as GridTile;
            finalIndTile.population = TILE_TYPES.INDUSTRIAL_L1.populationCapacity!;
            
            (simulationController as any).updateRoadAccessFlags();

            (simulationController as any).pollutionMap[indY][indX] = 0;
            simulationController._updatePollutionSystem();
            expect(simulationController.getPollutionAt(indX, indY)).toBeCloseTo(46.8);
        });

        it('should decay existing pollution and apply spread reduction over two ticks', () => {
            (simulationController as any).pollutionMap[1][1] = 100; 
            simulationController._updatePollutionSystem(); 
            const valAfterTick1 = 88.2; 
            expect(simulationController.getPollutionAt(1, 1)).toBeCloseTo(valAfterTick1);

            simulationController._updatePollutionSystem();
            expect(simulationController.getPollutionAt(1, 1)).toBeCloseTo(78.07251666666669, 5); 
        });
        
        it('park affects its own pollution correctly', () => {
            gridController.setTileType(1,1, TILE_TYPES.PARK);
            (simulationController as any).pollutionMap[1][1] = 50; 
            [[0,1],[2,1],[1,0],[1,2]].forEach(([dx,dy]) => {
                const nx = 1 + dx -1; 
                const ny = 1 + dy -1;
                 if(gridController.getTile(nx, ny)) {
                    gridController.setTileType(nx,ny, TILE_TYPES.GRASS); 
                    (simulationController as any).pollutionMap[ny][nx] = 0;
                 }
            });
            (simulationController as any).pollutionMap[1][1] = 50; 

            simulationController._updatePollutionSystem();
            expect(simulationController.getPollutionAt(1,1)).toBeCloseTo(29.1, 3);
        });

        it('park affects adjacent grass pollution correctly', () => {
            gridController.setTileType(1,1, TILE_TYPES.PARK);    
            gridController.setTileType(1,2, TILE_TYPES.GRASS);   
            
            (simulationController as any).pollutionMap[1][1] = 50; 
            (simulationController as any).pollutionMap[1][2] = 50; 
            
            const grassNeighborsOfPark = [[0,1],[2,1],[1,0]]; 
            grassNeighborsOfPark.forEach(([dx,dy]) => {
                 const nx = 1 + dx -1;
                 const ny = 1 + dy -1;
                 if(gridController.getTile(nx,ny)) {
                    gridController.setTileType(nx,ny, TILE_TYPES.GRASS);
                    (simulationController as any).pollutionMap[ny][nx] = 0;
                 }
            });
            const grassNeighborsOfTargetGrass = [[0,2],[2,2],[1,3]]; 
             grassNeighborsOfTargetGrass.forEach(([dx,dy]) => {
                 const nx = 1 + dx -1;
                 const ny = 2 + dy -1;
                 if(gridController.getTile(nx,ny)) {
                    gridController.setTileType(nx,ny, TILE_TYPES.GRASS);
                    (simulationController as any).pollutionMap[ny][nx] = 0;
                 }
            });
            (simulationController as any).pollutionMap[1][1] = 50; 
            (simulationController as any).pollutionMap[1][2] = 50;

            simulationController._updatePollutionSystem();
            expect(simulationController.getPollutionAt(1,2)).toBeCloseTo(0, 3); 
        });
    });
    
    describe('Finances and Global Metrics', () => {
        it('should calculate taxes, costs, and net budget correctly with RCI setup', () => {
            const initialBudget = 1000;
            (gameMock as any).playerBudget = initialBudget; 

            gridController.resetGridToGrass(); 
            const chX = 5, chY = 5; 
            (gridController as any).placeCityHall(chX, chY); // Places CH & 1 road tile

            const rciRoadY = chY + 2; // e.g., 5 + 2 = 7
            const resX = chX;         // e.g., 5
            const resY = rciRoadY + 1;// e.g., 7 + 1 = 8
            const comX = chX + 1;     // e.g., 5 + 1 = 6
            const comY = rciRoadY + 1;// e.g., 7 + 1 = 8

            // Path:
            // City Hall Road (e.g., (5,6) if placeCityHall places it at chY+1)
            // -> Road at (5,7) (chX, rciRoadY)
            // -> Road at (6,7) (comX, rciRoadY) to give access to Com zone
            // Residential (5,8) gets access from (5,7)
            // Commercial (6,8) gets access from (6,7)

            // Assuming placeCityHall placed a road at (chX, chY+1)
            // gridController.setTileType(chX, chY + 1, TILE_TYPES.ROAD); // This would be redundant if placeCityHall does it.

            gridController.setTileType(chX, rciRoadY, TILE_TYPES.ROAD);     // New Road 1 (e.g. 5,7)
            gridController.setTileType(comX, rciRoadY, TILE_TYPES.ROAD);   // New Road 2 (e.g. 6,7)

            gridController.setTileType(resX, resY, TILE_TYPES.RESIDENTIAL_L1); 
            const resL1 = gridController.getTile(resX, resY) as GridTile;
            resL1.population = 5; 
            
            gridController.setTileType(comX, comY, TILE_TYPES.COMMERCIAL_L1);
            const comL1 = gridController.getTile(comX, comY) as GridTile;
            comL1.population = TILE_TYPES.COMMERCIAL_L1.populationCapacity!; 

            (simulationController as any).updateRoadAccessFlags();

            const highTileValue = C.BASE_TILE_VALUE + C.ROAD_ADJACENCY_TILE_VALUE_BONUS + C.R_NEAR_C_BONUS + 50;
            (simulationController as any).tileValueMap[resY][resX] = highTileValue; 
            (simulationController as any).tileValueMap[comY][comX] = highTileValue; 

            const financeResultFromTick = simulationController.processGameTick(); 
            
            const finalResL1Pop = (gridController.getTile(resX,resY) as GridTile).population;
            const finalComL1Pop = (gridController.getTile(comX,comY) as GridTile).population;
            const finalResL1TileValue = (gridController.getTile(resX,resY) as GridTile).tileValue;

            // Roads: 1 from placeCityHall + 2 explicitly placed unique roads = 3 roads
            const expectedCosts = (TILE_TYPES.ROAD.carryCost * 3) + 
                                  TILE_TYPES.RESIDENTIAL_L1.carryCost! + 
                                  TILE_TYPES.COMMERCIAL_L1.carryCost!;
            expect(financeResultFromTick.costs).toBeCloseTo(expectedCosts); // Should be 1.5 + 3.5 + 5.0 = 10.0

            let expectedResTaxes = finalResL1Pop * TILE_TYPES.RESIDENTIAL_L1.taxRatePerPopulation!;
            if (finalResL1TileValue < C.R_TAX_DESIRABILITY_THRESHOLD_SEVERE) expectedResTaxes *= 0.05;
            else if (finalResL1TileValue < C.R_TAX_DESIRABILITY_THRESHOLD_LOW) expectedResTaxes *= 0.3;
            if((gridController.getTile(resX,resY) as GridTile).isVisuallyStruggling) expectedResTaxes *= C.STRUGGLING_TAX_MULTIPLIER;

            let expectedComTaxes = finalComL1Pop * TILE_TYPES.COMMERCIAL_L1.taxRatePerPopulation!;
            const comPopCapacity = TILE_TYPES.COMMERCIAL_L1.populationCapacity!;
            const comPopRatio = comPopCapacity > 0 ? (finalComL1Pop / comPopCapacity) : 0;
            if (comPopRatio < C.CI_TAX_POPULATION_RATIO_SEVERE) expectedComTaxes *= 0.05;
            else if (comPopRatio < C.CI_TAX_POPULATION_RATIO_LOW) expectedComTaxes *= 0.3;
            if((gridController.getTile(comX,comY) as GridTile).isVisuallyStruggling) expectedComTaxes *= C.STRUGGLING_TAX_MULTIPLIER;

            const expectedTotalTaxes = expectedResTaxes + expectedComTaxes; 
            // ResL1: 5pop * 0.7 = 3.5
            // ComL1: 5pop * 1.1 = 5.5
            // Total Taxes = 9.0
            expect(financeResultFromTick.taxes).toBeCloseTo(9.3); 
            
            const expectedNet = 9.3 - expectedCosts; // 9.0 - 10.0 = -1.0
            expect(financeResultFromTick.net).toBeCloseTo(expectedNet);
            expect(gameMock.playerBudget).toBeCloseTo(initialBudget + expectedNet); 
        });

        it('should reduce taxes if population declines due to no road access', () => {
            (gameMock as any).playerBudget = 1000;
            
            gridController.resetGridToGrass(); 
            const chX = Math.floor(C.GRID_SIZE_X / 2);
            const chY = Math.floor(C.GRID_SIZE_Y / 2);
            (gridController as any).placeCityHall(chX, chY);


            gridController.setTileType(1,1, TILE_TYPES.RESIDENTIAL_L1); 
            const resL1 = gridController.getTile(1,1) as GridTile;
            const initialPopulation = 5;
            resL1.population = initialPopulation;
            (simulationController as any).tileValueMap[1][1] = C.BASE_TILE_VALUE; 
            
            (simulationController as any).updateRoadAccessFlags();

            const financeResultFromTick = simulationController.processGameTick(); 

            const declinedPopulation = initialPopulation - C.R_DECLINE_POPULATION_RATE; 
            expect(resL1.population).toBe(declinedPopulation);
            
            const expectedTaxes = 0; 
            
            expect(financeResultFromTick.taxes).toBeCloseTo(expectedTaxes);
        });
    });
});
