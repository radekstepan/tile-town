import { GridController } from '../GridController';
import { TILE_TYPES } from '../../config/tileTypes';
import * as C from '../../config/constants';
import { GridTile } from '../../types';

describe('GridController', () => {
    let gridController: GridController;

    const createController = (skipInitialGeneration = true) => {
        return new GridController(skipInitialGeneration);
    };
    
    beforeEach(() => {
        // Reset Math.random for predictable procedural generation if testing those
        // For now, most tests use skipInitialGeneration = true
    });

    it('constructor should initialize an empty grid if skipInitialGeneration is true', () => {
        gridController = createController(true);
        expect(gridController.grid).toBeDefined();
        expect(gridController.grid.length).toBe(C.GRID_SIZE_Y);
        expect(gridController.grid[0].length).toBe(C.GRID_SIZE_X);
        const tile = gridController.getTile(0, 0);
        expect(tile).toBeDefined();
        expect(tile!.type.id).toBe(TILE_TYPES.GRASS.id);
    });

    it('getTile should return the correct tile or undefined', () => {
        gridController = createController();
        const tile = gridController.getTile(0, 0);
        expect(tile).toBeDefined();
        expect(tile!.type.id).toBe(TILE_TYPES.GRASS.id);

        expect(gridController.getTile(-1, -1)).toBeUndefined();
        expect(gridController.getTile(C.GRID_SIZE_X, C.GRID_SIZE_Y)).toBeUndefined();
    });

    it('setTileType should change the tile type and reset relevant properties', () => {
        gridController = createController();
        gridController.setTileType(1, 1, TILE_TYPES.ROAD);
        let tile = gridController.getTile(1, 1) as GridTile;
        expect(tile.type.id).toBe(TILE_TYPES.ROAD.id);
        expect(tile.population).toBe(0);

        gridController.setTileType(2, 2, TILE_TYPES.RESIDENTIAL_ZONE);
        tile = gridController.getTile(2, 2) as GridTile;
        expect(tile.type.id).toBe(TILE_TYPES.RESIDENTIAL_ZONE.id);
        expect(tile.population).toBe(0);

        gridController.setTileType(3, 3, TILE_TYPES.RESIDENTIAL_L1);
        tile = gridController.getTile(3, 3) as GridTile;
        expect(tile.type.id).toBe(TILE_TYPES.RESIDENTIAL_L1.id);
        expect(tile.population).toBeGreaterThan(0);
        expect(tile.population).toBe(Math.floor(TILE_TYPES.RESIDENTIAL_L1.populationCapacity! / 2));
    });
    
    it('clearTileData should reset tile data but not type', () => {
        gridController = createController();
        gridController.setTileType(1, 1, TILE_TYPES.INDUSTRIAL_L1);
        let tile = gridController.getTile(1, 1) as GridTile;
        tile.population = 5;
        tile.pollution = 50;
        tile.tileValue = 150;
        tile.hasRoadAccess = true;

        gridController.clearTileData(1, 1);
        tile = gridController.getTile(1, 1) as GridTile;
        
        expect(tile.type.id).toBe(TILE_TYPES.INDUSTRIAL_L1.id); // Type remains
        expect(tile.population).toBe(0);
        expect(tile.pollution).toBe(0);
        expect(tile.tileValue).toBe(C.BASE_TILE_VALUE);
        expect(tile.hasRoadAccess).toBe(false);
    });

    it('isAreaClearForFeature should correctly check if an area is clear', () => {
        gridController = createController(); // All grass
        expect(gridController.isAreaClearForFeature(0, 0, 2, 2, [TILE_TYPES.GRASS.id])).toBe(true);
        
        gridController.setTileType(1, 0, TILE_TYPES.ROAD);
        expect(gridController.isAreaClearForFeature(0, 0, 2, 2, [TILE_TYPES.GRASS.id])).toBe(false);
        expect(gridController.isAreaClearForFeature(0, 0, 1, 1, [TILE_TYPES.GRASS.id])).toBe(true);
    });
    
    it('resetGridToGrass should set all tiles to grass', () => {
        gridController = createController(false); // Potentially generates non-grass tiles
        gridController.setTileType(5,5, TILE_TYPES.MOUNTAIN);
        gridController.setTileType(6,6, TILE_TYPES.WATER);
        
        gridController.resetGridToGrass();
        
        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = gridController.getTile(x,y);
                expect(tile).toBeDefined();
                expect(tile!.type.id).toBe(TILE_TYPES.GRASS.id);
                expect(tile!.population).toBe(0);
                expect(tile!.pollution).toBe(0);
                expect(tile!.tileValue).toBe(C.BASE_TILE_VALUE);
            }
        }
    });

    it('generateTestTownLayout should place some RCI and roads', () => {
        gridController = createController(true);
        gridController.generateTestTownLayout();

        let roadCount = 0;
        let resZoneCount = 0;
        let comZoneCount = 0;
        let indZoneCount = 0;

        for (let y = 0; y < C.GRID_SIZE_Y; y++) {
            for (let x = 0; x < C.GRID_SIZE_X; x++) {
                const tile = gridController.getTile(x, y);
                if (tile) {
                    if (tile.type.id === TILE_TYPES.ROAD.id) roadCount++;
                    else if (tile.type.id === TILE_TYPES.RESIDENTIAL_ZONE.id) resZoneCount++;
                    else if (tile.type.id === TILE_TYPES.COMMERCIAL_ZONE.id) comZoneCount++;
                    else if (tile.type.id === TILE_TYPES.INDUSTRIAL_ZONE.id) indZoneCount++;
                }
            }
        }
        expect(roadCount).toBeGreaterThan(5);
        expect(resZoneCount).toBeGreaterThan(0);
        expect(comZoneCount).toBeGreaterThan(0);
        expect(indZoneCount).toBeGreaterThan(0);
    });
});
