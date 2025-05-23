import { TileTypeDefinition } from '../types';

// Helper function to create RCI level properties
const createRCILevelProps = (level: number, category: 'residential' | 'commercial' | 'industrial') => {
    let props: any = { level };
    if (category === 'residential') {
        props.populationCapacity = level * 10; // e.g., L1: 10, L2: 20, L3: 30
        props.taxRatePerPopulation = 0.5 + level * 0.2; // e.g. L1: 0.7, L2: 0.9, L3: 1.1
        props.carryCost = 2 + level * 1.5; // Increased carry cost scaling
    } else if (category === 'commercial') {
        props.jobsProvided = level * 5; // e.g., L1: 5, L2: 10, L3: 15
        props.taxRatePerPopulation = 0.8 + level * 0.3; // Commercial taxes based on its own "effective" population/size
        props.populationCapacity = level * 4; // "Size" for tax calculation
        props.carryCost = 3 + level * 2.5; // Increased carry cost scaling
    } else if (category === 'industrial') {
        props.jobsProvided = level * 8; // e.g., L1: 8, L2: 16, L3: 24
        props.taxRatePerPopulation = 0.4 + level * 0.1;
        props.populationCapacity = level * 6; // "Size" for tax calculation
        props.carryCost = 4 + level * 2; // Increased carry cost scaling
    }
    props.developsInto = level < 3 ? `${category.toUpperCase()}_L${level + 1}` : undefined;
    props.revertsTo = level > 1 ? `${category.toUpperCase()}_L${level - 1}` : `${category.toUpperCase()}_ZONE`;
    props.baseTile = `${category.toUpperCase()}_ZONE`;
    return props;
};

export const TILE_TYPES: TileTypeDefinition = {
    GRASS: { id: 'grass', color: '#72a372', name: 'Grass', cost: 0, renderHeight: 0, carryCost: 0 }, // Cost 0 for grass as a "tool"
    ROAD: { id: 'road', color: '#4a5568', name: 'Road', cost: 10, renderHeight: 0.01, carryCost: 0.5 }, // Road carry cost can be tuned
    WATER: { id: 'water', color: '#63b3ed', name: 'Water', cost: 5, renderHeight: 0.02, carryCost: 0, isNature: true },
    PARK: { id: 'park', color: '#38a169', name: 'Park (Player)', cost: 25, renderHeight: 0.15, isNature: true, carryCost: 2 },
    NATURAL_PARK: { id: 'natural_park', color: '#2E7D32', name: 'Natural Park', cost: 0, renderHeight: 0.15, isNature: true, carryCost: 0 },
    MOUNTAIN: { id: 'mountain', color: '#504A4B', name: 'Mountain', cost: 0, renderHeight: 0.8, carryCost: 0, isNature: true, isObstacle: true },

    // Ploppable Zones (Level 0)
    RESIDENTIAL_ZONE: { id: 'residential_zone', color: '#f6ad55', name: 'Residential Zone', cost: 20, renderHeight: 0.05, isZone: true, isDevelopableZone: true, zoneCategory: 'residential', developsInto: 'RESIDENTIAL_L1', carryCost: 0.2 },
    COMMERCIAL_ZONE: { id: 'commercial_zone', color: '#9b59b6', name: 'Commercial Zone', cost: 30, renderHeight: 0.05, isZone: true, isDevelopableZone: true, zoneCategory: 'commercial', developsInto: 'COMMERCIAL_L1', carryCost: 0.2 },
    INDUSTRIAL_ZONE: { id: 'industrial_zone', color: '#a0aec0', name: 'Industrial Zone', cost: 25, renderHeight: 0.05, isZone: true, isDevelopableZone: true, zoneCategory: 'industrial', developsInto: 'INDUSTRIAL_L1', carryCost: 0.2 },

    // Residential Levels
    RESIDENTIAL_L1: { id: 'residential_l1', color: '#e99c40', name: 'Small House', renderHeight: 0.4, zoneCategory: 'residential', ...createRCILevelProps(1, 'residential') },
    RESIDENTIAL_L2: { id: 'residential_l2', color: '#f0b863', name: 'Medium House', renderHeight: 0.6, zoneCategory: 'residential', ...createRCILevelProps(2, 'residential') },
    RESIDENTIAL_L3: { id: 'residential_l3', color: '#f5d48f', name: 'Apartment', renderHeight: 0.8, zoneCategory: 'residential', ...createRCILevelProps(3, 'residential') },
    
    // Commercial Levels
    COMMERCIAL_L1: { id: 'commercial_l1', color: '#9b59b6', name: 'Small Shop', renderHeight: 0.5, zoneCategory: 'commercial', ...createRCILevelProps(1, 'commercial') },
    COMMERCIAL_L2: { id: 'commercial_l2', color: '#b679d1', name: 'Medium Store', renderHeight: 0.7, zoneCategory: 'commercial', ...createRCILevelProps(2, 'commercial') },
    COMMERCIAL_L3: { id: 'commercial_l3', color: '#d19ee6', name: 'Office Building', renderHeight: 0.9, zoneCategory: 'commercial', ...createRCILevelProps(3, 'commercial') },

    // Industrial Levels
    INDUSTRIAL_L1: { id: 'industrial_l1', color: '#8c9bab', name: 'Small Factory', renderHeight: 0.45, zoneCategory: 'industrial', ...createRCILevelProps(1, 'industrial') },
    INDUSTRIAL_L2: { id: 'industrial_l2', color: '#a7b8c8', name: 'Medium Factory', renderHeight: 0.65, zoneCategory: 'industrial', ...createRCILevelProps(2, 'industrial') },
    INDUSTRIAL_L3: { id: 'industrial_l3', color: '#c2d0dd', name: 'Large Factory', renderHeight: 0.85, zoneCategory: 'industrial', ...createRCILevelProps(3, 'industrial') },

    // Rubble/Abandoned (Optional, could be a specific tile type)
    // RUBBLE: { id: 'rubble', color: '#5a5a5a', name: 'Rubble', cost: 0, renderHeight: 0.1, carryCost: 0.1 },
};
