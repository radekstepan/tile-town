// Gameplay Balance - Micropolis Inspired
export const MAX_TILE_VALUE = 255; // Max land value
export const MAX_POLLUTION = 255;  // Max pollution value

// Pollution Constants
export const POLLUTION_PER_INDUSTRIAL_POPULATION_UNIT = 0.1; // Pollution per population unit in an I zone
export const INDUSTRIAL_POLLUTION_SPREAD_RADIUS = 5; // How far direct pollution from I-zones initially adds
export const PARK_POLLUTION_REDUCTION_AMOUNT = 10;
export const PARK_POLLUTION_REDUCTION_RADIUS = 2;
export const POLLUTION_DECAY_FACTOR = 0.98; // Multiplier each tick for natural dissipation
export const POLLUTION_SPREAD_FACTOR = 0.1; // How much pollution spreads to neighbors (e.g. 10% of difference)

// Tile Value Constants
export const BASE_TILE_VALUE = 50;
export const WATER_TILE_VALUE_BONUS = 25;
export const WATER_INFLUENCE_RADIUS = 2;
export const PARK_TILE_VALUE_BONUS = 30;
export const PARK_INFLUENCE_RADIUS = 2;
export const MOUNTAIN_TILE_VALUE_PENALTY = -15; // If directly adjacent
export const ROAD_ADJACENCY_TILE_VALUE_BONUS = 5;
export const POLLUTION_TO_TILE_VALUE_MULTIPLIER = -0.5; // tileValue -= pollution * multiplier

// RCI Proximity Bonuses/Penalties for Tile Value (applied in a small radius, e.g., 1-2 tiles)
export const R_NEAR_C_BONUS = 8;
export const R_NEAR_I_PENALTY = -12;
export const C_NEAR_I_BONUS = 5; // Commercial might benefit slightly from nearby industry for goods/workers

// Zone Growth/Decline Constants
export const CONNECTIVITY_RADIUS = 8; // General radius for RCI needs checks

// Residential (R)
export const R_DENSITY_PENALTY_FACTOR = 0.5; // Penalty per population unit on growthFactor
export const R_GROWTH_THRESHOLD = 100;
export const R_MIN_DESIRABILITY_FOR_GROWTH = 60;
export const R_DECLINE_DESIRABILITY_THRESHOLD = 40;
export const R_MIN_JOB_SCORE_FOR_NO_DECLINE = 10; // If jobScore below this, decline even if desirability is okay
export const R_GROWTH_POPULATION_RATE = 2; // Population increase per tick if growing
export const R_DECLINE_POPULATION_RATE = 1; // Population decrease

// Commercial (C)
export const C_DENSITY_PENALTY_FACTOR = 0.3;
export const C_GROWTH_THRESHOLD = 90;
export const C_MIN_DESIRABILITY_FOR_GROWTH = 55;
export const C_DECLINE_DESIRABILITY_THRESHOLD = 35;
export const C_MIN_CUSTOMER_SCORE_FOR_NO_DECLINE = 15;
export const C_GROWTH_POPULATION_RATE = 1;
export const C_DECLINE_POPULATION_RATE = 1;

// Industrial (I)
export const I_DENSITY_PENALTY_FACTOR = 0.2;
export const I_GROWTH_THRESHOLD = 80;
export const I_MIN_DESIRABILITY_FOR_GROWTH = 30; // Industry tolerates lower desirability
// Industrial decline is more tied to worker access than local desirability
export const I_MIN_WORKER_SCORE_FOR_NO_DECLINE = 20;
export const I_GROWTH_POPULATION_RATE = 3; // Industry might grow faster in terms of "capacity"
export const I_DECLINE_POPULATION_RATE = 2;

// General
export const MAX_ZONE_LEVEL = 3;

// Old constants - review and remove/update if necessary
export const MAX_SATISFACTION = 100; // This concept is changing
export const SATISFACTION_LOW_THRESHOLD = 35;
export const SATISFACTION_HIGH_THRESHOLD = 65;
export const SATISFACTION_VISUAL_CHANGE_THRESHOLD = 2; // Will be replaced by level changes
export const LOW_EMPLOYMENT_THRESHOLD = 70;
export const LOW_EMPLOYMENT_SATISFACTION_PENALTY = -15; // Employment will affect growth factors directly

export const WORK_PROXIMITY_RADIUS = 5; // Replaced by CONNECTIVITY_RADIUS and jobScore
export const WORK_PROXIMITY_MAX_BONUS = 25;
export const NATURE_PROXIMITY_RADIUS = 4; // Replaced by specific influence radii for tile value
// export const PARK_PROXIMITY_BONUS = 15; // Now PARK_TILE_VALUE_BONUS
// export const WATER_PROXIMITY_BONUS = 10; // Now WATER_TILE_VALUE_BONUS
// export const MOUNTAIN_PROXIMITY_BONUS = 5; // Now MOUNTAIN_TILE_VALUE_PENALTY
export const INDUSTRIAL_POLLUTION_RADIUS = 4; // Replaced by pollution map mechanics
export const INDUSTRIAL_POLLUTION_PENALTY_MAX = -20;

export const DENSITY_RADIUS = 2;
export const DENSITY_IDEAL_MIN = 2;
export const DENSITY_IDEAL_MAX = 4;
export const DENSITY_BONUS = 15;
export const DENSITY_PENALTY_LOW = -10;
export const DENSITY_PENALTY_HIGH = -15;

export const MAX_OPERATIONAL_SCORE = 100; // This concept is changing
export const OP_LOW_THRESHOLD = 35;
export const OP_HIGH_THRESHOLD = 65;
export const OPERATIONAL_VISUAL_CHANGE_THRESHOLD = 2; // Will be replaced by level changes
export const WORKER_ACCESS_RADIUS = 6; // Replaced by CONNECTIVITY_RADIUS and workerScore
export const WORKER_ACCESS_MAX_BONUS = 50;
export const CUSTOMER_ACCESS_RADIUS = 7; // Replaced by CONNECTIVITY_RADIUS and customerScore
export const CUSTOMER_ACCESS_MAX_BONUS = 50;


// Grid & Rendering - Keep as is unless Micropolis implies changes
export const GRID_SIZE_X = 25;
export const GRID_SIZE_Y = 25;
export const TILE_WIDTH_ISO = 64;
export const TILE_HEIGHT_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_WIDTH_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_HEIGHT_ISO = TILE_HEIGHT_ISO / 2;
export const TILE_DEPTH_UNIT = TILE_HEIGHT_ISO * 0.75;
export const GAME_TICK_INTERVAL = 2000; // Faster ticks for more responsive simulation

export const INITIAL_BUDGET = 5000; // Increased budget for more initial options
