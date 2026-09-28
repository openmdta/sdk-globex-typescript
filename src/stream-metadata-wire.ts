export function decodeStreamMetadataSbe(body: Uint8Array) {
  if (body.byteLength < 1 || body.byteLength > 128 * 1024) throw new Error("invalid Stream metadata length");
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  let offset = 0;
  const byte = (): number => {
    if (offset >= body.byteLength) throw new Error("truncated Stream metadata");
    return view.getUint8(offset++);
  };
  const group = (maximum: number): number => {
    if (offset + 6 > body.byteLength || view.getUint16(offset, true) !== 1) throw new Error("invalid Stream metadata group");
    const count = view.getUint32(offset + 2, true);
    offset += 6;
    if (count > maximum) throw new Error("Stream metadata group exceeds limit");
    return count;
  };
  const text = (): string => {
    if (offset + 4 > body.byteLength) throw new Error("truncated Stream metadata text");
    const length = view.getUint32(offset, true);
    offset += 4;
    if (length > body.byteLength - offset) throw new Error("truncated Stream metadata text");
    const value = new TextDecoder("utf-8", {fatal: true}).decode(body.subarray(offset, offset + length));
    offset += length;
    return value;
  };
  const presence = byte();
  if (presence & ~7 || !(presence & 1) && (presence & 6)) throw new Error("invalid Stream metadata presence");
  const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const times: Record<string, {open: string; close: string}> = {};
  for (let index = 0, count = group(7); index < count; index++) {
    const day = byte();
    const open = text(), close = text();
    if (day > 6 || weekdays[day]! in times || !open || !close) throw new Error("invalid weekly activity window");
    times[weekdays[day]!] = {open, close};
  }
  const exceptions: Array<{date: string; open?: string; close?: string; closed?: boolean}> = [];
  for (let index = 0, count = group(4096); index < count; index++) {
    const closed = byte();
    const date = text(), open = text(), close = text();
    if (closed > 1 || closed === 1 && (open || close) || closed === 0 && (!open || !close)) throw new Error("invalid activity exception");
    exceptions.push(closed ? {date, closed: true} : {date, open, close});
  }
  const holidays: Array<{date: string; name?: string}> = [];
  for (let index = 0, count = group(4096); index < count; index++) {
    const hasName = byte();
    const date = text(), name = text();
    if (hasName > 1 || !hasName && name) throw new Error("invalid holiday name presence");
    holidays.push(hasName ? {date, name} : {date});
  }
  const dataset = text(), quality = text(), timeZone = text(), calendarName = text(), calendarDisplayName = text();
  if (offset !== body.byteLength || !(presence & 2) && (Object.keys(times).length || exceptions.length)
    || !(presence & 4) && (holidays.length || calendarName || calendarDisplayName)
    || !(presence & 1) && timeZone || (presence & 1) && !timeZone
    || (presence & 4) && (!calendarName || !calendarDisplayName)) throw new Error("invalid Stream metadata body");
  const activity = presence & 1 ? {
    timeZone,
    ...(presence & 2 ? {activitySchedule: {times, exceptions}} : {}),
    ...(presence & 4 ? {holidayCalendar: {name: calendarName, displayName: calendarDisplayName, holidays}} : {}),
  } : null;
  return {dataset, quality, activity};
}
