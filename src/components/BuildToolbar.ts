import { GameMode, TileType, ViewMode } from '../types';
import { TILE_TYPES } from '../config/tileTypes';

type ToolSelectCallback = (toolType: string, tileType: TileType | null) => void;
type ViewModeToggleCallback = (newMode: ViewMode) => void; // Callback now passes the new mode

export class BuildToolbar {
    private element: HTMLElement;
    private viewModeButton: HTMLButtonElement;
    private currentViewMode: ViewMode = 'default'; // Keep track of current view mode

    constructor(toolbarId: string = 'buildToolbar') {
        this.element = document.getElementById(toolbarId) as HTMLElement;
        if (!this.element) throw new Error(`BuildToolbar element with ID "${toolbarId}" not found.`);
        this.render();
        this.viewModeButton = document.getElementById('viewModeButton') as HTMLButtonElement;
    }

    private render(): void {
        // Added more view modes to the cycle
        this.element.innerHTML = `
            <button class="build-button pan-button" data-type="pan"><span class="icon-span">✥</span>Pan</button>
            <button class="build-button select-button" data-type="select"><span class="icon-span">⊕</span>Select</button>
            <button class="build-button view-mode-button" id="viewModeButton" data-type="view_mode"><span class="icon-span">👁</span>View: Default</button>
            
            <div class="toolbar-separator"></div>

            <button class="build-button grass" data-type="grass">Grass ($${TILE_TYPES.GRASS.cost})</button>
            <button class="build-button water" data-type="water">Water ($${TILE_TYPES.WATER.cost})</button>
            <button class="build-button road" data-type="road">Road ($${TILE_TYPES.ROAD.cost})</button>
            <button class="build-button park" data-type="park">Park ($${TILE_TYPES.PARK.cost})</button>
            <button class="build-button residential" data-type="residential_zone">Res. Zone ($${TILE_TYPES.RESIDENTIAL_ZONE.cost})</button>
            <button class="build-button commercial" data-type="commercial_zone">Com. Zone ($${TILE_TYPES.COMMERCIAL_ZONE.cost})</button>
            <button class="build-button industrial" data-type="industrial_zone">Ind. Zone ($${TILE_TYPES.INDUSTRIAL_ZONE.cost})</button>
        `;
    }

    public setupEventListeners(
        onToolSelect: ToolSelectCallback,
        onViewModeToggle: ViewModeToggleCallback
    ): void {
        const buttons = this.element.querySelectorAll<HTMLButtonElement>('.build-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const toolType = button.dataset.type;
                if (!toolType) return;

                if (toolType === 'view_mode') {
                    // Cycle through view modes
                    if (this.currentViewMode === 'default') this.currentViewMode = 'tile_value_heatmap';
                    else if (this.currentViewMode === 'tile_value_heatmap') this.currentViewMode = 'pollution_heatmap';
                    else this.currentViewMode = 'default';
                    this.updateViewModeButtonText(this.currentViewMode);
                    onViewModeToggle(this.currentViewMode);
                } else if (toolType === 'pan' || toolType === 'select') {
                    onToolSelect(toolType, null);
                } else {
                    const typeKey = toolType.toUpperCase().replace('-', '_');
                    if (TILE_TYPES[typeKey]) {
                        onToolSelect('build', TILE_TYPES[typeKey]);
                    } else {
                        console.error("Unknown build type:", toolType);
                    }
                }
                this.updateSelectedButtonVisuals(button.dataset.type || null); // Might need more robust update from Game state
            });
        });
    }

    public updateViewModeButtonText(viewMode: ViewMode): void {
        this.currentViewMode = viewMode; // Ensure internal state is synced
        const iconSpan = `<span class="icon-span">👁</span>`;
        if (viewMode === 'tile_value_heatmap') {
            this.viewModeButton.innerHTML = `${iconSpan}View: Tile Value`;
        } else if (viewMode === 'pollution_heatmap') {
            this.viewModeButton.innerHTML = `${iconSpan}View: Pollution`;
        } else {
            this.viewModeButton.innerHTML = `${iconSpan}View: Default`;
        }
    }
    
    public updateSelectedButtonVisuals(activeToolOrBuildTypeId: string | null, currentMode?: GameMode, currentBuildType?: TileType | null): void {
        this.element.querySelectorAll<HTMLButtonElement>('.build-button').forEach(btn => {
            btn.classList.remove('selected');
            const btnType = btn.dataset.type;
            if (!btnType) return;

            let isSelected = false;
            if (currentMode === 'pan' && btnType === 'pan') isSelected = true;
            else if (currentMode === 'select' && btnType === 'select') isSelected = true;
            else if (currentMode === 'build' && currentBuildType && btnType === currentBuildType.id) isSelected = true;
            
            // For view mode button, it's not 'selected' in the same way as a tool
            // but its text changes, handled by updateViewModeButtonText.

            if (isSelected) {
                btn.classList.add('selected');
            }
        });
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
