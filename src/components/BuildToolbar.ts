import { GameMode, TileType, ViewMode } from '../types';
import { TILE_TYPES } from '../config/tileTypes';

type ToolSelectCallback = (toolType: string, tileType: TileType | null) => void;
type ViewModeToggleCallback = () => void;

export class BuildToolbar {
    private element: HTMLElement;
    private viewModeButton: HTMLButtonElement;

    constructor(toolbarId: string = 'buildToolbar') {
        this.element = document.getElementById(toolbarId) as HTMLElement;
        if (!this.element) throw new Error(`BuildToolbar element with ID "${toolbarId}" not found.`);
        this.render();
        this.viewModeButton = document.getElementById('viewModeButton') as HTMLButtonElement;
    }

    private render(): void {
        this.element.innerHTML = `
            <button class="build-button pan-button" data-type="pan">Pan</button>
            <button class="build-button select-button" data-type="select">Select</button>
            <button class="build-button view-mode-button" id="viewModeButton" data-type="view_mode">View: Default</button>
            <button class="build-button grass" data-type="grass">Grass</button>
            <button class="build-button road" data-type="road">Road</button>
            <button class="build-button water" data-type="water">Water</button>
            <button class="build-button park" data-type="park">Park</button>
            <button class="build-button residential" data-type="residential_zone">Residential</button>
            <button class="build-button commercial" data-type="commercial_zone">Commercial</button>
            <button class="build-button industrial" data-type="industrial_zone">Industrial</button>
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
                    onViewModeToggle();
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
                this.updateSelectedButtonVisuals(button.dataset.type || null);
            });
        });
    }

    public updateViewModeButtonText(currentViewMode: ViewMode): void {
        if (currentViewMode === 'satisfaction_heatmap') {
            this.viewModeButton.textContent = 'View: Satisfaction';
        } else {
            this.viewModeButton.textContent = 'View: Default';
        }
    }
    
    public updateSelectedButtonVisuals(activeToolOrBuildTypeId: string | null, currentMode?: GameMode, currentBuildType?: TileType | null): void {
        this.element.querySelectorAll<HTMLButtonElement>('.build-button').forEach(btn => {
            btn.classList.remove('selected', 'ring-2', 'ring-offset-2', 'ring-sky-500');
            const btnType = btn.dataset.type;
            if (!btnType) return;

            let isSelected = false;
            if (currentMode === 'pan' && btnType === 'pan') isSelected = true;
            else if (currentMode === 'select' && btnType === 'select') isSelected = true;
            else if (currentMode === 'build' && currentBuildType && btnType === currentBuildType.id) isSelected = true;

            // The view mode button selection is handled slightly differently (toggles visual state, not a mode)
            if (btn.id === 'viewModeButton') {
                // it could have a selected state if we want, but the original didn't focus on it like other tools
            } else if (isSelected) {
                btn.classList.add('selected', 'ring-2', 'ring-offset-2', 'ring-sky-500');
            }
        });
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
