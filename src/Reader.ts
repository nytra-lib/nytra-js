import {TYPE_EXTENSION} from "./Types.ts";

const LITTLE_ENDIAN = true;

export class Reader {

    static readonly #decoder = new TextDecoder();
    #ind: number = 0;
    #data: Uint8Array;
    #dataView: DataView;

    /**
     *
     * @param {Uint8Array} buffer
     */
    constructor(buffer: Uint8Array) {
        this.#data = buffer;
        this.#dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }



    /**
     *
     * @param {number} length
     */
    readBytes(length: number) {
        if (Number.isInteger(length) && length > 0) {
            const start = this.#ind;
            const end = start + length;
            if (end > this.#data.length) {
                throw new Error('Out of bounds read');
            }

            this.#ind = end;
            return this.#data.subarray(start, end);
        }
        throw new Error('Invalid length:' + length);
    }


    readUINT8() {
        return this.#dataView.getUint8(this.#ind++);
    }

    readUINT16() {
        const offset = this.#ind;
        this.#ind += 2;
        return this.#dataView.getUint16(offset, LITTLE_ENDIAN);
    }

    readUINT32() {
        const offset = this.#ind;
        this.#ind += 4;
        return this.#dataView.getUint32(offset, LITTLE_ENDIAN);
    }

    readUINT64() {
        const offset = this.#ind;
        this.#ind += 8;
        return this.#dataView.getBigUint64(offset, LITTLE_ENDIAN);
    }

    readINT8() {
        return this.#dataView.getInt8(this.#ind++);
    }

    readINT16() {
        const offset = this.#ind;
        this.#ind += 2;
        return this.#dataView.getInt16(offset, LITTLE_ENDIAN);
    }

    readINT32() {
        const offset = this.#ind;
        this.#ind += 4;
        return this.#dataView.getInt32(offset, LITTLE_ENDIAN);
    }

    readINT64() {
        const offset = this.#ind;
        this.#ind += 8;
        return this.#dataView.getBigInt64(offset, LITTLE_ENDIAN);
    }

    readFloat32() {
        const offset = this.#ind;
        this.#ind += 4;
        return this.#dataView.getFloat32(offset, LITTLE_ENDIAN);
    }

    readFloat64() {
        const offset = this.#ind;
        this.#ind += 8;
        return this.#dataView.getFloat64(offset, LITTLE_ENDIAN);
    }


    readString(length: number) {
        const bytes = this.readBytes(length);
        return Reader.#decoder.decode(bytes);
    }

    readBigInt() {
        const length = this.readUINT16();
        const bytes = this.readBytes(length);
        return uint8ArrayLEToBigint(bytes);
    }

    readType() {
        let type = this.readUINT8();
        if (type === TYPE_EXTENSION) {
            type = this.readUINT16();
        }
        return type;
    }


    /**
     * Current read offset
     */
    get offset(): number {
        return this.#ind;
    }

    /**
     * Number of bytes remaining to read
     */
    get remaining(): number {
        return this.#data.length - this.#ind;
    }

    skip(bytes: number) {
        this.#ind += bytes;
    }
}

function uint8ArrayLEToBigint(bytes: Uint8Array): bigint {
    const len = bytes.length;
    if (len === 0) return 0n;

    const isNegative = (bytes[len - 1] & 0x80) !== 0;
    let value = 0n;
    let shift = 0n;

    if (!isNegative) {
        for (let i = 0; i < len; i++) {
            value |= BigInt(bytes[i]) << shift;
            shift += 8n;
        }
        return value;
    }

    // two's complement decode without temp allocation
    let carry = 1;
    for (let i = 0; i < len; i++) {
        const t = (bytes[i] ^ 0xff) + carry;
        carry = t >>> 8; // 0 or 1
        value |= BigInt(t & 0xff) << shift;
        shift += 8n;
    }

    return -value;
}