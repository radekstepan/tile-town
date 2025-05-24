import { GridTile, Coordinates } from '../types';

// type CloseCallback = () => void; // Close button is removed

export class TileInfoPane {
    private element: HTMLElement;
    private tileName: HTMLElement;
    private tileInfoType: HTMLElement;
    private tileInfoCoords: HTMLElement;
    private tileInfoCarryCost: HTMLElement;
    private tileInfoPopulation: HTMLElement; 
    private tileInfoLevel: HTMLElement; 
    private tileInfoJobs: HTMLElement; 
    private healthMetricContainer: HTMLElement; 
    private tileInfoHealthMetricLabel: HTMLElement;
    private tileInfoHealthMetricValue: HTMLElement;
    private tileInfoTileValue: HTMLElement; 
    private tileInfoPollution: HTMLElement; 
    private tileInfoRoadAccess: HTMLElement; 
    // private closeButton: HTMLButtonElement; // Removed close button

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
        
        this.healthMetricContainer = document.getElementById('healthMetricContainer') as HTMLElement;
        this.tileInfoHealthMetricLabel = document.getElementById('tileInfoHealthMetricLabel') as HTMLElement;
        this.tileInfoHealthMetricValue = document.getElementById('tileInfoHealthMetricValue') as HTMLElement;
        
        this.tileInfoTileValue = document.getElementById('tileInfoTileValue') as HTMLElement;
        this.tileInfoPollution = document.getElementById('tileInfoPollution') as HTMLElement;
        this.tileInfoRoadAccess = document.getElementById('tileInfoRoadAccess') as HTMLElement;
        // this.closeButton = document.getElementById('closeInfoPane') as HTMLButtonElement; // Removed

        this.hide(); // Initially hidden, shown on hover
    }

    private render(): void {
        // Removed close button from HTML
        this.element.innerHTML = `
            <h3 id="tileName" class="text-lg font-bold mb-2">Tile Info</h3>
            <p>Type: <span id="tileInfoType">N/A</span></p>
            <p>Coords: <span id="tileInfoCoords">N/A</span></p>
            <p>Population: <span id="tileInfoPopulation">N/A</span></p>
            <p>Level: <span id="tileInfoLevel">N/A</span></p>
            <p>Jobs Provided: <span id="tileInfoJobs">N/A</span></p>
            <div id="healthMetricContainer" style="display: none;"><span id="tileInfoHealthMetricLabel" class="font-semibold">Health:</span> <span id="tileInfoHealthMetricValue">N/A</span></div>
            <p>Tile Value: <span id="tileInfoTileValue">N/A</span></p>
            <p>Pollution: <span id="tileInfoPollution">N/A</span></p>
            <p>Road Access: <span id="tileInfoRoadAccess">N/A</span></p>
            <p>Carry Cost: $<span id="tileInfoCarryCost">N/A</span> / period</p>
        `;
    }
    
    // public setupCloseButton(onClose: CloseCallback): void { // Method removed
    //     this.closeButton.addEventListener('click', onClose);
    // }

    public update(tile: GridTile, coords: Coordinates): void {
        const tileTypeData = tile.type;

        this.tileName.textContent = tileTypeData.name;
        this.tileInfoType.textContent = tileTypeData.name;
        this.tileInfoCoords.textContent = `${coords.x}, ${coords.y}`;
        this.tileInfoCarryCost.textContent = (tileTypeData.carryCost || 0).toFixed(1);
        
        this.tileInfoPopulation.textContent = tile.population.toString();
        this.tileInfoLevel.textContent = (tileTypeData.level || (tileTypeData.isDevelopableZone ? 0 : 'N/A')).toString();
        this.tileInfoJobs.textContent = (tileTypeData.jobsProvided || 0).toString(); 

        this.tileInfoTileValue.textContent = tile.tileValue.toFixed(1);
        this.tileInfoPollution.textContent = tile.pollution.toFixed(1);
        this.tileInfoRoadAccess.textContent = tile.hasRoadAccess ? 'Yes' : 'No';

        // Show Efficiency for Commercial/Industrial, otherwise hide the healthMetricContainer
        if ((tileTypeData.zoneCategory === 'commercial' || tileTypeData.zoneCategory === 'industrial') && tileTypeData.level && tileTypeData.populationCapacity) {
            this.healthMetricContainer.style.display = 'block';
            this.tileInfoHealthMetricLabel.textContent = 'Efficiency:';
            const efficiency = tileTypeData.populationCapacity > 0 ? (tile.population / tileTypeData.populationCapacity * 100) : 0;
            this.tileInfoHealthMetricValue.textContent = `${efficiency.toFixed(0)}%`;
        } else {
            this.healthMetricContainer.style.display = 'none';
        }

        (this.tileInfoPopulation.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory) ? 'block' : 'none';
        (this.tileInfoLevel.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory) ? 'block' : 'none';
        (this.tileInfoJobs.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory === 'commercial' || tileTypeData.zoneCategory === 'industrial') ? 'block' : 'none';
        
        // Make Tile Value always visible
        (this.tileInfoTileValue.parentElement as HTMLElement).style.display = 'block'; 
        
        // Keep Pollution visibility conditional for now, as it might not apply to all non-zone tiles meaningfully (e.g. pristine water/mountain)
        // Or, make it always visible if all tiles can have pollution. For now, retaining existing logic.
        (this.tileInfoPollution.parentElement as HTMLElement).style.display = (tileTypeData.zoneCategory || tileTypeData.isDevelopableZone) ? 'block' : 'none'; 
    }

    public show(): void { // Removed isHoverPreview parameter
        this.element.style.display = 'block';
        // this.closeButton.style.display = isHoverPreview ? 'none' : 'block'; // Logic removed
    }

    public hide(): void {
        this.element.style.display = 'none';
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
