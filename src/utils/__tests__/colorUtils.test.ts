import { lightenColor, darkenColor } from '../colorUtils';

describe('Color Utilities', () => {
    describe('lightenColor', () => {
        it('should lighten a hex color by a given percentage', () => {
            expect(lightenColor('#808080', 20)).toBe('#999999'); 
            expect(lightenColor('#123456', 50)).toBe('#1b4e81'); 
        });

        it('should handle 3-digit hex codes', () => {
            expect(lightenColor('#F00', 10)).toBe('#ff0000'); 
            // R: aa (170) -> 170 * 1.1 = 187 -> bb
            // G: bb (187) -> 187 * 1.1 = 205.7 -> floor(205.7) = 205 -> cd
            // B: cc (204) -> 204 * 1.1 = 224.4 -> floor(224.4) = 224 -> e0
            expect(lightenColor('#abc', 10)).toBe('#bbcde0'); 
        });
        
        it('should cap values at 255', () => {
            expect(lightenColor('#EEEEEE', 50)).toBe('#ffffff');
        });

        it('should return #000000 for invalid hex input', () => {
            expect(lightenColor('invalid', 10)).toBe('#000000');
            expect(lightenColor('#12345', 10)).toBe('#000000');
            expect(lightenColor('#GGHHII', 10)).toBe('#000000');
        });

        it('should handle 0 percent change', () => {
            expect(lightenColor('#123456', 0)).toBe('#123456');
        });
    });

    describe('darkenColor', () => {
        it('should darken a hex color by a given percentage', () => {
            // R: 255 * (1-0.1) = 229.5 -> floor(229.5) = 229 (0xe5)
            expect(darkenColor('#FF0000', 10)).toBe('#e50000'); 
            // 128 * 0.8 = 102.4 -> floor(102.4) = 102 (0x66)
            expect(darkenColor('#808080', 20)).toBe('#666666'); 
        });

        it('should cap values at 0', () => {
            expect(darkenColor('#101010', 500)).toBe('#000000');
        });
    });
});
