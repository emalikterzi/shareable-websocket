import {BroadcastChannelOptions, LeaderElectionOptions} from "broadcast-channel";
import {ISharedTabInternalMessage, SharedTabOptions} from "./types.ts";
import {EventTargetProxyHandler, SharableEventContext, ShareableEventTarget} from "./shared-tab-et.ts";


interface WebSocketOpts {
    url: string | URL,
    protocols?: string | string[]
}

class WebsocketContext extends SharableEventContext {

}

export class WebSocketProxyHandler extends EventTargetProxyHandler<WebSocket, ShareableWebsocket> {

    constructor(sharable: ShareableWebsocket) {
        super(sharable);
    }

    get(target: WebSocket, p: string | symbol, receiver: any): any {
        const self = this;
        if (p === 'addEventListener') {
            return super.get(target, p, receiver);
        }

        if (p === 'send') {
            return function (data: string | ArrayBufferLike | Blob | ArrayBufferView) {
                return self.sharable._createSendProxy(data)
            }
        }

        return super.get(target, p, receiver)
    }

}

export class ShareableWebsocket extends ShareableEventTarget<WebsocketContext, WebSocket> {

    constructor(private webSocketOptions: WebSocketOpts,
                opts?: SharedTabOptions,
                leaderElectionOptions?: LeaderElectionOptions,
                broadcastChannelOptions?: BroadcastChannelOptions) {
        super(opts, leaderElectionOptions, broadcastChannelOptions);
    }


    createSource(): Promise<WebSocket> {
        return Promise.resolve(new WebSocket(this.webSocketOptions.url, this.webSocketOptions.protocols))
    }

    protected createProxyHandler(): ProxyHandler<WebSocket> {
        return new WebSocketProxyHandler(this);
    }

    _createSendProxy(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (this.source) {
            this.source.send(data)
        } else {
            this.publishInternal('INVOKE_SEND', data)
        }
    }


    public async onSourceCreate(): Promise<void> {
        await this.onClusterContextChanged()
    }


    protected async onMessage(ev: ISharedTabInternalMessage): Promise<void> {
        if (ev.action === 'INVOKE_SEND') {
            if (this.source) {
                this.source.send(ev.msg)
            }
            console.log('from slave recieved', ev)
            ev.handled = true
            return Promise.resolve();
        }
        return super.onMessage(ev)
    }
}
