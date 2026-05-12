import {Nytra} from "../src/Nytra.ts";
import {TYPE_FLOAT64, TYPE_INT16, TYPE_INT8, TYPE_JSON, TYPE_STRING} from "../src/Types.ts";


@Nytra.registerClass(2001)
export class Weapon {
    @Nytra.registerField(0, TYPE_STRING)
    name = "Sword";

    @Nytra.registerField(1, TYPE_INT16)
    damage = 100;
}

@Nytra.registerClass(2000)
export class Player {
    @Nytra.registerField(0, TYPE_INT8)
    posX = 44;

    @Nytra.registerField(1, TYPE_FLOAT64)
    posY = 0.123;

    @Nytra.registerField(2, Weapon)
    weapon = new Weapon();
}




