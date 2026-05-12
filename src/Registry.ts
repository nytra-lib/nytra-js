import type {Reader} from "./Reader.ts";
import {Writer} from "./Writer.ts";

export type Encoder<T = unknown> = (data: T, writer: Writer|null) => Uint8Array;
export type Decoder<T = unknown> = (reader: Reader) => T;
export type TypeHandler<T = unknown> = {
    encoder: Encoder<T>,
    decoder: Decoder<T>,
}


export class Registry {
    /**
     *
     * @type {Map<number, TypeHandler>}
     */
    #registry = new Map();





    register<T>(type:number, handler: TypeHandler<T> ) {
        if(this.#registry.has(type)) {
            throw new Error('Type already registered:' + type);
        }
        this.#registry.set(type, handler);
    }

    getDecoder(type: number): Decoder {
        const decoder = this.#registry.get(type)?.decoder;
        if (!decoder) {
            throw new Error('Unknown type: ' + type);
        }
        return decoder;
    }

    getEncoder(type: number): Encoder {
        const encoder = this.#registry.get(type)?.encoder;
        if (!encoder) {
            throw new Error('Unknown type: ' + type);
        }
        return encoder;
    }

}