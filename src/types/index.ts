export interface TileType {
  id: string;
  color: string;
  name: string;
  cost: number; // Cost to build this specific tile/zone
  renderHeight: number;
  carryCost: number; // Cost per tick for this tile type
  
  // For RCI buildings/levels:
  taxRatePerPopulation?: number; // Tax generated per unit of population
  baseTax?: number; // Flat tax if not population based
  populationCapacity?: number;
  jobsProvided?: number; // Can be dynamic based on population/level or fixed

  isNature?: boolean;
  isObstacle?: boolean;
  
  // Zoning and Development
  isZone?: boolean; // Is it a ploppable zone?
  isDevelopableZone?: boolean; // Is it an R, C, or I zone tile that can develop?
  zoneCategory?: 'residential' | 'commercial' | 'industrial'; // Category if it's a zone or building
  
  baseTile?: string; // For buildings, what zone do they revert to if demolished (e.g. RESIDENTIAL_L1 -> RESIDENTIAL_ZONE)
  
  // Micropolis-style leveling
  level?: number; // e.g., 1, 2, 3 for RCI buildings
  developsInto?: string; // Key of TILE_TYPE for next level
  revertsTo?: string; // Key of TILE_TYPE for previous level or abandonment

  // Old properties that might be deprecated or used differently:
  // population: number; // Now dynamic in GridTile
  // parentZoneCategory?: 'residential' | 'commercial' | 'industrial'; // Covered by zoneCategory
  // visualLevel?: 'LOW' | 'MED' | 'HIGH'; // Replaced by discrete levels
}

export interface TileTypeDefinition {
  [key: string]: TileType;
}

// Removed SatisfactionData and OperationalData as they are replaced by Micropolis model

export interface GridTile {
  type: TileType;
  
  // Micropolis-style dynamic data
  population: number; // Current population for RCI zones
  // level: number; // Level is now part of TileType, type itself changes on level up/down
  
  tileValue: number; // Land value / desirability score
  pollution: number; // Pollution level at this tile
  hasRoadAccess: boolean;

  developmentTimerId?: number; // Retaining for potential timed events, though primary growth is tick-based
}

export interface Coordinates {
  x: number;
  y: number;
}

export type GameMode = 'pan' | 'select' | 'build';
export type ViewMode = 'default' | 'tile_value_heatmap' | 'pollution_heatmap'; // Updated view modes
