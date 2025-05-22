export function lightenColor(hex: string, percent: number): string {
    hex = String(hex).replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) { hex = hex.replace(/(.)/g, '$1$1'); }
    
    // Ensure hex is a valid 6-digit hex color string before parsing
    if (hex.length !== 6) {
        console.warn(`lightenColor: Invalid hex color '${hex}', defaulting to black.`);
        return '#000000'; // Default to black if hex is not valid
    }

    let r = parseInt(hex.substring(0, 2), 16),
        g = parseInt(hex.substring(2, 4), 16), // Corrected: (2, 4) for green
        b = parseInt(hex.substring(4, 6), 16); // Corrected: (4, 6) for blue

    // Check if parsing resulted in NaN (e.g., if hex contained invalid characters)
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn(`lightenColor: Parsing failed for '${hex}', defaulting to black.`);
        return '#000000';
    }
        
    const p = percent / 100;
    r = Math.min(255, Math.max(0, Math.floor(r * (1 + p))));
    g = Math.min(255, Math.max(0, Math.floor(g * (1 + p))));
    b = Math.min(255, Math.max(0, Math.floor(b * (1 + p))));
    
    return '#' + r.toString(16).padStart(2, '0') +
           g.toString(16).padStart(2, '0') +
           b.toString(16).padStart(2, '0');
}

export function darkenColor(hex: string, percent: number): string {
    return lightenColor(hex, -percent);
}
