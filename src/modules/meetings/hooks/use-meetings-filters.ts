import { parseAsInteger, parseAsString, useQueryStates, parseAsStringEnum } from "nuqs";

import { DEFAULT_PAGE } from "@/constant";

import { MeetingStatus } from "../types";

export const useMeetingsFilters = () => {
    return useQueryStates({
        search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
        page: parseAsInteger.withDefault(DEFAULT_PAGE).withOptions({ clearOnDefault: true }),
        status: parseAsStringEnum(Object.values(MeetingStatus)),
        agentId: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    })
};
