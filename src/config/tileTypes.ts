import { TileTypeDefinition } from '../types';

export const TILE_TYPES: TileTypeDefinition = {
    GRASS: { id: 'grass', color: '#72a372', name: 'Grass', cost: 0, renderHeight: 0, carryCost: 0, taxRate: 0, population: 0, jobsProvided: 0 },
    ROAD: { id: 'road', color: '#4a5568', name: 'Road', cost: 10, renderHeight: 0.01, carryCost: 1, taxRate: 0, population: 0, jobsProvided: 0 },
    WATER: { id: 'water', color: '#63b3ed', name: 'Water', cost: 5, renderHeight: 0.02, carryCost: 0, taxRate: 0, population: 0, isNature: true, jobsProvided: 0 },
    PARK: { id: 'park', color: '#38a169', name: 'Park (Player)', cost: 25, renderHeight: 0.15, isNature: true, carryCost: 2, taxRate: 0, population: 0, jobsProvided: 0 },
    NATURAL_PARK: { id: 'natural_park', color: '#2E7D32', name: 'Natural Park', cost: 0, renderHeight: 0.15, isNature: true, carryCost: 0, taxRate: 0, population: 0, jobsProvided: 0 },
    MOUNTAIN: { id: 'mountain', color: '#504A4B', name: 'Mountain', cost: 0, renderHeight: 0.8, carryCost: 0, taxRate: 0, population: 0, isNature: true, isObstacle: true, jobsProvided: 0 },

    RESIDENTIAL_ZONE: { id: 'residential_zone', color: '#f6ad55', name: 'Residential Zone', cost: 50, renderHeight: 0.05, isZone: true, developsInto: 'RESIDENTIAL_LVL1_MED', category: 'residential', carryCost: 0.5, taxRate: 0, population: 0, jobsProvided: 0 },
    COMMERCIAL_ZONE: { id: 'commercial_zone', color: '#9b59b6', name: 'Commercial Zone', cost: 70, renderHeight: 0.05, isZone: true, developsInto: 'COMMERCIAL_LVL1_MED', category: 'commercial', carryCost: 0.5, taxRate: 0, population: 0, jobsProvided: 0 },
    INDUSTRIAL_ZONE: { id: 'industrial_zone', color: '#a0aec0', name: 'Industrial Zone', cost: 60, renderHeight: 0.05, isZone: true, developsInto: 'INDUSTRIAL_LVL1_MED', category: 'industrial', carryCost: 0.5, taxRate: 0, population: 0, jobsProvided: 0 },

    RESIDENTIAL_LVL1_LOW: { id: 'residential_lvl1_low', color: '#d9822E', name: 'Small House (Low Sat.)', renderHeight: 0.25, isBuilding: true, parentZoneCategory: 'residential', revertsTo: 'RESIDENTIAL_ZONE', carryCost: 6, taxRate: 7, population: 3, visualLevel: 'LOW', jobsProvided: 0 },
    RESIDENTIAL_LVL1_MED: { id: 'residential_lvl1_med', color: '#e99c40', name: 'Small House (Med Sat.)', renderHeight: 0.4, isBuilding: true, parentZoneCategory: 'residential', revertsTo: 'RESIDENTIAL_ZONE', carryCost: 5, taxRate: 10, population: 5, visualLevel: 'MED', jobsProvided: 0 },
    RESIDENTIAL_LVL1_HIGH: { id: 'residential_lvl1_high', color: '#f0b863', name: 'Small House (High Sat.)', renderHeight: 0.55, isBuilding: true, parentZoneCategory: 'residential', revertsTo: 'RESIDENTIAL_ZONE', carryCost: 4, taxRate: 13, population: 7, visualLevel: 'HIGH', jobsProvided: 0 },
    
    COMMERCIAL_LVL1_LOW: { id: 'commercial_lvl1_low', color: '#804499', name: 'Small Shop (Low Op.)', renderHeight: 0.3, isBuilding: true, parentZoneCategory: 'commercial', revertsTo: 'COMMERCIAL_ZONE', carryCost: 10, taxRate: 8, population: 0, jobsProvided: 2, visualLevel: 'LOW' },
    COMMERCIAL_LVL1_MED: { id: 'commercial_lvl1_med', color: '#9b59b6', name: 'Small Shop (Med Op.)', renderHeight: 0.6, isBuilding: true, parentZoneCategory: 'commercial', revertsTo: 'COMMERCIAL_ZONE', carryCost: 8, taxRate: 15, population: 0, jobsProvided: 5, visualLevel: 'MED' },
    COMMERCIAL_LVL1_HIGH: { id: 'commercial_lvl1_high', color: '#b679d1', name: 'Small Shop (High Op.)', renderHeight: 0.75, isBuilding: true, parentZoneCategory: 'commercial', revertsTo: 'COMMERCIAL_ZONE', carryCost: 6, taxRate: 22, population: 0, jobsProvided: 8, visualLevel: 'HIGH' },

    INDUSTRIAL_LVL1_LOW: { id: 'industrial_lvl1_low', color: '#768594', name: 'Small Factory (Low Op.)', renderHeight: 0.25, isBuilding: true, parentZoneCategory: 'industrial', revertsTo: 'INDUSTRIAL_ZONE', carryCost: 9, taxRate: 7, population: 0, jobsProvided: 3, visualLevel: 'LOW' },
    INDUSTRIAL_LVL1_MED: { id: 'industrial_lvl1_med', color: '#8c9bab', name: 'Small Factory (Med Op.)', renderHeight: 0.5, isBuilding: true, parentZoneCategory: 'industrial', revertsTo: 'INDUSTRIAL_ZONE', carryCost: 7, taxRate: 12, population: 0, jobsProvided: 6, visualLevel: 'MED' },
    INDUSTRIAL_LVL1_HIGH: { id: 'industrial_lvl1_high', color: '#a7b8c8', name: 'Small Factory (High Op.)', renderHeight: 0.65, isBuilding: true, parentZoneCategory: 'industrial', revertsTo: 'INDUSTRIAL_ZONE', carryCost: 5, taxRate: 18, population: 0, jobsProvided: 10, visualLevel: 'HIGH' }
};
