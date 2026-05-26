import "reflect-metadata";
import {Nytra} from "./Nytra.ts"


type MetaData = Record<string | symbol, any>;

const metaData: Map<unknown, MetaData> = new Map();

export class NytraExperimental {
    private static getMetaData(target: unknown): MetaData {
        let ctx = metaData.get(target);
        if (!ctx) {
            ctx = {};
            metaData.set(target, ctx);
            return ctx;
        }
        return ctx;

    }


    static registerClass(index: number) {

        const realDecorator = Nytra.registerClass(index);
        return function <T extends Function>(target: T) {
            const meta = NytraExperimental.getMetaData(target);
            realDecorator(target, {

                addInitializer(initializer: (this: { new(...args: any): any }) => void): void {
                }, kind: "class", metadata: meta, name: undefined

            })
        }
    }

    static registerField(
        position: Parameters<typeof Nytra.registerField>[0],
        targetTypeId?: Parameters<typeof Nytra.registerField>[1],
        options?: Parameters<typeof Nytra.registerField>[2]
    ) {

        const realDecorator = Nytra.registerField(position, targetTypeId, options);


        return function <T extends object>(target: T, propertyKey: keyof T) {
            let targetClass = target.constructor;
            if (typeof propertyKey !== 'string') {
                throw new Error('propertyKey must be a string');
            }
            const meta = NytraExperimental.getMetaData(targetClass);
            realDecorator(undefined, {
                addInitializer(initializer: (this: unknown) => void): void {
                },
                kind: "field",
                static: typeof targetClass === 'function',
                name: propertyKey,
                private: propertyKey.startsWith("#"),
                metadata: meta,
                access: {
                    has(object: T): boolean {
                        return propertyKey in (object as object);
                    },
                    set(object: T, value: unknown) {
                        (object as Record<string | symbol, unknown>)[propertyKey] = value;
                    },
                    get(object: T): unknown {
                        return (object as Record<string | symbol, unknown>)[propertyKey];
                    }
                }
            });

        }
    }
}