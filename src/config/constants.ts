// Gameplay Balance - Micropolis Inspired
export const MAX_TILE_VALUE = 255; // Max land value
export const MAX_POLLUTION = 255;  // Max pollution value

// Pollution Constants
export const POLLUTION_PER_INDUSTRIAL_POPULATION_UNIT = 8.0;
export const PARK_POLLUTION_REDUCTION_AMOUNT = 10;
export const PARK_POLLUTION_REDUCTION_RADIUS = 2;
export const POLLUTION_DECAY_FACTOR = 0.98;
export const POLLUTION_SPREAD_FACTOR = 0.1;

export const PARK_SPREAD_DAMPENING_FACTOR = 0.05;

// New Water Pollution Constants
export const WATER_POLLUTION_DECAY_FACTOR = 0.99;
export const INDUSTRIAL_POLLUTION_TRANSFER_TO_WATER_FACTOR = 0.2;
export const WATER_POLLUTION_SPREAD_FACTOR = 0.30; 
export const WATER_POLLUTION_AFFECTS_LAND_RADIUS = 2;
export const WATER_POLLUTION_TO_LAND_FACTOR = 0.05;

// New Mountain Interaction Constants
export const MOUNTAIN_POLLUTION_REFLECTION_FACTOR = 0.25;


// Tile Value Constants
export const BASE_TILE_VALUE = 100;
export const WATER_TILE_VALUE_BONUS = 25;
export const WATER_INFLUENCE_RADIUS = 2;
export const PARK_TILE_VALUE_BONUS = 30;
export const PARK_INFLUENCE_RADIUS = 2;
export const MOUNTAIN_TILE_VALUE_BONUS = 10;
export const ROAD_ADJACENCY_TILE_VALUE_BONUS = 5;
export const POLLUTION_TO_TILE_VALUE_MULTIPLIER = -2; // General negative impact
export const INDUSTRIAL_ZONE_POLLUTION_TO_OWN_TILE_VALUE_MULTIPLIER = -0.15; // Industrial zones care less about their own pollution for their own tile value

// RCI Proximity Bonuses/Penalties for Tile Value (applied in a small radius, e.g., 1-2 tiles)
export const R_NEAR_C_BONUS = 8;
export const R_NEAR_I_PENALTY = -12; // Residential near Industrial
export const C_NEAR_I_BONUS = 5;   // Commercial near Industrial

// Zone Growth/Decline Constants
export const CONNECTIVITY_RADIUS = 8;

// Residential (R)
export const R_DENSITY_PENALTY_FACTOR = 0.5;
export const R_GROWTH_THRESHOLD = 100;
export const R_MIN_DESIRABILITY_FOR_GROWTH = 60;
export const R_DECLINE_DESIRABILITY_THRESHOLD = 25; 
export const R_MIN_JOB_SCORE_FOR_NO_DECLINE = 5;  
export const R_GROWTH_POPULATION_RATE = 2;
export const R_DECLINE_POPULATION_RATE = 1;

// Commercial (C)
export const C_DENSITY_PENALTY_FACTOR = 0.3;
export const C_GROWTH_THRESHOLD = 90;
export const C_MIN_DESIRABILITY_FOR_GROWTH = 55;
export const C_DECLINE_DESIRABILITY_THRESHOLD = 20; 
export const C_MIN_CUSTOMER_SCORE_FOR_NO_DECLINE = 8; 
export const C_MIN_GOODS_ACCESS_FOR_NO_DECLINE = 5; 
export const C_GROWTH_POPULATION_RATE = 1;
export const C_DECLINE_POPULATION_RATE = 1;

// Industrial (I)
export const I_DENSITY_PENALTY_FACTOR = 0.2;
export const I_GROWTH_THRESHOLD = 80;
export const I_MIN_DESIRABILITY_FOR_GROWTH = 30; // Industrial zones require this tile value to grow/sustain
export const I_DECLINE_DESIRABILITY_THRESHOLD = 15; // If tile value (desirability) drops below this, they decline
export const I_MIN_WORKER_SCORE_FOR_NO_DECLINE = 10; 
export const I_MIN_MARKET_ACCESS_FOR_NO_DECLINE = 5; 
export const I_GROWTH_POPULATION_RATE = 3;
export const I_DECLINE_POPULATION_RATE = 1; 

// Tax Modifier Thresholds (lower value = lower tax) - Made stricter
export const R_TAX_DESIRABILITY_THRESHOLD_SEVERE = 30;
export const R_TAX_DESIRABILITY_THRESHOLD_LOW = 50;
export const CI_TAX_POPULATION_RATIO_SEVERE = 0.3;
export const CI_TAX_POPULATION_RATIO_LOW = 0.6;
export const STRUGGLING_TAX_MULTIPLIER = 0.25;

// Visual Struggle Constants
export const STRUGGLE_VISUAL_THRESHOLD_TICKS = 3;
export const R_VISUAL_STRUGGLE_TILE_VALUE_THRESHOLD = 25;
export const CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD = 0.25;

// General
export const MAX_ZONE_LEVEL = 3;
export const BULLDOZE_COST = 5;

// Old constants - review and remove/update if necessary
export const MAX_SATISFACTION = 100;
export const SATISFACTION_LOW_THRESHOLD = 35;
export const SATISFACTION_HIGH_THRESHOLD = 65;
export const SATISFACTION_VISUAL_CHANGE_THRESHOLD = 2;
export const LOW_EMPLOYMENT_THRESHOLD = 70;
export const LOW_EMPLOYMENT_SATISFACTION_PENALTY = -15;

export const WORK_PROXIMITY_RADIUS = 5;
export const WORK_PROXIMITY_MAX_BONUS = 25;
export const NATURE_PROXIMITY_RADIUS = 4;
export const INDUSTRIAL_POLLUTION_PENALTY_MAX = -20;

export const DENSITY_RADIUS = 2;
export const DENSITY_IDEAL_MIN = 2;
export const DENSITY_IDEAL_MAX = 4;
export const DENSITY_BONUS = 15;
export const DENSITY_PENALTY_LOW = -10;
export const DENSITY_PENALTY_HIGH = -15;

export const MAX_OPERATIONAL_SCORE = 100;
export const OP_LOW_THRESHOLD = 35;
export const OP_HIGH_THRESHOLD = 65;
export const OPERATIONAL_VISUAL_CHANGE_THRESHOLD = 2;
export const WORKER_ACCESS_RADIUS = 6;
export const WORKER_ACCESS_MAX_BONUS = 50;
export const CUSTOMER_ACCESS_RADIUS = 7;
export const CUSTOMER_ACCESS_MAX_BONUS = 50;


// Grid & Rendering
export const GRID_SIZE_X = 25;
export const GRID_SIZE_Y = 25;
export const TILE_WIDTH_ISO = 64;
export const TILE_HEIGHT_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_WIDTH_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_HEIGHT_ISO = TILE_HEIGHT_ISO / 2;
export const TILE_DEPTH_UNIT = TILE_HEIGHT_ISO * 0.75;
export const GAME_TICK_INTERVAL = 2000; // For simulation logic
export const TEST_GAME_TICK_INTERVAL = 10; // For faster tests if intervals matter

export const INITIAL_BUDGET = 3000;
