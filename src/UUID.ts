export const UUID = {
    toString: (uuid: Uint8Array): string => {
        if(uuid.length !== 16) {
            throw new Error('invalid uuid length');
        }
        //writes uuid in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const parts = [
            uuid.slice(0, 4),
            uuid.slice(4, 6),
            uuid.slice(6, 8),
            uuid.slice(8, 10),
            uuid.slice(10, 16),
        ]

        return parts
            .map(part => Array.from(part).map(b => b.toString(16).padStart(2, '0')).join(''))
            .join('-');
    },

    toUint8Array(uuid: string): Uint8Array {
        const hex = uuid.split('-').join('');
        if(hex.length !== 32) {
            throw new Error('invalid hex length');
        }
        const result = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return result;
    }
}