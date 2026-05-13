import {TYPE_EXTENSION} from "./Types.ts";

const LITTLE_ENDIAN = true;
export class Writer {
    static DEFAULT_SIZE = 1024;
    #buffer: ArrayBuffer;
    #view: DataView;
    #offset: number = 0;

    setOffset(value: number, automaticallyExpand: boolean = false) {
        if(value < 0) {
            throw new Error('Offset cannot be negative');
        }
        if(value >= this.#buffer.byteLength) {
            if(!automaticallyExpand) { throw new Error('Offset out of bounds'); }
            this.ensureCapacity(value - this.#offset);
        }

        this.#offset = value;
    }

    get offset(): number {
        return this.#offset;
    }

    constructor(initialSize: number = Writer.DEFAULT_SIZE) {
        this.#buffer = new ArrayBuffer(initialSize);
        this.#view = new DataView(this.#buffer);
    }

    private ensureCapacity(additionalLength: number): void {
        const required = this.#offset + additionalLength;
        if (required <= this.#buffer.byteLength) return;

        let newLength = this.#buffer.byteLength * 2;
        while (newLength < required) {
            newLength *= 2;
        }

        const newBuffer = new ArrayBuffer(newLength);

        // copy old data
        new Uint8Array(newBuffer).set(new Uint8Array(this.#buffer));

        this.#buffer = newBuffer;
        this.#view = new DataView(newBuffer);
    }


    writeType(type: number) {
        if(type <= 255) {
            return this.writeUINT8(type);
        }
        this.writeUINT8(TYPE_EXTENSION);
        return this.writeUINT16(type);
    }

    writeINT8(value: number): this {
        this.ensureCapacity(1);
        this.#view.setInt8(this.#offset, value);
        this.#offset += 1;
        return this;
    }

    writeINT16(value: number): this {
        this.ensureCapacity(2);
        this.#view.setInt16(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 2;
        return this;
    }

    writeINT32(value: number): this {
        this.ensureCapacity(4);
        this.#view.setInt32(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 4;
        return this;
    }

    writeINT64(value: bigint): this {
        this.ensureCapacity(8);
        this.#view.setBigInt64(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 8;
        return this;
    }


    writeUINT8(value: number): this {
        this.ensureCapacity(1);
        this.#view.setUint8(this.#offset, value);
        this.#offset += 1;
        return this;
    }

    writeUINT16(value: number): this {
        this.ensureCapacity(2);
        this.#view.setUint16(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 2;
        return this;
    }

    writeUINT32(value: number): this {
        this.ensureCapacity(4);
        this.#view.setUint32(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 4;
        return this;
    }

    writeUINT64(value: bigint): this {
        this.ensureCapacity(8);
        this.#view.setBigUint64(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 8;
        return this;
    }


    writeFLOAT32(value: number): this {
        this.ensureCapacity(4);
        this.#view.setFloat32(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 4;
        return this;
    }

    writeFLOAT64(value: number): this {
        this.ensureCapacity(8);
        this.#view.setFloat64(this.#offset, value, LITTLE_ENDIAN);
        this.#offset += 8;
        return this;
    }

    writeBytes(bytes: Uint8Array): this {
        this.ensureCapacity(bytes.length);
        new Uint8Array(this.#buffer, this.#offset, bytes.length).set(bytes);
        this.#offset += bytes.length;
        return this;
    }

    writeBigInt(value: bigint): this {
        let bytes = bigintToUint8ArrayLE(value);
        this.writeUINT16(bytes.length);
        this.writeBytes(bytes);
        return this;
    }

    toUint8Array(): Uint8Array {
        return new Uint8Array(this.#buffer, 0, this.#offset);
    }

    get length(): number {
        return this.#offset;
    }
}


function bigintToUint8ArrayLE(value: bigint): Uint8Array {
    if (value === 0n) return new Uint8Array([0]);

    const isNegative = value < 0n;

    // Work in absolute space first if negative
    let abs = isNegative ? -value : value;

    // Collect bytes (little-endian magnitude)
    const bytes: number[] = [];

    while (abs > 0n) {
        bytes.push(Number(abs & 0xffn));
        abs >>= 8n;
    }

    // Ensure sign bit correctness in the highest byte
    const signBitSet = (bytes[bytes.length - 1] & 0x80) !== 0;

    if (isNegative) {
        // two's complement across variable length
        let carry = 1;
        for (let i = 0; i < bytes.length; i++) {
            const inverted = (~bytes[i] & 0xff) + carry;
            bytes[i] = inverted & 0xff;
            carry = inverted > 0xff ? 1 : 0;
        }

        if (carry) bytes.push(0xff);
    } else if (signBitSet) {
        // prevent misinterpretation as negative
        bytes.push(0x00);
    }

    return new Uint8Array(bytes);
}