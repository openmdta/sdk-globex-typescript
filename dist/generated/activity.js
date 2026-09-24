const schema = {
    "$defs": {
        "ActivityException": {
            "additionalProperties": false,
            "properties": {
                "close": {
                    "maxLength": 8,
                    "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "closed": {
                    "type": [
                        "boolean",
                        "null"
                    ]
                },
                "date": {
                    "maxLength": 10,
                    "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                    "type": "string"
                },
                "open": {
                    "maxLength": 8,
                    "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                    "type": [
                        "string",
                        "null"
                    ]
                }
            },
            "required": [
                "date"
            ],
            "type": "object",
            "x-kubernetes-validations": [
                {
                    "message": "require open/close or closed: true exclusively",
                    "rule": "has(self.closed) ? (self.closed && !has(self.open) && !has(self.close)) : (has(self.open) && has(self.close) && self.open < self.close)"
                }
            ]
        },
        "ActivitySchedule": {
            "additionalProperties": false,
            "properties": {
                "exceptions": {
                    "default": [],
                    "items": {
                        "$ref": "#/$defs/ActivityException"
                    },
                    "maxItems": 4096,
                    "type": "array",
                    "x-kubernetes-list-map-keys": [
                        "date"
                    ],
                    "x-kubernetes-list-type": "map"
                },
                "times": {
                    "$ref": "#/$defs/WeeklyActivity"
                }
            },
            "required": [
                "times"
            ],
            "type": "object"
        },
        "ActivityWindow": {
            "additionalProperties": false,
            "properties": {
                "close": {
                    "maxLength": 8,
                    "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                    "type": "string"
                },
                "open": {
                    "maxLength": 8,
                    "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
                    "type": "string"
                }
            },
            "required": [
                "open",
                "close"
            ],
            "type": "object",
            "x-kubernetes-validations": [
                {
                    "message": "open must precede close on the same day",
                    "rule": "self.open < self.close"
                }
            ]
        },
        "Holiday": {
            "additionalProperties": false,
            "properties": {
                "date": {
                    "maxLength": 10,
                    "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                    "type": "string"
                },
                "name": {
                    "maxLength": 256,
                    "type": [
                        "string",
                        "null"
                    ]
                }
            },
            "required": [
                "date"
            ],
            "type": "object"
        },
        "ResolvedHolidayCalendar": {
            "additionalProperties": false,
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "holidays": {
                    "items": {
                        "$ref": "#/$defs/Holiday"
                    },
                    "maxItems": 4096,
                    "type": "array"
                },
                "name": {
                    "type": "string"
                }
            },
            "required": [
                "name",
                "displayName",
                "holidays"
            ],
            "type": "object"
        },
        "StreamActivityMetadata": {
            "additionalProperties": false,
            "properties": {
                "activitySchedule": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivitySchedule"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "holidayCalendar": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ResolvedHolidayCalendar"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "timeZone": {
                    "type": "string"
                }
            },
            "required": [
                "timeZone"
            ],
            "type": "object"
        },
        "WeeklyActivity": {
            "additionalProperties": false,
            "properties": {
                "fri": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "mon": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "sat": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "sun": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "thu": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "tue": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "wed": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/ActivityWindow"
                        },
                        {
                            "type": "null"
                        }
                    ]
                }
            },
            "type": "object"
        }
    },
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "additionalProperties": false,
    "description": "One source's activity metadata. Missing activity supports older/unconfigured services.",
    "properties": {
        "activity": {
            "anyOf": [
                {
                    "$ref": "#/$defs/StreamActivityMetadata"
                },
                {
                    "type": "null"
                }
            ]
        },
        "dataset": {
            "type": "string"
        },
        "quality": {
            "type": "string"
        }
    },
    "required": [
        "dataset",
        "quality"
    ],
    "title": "StreamMetadata",
    "type": "object"
};
const MAX_METADATA_BYTES = 131072;
function valid(node, value) {
    if (node.$ref) {
        const definition = schema.$defs?.[node.$ref.replace("#/$defs/", "")];
        return definition !== undefined && valid(definition, value);
    }
    const alternatives = node.anyOf ?? node.oneOf;
    if (alternatives)
        return alternatives.some(variant => valid(variant, value));
    if (Array.isArray(node.type))
        return node.type.some(type => valid({ ...node, type }, value));
    switch (node.type) {
        case "null": return value === null;
        case "boolean": return typeof value === "boolean";
        case "string": return typeof value === "string"
            && (node.pattern === undefined || new RegExp(node.pattern).test(value))
            && (node.maxLength === undefined || [...value].length <= node.maxLength)
            && (node.minLength === undefined || [...value].length >= node.minLength);
        case "array": return Array.isArray(value) && node.items !== undefined
            && (node.maxItems === undefined || value.length <= node.maxItems)
            && value.every(item => valid(node.items, item));
        case "object": {
            if (typeof value !== "object" || value === null || Array.isArray(value))
                return false;
            const object = value;
            if (node.required?.some(key => !Object.hasOwn(object, key)))
                return false;
            return Object.entries(object).every(([key, field]) => {
                const property = node.properties?.[key];
                return property === undefined ? node.additionalProperties !== false : valid(property, field);
            });
        }
        default: return false;
    }
}
export function decodeStreamMetadataJson(bytes) {
    if (bytes.byteLength > MAX_METADATA_BYTES)
        throw new Error("Stream metadata exceeds 128 KiB");
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!valid(schema, value))
        throw new Error("invalid Stream metadata response");
    return value;
}
//# sourceMappingURL=activity.js.map