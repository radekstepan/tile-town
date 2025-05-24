import { Game } from '../Game';
import { TILE_TYPES } from '../../config/tileTypes';
import * as C from '../../config/constants';
import { GridTile } from '../../types';

jest.mock('../../components/MainInfoPanel', () => ({
    MainInfoPanel: jest.fn().mockImplementation(() => ({
        updateDisplay: jest.fn(),
    })),
}));
jest.mock('../../components/BuildToolbar', () => ({
    BuildToolbar: jest.fn().mockImplementation(() => ({
        setupEventListeners: jest.fn(),
        updateSelectedButtonVisuals: jest.fn(),
        updateViewModeButtonText: jest.fn(),
    })),
}));
jest.mock('../../components/MessageBox', () => ({
    MessageBox: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
    })),
}));
jest.mock('../../components/TileInfoPane', () => ({
    TileInfoPane: jest.fn().mockImplementation(() => ({
        update: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
    })),
}));
jest.mock('../Renderer', () => ({
    Renderer: jest.fn().mockImplementation(() => ({
        render: jest.fn(),
    })),
}));
jest.mock('../InputController', () => ({
    InputController: jest.fn().mockImplementation(() => ({
    })),
}));
jest.mock('pixi.js', () => ({
    Application: jest.fn().mockImplementation(() => ({
        stage: { addChild: jest.fn(), removeChildren: jest.fn() },
        ticker: { add: jest.fn(), remove: jest.fn() },
        renderer: { resize: jest.fn(), view: {} }, 
        view: {}, 
    })),
}));


describe('Game Interactions & State', () => {
    let game: Game;
    let setIntervalSpy: jest.SpyInstance;
    let clearIntervalSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        // Spy on the global timer functions
        setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
        clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
        
        game = new Game({}, C.INITIAL_BUDGET); 
        game.gridController.resetGridToGrass();
        game.simulationController.resetMaps();
        game.stopGameLoop(); 
    });

    afterEach(() => {
        jest.clearAllTimers();
        // Restore original timer functions
        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
        jest.restoreAllMocks(); 
    });

    describe('Tool Selection', () => {
        it('should switch to pan mode', () => {
            game.currentMode = 'build'; 
            game.handleToolSelection('pan_toggle', null);
            expect(game.currentMode).toBe('pan');
            expect(game.currentBuildType).toBeNull();
        });

        it('should switch to build mode (inspect) from pan mode', () => {
            game.currentMode = 'pan';
            game.handleToolSelection('pan_toggle', null); 
            expect(game.currentMode).toBe('build');
            expect(game.currentBuildType).toBeNull();
        });

        it('should select a build type', () => {
            game.handleToolSelection('build', TILE_TYPES.ROAD);
            expect(game.currentMode).toBe('build');
            expect(game.currentBuildType!.id).toBe(TILE_TYPES.ROAD.id);
        });
    });

    describe('View Mode', () => {
        it('should cycle through view modes', () => {
            expect(game.currentViewMode).toBe('default');
            
            game.setViewMode('tile_value_heatmap');
            expect(game.currentViewMode).toBe('tile_value_heatmap');

            game.setViewMode('pollution_heatmap');
            expect(game.currentViewMode).toBe('pollution_heatmap');
            
            game.setViewMode('default');
            expect(game.currentViewMode).toBe('default');
        });
    });

    describe('Building Interaction (handleCanvasBuildInteraction)', () => {
        it('should build a road on grass if budget allows', () => {
            game.playerBudget = 100;
            game.currentMode = 'build';
            game.currentBuildType = TILE_TYPES.ROAD;

            const built = game.handleCanvasBuildInteraction(1, 1);
            expect(built).toBe(true);
            expect(game.playerBudget).toBe(100 - TILE_TYPES.ROAD.cost);
            const tile = game.gridController.getTile(1, 1) as GridTile;
            expect(tile.type.id).toBe(TILE_TYPES.ROAD.id);
        });

        it('should not build if budget is insufficient', () => {
            game.playerBudget = 5;
            game.currentMode = 'build';
            game.currentBuildType = TILE_TYPES.ROAD; 

            const built = game.handleCanvasBuildInteraction(1, 1);
            expect(built).toBe(false);
            expect(game.playerBudget).toBe(5);
            const tile = game.gridController.getTile(1, 1) as GridTile;
            expect(tile.type.id).toBe(TILE_TYPES.GRASS.id);
        });

        it('should bulldoze a non-road tile to grass and charge', () => {
            game.playerBudget = 100;
            game.gridController.setTileType(1,1, TILE_TYPES.RESIDENTIAL_ZONE); 
            
            game.currentMode = 'build';
            game.currentBuildType = TILE_TYPES.GRASS;

            const bulldozed = game.handleCanvasBuildInteraction(1, 1);
            expect(bulldozed).toBe(true);
            expect(game.playerBudget).toBe(100 - C.BULLDOZE_COST);
            const tile = game.gridController.getTile(1, 1) as GridTile;
            expect(tile.type.id).toBe(TILE_TYPES.GRASS.id);
        });
        
        it('should bulldoze a road tile to grass for free', () => {
            game.playerBudget = 100;
            game.gridController.setTileType(1,1, TILE_TYPES.ROAD);
            
            game.currentMode = 'build';
            game.currentBuildType = TILE_TYPES.GRASS;

            const bulldozed = game.handleCanvasBuildInteraction(1, 1);
            expect(bulldozed).toBe(true);
            expect(game.playerBudget).toBe(100);
            const tile = game.gridController.getTile(1, 1) as GridTile;
            expect(tile.type.id).toBe(TILE_TYPES.GRASS.id);
        });

        it('should not build on mountains (except grass tool to attempt removal)', () => {
            game.playerBudget = 100;
            game.gridController.setTileType(1,1, TILE_TYPES.MOUNTAIN);
            
            game.currentMode = 'build';
            game.currentBuildType = TILE_TYPES.ROAD;
            expect(game.handleCanvasBuildInteraction(1,1)).toBe(false);
            expect(game.gridController.getTile(1,1)?.type.id).toBe(TILE_TYPES.MOUNTAIN.id);
            
            game.currentBuildType = TILE_TYPES.GRASS; 
            expect(game.handleCanvasBuildInteraction(1,1)).toBe(false);
            expect(game.gridController.getTile(1,1)?.type.id).toBe(TILE_TYPES.MOUNTAIN.id);
        });
    });

    describe('Game Tick', () => {
        it('should increment gameDay and update budget after a game tick', () => {
            game.playerBudget = C.INITIAL_BUDGET;
            game.gridController.setTileType(0,0, TILE_TYPES.ROAD); 

            const initialBudget = game.playerBudget;
            const initialDay = game.gameDay;

            (game as any).gameTick();

            expect(game.gameDay).toBe(initialDay + 1);
            expect(game.playerBudget).toBeLessThan(initialBudget); 
        });

        it('should run game loop using Jest timers', () => {
            game.initializeGame(); 
            expect(setIntervalSpy).toHaveBeenCalledTimes(1);
            expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), C.TEST_GAME_TICK_INTERVAL);

            const initialDay = game.gameDay;
            
            jest.advanceTimersByTime(C.TEST_GAME_TICK_INTERVAL);
            expect(game.gameDay).toBe(initialDay + 1);

            jest.advanceTimersByTime(C.TEST_GAME_TICK_INTERVAL * 2);
            expect(game.gameDay).toBe(initialDay + 3);

            game.stopGameLoop();
            expect(clearIntervalSpy).toHaveBeenCalledTimes(1); // Was called once in beforeEach, once now.
        });
    });
});
