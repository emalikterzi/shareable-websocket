declare global {

    interface MyDataInterface {

    }

    interface EventSourceEventMap {
        ['customConnected']: MessageEvent<MyDataInterface>;
    }
}
