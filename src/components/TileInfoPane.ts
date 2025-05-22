import { GridTile, Coordinates, SatisfactionData, OperationalData } from '../types';

type CloseCallback = () => void;

export class TileInfoPane {
    private element: HTMLElement;
    private tileName: HTMLElement;
    private tileInfoType: HTMLElement;
    private tileInfoCoords: HTMLElement;
    private tileInfoCarryCost: HTMLElement;
    private tileInfoTaxes: HTMLElement;
    private tileInfoPopulation: HTMLElement;
    private tileInfoJobs: HTMLElement;
    private tileInfoSatisfaction: HTMLElement;
    private tileInfoOperation: HTMLElement;
    private closeButton: HTMLButtonElement;

    constructor(paneId: string = 'tileInfoPane') {
        this.element = document.getElementById(paneId) as HTMLElement;
        if (!this.element) throw new Error(`TileInfoPane element with ID "${paneId}" not found.`);
        this.render();

        this.tileName = document.getElementById('tileName') as HTMLElement;
        this.tileInfoType = document.getElementById('tileInfoType') as HTMLElement;
        this.tileInfoCoords = document.getElementById('tileInfoCoords') as HTMLElement;
        this.tileInfoCarryCost = document.getElementById('tileInfoCarryCost') as HTMLElement;
        this.tileInfoTaxes = document.getElementById('tileInfoTaxes') as HTMLElement;
        this.tileInfoPopulation = document.getElementById('tileInfoPopulation') as HTMLElement;
        this.tileInfoJobs = document.getElementById('tileInfoJobs') as HTMLElement;
        this.tileInfoSatisfaction = document.getElementById('tileInfoSatisfaction') as HTMLElement;
        this.tileInfoOperation = document.getElementById('tileInfoOperation') as HTMLElement;
        this.closeButton = document.getElementById('closeInfoPane') as HTMLButtonElement;

        this.hide(); // Initially hidden
    }

    private render(): void {
        this.element.innerHTML = `
            <h3 id="tileName" class="text-lg font-bold mb-2">Tile Info</h3>
            <p>Type: <span id="tileInfoType">N/A</span></p>
            <p>Coords: <span id="tileInfoCoords">N/A</span></p>
            <p>Carry Cost: $<span id="tileInfoCarryCost">N/A</span> / period</p>
            <p>Taxes: $<span id="tileInfoTaxes">N/A</span> / period</p>
            <p>Population: <span id="tileInfoPopulation">N/A</span></p>
            <p>Jobs: <span id="tileInfoJobs">N/A</span></p>
            <p>Satisfaction: <span id="tileInfoSatisfaction">N/A</span></p>
            <p>Operation: <span id="tileInfoOperation">N/A</span></p>
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
        this.tileInfoTaxes.textContent = (tileTypeData.taxRate || 0).toFixed(1);
        this.tileInfoPopulation.textContent = (tileTypeData.population || 0).toString();
        this.tileInfoJobs.textContent = (tileTypeData.jobsProvided || 0).toString();
        
        if (tileTypeData.parentZoneCategory === 'residential' && tileTypeData.isBuilding && tile.satisfactionData) {
            const satData = tile.satisfactionData;
            this.tileInfoSatisfaction.textContent = `${satData.score.toFixed(1)}% (W:${satData.work.toFixed(0)}, P:${satData.parkBonus.toFixed(0)}, H₂O:${satData.waterBonus.toFixed(0)}, M:${satData.mountainBonus.toFixed(0)}, D:${satData.density.toFixed(0)}, E:${satData.employmentPenalty.toFixed(0)}, I:${satData.industrialPenalty.toFixed(0)})`;
            this.tileInfoOperation.textContent = 'N/A';
        } else if ((tileTypeData.parentZoneCategory === 'commercial' || tileTypeData.parentZoneCategory === 'industrial') && tileTypeData.isBuilding && tile.operationalData) {
            const opData = tile.operationalData;
            this.tileInfoOperation.textContent = `${opData.score.toFixed(1)}% (Workers:${opData.workerAccess.toFixed(0)}${tileTypeData.parentZoneCategory === 'commercial' ? `, Cust:${opData.customerAccess.toFixed(0)}` : ''})`;
            this.tileInfoSatisfaction.textContent = 'N/A';
        } else {
            this.tileInfoSatisfaction.textContent = 'N/A';
            this.tileInfoOperation.textContent = 'N/A';
        }
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
