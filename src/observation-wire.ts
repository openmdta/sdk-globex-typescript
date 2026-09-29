import {ProtocolError} from "./protocol.js";
import {WireReader} from "./wire-reader.js";

const SCHEMA_ID = 21;
const VERSION = 0;
const encoder = new TextEncoder();

function ownerFrame(template: number, fixed: number, texts: readonly string[], writeFixed?: (view: DataView) => void): Uint8Array {
  const members = texts.map(text => encoder.encode(text));
  const bytes = new Uint8Array(8 + fixed + members.reduce((size, member) => size + 4 + member.byteLength, 0));
  const view = new DataView(bytes.buffer);
  view.setUint16(0, fixed, true);
  view.setUint16(2, template, true);
  view.setUint16(4, SCHEMA_ID, true);
  view.setUint16(6, VERSION, true);
  writeFixed?.(view);
  let offset = 8 + fixed;
  for (const member of members) {
    view.setUint32(offset, member.byteLength, true);
    bytes.set(member, offset + 4);
    offset += 4 + member.byteLength;
  }
  return bytes;
}

export function encodeObservationInput(template: number, input: Record<string, unknown>): Uint8Array {
  if (template === 1) return ownerFrame(1, 0, [input.accountId as string]);
  if (template === 2) return ownerFrame(2, 0, [input.watcherId as string]);
  if (template !== 3) throw new ProtocolError("unsupported Observation input template");
  const update = input.update as Record<string, unknown>;
  const expected = update.expectedRevision;
  const rule = update.rule as Record<string, unknown> | null | undefined;
  const notifications = update.notifications as Record<string, unknown> | null | undefined;
  const expectedState = expected === undefined ? 0 : expected === null ? 1 : 2;
  const ruleState = rule === undefined ? 0 : rule === null ? 1 : 2;
  const notificationState = notifications === undefined ? 0 : notifications === null ? 1 : 2;
  const presence = (notifications && Object.hasOwn(notifications, "liveOn") ? 1 : 0)
    | (notifications && Object.hasOwn(notifications, "liveOff") ? 2 : 0)
    | (notifications && Object.hasOwn(notifications, "gapRecovery") ? 4 : 0);
  return ownerFrame(3, 25, [input.watcherId as string, rule?.field as string ?? ""], view => {
    view.setUint8(8, expectedState);
    view.setUint8(9, ruleState);
    view.setUint8(10, notificationState);
    view.setUint8(11, presence);
    view.setBigUint64(12, expectedState === 2 ? BigInt(expected as string) : 0n, true);
    view.setUint16(20, ruleState === 2 ? rule!.blockId as number : 0, true);
    view.setFloat64(22, ruleState === 2 ? rule!.threshold as number : 0, true);
    view.setUint8(30, notifications?.liveOn === true ? 1 : 0);
    view.setUint8(31, notifications?.liveOff === true ? 1 : 0);
    view.setUint8(32, notifications?.gapRecovery === true ? 1 : 0);
  });
}

function watcher(reader: WireReader): Record<string, unknown> {
  const revision = reader.u64().toString();
  const alertType = reader.u8();
  const blockId = reader.u16();
  const threshold = reader.f64();
  const status = reader.u8();
  const notificationValues = reader.u8();
  const activeUntilState = reader.u8();
  if (![1, 2].includes(alertType) || ![1, 2, 3].includes(status) || notificationValues & ~7
    || activeUntilState > 2 || !Number.isFinite(threshold)) throw new ProtocolError("invalid Observation Watcher fields");
  const watcherId = reader.text();
  const accountId = reader.text();
  const listingExpression = reader.text();
  const field = reader.text();
  const activeFrom = reader.text();
  const activeUntil = reader.text();
  const createdAt = reader.text();
  const updatedAt = reader.text();
  if (activeUntilState !== 2 && activeUntil !== "") throw new ProtocolError("invalid Observation activeUntil");
  return {
    watcherId, accountId, revision, listingExpression,
    alertType: alertType === 1 ? "ALERT_ON_OVER" : "ALERT_ON_UNDER",
    rule: {field, blockId, threshold}, activeFrom,
    ...(activeUntilState === 0 ? {} : {activeUntil: activeUntilState === 1 ? null : activeUntil}),
    notifications: {
      liveOn: Boolean(notificationValues & 1), liveOff: Boolean(notificationValues & 2),
      gapRecovery: Boolean(notificationValues & 4),
    },
    status: ["", "TRIGGERED", "FLAPPING", "NOT_TRIGGERED"][status], createdAt, updatedAt,
  };
}

export function decodeObservationValue(template: number, frame: Uint8Array): unknown {
  if (frame.byteLength < 8 || frame.byteLength > 4 * 1024 * 1024) throw new ProtocolError("invalid Observation frame length");
  const reader = new WireReader(frame);
  const block = reader.u16();
  const actualTemplate = reader.u16();
  const schema = reader.u16();
  const version = reader.u16();
  const expectedBlock = ({4: 22, 5: 0, 6: 16, 7: 0} as Record<number, number>)[template];
  if (schema !== SCHEMA_ID || version !== VERSION || actualTemplate !== template || block !== expectedBlock)
    throw new ProtocolError("unexpected Observation owner format");
  let value: unknown;
  if (template === 4) value = watcher(reader);
  else if (template === 5) {
    const count = reader.group(22);
    if (count > 100_000) throw new ProtocolError("too many Observation watchers");
    value = Array.from({length: count}, () => watcher(reader));
  } else if (template === 6) {
    value = {expectedRevision: reader.u64().toString(), actualRevision: reader.u64().toString()};
  } else if (template === 7) value = {watcherId: reader.text()};
  else throw new ProtocolError("unknown Observation owner template");
  reader.finish();
  return value;
}
