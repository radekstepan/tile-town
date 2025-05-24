// Gameplay Balance - Micropolis Inspired
export const MAX_TILE_VALUE = 255; // Max land value
export const MAX_POLLUTION = 255;  // Max pollution value

// Pollution Constants
export const POLLUTION_PER_INDUSTRIAL_POPULATION_UNIT = 6.5;
export const PARK_POLLUTION_REDUCTION_AMOUNT = 15;
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
export const CITY_HALL_TILE_VALUE_BONUS = 60; // Increased: Max bonus directly adjacent to City Hall
export const CITY_HALL_INFLUENCE_RADIUS = 5;  // Increased: How far the City Hall's land value bonus reaches
export const POLLUTION_TO_TILE_VALUE_MULTIPLIER = -2; 
export const INDUSTRIAL_ZONE_POLLUTION_TO_OWN_TILE_VALUE_MULTIPLIER = -0.15; 

// RCI Proximity Bonuses/Penalties for Tile Value
export const R_NEAR_C_BONUS = 10;
export const R_NEAR_I_PENALTY = -8; 
export const C_NEAR_I_BONUS = 7;   

// Zone Growth/Decline Constants
export const CONNECTIVITY_RADIUS = 8; 

// Residential (R)
export const R_DENSITY_PENALTY_FACTOR = 0.5; 
export const R_GROWTH_THRESHOLD = 70; 
export const R_MIN_DESIRABILITY_FOR_GROWTH = 40; 
export const R_DECLINE_DESIRABILITY_THRESHOLD = 20; 
export const R_MIN_JOB_SCORE_FOR_NO_DECLINE = 3;  
export const R_GROWTH_POPULATION_RATE = 2; 
export const R_DECLINE_POPULATION_RATE = 1; 

// Commercial (C)
export const C_DENSITY_PENALTY_FACTOR = 0.15; 
export const C_GROWTH_THRESHOLD = 40; 
export const C_MIN_DESIRABILITY_FOR_GROWTH = 25; 
export const C_DECLINE_DESIRABILITY_THRESHOLD = 5;  
export const C_MIN_CUSTOMER_SCORE_FOR_NO_DECLINE = 2; 
export const C_MIN_GOODS_ACCESS_FOR_NO_DECLINE = 1;   
export const C_GROWTH_POPULATION_RATE = 4; 
export const C_DECLINE_POPULATION_RATE = 1;

// Industrial (I)
export const I_DENSITY_PENALTY_FACTOR = 0.1; 
export const I_GROWTH_THRESHOLD = 35; 
export const I_MIN_DESIRABILITY_FOR_GROWTH = 15; 
export const I_DECLINE_DESIRABILITY_THRESHOLD = 3;  
export const I_MIN_WORKER_SCORE_FOR_NO_DECLINE = 2;  
export const I_MIN_MARKET_ACCESS_FOR_NO_DECLINE = 1; 
export const I_GROWTH_POPULATION_RATE = 5; 
export const I_DECLINE_POPULATION_RATE = 1; 

// Tax Modifier Thresholds
export const R_TAX_DESIRABILITY_THRESHOLD_SEVERE = 30;
export const R_TAX_DESIRABILITY_THRESHOLD_LOW = 50;
export const CI_TAX_POPULATION_RATIO_SEVERE = 0.2; 
export const CI_TAX_POPULATION_RATIO_LOW = 0.5;  
export const STRUGGLING_TAX_MULTIPLIER = 0.25;

// Visual Struggle Constants
export const STRUGGLE_VISUAL_THRESHOLD_TICKS = 3;
export const R_VISUAL_STRUGGLE_TILE_VALUE_THRESHOLD = 25;
export const CI_VISUAL_STRUGGLE_POPULATION_RATIO_THRESHOLD = 0.20; 

// General
export const MAX_ZONE_LEVEL = 3;
export const BULLDOZE_COST = 5;

// Grid & Rendering
export const GRID_SIZE_X = 25;
export const GRID_SIZE_Y = 25;
export const TILE_WIDTH_ISO = 64;
export const TILE_HEIGHT_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_WIDTH_ISO = TILE_WIDTH_ISO / 2;
export const TILE_HALF_HEIGHT_ISO = TILE_HEIGHT_ISO / 2;
export const TILE_DEPTH_UNIT = TILE_HEIGHT_ISO * 0.75;
export const GAME_TICK_INTERVAL = 2000; 
export const TEST_GAME_TICK_INTERVAL = 10;

export const INITIAL_BUDGET = 3000;
