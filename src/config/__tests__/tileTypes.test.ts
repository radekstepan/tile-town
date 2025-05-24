import { TILE_TYPES } from '../tileTypes';
import { TileType } from '../../types';

describe('TileType Definitions', () => {
    it('should have valid IDs and basic properties for all tile types', () => {
        for (const key in TILE_TYPES) {
            const tileDef: TileType = TILE_TYPES[key];
            expect(tileDef).toBeDefined();
            expect(typeof tileDef.id).toBe('string');
            expect(tileDef.id.length).toBeGreaterThan(0);
            expect(tileDef.id === key.toLowerCase() || tileDef.id === key).toBeTruthy();
            expect(typeof tileDef.name).toBe('string');
            expect(typeof tileDef.color).toBe('string');
            expect(tileDef.color.startsWith('#')).toBeTruthy();
            
            // Cost is only defined for base zones and non-RCI ploppables, not for developed RCI levels
            if (!tileDef.level || tileDef.level === 0) { // Or check if it's not a L1,L2,L3 RCI
                expect(typeof tileDef.cost).toBe('number');
                expect(tileDef.cost).toBeGreaterThanOrEqual(0);
            } else {
                // For RCI levels L1, L2, L3, cost is undefined as they are developed.
                 expect(tileDef.cost).toBeUndefined();
            }

            expect(typeof tileDef.renderHeight).toBe('number');
            expect(typeof tileDef.carryCost).toBe('number');
            expect(tileDef.carryCost).toBeGreaterThanOrEqual(0);
        }
    });

    it('should have valid development/reversion paths for RCI tiles', () => {
        const rciCategories = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'];
        rciCategories.forEach(category => {
            const zoneKey = `${category}_ZONE`;
            const zoneDef = TILE_TYPES[zoneKey];
            expect(zoneDef).toBeDefined();
            expect(zoneDef.isDevelopableZone).toBe(true);
            expect(zoneDef.developsInto).toBeDefined();
            expect(TILE_TYPES[zoneDef.developsInto!]).toBeDefined();

            for (let level = 1; level <= 3; level++) {
                const levelKey = `${category}_L${level}`;
                const levelDef = TILE_TYPES[levelKey];
                expect(levelDef).toBeDefined();
                expect(levelDef.level).toBe(level);
                expect(levelDef.zoneCategory).toBe(category.toLowerCase());

                if (level < 3) {
                    expect(levelDef.developsInto).toBeDefined();
                    expect(TILE_TYPES[levelDef.developsInto!]).toBeDefined();
                    expect(TILE_TYPES[levelDef.developsInto!].level).toBe(level + 1);
                } else {
                    expect(levelDef.developsInto).toBeUndefined();
                }

                if (level > 1) {
                    expect(levelDef.revertsTo).toBeDefined();
                    expect(TILE_TYPES[levelDef.revertsTo!]).toBeDefined();
                    expect(TILE_TYPES[levelDef.revertsTo!].level).toBe(level - 1);
                } else { // Level 1
                    expect(levelDef.revertsTo).toBeDefined();
                    expect(levelDef.revertsTo).toBe(zoneKey);
                }
                expect(levelDef.baseTile).toBeDefined();
                expect(levelDef.baseTile).toBe(zoneKey);
            }
        });
    });

    it('should have required properties for RCI leveled buildings', () => {
        const rciBuildingPrefixes = ['RESIDENTIAL_L', 'COMMERCIAL_L', 'INDUSTRIAL_L'];
        for (const key in TILE_TYPES) {
            const tileDef = TILE_TYPES[key];
            if (rciBuildingPrefixes.some(prefix => key.startsWith(prefix))) {
                expect(tileDef.populationCapacity).toBeDefined();
                expect(tileDef.populationCapacity!).toBeGreaterThan(0);
                expect(tileDef.taxRatePerPopulation).toBeDefined();

                if (tileDef.zoneCategory === 'commercial' || tileDef.zoneCategory === 'industrial') {
                    expect(tileDef.jobsProvided).toBeDefined();
                    expect(tileDef.jobsProvided!).toBeGreaterThan(0);
                }
            }
        }
    });
});
