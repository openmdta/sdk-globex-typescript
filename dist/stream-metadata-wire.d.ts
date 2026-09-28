export declare function decodeStreamMetadataSbe(body: Uint8Array): {
    dataset: string;
    quality: string;
    activity: {
        timeZone: string;
        activitySchedule?: {
            times: Record<string, {
                open: string;
                close: string;
            }>;
            exceptions: {
                date: string;
                open?: string;
                close?: string;
                closed?: boolean;
            }[];
        };
        holidayCalendar?: {
            name: string;
            displayName: string;
            holidays: {
                date: string;
                name?: string;
            }[];
        };
    } | null;
};
//# sourceMappingURL=stream-metadata-wire.d.ts.map