export class MessageBox {
    private element: HTMLElement;
    private timerId: number | null = null;

    constructor(boxId: string = 'messageBox') {
        this.element = document.getElementById(boxId) as HTMLElement;
        if (!this.element) throw new Error(`MessageBox element with ID "${boxId}" not found.`);
        this.element.style.display = 'none'; // Ensure it's hidden initially
    }

    public show(message: string, duration: number = 3000): void {
        this.element.textContent = message;
        this.element.style.display = 'block';

        if (this.timerId) {
            clearTimeout(this.timerId);
        }

        this.timerId = window.setTimeout(() => {
            this.element.style.display = 'none';
            this.timerId = null;
        }, duration);
    }

    public getElement(): HTMLElement {
      return this.element;
    }
}
