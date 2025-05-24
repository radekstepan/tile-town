else if (neighborTile.type.id === TILE_TYPES.PARK.id || neighborTile.type.id === TILE_TYPES.NATURAL_PARK.id) {
    neighborPollutionSum += landMap[ny][nx] * C.PARK_SPREAD_DAMPENING_FACTOR; // landMap[ny][nx] is pollution ON THE PARK TILE
    effectiveNeighborCountForSpread++;
}
