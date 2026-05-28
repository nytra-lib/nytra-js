import {expect, test} from "bun:test";


import {Nytra, Types} from "nytra";
const {
    TYPE_ARRAY, TYPE_BIGINT, TYPE_BOOLEAN,
    TYPE_FLOAT32, TYPE_FLOAT64, TYPE_INT16, TYPE_INT32, TYPE_INT64, TYPE_INT8, TYPE_JSON,
    TYPE_NULL, TYPE_OBJECT,
    TYPE_STRING,
     TYPE_UINT16, TYPE_UINT32, TYPE_UINT64, TYPE_UINT8, TYPE_UUID
} = Types;

test("TypeHandler: bigint", () => {
    const value = 123456789n;
    const encoded = Nytra.encode(value, TYPE_BIGINT);
    const decoded = Nytra.decode(encoded) as bigint;
    expect(decoded).toEqual(value);
})

test("TypeHandler: boolean = true", () => {
    const encodedTrue = Nytra.encode(true, TYPE_BOOLEAN);
    const decodedTrue = Nytra.decode(encodedTrue);

    expect(decodedTrue).toEqual(true);

});


test("TypeHandler: null", () => {
    const encoded = Nytra.encode(null, TYPE_NULL);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(null);
});


test("TypeHandler: boolean = false", () => {
    const encodedFalse = Nytra.encode(false, TYPE_BOOLEAN);
    const decodedFalse = Nytra.decode(encodedFalse);

    expect(decodedFalse).toEqual(false);
});


test("TypeHandler: uint8", () => {
    const value = 255;
    const encoded = Nytra.encode(value, TYPE_UINT8);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: uint16", () => {
    const value = 65535;
    const encoded = Nytra.encode(value, TYPE_UINT16);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: uint32", () => {
    const value = 4294967295;
    const encoded = Nytra.encode(value, TYPE_UINT32);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: uint64", () => {
    const value = Number.MAX_SAFE_INTEGER;
    const encoded = Nytra.encode(value, TYPE_UINT64);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: int8", () => {
    const value = -128;
    const encoded = Nytra.encode(value, TYPE_INT8);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: int16", () => {
    const value = -32768;
    const encoded = Nytra.encode(value, TYPE_INT16);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: int32", () => {
    const value = -2147483648;
    const encoded = Nytra.encode(value, TYPE_INT32);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: int64", () => {
    const value = Number.MIN_SAFE_INTEGER;
    const encoded = Nytra.encode(value, TYPE_INT64);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});

test("TypeHandler: float32", () => {
    const value = 123.5;
    const encoded = Nytra.encode(value, TYPE_FLOAT32);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toBeCloseTo(value, 6);
});

test("TypeHandler: float64", () => {
    const value = Math.PI;
    const encoded = Nytra.encode(value, TYPE_FLOAT64);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toBeCloseTo(value, 12);
});

test("TypeHandler: string", () => {
    const value = "Hello Nytra 👋";
    const encoded = Nytra.encode(value, TYPE_STRING);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
});


test("TypeHandler: array<string>", () => {
    const values = ['Hello', 'Nytra', '!'];
    const encoded = Nytra.encode(values, TYPE_ARRAY);
    const decoded = Nytra.decode(encoded);




    expect(decoded).toEqual(values);
})

test("TypeHandler: array<string|number>", () => {
    const values = ['Hello', 111, '!', 1234.333];
    const encoded = Nytra.encode(values, TYPE_ARRAY);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(values);
})

test("TypeHandler: array<array|string|number>", () => {
    const values = ['Hello', 111, '!', [100, 200, 'aaaa'], 1234.333];
    const encoded = Nytra.encode(values, TYPE_ARRAY);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(values);
})


test("TypeHandler: object", () => {
    const value = {
        hello: "Nytra",
        greatness: true,
        errors: 0,
        love: 999999999,
        loveBig: 9999999999n,
        null: null
    };

    const encoded = Nytra.encode(value, TYPE_OBJECT);
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(value);
})

test("TypeHandler: object/nested", () => {
    const value = {
        hello: "Nytra",
        greatness: true,
        errors: 0,
        love: 999999999,
        loveBig: 9999999999999999999999999999999999n,
        null: null,
        nested: {
            deep: "nested"
        }

    };

    const encoded = Nytra.encode(value, TYPE_OBJECT);
    const decoded = Nytra.decode(encoded);
    expect(decoded).toEqual(value);
})

test("TypeHandler: UUID", () => {
    const randomUUID = crypto.randomUUID();
    const encoded = Nytra.encode(randomUUID, TYPE_UUID);
    const decoded = Nytra.decode(encoded);
    expect(decoded).toEqual(randomUUID);
})