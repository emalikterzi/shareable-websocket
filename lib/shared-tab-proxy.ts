import {SharedTabs} from "./shared-tab.ts";
import {SharedTabOptions} from "./types.ts";
import {BroadcastChannelOptions, LeaderElectionOptions} from "broadcast-channel";

export abstract class SharableProxy<CONTEXT, SOURCE extends object> extends SharedTabs<CONTEXT> {

    protected proxy!: SOURCE
    protected source!: SOURCE;

    protected constructor(
        opts?: SharedTabOptions,
        leaderElectionOptions?: LeaderElectionOptions,
        broadcastChannelOptions?: BroadcastChannelOptions) {
        super(opts, leaderElectionOptions, broadcastChannelOptions);

    }

    public abstract createSource(): Promise<SOURCE>;

    public abstract onSourceCreate(): Promise<void>


    public getConnection(): SOURCE {
        return this.proxy
    }

    protected async onMasterSelection(): Promise<any> {
        this.source = await this.createSource()
        await this.onSourceCreate();
    }
}
