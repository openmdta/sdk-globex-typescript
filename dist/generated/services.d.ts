import { ServiceError, type ServiceCallOptions, type ServiceInvoker } from "../service.js";
export declare namespace observationTypes {
    type AlertType = "ALERT_ON_OVER" | "ALERT_ON_UNDER";
    type GetWatcherRequest = {
        readonly "watcherId": string;
    };
    type GetWatchersRequest = {
        readonly "accountId": string;
    };
    type NotificationPolicy = {
        readonly "gapRecovery"?: boolean;
        readonly "liveOff"?: boolean;
        readonly "liveOn"?: boolean;
    };
    type ObservationStatus = "TRIGGERED" | "FLAPPING" | "NOT_TRIGGERED";
    type RevisionConflict = {
        readonly "actualRevision": bigint;
        readonly "expectedRevision": bigint;
    };
    type SetWatcherRequest = {
        readonly "update": WatcherUpdate;
        readonly "watcherId": string;
    };
    type Watcher = {
        readonly "accountId": string;
        readonly "activeFrom": string;
        readonly "activeUntil"?: string | null;
        readonly "alertType": AlertType;
        readonly "createdAt": string;
        readonly "listingExpression": string;
        readonly "notifications": NotificationPolicy;
        readonly "revision": bigint;
        readonly "rule": WatcherRule;
        readonly "status": ObservationStatus;
        readonly "updatedAt": string;
        readonly "watcherId": string;
    };
    type WatcherList = ReadonlyArray<Watcher>;
    type WatcherNotFound = {
        readonly "watcherId": string;
    };
    type WatcherRule = {
        readonly "blockId": number;
        readonly "field": string;
        readonly "threshold": number;
    };
    type WatcherUpdate = {
        readonly "expectedRevision"?: bigint | null;
        readonly "notifications"?: NotificationPolicy | null;
        readonly "rule"?: WatcherRule | null;
    };
    type getWatcherError = (ServiceError & {
        readonly code: "not_found";
        readonly details: WatcherNotFound;
    });
    const isGetWatcherError: (error: unknown) => error is getWatcherError;
    type setWatcherError = (ServiceError & {
        readonly code: "conflict";
        readonly details: RevisionConflict;
    }) | (ServiceError & {
        readonly code: "not_found";
        readonly details: WatcherNotFound;
    });
    const isSetWatcherError: (error: unknown) => error is setWatcherError;
}
export interface ServiceNamespace {
    readonly observation: {
        getWatcher(watcherId: string, options?: ServiceCallOptions): Promise<observationTypes.Watcher>;
        getWatchers(accountId: string, options?: ServiceCallOptions): Promise<observationTypes.WatcherList>;
        setWatcher(watcherId: string, update: observationTypes.WatcherUpdate, options?: ServiceCallOptions): Promise<observationTypes.Watcher>;
    };
}
export declare const createServiceNamespace: (call: ServiceInvoker) => ServiceNamespace;
//# sourceMappingURL=services.d.ts.map