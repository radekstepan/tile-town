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
            <button class="build-button pan-button" data-type="pan"><span class="icon-span">✥</span>Pan</button>
            <button class="build-button select-button" data-type="select"><span class="icon-span">⊕</span>Select</button>
            <button class="build-button view-mode-button" id="viewModeButton" data-type="view_mode"><span class="icon-span">👁</span>View: Default</button>
            
            <div class="toolbar-separator"></div>

            <button class="build-button grass" data-type="grass">Grass</button>
            <button class="build-button water" data-type="water">Water</button>
            <button class="build-button road" data-type="road">Road</button>
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
        const iconSpan = `<span class="icon-span">👁</span>`;
        if (currentViewMode === 'satisfaction_heatmap') {
            this.viewModeButton.innerHTML = `${iconSpan}View: Satisfaction`;
        } else {
            this.viewModeButton.innerHTML = `${iconSpan}View: Default`;
        }
    }
    
    public updateSelectedButtonVisuals(activeToolOrBuildTypeId: string | null, currentMode?: GameMode, currentBuildType?: TileType | null): void {
        this.element.querySelectorAll<HTMLButtonElement>('.build-button').forEach(btn => {
            btn.classList.remove('selected'); // Simplified selection class
            const btnType = btn.dataset.type;
            if (!btnType) return;

            let isSelected = false;
            if (currentMode === 'pan' && btnType === 'pan') isSelected = true;
            else if (currentMode === 'select' && btnType === 'select') isSelected = true;
            else if (currentMode === 'build' && currentBuildType && btnType === currentBuildType.id) isSelected = true;
            // View mode button is not a 'mode' that stays selected in the same way, 
            // but we can add 'selected' if its current view is active.
            // For now, keeping it simple: only tool/build buttons get 'selected' state.

            if (isSelected) {
                btn.classList.add('selected');
            }
        });
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
