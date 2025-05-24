import { getTileCoordinatesFromScreenPoint } from '../geometryUtils';
import { TILE_HALF_WIDTH_ISO, TILE_HALF_HEIGHT_ISO, GRID_SIZE_X, GRID_SIZE_Y } from '../../config/constants';

describe('Geometry Utilities', () => {
    describe('getTileCoordinatesFromScreenPoint', () => {
        const getScreenPointForTile = (gridX: number, gridY: number, cameraOffsetX: number, cameraOffsetY: number) => {
            const worldX = (gridX - gridY) * TILE_HALF_WIDTH_ISO;
            const worldY = (gridX + gridY) * TILE_HALF_HEIGHT_ISO;
            return {
                // Click in the center of the diamond's top face for reliability
                canvasMouseX: worldX + cameraOffsetX, 
                canvasMouseY: worldY + TILE_HALF_HEIGHT_ISO + cameraOffsetY,
            };
        };

        it('should return correct tile coordinates for a point within grid boundaries', () => {
            const camX = 100, camY = 50;
            const targetGridX = 5, targetGridY = 5;
            const { canvasMouseX, canvasMouseY } = getScreenPointForTile(targetGridX, targetGridY, camX, camY);
            
            const coords = getTileCoordinatesFromScreenPoint(canvasMouseX, canvasMouseY, camX, camY);
            expect(coords).not.toBeNull();
            expect(coords!.x).toBe(targetGridX);
            expect(coords!.y).toBe(targetGridY);
        });

        it('should return null for a point outside grid boundaries', () => {
            expect(getTileCoordinatesFromScreenPoint(-1000, 200, 0, 0)).toBeNull();
            expect(getTileCoordinatesFromScreenPoint(200, -1000, 0, 0)).toBeNull();

            const screenForNegX = getScreenPointForTile(-1, 5, 0, 0);
            const coordsNegX = getTileCoordinatesFromScreenPoint(screenForNegX.canvasMouseX, screenForNegX.canvasMouseY, 0, 0);
            expect(coordsNegX === null || coordsNegX.x < 0).toBeTruthy();

            const screenForTooLargeY = getScreenPointForTile(5, GRID_SIZE_Y, 0, 0);
            const coordsTooLargeY = getTileCoordinatesFromScreenPoint(screenForTooLargeY.canvasMouseX, screenForTooLargeY.canvasMouseY, 0, 0);
            expect(coordsTooLargeY === null || coordsTooLargeY.y >= GRID_SIZE_Y).toBeTruthy();
        });

        it('should handle camera offsets correctly', () => {
            const camX = 500, camY = 300;
            const targetGridX = 10, targetGridY = 8;
            const { canvasMouseX, canvasMouseY } = getScreenPointForTile(targetGridX, targetGridY, camX, camY);

            const coords = getTileCoordinatesFromScreenPoint(canvasMouseX, canvasMouseY, camX, camY);
            expect(coords).not.toBeNull();
            expect(coords!.x).toBe(targetGridX);
            expect(coords!.y).toBe(targetGridY);
        });

        it('should return coordinates for edge cases like (0,0)', () => {
            const camX = 0, camY = 0;
            const targetGridX = 0, targetGridY = 0;
            const { canvasMouseX, canvasMouseY } = getScreenPointForTile(targetGridX, targetGridY, camX, camY);
            
            const coords = getTileCoordinatesFromScreenPoint(canvasMouseX, canvasMouseY, camX, camY);
            expect(coords).not.toBeNull();
            expect(coords!.x).toBe(targetGridX);
            expect(coords!.y).toBe(targetGridY);
        });
        
        it('should return correct coordinates for various points on the grid', () => {
            const testPoints = [
                { x: 1, y: 1 }, { x: GRID_SIZE_X - 1, y: GRID_SIZE_Y - 1 },
                { x: Math.floor(GRID_SIZE_X/2), y: Math.floor(GRID_SIZE_Y/2) },
                { x: 0, y: GRID_SIZE_Y - 1 }, { x: GRID_SIZE_X - 1, y: 0 }
            ];
            const camX = 20, camY = 30;

            for (const p of testPoints) {
                const { canvasMouseX, canvasMouseY } = getScreenPointForTile(p.x, p.y, camX, camY);
                const coords = getTileCoordinatesFromScreenPoint(canvasMouseX, canvasMouseY, camX, camY);
                expect(coords).not.toBeNull();
                expect(coords!.x).toBe(p.x);
                expect(coords!.y).toBe(p.y);
            }
        });
    });
});
