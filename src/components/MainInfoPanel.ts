export class MainInfoPanel {
    private gameDayDisplay: HTMLSpanElement;
    private budgetDisplay: HTMLSpanElement;
    private populationDisplay: HTMLSpanElement;
    private employmentDisplay: HTMLSpanElement;
    private satisfactionDisplay: HTMLSpanElement;
    private taxesDisplay: HTMLSpanElement;
    private costsDisplay: HTMLSpanElement;
    private netDisplay: HTMLSpanElement;

    constructor(panelId: string = 'mainInfoPanel') {
        const panel = document.getElementById(panelId);
        if (!panel) throw new Error(`MainInfoPanel element with ID "${panelId}" not found.`);

        panel.innerHTML = `
            <div><span class="info-label">Day</span><span class="info-value" id="gameDayDisplay">0</span></div>
            <div><span class="info-label">Budget</span><span class="info-value" id="budgetDisplay">$0</span></div>
            <div><span class="info-label">Population</span><span class="info-value" id="populationDisplay">0</span></div>
            <div><span class="info-label">Employment</span><span class="info-value" id="employmentDisplay">N/A</span></div>
            <div><span class="info-label">Satisfaction</span><span class="info-value" id="satisfactionDisplay">N/A</span></div>
            <div><span class="info-label">Taxes</span><span class="info-value" id="taxesDisplay">$0</span></div>
            <div><span class="info-label">Costs</span><span class="info-value" id="costsDisplay">$0</span></div>
            <div><span class="info-label">Net</span><span class="info-value" id="netDisplay">$0</span></div>
        `;

        this.gameDayDisplay = document.getElementById('gameDayDisplay') as HTMLSpanElement;
        this.budgetDisplay = document.getElementById('budgetDisplay') as HTMLSpanElement;
        this.populationDisplay = document.getElementById('populationDisplay') as HTMLSpanElement;
        this.employmentDisplay = document.getElementById('employmentDisplay') as HTMLSpanElement;
        this.satisfactionDisplay = document.getElementById('satisfactionDisplay') as HTMLSpanElement;
        this.taxesDisplay = document.getElementById('taxesDisplay') as HTMLSpanElement;
        this.costsDisplay = document.getElementById('costsDisplay') as HTMLSpanElement;
        this.netDisplay = document.getElementById('netDisplay') as HTMLSpanElement;
    }

    public updateDisplay(
        gameDay: number,
        budget: number,
        population: number,
        employmentRate: number,
        citySatisfaction: number,
        taxes: number,
        costs: number,
        net: number
    ): void {
        this.gameDayDisplay.textContent = gameDay.toString();
        this.budgetDisplay.textContent = `$${budget.toFixed(0)}`;
        this.populationDisplay.textContent = population.toString();
        this.employmentDisplay.textContent = `${employmentRate.toFixed(1)}%`;
        this.satisfactionDisplay.textContent = `${citySatisfaction.toFixed(1)}%`;
        this.taxesDisplay.textContent = `$${taxes.toFixed(1)}`;
        this.costsDisplay.textContent = `$${costs.toFixed(1)}`;
        this.netDisplay.textContent = `$${net.toFixed(1)}`;

        this.netDisplay.classList.remove('positive-net', 'negative-net');
        if (net > 0) this.netDisplay.classList.add('positive-net');
        if (net < 0) this.netDisplay.classList.add('negative-net');

        this.budgetDisplay.classList.remove('text-red-500', 'text-green-600');
        if (budget < 0) this.budgetDisplay.classList.add('text-red-500');
        else this.budgetDisplay.classList.add('text-green-600');
    }

    public getElement(): HTMLElement {
        return document.getElementById('mainInfoPanel') as HTMLElement;
    }
}
