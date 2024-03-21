export type SharedTabOptions = {
    namespace: string
}

export type InstanceId = string;

export const MESSAGE_ACTION = {
    UPDATE_CONTEXT: 'UPDATE_CONTEXT',
    INSTANCE_REMOVED: 'INSTANCE_REMOVED',
    INSTANCE_JOIN: 'INSTANCE_JOIN',
    EVENT_LISTENER: 'EVENT_LISTENER',
    INVOKE_SEND: 'INVOKE_SEND'
} as const

export type IMessageAction = keyof typeof MESSAGE_ACTION;

export interface ISharedTabInternalMessage {
    instanceId: InstanceId
    msg: any
    action: IMessageAction
    handled?: boolean
}

export interface Closable {
    close(): void
}


export {}
