import {BroadcastChannelOptions, LeaderElectionOptions} from "broadcast-channel";
import {SharedTabOptions} from "./types.ts";
import {EventTargetProxyHandler, SharableEventContext, ShareableEventTarget} from "./shared-tab-et.ts";

interface EventSourceOpts {
    url: string | URL,
    eventSourceInitDict?: EventSourceInit
}

class EventSourceContext extends SharableEventContext {

}


export class ShareableEventSource extends ShareableEventTarget<EventSourceContext, EventSource> {

    constructor(private eventSourceOpts: EventSourceOpts,
                opts?: SharedTabOptions,
                leaderElectionOptions?: LeaderElectionOptions,
                broadcastChannelOptions?: BroadcastChannelOptions) {
        super(opts, leaderElectionOptions, broadcastChannelOptions);
    }

    createSource(): Promise<EventSource> {
        return Promise.resolve(new EventSource(this.eventSourceOpts.url, this.eventSourceOpts.eventSourceInitDict))
    }

    protected createProxyHandler(): ProxyHandler<EventSource> {
        return new EventTargetProxyHandler(this)
    }


    public async onSourceCreate(): Promise<void> {
        await this.onClusterContextChanged()
    }


}
