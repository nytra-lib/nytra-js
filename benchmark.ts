// @ts-ignore
import {Player} from "./example/Player.js";
import {Nytra} from "./src/Nytra.ts";
import MSGPACK from "@msgpack/msgpack";
import {TYPE_ARRAY, TYPE_BOOLEAN, TYPE_STRING, TYPE_UINT8} from "./src/Types.ts";





@Nytra.registerClass(1025)
class DTO  {
    @Nytra.registerField(0, TYPE_STRING)
    name!: string;

    @Nytra.registerField(1, TYPE_UINT8)
    age!: number;

    @Nytra.registerField(2, TYPE_BOOLEAN)
    isActive!: boolean;

    @Nytra.registerField(3, TYPE_ARRAY)
    scores!: number[];

    @Nytra.registerField(4, TYPE_ARRAY)
    tags!: string[];
}


function compareSize(anyData: unknown, typeId: number|null=null) {
    const msgPack = MSGPACK.encode(anyData);
    console.log("MsgPack size:", msgPack.length);
    const nytraPack = Nytra.encode(anyData);
    console.log("AUTO Nytra size:", nytraPack.length);
    const nytraPack2 = Nytra.encode(anyData, typeId);
    console.log("DTO Nytra size:", nytraPack2.length);
    console.log("JSON size:", JSON.stringify(anyData).length);

    console.log('')
    console.log('')
    console.log('')
    console.log('')
}

let player = new Player();

console.log('Comparing size of Player Instance', player);
compareSize(player)



const someDeepObject = {
    name: "John Doe",
    age: 30,
    isActive: true,
    scores: [85, 90, 78],
    tags: ["developer", "gamer", "blogger"]
} as DTO;

console.log('Comparing size of some plain object', someDeepObject);
compareSize(someDeepObject, Nytra.getTypeIdForClass(DTO));


function doTask(task: () => void, times = 1_000_000) : string {
     performance.mark('start');
    for(let i = 0; i < times; i++) {
        task();
    }
    performance.mark('end');
    const measured = performance.measure('doTask', 'start', 'end');
    return `times: ${times} avg: ${(measured.duration*1000/times).toFixed(3)}ns - total: ${(measured.duration).toFixed(3)}ms`;
}

const encodedPlayerNYTRA = Nytra.encode(player)
const encodedPlayerMSGPACK = MSGPACK.encode(player)

const encodedObjectNYTRA = Nytra.encode(someDeepObject)
const encodedObjectMSGPACK = MSGPACK.encode(someDeepObject)

console.log('Performance Encode NYTRA Player', doTask(() => Nytra.encode(player)));
console.log('Performance Encode MSGPACK Player', doTask(() => MSGPACK.encode(player)));
console.log('Performance Decode NYTRA Player', doTask(() => Nytra.decode(encodedPlayerNYTRA)));
console.log('Performance Decode MSGPACK Player', doTask(() => MSGPACK.decode(encodedPlayerMSGPACK)));
console.log('')
console.log('')
console.log('')
console.log('')
console.log('Performance Encode NYTRA plain Object', doTask(() => Nytra.encode(player)));
console.log('Performance Encode MSGPACK plain Object', doTask(() => MSGPACK.encode(player)));
console.log('Performance Decode NYTRA plain Object', doTask(() => Nytra.decode(encodedObjectNYTRA)));
console.log('Performance Decode MSGPACK plain Object', doTask(() => MSGPACK.decode(encodedObjectMSGPACK)));