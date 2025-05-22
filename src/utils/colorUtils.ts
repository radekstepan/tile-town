export function lightenColor(hex: string, percent: number): string {
    hex = String(hex).replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) { hex = hex.replace(/(.)/g, '$1$1'); }
    let r = parseInt(hex.substring(0, 2), 16),
        g = parseInt(hex.substring(2, 2), 16),
        b = parseInt(hex.substring(4, 2), 16);
    const p = percent / 100;
    r = Math.min(255, Math.floor(r * (1 + p)));
    g = Math.min(255, Math.floor(g * (1 + p)));
    b = Math.min(255, Math.floor(b * (1 + p)));
    return '#' + r.toString(16).padStart(2, '0') +
           g.toString(16).padStart(2, '0') +
           b.toString(16).padStart(2, '0');
}

export function darkenColor(hex: string, percent: number): string {
    return lightenColor(hex, -percent);
}
