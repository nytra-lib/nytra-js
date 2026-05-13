export const
    TYPE_NULL = 0,
    TYPE_BOOLEAN = 1,
    TYPE_ARRAY = 2,
    TYPE_OBJECT = 3,
    TYPE_STRING_16_INTERNAL = 4,
    TYPE_STRING_32_INTERNAL = 5,

    TYPE_JSON = 9,

    TYPE_UINT8 = 11,
    TYPE_UINT16 = 12,
    TYPE_UINT32 = 13,
    TYPE_UINT64 = 14,
    TYPE_INT8 = 21,
    TYPE_INT16 = 22,
    TYPE_INT32 = 23,
    TYPE_INT64 = 24,

    TYPE_FLOAT32 = 30,
    TYPE_FLOAT64 = 31,


    TYPE_BIGINT = 40,
    TYPE_TYPED_ARRAY = 50,
    TYPE_EXTENSION = 127,






    //128-255 -> String use 7 bits for length (max 127)
    TYPE_STRING = 128
;
