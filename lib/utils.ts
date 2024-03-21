export function sleep(time: number, resolveWith: boolean): Promise<boolean> {
    if (!time) time = 0;
    return new Promise(res => setTimeout(() => res(resolveWith), time));
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function asyncCall(cb?: { (): void; }) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('')
            if (cb) {
                cb()
            }
        })
    })
}

export function noop() {
    // do nothing
}
