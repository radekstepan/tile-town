export interface TileType {
  id: string;
  color: string;
  name: string;
  cost: number;
  renderHeight: number;
  carryCost: number;
  taxRate: number;
  population: number;
  jobsProvided: number;
  isNature?: boolean;
  isObstacle?: boolean;
  isZone?: boolean;
  developsInto?: string; // Key of another TILE_TYPE
  category?: 'residential' | 'commercial' | 'industrial';
  isBuilding?: boolean;
  parentZoneCategory?: 'residential' | 'commercial' | 'industrial';
  revertsTo?: string; // Key of another TILE_TYPE
  visualLevel?: 'LOW' | 'MED' | 'HIGH';
}

export interface TileTypeDefinition {
  [key: string]: TileType;
}

export interface SatisfactionData {
  score: number;
  currentTargetVisualLevel: 'LOW' | 'MED' | 'HIGH';
  ticksInCurrentTargetLevel: number;
  work: number;
  nature: number;
  density: number;
  parkBonus: number;
  waterBonus: number;
  mountainBonus: number;
  employmentPenalty: number;
  industrialPenalty: number;
}

export interface OperationalData {
  score: number;
  currentTargetVisualLevel: 'LOW' | 'MED' | 'HIGH';
  ticksInCurrentTargetLevel: number;
  workerAccess: number;
  customerAccess: number; // Relevant for commercial
}

export interface GridTile {
  type: TileType;
  satisfactionData?: SatisfactionData;
  operationalData?: OperationalData;
  developmentTimerId?: number; // Store setTimeout ID
}

export interface Coordinates {
  x: number;
  y: number;
}

export type GameMode = 'pan' | 'select' | 'build';
export type ViewMode = 'default' | 'satisfaction_heatmap';
