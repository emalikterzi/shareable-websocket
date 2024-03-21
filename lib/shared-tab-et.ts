import {SharableProxy} from "./shared-tab-proxy.ts";
import {ISharedTabInternalMessage, SharedTabOptions} from "./types.ts";
import {BroadcastChannelOptions, LeaderElectionOptions} from "broadcast-channel";
import {v4 as uuidv4} from "uuid";
import {noop} from "./utils.ts";
import {InternalPublisher} from "./shared-tab.ts";

export interface MethodWrapper<T extends EventTarget> {
    type: string
    listener: EventListenerOrEventListenerObject
    receiver: any
    options?: boolean | AddEventListenerOptions
    target: T
    signal?: AbortSignal;
    subscriptionId: string
}

export class EventTargetProxyHandler<SOURCE extends EventTarget, TARGET extends ShareableEventTarget<SharableEventContext, SOURCE>> implements ProxyHandler<SOURCE> {

    constructor(protected sharable: TARGET) {
    }

    get(target: SOURCE, p: string | symbol, receiver: any): any {
        const self = this;
        if (p === 'addEventListener') {
            return function (type: string,
                             listener: EventListenerOrEventListenerObject,
                             options?: boolean | AddEventListenerOptions) {

                const wrapper: MethodWrapper<SOURCE> = {
                    type, listener, options, target, receiver, subscriptionId: uuidv4()
                }

                const addEventListenerOptions = options as AddEventListenerOptions;

                if (addEventListenerOptions && addEventListenerOptions.signal) {
                    wrapper.signal = addEventListenerOptions.signal
                }

                self.sharable._createAddListener(wrapper);
                return target.addEventListener(type, listener, options);
            };
        }

        throw new Error('Cannot use method With Shared Tabs: ' + p.toString())
    }
}

export class SharableEventContext {
    subscriptions: Record<string, string[]> = {}
}

class SharableEventTarget extends EventTarget {

}

export class SharableMessageEvent extends Event {

    public data: string
    public lastEventId: string

    constructor(type: string, eventInitDict: EventInit, data: string, lastEventId: string) {
        super(type, eventInitDict);
        this.data = data;
        this.lastEventId = lastEventId;
    }

}


class SharableContextAccessor {

    context: SharableEventContext;

    constructor(context: SharableEventContext) {
        this.context = context;
    }


    addSubscription(key: string, subscriptionId: string) {
        const allSubs = this.context.subscriptions || (this.context.subscriptions = {})
        const subscriptions = allSubs[key] || (allSubs[key] = [])
        if (subscriptions.includes(subscriptionId)) {
            return
        }
        subscriptions.push(subscriptionId);
    }

    removeSubscription(key: string, subscriptionId: string) {
        const allSubs = this.context.subscriptions || (this.context.subscriptions = {})
        const subscriptions = allSubs[key] || (allSubs[key] = [])
        subscriptions.splice(subscriptions.indexOf(subscriptionId), 1)
    }

    getSubscriptionTypes() {
        const types: string[] = []
        Object.keys(this.context.subscriptions).forEach(value => {
            if (!types.includes(value)) {
                types.push(value)
            }
        })
        return types
    }

    static from(context: SharableEventContext) {
        return new SharableContextAccessor(context);
    }
}

class InternalSourceStream<SOURCE extends EventTarget> {

    closer: () => void = () => {
    }

    constructor(private type: string,
                private publisher: InternalPublisher,
                private shadow: SharableEventTarget, private source: SOURCE) {
    }

    open() {
        const publisher = this.publisher;
        const shadow = this.shadow

        function listenerFn(ev: any) {
            const event = {
                lastEventId: ev.lastEventId,
                type: ev.type,
                data: ev.data
            }
            publisher.publishInternal("EVENT_LISTENER", event)
            shadow.dispatchEvent(new SharableMessageEvent(event.type, {}, event.data, ev.lastEventId))
        }

        this.source.addEventListener(this.type, listenerFn)
        return () => {
            console.log('called closer')
            this.source.removeEventListener(this.type, listenerFn)
        }
    }
}

export abstract class ShareableEventTarget<CONTEXT extends SharableEventContext, SOURCE extends EventTarget> extends SharableProxy<CONTEXT, SOURCE> {

    protected proxyInstance: SharableEventTarget;
    protected listeners: Record<string, MethodWrapper<any>[]> = {}
    protected internalSourceStreams: Record<string, InternalSourceStream<SOURCE>> = {}

    protected constructor(opts?: SharedTabOptions,
                          leaderElectionOptions?: LeaderElectionOptions,
                          broadcastChannelOptions?: BroadcastChannelOptions) {
        super(opts, leaderElectionOptions, broadcastChannelOptions);
        this.proxyInstance = new SharableEventTarget();
        this.proxy = new Proxy(this.proxyInstance as SOURCE, this.createProxyHandler())
    }

    protected abstract createProxyHandler(): ProxyHandler<SOURCE>

    private checkForSourceListeners(streams: string[]) {
        for (const each of streams) {
            const existing = this.internalSourceStreams[each]

            if (existing) {
                return
            }

            const stream = new InternalSourceStream(each, this, this.proxyInstance, this.source);
            this.internalSourceStreams[each] = stream;
            stream.closer = stream.open();
        }
    }

    protected async onClusterContextChanged(): Promise<void> {
        await this.elector.hasLeader()
        if (this.elector.isLeader) {
            const types = SharableContextAccessor.from(this.context).getSubscriptionTypes();
            if (!types) {
                return
            }
            this.checkForSourceListeners(types)
        }
    }


    protected async onMessage(ev: ISharedTabInternalMessage): Promise<void> {
        if (ev.handled) {
            return super.onMessage(ev)
        }

        if (ev.action === 'EVENT_LISTENER') {
            ev.handled = true
            const data = ev.msg;
            this.proxyInstance.dispatchEvent(new SharableMessageEvent(data.type, {}, data.data, data.lastEventId))
            return Promise.resolve()
        }

        return super.onMessage(ev)
    }

    public _createAddListener(wrapper: MethodWrapper<SOURCE>) {
        const accessor = SharableContextAccessor.from(this.context);
        const listeners = this.listeners[wrapper.type] || (this.listeners[wrapper.type] = [])
        const exist = listeners.find(value => value.listener == wrapper.listener);

        if (exist) {
            accessor.removeSubscription(wrapper.type, exist.subscriptionId)
            listeners.splice(listeners.indexOf(exist), 1)
        }

        accessor.addSubscription(wrapper.type, wrapper.subscriptionId)
        listeners.push(wrapper)

        this.publishContext()
        this.onClusterContextChanged().then(noop).catch(console.error)

        if (wrapper.signal) {
            wrapper.signal.addEventListener('abort', () => {
                const found = listeners.find(value => value.listener == wrapper.listener);
                if (found) {
                    accessor.removeSubscription(found.type, found.subscriptionId)
                    listeners.splice(listeners.indexOf(found), 1)
                    this.publishContext()
                    this.onClusterContextChanged().then(noop).catch(console.error)
                }
            })
        }
    }
}
