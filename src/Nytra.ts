import {Reader} from "./Reader.ts";
import {Encoder, Registry, type TypeHandler} from "./Registry.ts";
import {Writer} from "./Writer.ts";
import {
    TYPE_ARRAY,
    TYPE_BIGINT,
    TYPE_BOOLEAN,
    TYPE_FLOAT32,
    TYPE_FLOAT64,
    TYPE_INT16,
    TYPE_INT32,
    TYPE_INT64,
    TYPE_INT8,
    TYPE_JSON,
    TYPE_NULL,
    TYPE_OBJECT,
    TYPE_STRING,
    TYPE_STRING_16_INTERNAL,
    TYPE_STRING_32_INTERNAL,
    TYPE_TYPED_ARRAY,
    TYPE_UINT16,
    TYPE_UINT32,
    TYPE_UINT64,
    TYPE_UINT8, TYPE_UUID
} from "./Types.ts";
import {UUID} from "./UUID.ts";


const MAX_UINT_32 = 2 ** 32;
const MAX_UINT_16 = 2 ** 16;
const MAX_UINT_8 = 2 ** 8;

const MIN_INT_32 = -(2 ** 31);
const MIN_INT_16 = -(2 ** 15);
const MIN_INT_8 = -(2 ** 8);


type TypedArrayRegisterFieldOptions = {
    typedArrayTargetTypeId?: number | Function;
};


export type RegisterFieldOptions = {
    nullable?: boolean;
}  & TypedArrayRegisterFieldOptions;




type Constructor<T = object> = new (...args: any[]) => T;

type RequiredRegisterFieldOptions = Required<RegisterFieldOptions>;

type FieldMeta = {
    position: number,
    targetTypeId?: number | Function
    options: RequiredRegisterFieldOptions
}

type Field = [string, FieldMeta];

type ClassMeta = {
    typeId: number,
    fields: Field[]
}


function createDecoder<T extends Function>(cls: T) {
    const meta = classMetaStore.get(cls! as unknown as Function)!;
    const fields = meta?.fields;
    return function (reader: Reader): T {
        let obj = {} as Record<string, any>;

        const nullableFields: (keyof T)[] = fields.filter(([_name, meta]) => meta.options.nullable).map(([name, _meta]) => name as keyof T);
        const nullableBytes = Math.ceil(nullableFields.length / 8);
        const nullableBitfield = nullableBytes > 0 ? reader.readBytes(nullableBytes) : [];
        const isFieldNull = (index: number) => {
            const byteIndex = Math.floor(index / 8);
            const bitOffset = index % 8;
            return (nullableBitfield[byteIndex] & (1 << bitOffset)) !== 0;
        }


        for (let [name, meta] of fields) {
            if (nullableBytes > 0 && meta.options.nullable) {
                const nullIndex = nullableFields.indexOf(name as keyof T);
                if (nullIndex !== -1 && isFieldNull(nullIndex)) {
                    obj[name] = null;
                    continue;
                }
            }

            if (typeof meta.targetTypeId === "function") {
                const found = classMetaStore.get(meta.targetTypeId);
                meta.targetTypeId = found ? found.typeId : TYPE_JSON
            }
            let type = meta.targetTypeId;
            if (type === TYPE_TYPED_ARRAY) {
                const targetType = typeof meta.options.typedArrayTargetTypeId === 'function' ? classMetaStore.get(meta.options.typedArrayTargetTypeId)?.typeId : meta.options.typedArrayTargetTypeId
                const size = reader.readUINT32();
                const end = reader.offset + size;
                let data = []

                while (reader.offset < end) {
                    data.push(Nytra.decode(reader, targetType === TYPE_STRING ? null : targetType));
                }
                obj[name] = data;
                continue;
            }
            if (type === TYPE_STRING) {
                type = reader.readType();
            }
            obj[name] = Nytra.decode(reader, type);
        }


        Object.setPrototypeOf(obj, cls.prototype);
        return obj as T;
    }
}


function createTypedArrayEncoder(targetType: number | Function): Encoder {
    if (typeof targetType === 'function') {
        const meta = classMetaStore.get(targetType);
        if (!meta) {
            throw new Error(`Cannot convert object type ${targetType}`);
        }
        targetType = meta ? meta.typeId : TYPE_JSON;
        meta.typeId;

    }

    return function (data: unknown, writer: Writer | null) {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }
        if (writer === null) {
            writer = new Writer();
        }
        const arr = data as unknown[];
        const startIndex = writer.offset;

        writer.setOffset(startIndex + 4); // reserve space for length

        for (let value of arr) {
            Nytra.encode(value, targetType, false, writer);
        }
        const endIndex = writer.offset;
        writer.setOffset(startIndex);
        writer.writeUINT32(endIndex - startIndex - 4);
        writer.setOffset(endIndex);

        return writer.toUint8Array();
    };

}

function createEncoder<T extends Function>(cls: T) {
    const meta = classMetaStore.get(cls! as unknown as Function)!;
    type CompiledField<T> = {
        name: keyof T,
        encode: null | Encoder,
        options: RequiredRegisterFieldOptions
    }
    const cachedEncoders: CompiledField<T>[] = [];
    const nullableFields: (keyof T)[] = [];
    let nullableBytes = 0;

    return function (data: T, writer: Writer | null): Uint8Array {
        if (writer === null) {
            writer = new Writer();
        }
        if (cachedEncoders.length == 0) {
            meta.fields.forEach(([name, fieldMeta]) => {
                if (fieldMeta.options.nullable) {
                    nullableFields.push(name as keyof T);
                }

                let typeId = fieldMeta.targetTypeId as number;
                if (!typeId) {
                    cachedEncoders.push({name: name as keyof T, encode: null, options: fieldMeta.options});
                    return;
                }
                // Resolve Function → typeId hier, nicht im Loop!
                if (typeof typeId === 'function') {
                    const found = classMetaStore.get(typeId);
                    typeId = found ? found.typeId : TYPE_JSON;
                }

                // Encoder-Funktion vorgebunden
                let encodeFn: Encoder<any>;
                if (typeId === TYPE_TYPED_ARRAY) {
                    if (typeof fieldMeta.options.typedArrayTargetTypeId === 'function') {
                        const typeId = classMetaStore.get(fieldMeta.options.typedArrayTargetTypeId)?.typeId;
                        fieldMeta.options.typedArrayTargetTypeId = typeId!;
                    }
                    encodeFn = createTypedArrayEncoder(fieldMeta.options.typedArrayTargetTypeId as number)
                } else if (typeId < 255) {
                    encodeFn = (value, writer) => Nytra.encode(value, typeId, false, writer);
                } else {
                    encodeFn = CustomRegistry.getEncoder(typeId);
                }
                cachedEncoders.push({name: name as keyof T, encode: encodeFn, options: fieldMeta.options});
            });
            nullableBytes = Math.ceil(nullableFields.length / 8);
        }


        if (nullableBytes > 0) {
            const nullableBitfield = new Uint8Array(nullableBytes);
            for (let i = 0; i < nullableFields.length; i++) {
                const field = nullableFields[i];
                if (data[field] === null) {
                    const byteIndex = Math.floor(i / 8);
                    const bitOffset = i % 8;
                    nullableBitfield[byteIndex] |= (1 << bitOffset);
                }
            }
            writer.writeBytes(nullableBitfield);
        }


        for (const encodeInfo of cachedEncoders) {
            const value = data[encodeInfo.name];
            if (value === null && encodeInfo.options.nullable) {
                continue;
            }

            encodeInfo.encode ?
                encodeInfo.encode(data[encodeInfo.name], writer) :
                Nytra.encode(data[encodeInfo.name], null, true, writer);

        }
        return writer.toUint8Array();
    } satisfies Encoder<T>
}


const classMetaStore = new WeakMap<Function, ClassMeta>();
const SYMBOL_FIELDS = Symbol('Nytra:fields');
const CustomRegistry = new Registry();


export class Nytra {
    static registerField(
        position: number,
        targetTypeId?: number | Function,
        options?: RegisterFieldOptions
    ) {
        const defaultOpts: RequiredRegisterFieldOptions = {
            nullable: false,
            typedArrayTargetTypeId: -1,
        }

        Object.assign(defaultOpts, options);
        if(targetTypeId === TYPE_TYPED_ARRAY && defaultOpts.typedArrayTargetTypeId === -1) {
            throw new Error('You must provide options.typedArrayTargetTypeId if you want to register a typed array field')
        }

        return function (v: undefined, ctx: ClassFieldDecoratorContext) {
            if (ctx.private) {
                throw new Error('Only public fields can be registered');
            }
            const metadata = ctx.metadata as Record<string | symbol, any>;
            if (typeof metadata![SYMBOL_FIELDS] === 'undefined') {
                metadata![SYMBOL_FIELDS] = new Map<string, FieldMeta>();
            }
            const fieldMeta: FieldMeta = {
                position,
                targetTypeId,
                options: defaultOpts
            }
            metadata[SYMBOL_FIELDS].set(ctx.name, fieldMeta);
        }
    }

    static registerClass(typeId: number) {

        if (typeId < 256 || typeId > 65535) {
            throw new Error('typeId must be in range of 256 and 65535');
        }

        return function <T extends Constructor>(decoratedClass: T, ctx: ClassDecoratorContext) {
            const metadata = ctx.metadata as Record<string | symbol, any>;
            const fields = metadata[SYMBOL_FIELDS] ?
                [...metadata[SYMBOL_FIELDS].entries()].sort(
                    (
                        [_aName, aMeta],
                        [_bName, bMeta]
                    ) => aMeta.position - bMeta.position
                )
                : [];


            classMetaStore.set(decoratedClass, {typeId, fields});

            CustomRegistry.register(typeId, {
                encoder: createEncoder(decoratedClass),
                decoder: createDecoder(decoratedClass)
            } satisfies TypeHandler<T>)
        }


    }


    static autoguessType(data: unknown): number {
        if (data === null) {
            return TYPE_NULL;
        }
        if (typeof data === 'object') {
            const ctor = (data as object).constructor as Function;
            const found = classMetaStore.get(ctor);
            if (found) {
                return found.typeId;
            }
        }

        if (Array.isArray(data)) {
            return TYPE_ARRAY;
        }
        if (typeof data === 'object') {
            return TYPE_OBJECT;
        }
        if (typeof data === 'string') {
            return TYPE_STRING;
        }
        if (typeof data === 'boolean') {
            return TYPE_BOOLEAN;
        }
        if (typeof data === 'number') {
            if (Number.isInteger(data)) {
                if (data >= 0) {
                    //unsigned possible
                    if (data <= MAX_UINT_8) {
                        return TYPE_UINT8;
                    }
                    if (data <= MAX_UINT_16) {
                        return TYPE_UINT16;
                    }
                    if (data <= MAX_UINT_32) {
                        return TYPE_UINT32;
                    }
                    return TYPE_UINT64;
                } else {
                    if (data >= MIN_INT_8) {
                        return TYPE_INT8;
                    }
                    if (data >= MIN_INT_16) {
                        return TYPE_INT16;
                    }
                    if (data >= MIN_INT_32) {
                        return TYPE_INT32;
                    }
                    return TYPE_INT64;
                }
            }
            if (Math.fround(data) === data) {
                return TYPE_FLOAT32;
            }
            return TYPE_FLOAT64;
        }
        if (typeof data === 'bigint') {
            return TYPE_BIGINT;
        }


        return TYPE_JSON;
    }

    static getTypeIdForClass(ctor: Function) {
        const found = classMetaStore.get(ctor);
        return found ? found.typeId : TYPE_JSON;
    }


    static #TEXT_ENCODER = new TextEncoder();

    static getFieldsFromRegisteredClass<T extends Constructor>(ctor: T) {
        const classMeta = classMetaStore.get(ctor);
        if (!classMeta) {
            throw new Error('Class not registered');
        }
        return classMeta.fields;
    }

    static encode(data: unknown, type: number | null = null, withType: boolean = true, writer: Writer | null = null): Uint8Array {
        if (writer === null) {
            writer = new Writer();
        }

        if (type === null) {
            type = this.autoguessType(data);
        }


        if (type >= 256) {
            const encodeFunction = CustomRegistry.getEncoder(type)
            if (typeof encodeFunction !== 'function') {
                throw new Error('Unknown type:' + type);
            }
            if (withType) {
                writer.writeType(type);
            }


            encodeFunction(data, writer);
            return writer.toUint8Array();
        }


        if (type >= TYPE_STRING) { //automatically
            const str = data as string;
            const bytes = this.#TEXT_ENCODER.encode(str);
            const len = bytes.length;
            if (len <= 127) {
                writer.writeUINT8(128 + len);
                writer.writeBytes(bytes);
                return writer.toUint8Array()
            }
            if (len <= 65535) {
                writer.writeUINT8(TYPE_STRING_16_INTERNAL);
                writer.writeUINT16(len);
                writer.writeBytes(bytes);
                return writer.toUint8Array()
            }
            writer.writeUINT8(TYPE_STRING_32_INTERNAL);
            writer.writeUINT32(len);
            writer.writeBytes(bytes);
            return writer.toUint8Array()
        }

        switch (type) {
            case TYPE_UUID:
                const bytes = UUID.toUint8Array(data as string);
                if(withType) {
                    writer.writeType(TYPE_UUID);
                }
                writer.writeBytes(bytes);
                return writer.toUint8Array();


            case TYPE_NULL:
                writer.writeUINT8(TYPE_NULL);
                return writer.toUint8Array();

            case TYPE_ARRAY: {
                if (!Array.isArray(data)) {
                    throw new Error('Data must be an array');
                }
                const arr = data as unknown[];
                if (withType)
                    writer.writeType(TYPE_ARRAY);
                const startIndex = writer.offset;

                writer.setOffset(startIndex + 4); // reserve space for length

                for (let value of arr) {
                    this.encode(value, null, true, writer);
                }
                const endIndex = writer.offset;
                writer.setOffset(startIndex);
                writer.writeUINT32(endIndex - startIndex - 4);
                writer.setOffset(endIndex);
                return writer.toUint8Array();
            }

            case TYPE_OBJECT: {
                if (typeof data !== 'object') {
                    throw new Error('Data must be an array');
                }
                const obj = data as object;
                if (withType)
                    writer.writeType(TYPE_OBJECT);
                const startIndex = writer.offset;
                writer.setOffset(startIndex + 4);

                let keys = Object.keys(obj);
                for (let key of keys) {
                    this.encode(key, TYPE_STRING, true, writer);
                    this.encode(obj[key as keyof typeof obj], null, true, writer);
                }
                const endIndex = writer.offset;
                writer.setOffset(startIndex);
                writer.writeUINT32(endIndex - startIndex - 4);
                writer.setOffset(endIndex);
                return writer.toUint8Array();
            }

            case TYPE_UINT8: {
                if (withType)
                    writer.writeType(TYPE_UINT8);
                writer.writeUINT8(data as number);
                return writer.toUint8Array();
            }

            case TYPE_UINT16: {
                if (withType)
                    writer.writeType(TYPE_UINT16);
                writer.writeUINT16(data as number);
                return writer.toUint8Array();
            }

            case TYPE_UINT32: {
                if (withType)
                    writer.writeType(TYPE_UINT32);
                writer.writeUINT32(data as number);
                return writer.toUint8Array();
            }

            case TYPE_UINT64: {
                if (withType)
                    writer.writeType(TYPE_UINT64);
                writer.writeUINT64(BigInt(data as number | bigint));
                return writer.toUint8Array();
            }

            case TYPE_INT8: {
                if (withType)
                    writer.writeType(TYPE_INT8);
                writer.writeINT8(data as number);
                return writer.toUint8Array();
            }

            case TYPE_INT16: {
                if (withType)
                    writer.writeType(TYPE_INT16);
                writer.writeINT16(data as number);
                return writer.toUint8Array();
            }

            case TYPE_INT32: {
                if (withType)
                    writer.writeType(TYPE_INT32);
                writer.writeINT32(data as number);
                return writer.toUint8Array();
            }

            case TYPE_INT64: {
                if (withType)
                    writer.writeType(TYPE_INT64);
                writer.writeINT64(BigInt(data as number | bigint));
                return writer.toUint8Array();
            }

            case TYPE_BOOLEAN: {
                if (withType)
                    writer.writeType(TYPE_BOOLEAN);
                writer.writeUINT8((data as boolean) ? 1 : 0);
                return writer.toUint8Array();
            }

            case TYPE_JSON: {
                return this.encode(JSON.stringify(data), TYPE_STRING, withType, writer);
            }

            case TYPE_FLOAT32: {
                if (withType)
                    writer.writeType(TYPE_FLOAT32);
                writer.writeFLOAT32(data as number);
                return writer.toUint8Array();
            }
            case TYPE_FLOAT64: {
                if (withType)
                    writer.writeType(TYPE_FLOAT64);
                writer.writeFLOAT64(data as number);
                return writer.toUint8Array();
            }

            case TYPE_BIGINT: {
                if (withType)
                    writer.writeType(TYPE_BIGINT);
                writer.writeBigInt(BigInt(data as number | bigint));
                return writer.toUint8Array();
            }

        }


        throw new Error('Type unknown: ' + type);

    }

    static decode(data: Uint8Array | Reader, type: number | null = null): unknown {
        let reader = data instanceof Reader ? data : new Reader(data);


        if (type === null)
            type = reader.readType();


        if (type > 255) {
            const decodeFunction = CustomRegistry.getDecoder(type)
            if (typeof decodeFunction !== 'function') {
                throw new Error('Unknown type:' + type);
            }
            return decodeFunction(reader);
        }


        if (type >= TYPE_STRING) {
            let length = type & 0b01111111;
            return reader.readString(length);
        }


        switch (type) {
            case TYPE_UUID:
                const bytes = reader.readBytes(16);
                return UUID.toString(bytes);
            case TYPE_STRING_16_INTERNAL: {
                const length = reader.readUINT16();
                return reader.readString(length);
            }
            case TYPE_STRING_32_INTERNAL: {
                const length = reader.readUINT32();
                return reader.readString(length);
            }
            case TYPE_BOOLEAN: {
                return reader.readUINT8() !== 0;
            }
            case TYPE_JSON: {
                const json = this.decode(reader) as string;
                return JSON.parse(json);
            }
            case TYPE_UINT8: {
                return reader.readUINT8();
            }
            case TYPE_UINT16: {
                return reader.readUINT16();
            }
            case TYPE_UINT32: {
                return reader.readUINT32();
            }
            case TYPE_UINT64: {
                return bigintToSafeNumber(reader.readUINT64());
            }
            case TYPE_INT8: {
                return reader.readINT8();
            }
            case TYPE_INT16: {
                return reader.readINT16();
            }
            case TYPE_INT32: {
                return reader.readINT32();
            }
            case TYPE_INT64: {
                return bigintToSafeNumber(reader.readINT64());
            }
            case TYPE_FLOAT64: {
                return reader.readFLOAT64();
            }
            case TYPE_FLOAT32: {
                return reader.readFLOAT32();
            }


            case TYPE_ARRAY: {
                const len = reader.readUINT32();
                const end = reader.offset + len;
                const targetArray = [];
                while (reader.offset < end) {
                    targetArray.push(this.decode(reader));
                }
                return targetArray;
            }

            case TYPE_OBJECT: {
                const len = reader.readUINT32();
                const end = reader.offset + len;
                const targetObj: Record<string, any> = {};
                while (reader.offset < end) {
                    const key = this.decode(reader) as string;
                    targetObj[key] = this.decode(reader);
                }
                return targetObj;
            }

            case TYPE_BIGINT: {
                return reader.readBigInt();
            }

            case TYPE_NULL: {
                return null;
            }


        }

        throw new Error('Unknown type:' + type);
    }


}

function bigintToSafeNumber(value: bigint) {
    if (
        value > BigInt(Number.MAX_SAFE_INTEGER) ||
        value < BigInt(Number.MIN_SAFE_INTEGER)
    ) {
        return value;
    }

    return Number(value);
}