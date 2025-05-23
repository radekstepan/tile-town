import { GridTile, Coordinates } from '../types'; // Removed SatisfactionData, OperationalData

type CloseCallback = () => void;

export class TileInfoPane {
    private element: HTMLElement;
    private tileName: HTMLElement;
    private tileInfoType: HTMLElement;
    private tileInfoCoords: HTMLElement;
    private tileInfoCarryCost: HTMLElement;
    private tileInfoPopulation: HTMLElement; // Now dynamic
    private tileInfoLevel: HTMLElement; // New: for RCI level
    private tileInfoJobs: HTMLElement; // Can be dynamic
    private tileInfoTileValue: HTMLElement; // New: land value
    private tileInfoPollution: HTMLElement; // New: pollution
    private tileInfoRoadAccess: HTMLElement; // New: road access
    private closeButton: HTMLButtonElement;

    constructor(paneId: string = 'tileInfoPane') {
        this.element = document.getElementById(paneId) as HTMLElement;
        if (!this.element) throw new Error(`TileInfoPane element with ID "${paneId}" not found.`);
        this.render();

        this.tileName = document.getElementById('tileName') as HTMLElement;
        this.tileInfoType = document.getElementById('tileInfoType') as HTMLElement;
        this.tileInfoCoords = document.getElementById('tileInfoCoords') as HTMLElement;
        this.tileInfoCarryCost = document.getElementById('tileInfoCarryCost') as HTMLElement;
        this.tileInfoPopulation = document.getElementById('tileInfoPopulation') as HTMLElement;
        this.tileInfoLevel = document.getElementById('tileInfoLevel') as HTMLElement;
        this.tileInfoJobs = document.getElementById('tileInfoJobs') as HTMLElement;
        this.tileInfoTileValue = document.getElementById('tileInfoTileValue') as HTMLElement;
        this.tileInfoPollution = document.getElementById('tileInfoPollution') as HTMLElement;
        this.tileInfoRoadAccess = document.getElementById('tileInfoRoadAccess') as HTMLElement;
        this.closeButton = document.getElementById('closeInfoPane') as HTMLButtonElement;

        this.hide(); // Initially hidden
    }

    private render(): void {
        this.element.innerHTML = `
            <h3 id="tileName" class="text-lg font-bold mb-2">Tile Info</h3>
            <p>Type: <span id="tileInfoType">N/A</span></p>
            <p>Coords: <span id="tileInfoCoords">N/A</span></p>
            <p>Population: <span id="tileInfoPopulation">N/A</span></p>
            <p>Level: <span id="tileInfoLevel">N/A</span></p>
            <p>Jobs: <span id="tileInfoJobs">N/A</span></p>
            <p>Tile Value: <span id="tileInfoTileValue">N/A</span></p>
            <p>Pollution: <span id="tileInfoPollution">N/A</span></p>
            <p>Road Access: <span id="tileInfoRoadAccess">N/A</span></p>
            <p>Carry Cost: $<span id="tileInfoCarryCost">N/A</span> / period</p>
            <button id="closeInfoPane">Close</button>
        `;
    }
    
    public setupCloseButton(onClose: CloseCallback): void {
        this.closeButton.addEventListener('click', onClose);
    }

    public update(tile: GridTile, coords: Coordinates): void {
        const tileTypeData = tile.type;

        this.tileName.textContent = tileTypeData.name;
        this.tileInfoType.textContent = tileTypeData.name;
        this.tileInfoCoords.textContent = `${coords.x}, ${coords.y}`;
        this.tileInfoCarryCost.textContent = (tileTypeData.carryCost || 0).toFixed(1);
        
        this.tileInfoPopulation.textContent = tile.population.toString();
        this.tileInfoLevel.textContent = (tileTypeData.level || (tileTypeData.isDevelopableZone ? 0 : 'N/A')).toString();
        this.tileInfoJobs.textContent = (tileTypeData.jobsProvided || 0).toString(); // Could be dynamic later

        this.tileInfoTileValue.textContent = tile.tileValue.toFixed(1);
        this.tileInfoPollution.textContent = tile.pollution.toFixed(1);
        this.tileInfoRoadAccess.textContent = tile.hasRoadAccess ? 'Yes' : 'No';

        // Hide fields that are not applicable
        (this.tileInfoPopulation.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory) ? 'block' : 'none';
        (this.tileInfoLevel.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory) ? 'block' : 'none';
        (this.tileInfoJobs.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory === 'commercial' || tileTypeData.zoneCategory === 'industrial') ? 'block' : 'none';
    }

    public show(): void {
        this.element.style.display = 'block';
    }

    public hide(): void {
        this.element.style.display = 'none';
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
