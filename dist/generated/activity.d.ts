export type ActivityException = {
    readonly "close"?: string | null;
    readonly "closed"?: boolean | null;
    readonly "date": string;
    readonly "open"?: string | null;
};
export type ActivitySchedule = {
    readonly "exceptions"?: ReadonlyArray<ActivityException>;
    readonly "times": WeeklyActivity;
};
export type ActivityWindow = {
    readonly "close": string;
    readonly "open": string;
};
export type Holiday = {
    readonly "date": string;
    readonly "name"?: string | null;
};
export type ResolvedHolidayCalendar = {
    readonly "displayName": string;
    readonly "holidays": ReadonlyArray<Holiday>;
    readonly "name": string;
};
export type StreamActivityMetadata = {
    readonly "activitySchedule"?: ActivitySchedule | null;
    readonly "holidayCalendar"?: ResolvedHolidayCalendar | null;
    readonly "timeZone": string;
};
export type WeeklyActivity = {
    readonly "fri"?: ActivityWindow | null;
    readonly "mon"?: ActivityWindow | null;
    readonly "sat"?: ActivityWindow | null;
    readonly "sun"?: ActivityWindow | null;
    readonly "thu"?: ActivityWindow | null;
    readonly "tue"?: ActivityWindow | null;
    readonly "wed"?: ActivityWindow | null;
};
export type StreamMetadata = {
    readonly "activity"?: StreamActivityMetadata | null;
    readonly "dataset": string;
    readonly "quality": string;
};
export declare function decodeStreamMetadataJson(bytes: Uint8Array): StreamMetadata;
//# sourceMappingURL=activity.d.ts.map