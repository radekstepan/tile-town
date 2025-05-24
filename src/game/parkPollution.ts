// inside _applyParkReduction, when park is at (x,y) and it iterates to check (nx,ny)
const targetTile = this.gridController.getTile(nx, ny);
if(targetTile && !targetTile.type.isObstacle) { // <<< THIS CHECK
    landMap[ny][nx] -= C.PARK_POLLUTION_REDUCTION_AMOUNT / (dist + 1);
}
