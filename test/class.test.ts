import {Nytra,Types} from "nytra";
import {expect, test} from "bun:test";

@Nytra.registerClass(22222)
class Account {
    @Nytra.registerField(0, Types.TYPE_STRING)
    name: string;

    @Nytra.registerField(1, Types.TYPE_STRING, {nullable: true})
    email: string|null = null;


    constructor(name: string) {
        this.name = name;
    }
}

test("Handle Account with email", () => {
    const account = new Account("test");
    account.email = 'test@example.com';

    const encoded = Nytra.encode(account, Nytra.getTypeIdForClass(Account));
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(account)
});

test("Handle Account with null email", () => {
    const account = new Account("test");
    const encoded = Nytra.encode(account, Nytra.getTypeIdForClass(Account));
    const decoded = Nytra.decode(encoded);

    expect(decoded).toEqual(account)
});