import {
    BroadcastChannel,
    BroadcastChannelOptions,
    createLeaderElection,
    LeaderElectionOptions,
    LeaderElector
} from 'broadcast-channel';
import {v4 as uuidv4} from 'uuid';
import {noop} from "./utils.ts";

import {IMessageAction, InstanceId, ISharedTabInternalMessage, MESSAGE_ACTION, SharedTabOptions} from "./types.ts";

const DEFAULT_OPTIONS: SharedTabOptions = {
    namespace: '__sharedTabsContext'
}

interface ContextHolder<CONTEXT> {

    putContext<T extends keyof CONTEXT & string>(key: T, value: CONTEXT[T]): void;

    publishContext(): void;
}

export interface InternalPublisher {

    publishInternal(action: IMessageAction, msg?: any): Promise<void>
}

export abstract class SharedTabs<CONTEXT> implements ContextHolder<CONTEXT>, InternalPublisher {

    private readonly _instanceId: InstanceId = uuidv4()
    protected readonly channel: BroadcastChannel;
    private readonly _isReady: Promise<boolean>;
    private readonly _context: CONTEXT;
    protected readonly elector: LeaderElector
    protected readonly clusterContext: Record<InstanceId, CONTEXT> = {}

    protected constructor(opts: SharedTabOptions = DEFAULT_OPTIONS,
                          leaderElectionOptions: LeaderElectionOptions = {fallbackInterval: 2000, responseTime: 1000},
                          broadcastChannelOptions: BroadcastChannelOptions = {type: 'native'}) {
        const options = {...DEFAULT_OPTIONS, ...opts}
        this._context = Object.create({});
        this.channel = new BroadcastChannel<ISharedTabInternalMessage>(options.namespace, broadcastChannelOptions);
        this.elector = createLeaderElection(this.channel, leaderElectionOptions)
        this.channel.onmessage = ev => this.onMessage(ev)
        this._isReady = this.elector.hasLeader();
        this.elector.awaitLeadership().then(() => this.onMasterSelection().then(noop).catch(console.error))
        this._isReady.then(() => this.internalReady())
        window.addEventListener('beforeunload', () => this.close().then(noop).catch(noop))
    }

    async internalReady() {
        await this.publishInternal(MESSAGE_ACTION.INSTANCE_JOIN)
        await this.publishContext()
    }

    putContext<T extends keyof CONTEXT & string>(key: T, value: CONTEXT[T]): void {
        this._context[key] = value
    }

    isLeader() {
        return this.elector.isLeader
    }

    async publishContext() {
        await this.publishInternal(MESSAGE_ACTION.UPDATE_CONTEXT, this._context)
    }

    async publishInternal(action: IMessageAction, msg?: any) {
        await this.channel.postMessage({
            instanceId: this._instanceId,
            action: action,
            msg: msg
        })
    }

    protected abstract onClusterContextChanged(): Promise<any> ;

    protected abstract onMasterSelection(): Promise<any>

    private async onUpdateContextEvent(instanceId: InstanceId, ctx: CONTEXT): Promise<void> {
        this.clusterContext[instanceId] = ctx
        this.onClusterContextChanged().then(noop).catch(console.error)
    }


    private async onInstanceRemoved(instanceId: InstanceId): Promise<void> {
        delete this.clusterContext[instanceId]
        this.onClusterContextChanged().then(noop).catch(console.error)
    }


    protected async onMessage(ev: ISharedTabInternalMessage) {
        if (ev.handled) {
            return
        }
        switch (ev.action) {
            case MESSAGE_ACTION.UPDATE_CONTEXT:
                this.onUpdateContextEvent(ev.instanceId, ev.msg).then(noop).catch(noop)
                break
            case MESSAGE_ACTION.INSTANCE_REMOVED:
                this.onInstanceRemoved(ev.instanceId).then(noop).catch(noop)
                break
            case MESSAGE_ACTION.INSTANCE_JOIN:
                this.publishContext().then(noop).catch(noop)
                break
        }
    }


    public isReady() {
        return this._isReady;
    }

    get instanceId(): InstanceId {
        return this._instanceId;
    }

    get context(): CONTEXT {
        return this._context;
    }

    async close() {
        throw new Error('close method must be implemented')
    }
}
