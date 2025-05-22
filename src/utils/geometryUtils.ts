import { Coordinates } from '../types';
import { TILE_HALF_WIDTH_ISO, TILE_HALF_HEIGHT_ISO, GRID_SIZE_X, GRID_SIZE_Y } from '../config/constants';

export function getTileCoordinatesFromScreenPoint(
    canvasMouseX: number,
    canvasMouseY: number,
    cameraOffsetX: number,
    cameraOffsetY: number
): Coordinates | null {
    const worldMouseX = canvasMouseX - cameraOffsetX;
    const worldMouseY = canvasMouseY - cameraOffsetY;

    const mapX = (worldMouseX / TILE_HALF_WIDTH_ISO) + (worldMouseY / TILE_HALF_HEIGHT_ISO);
    const mapY = (worldMouseY / TILE_HALF_HEIGHT_ISO) - (worldMouseX / TILE_HALF_WIDTH_ISO);

    const gridX = Math.floor(mapX / 2.0);
    const gridY = Math.floor(mapY / 2.0);

    if (gridX >= 0 && gridX < GRID_SIZE_X && gridY >= 0 && gridY < GRID_SIZE_Y) {
        return { x: gridX, y: gridY };
    }
    return null;
}
