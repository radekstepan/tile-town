import { GameMode, TileType, ViewMode } from '../types';
import { TILE_TYPES } from '../config/tileTypes';

type ToolSelectCallback = (toolAction: string, tileType: TileType | null) => void; // toolAction: 'pan_toggle', 'build', 'view_mode_cycle'
type ViewModeToggleCallback = (newMode: ViewMode) => void; 

export class BuildToolbar {
    private element: HTMLElement;
    private viewModeButton: HTMLButtonElement;
    private currentViewMode: ViewMode = 'default'; 

    constructor(toolbarId: string = 'buildToolbar') {
        this.element = document.getElementById(toolbarId) as HTMLElement;
        if (!this.element) throw new Error(`BuildToolbar element with ID "${toolbarId}" not found.`);
        this.render();
        this.viewModeButton = document.getElementById('viewModeButton') as HTMLButtonElement;
    }

    private render(): void {
        // data-type is the general action identifier.
        // data-tilekey now stores the EXACT key for TILE_TYPES object.
        this.element.innerHTML = `
            <button class="build-button pan-button" data-type="pan"><span class="icon-span">✥</span>Pan</button>
            <button class="build-button view-mode-button" id="viewModeButton" data-type="view_mode"><span class="icon-span">👁</span>View: Default</button>
            
            <div class="toolbar-separator"></div>

            <button class="build-button grass" data-type="grass" data-tilekey="GRASS">Grass (Clear/$${TILE_TYPES.GRASS.cost})</button>
            <button class="build-button water" data-type="water" data-tilekey="WATER">Water ($${TILE_TYPES.WATER.cost})</button>
            <button class="build-button road" data-type="road" data-tilekey="ROAD">Road ($${TILE_TYPES.ROAD.cost})</button>
            <button class="build-button park" data-type="park" data-tilekey="PARK">Park ($${TILE_TYPES.PARK.cost})</button>
            <button class="build-button residential" data-type="residential_zone" data-tilekey="RESIDENTIAL_ZONE">Res. Zone ($${TILE_TYPES.RESIDENTIAL_ZONE.cost})</button>
            <button class="build-button commercial" data-type="commercial_zone" data-tilekey="COMMERCIAL_ZONE">Com. Zone ($${TILE_TYPES.COMMERCIAL_ZONE.cost})</button>
            <button class="build-button industrial" data-type="industrial_zone" data-tilekey="INDUSTRIAL_ZONE">Ind. Zone ($${TILE_TYPES.INDUSTRIAL_ZONE.cost})</button>
        `;
    }

    public setupEventListeners(
        onToolSelect: ToolSelectCallback, 
        onViewModeToggle: ViewModeToggleCallback
    ): void {
        const buttons = this.element.querySelectorAll<HTMLButtonElement>('.build-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const toolActionType = button.dataset.type; 
                if (!toolActionType) return;

                if (toolActionType === 'view_mode') {
                    if (this.currentViewMode === 'default') this.currentViewMode = 'tile_value_heatmap';
                    else if (this.currentViewMode === 'tile_value_heatmap') this.currentViewMode = 'pollution_heatmap';
                    else this.currentViewMode = 'default';
                    onViewModeToggle(this.currentViewMode); 
                } else if (toolActionType === 'pan') { 
                    onToolSelect('pan_toggle', null); 
                } else { // Build modes
                    const tileKey = button.dataset.tilekey; // Use data-tilekey
                    if (tileKey && TILE_TYPES[tileKey]) { 
                        onToolSelect('build', TILE_TYPES[tileKey]);
                    } else {
                        console.error("Unknown build type or missing tileKey for button with data-type:", toolActionType, "and data-tilekey:", tileKey);
                    }
                }
            });
        });
    }

    public updateViewModeButtonText(viewMode: ViewMode): void {
        this.currentViewMode = viewMode; 
        const iconSpan = `<span class="icon-span">👁</span>`;
        if (viewMode === 'tile_value_heatmap') {
            this.viewModeButton.innerHTML = `${iconSpan}View: Tile Value`;
        } else if (viewMode === 'pollution_heatmap') {
            this.viewModeButton.innerHTML = `${iconSpan}View: Pollution`;
        } else {
            this.viewModeButton.innerHTML = `${iconSpan}View: Default`;
        }
    }
    
    public updateSelectedButtonVisuals(currentMode: GameMode, currentBuildType: TileType | null): void {
        this.element.querySelectorAll<HTMLButtonElement>('.build-button').forEach(btn => {
            btn.classList.remove('selected');
            const btnActionType = btn.dataset.type; 
            const btnTileKey = btn.dataset.tilekey; // Use data-tilekey for checking build buttons

            if (!btnActionType) return;

            if (currentMode === 'pan' && btnActionType === 'pan') {
                btn.classList.add('selected');
            } else if (currentMode === 'build' && currentBuildType && btnTileKey && TILE_TYPES[btnTileKey]?.id === currentBuildType.id) {
                // Match based on the TILE_TYPES key stored in data-tilekey, then compare its ID to currentBuildType's ID
                btn.classList.add('selected');
            }
        });
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
