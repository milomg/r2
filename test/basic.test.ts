import { expect, test } from "vitest";
import { r, s, stabilize } from "../src";

test("basic", () => {
  let aCalledCount = 0;
  let cCalledCount = 0;
  const b = s(1);

  const a = r(function* () {
    aCalledCount++;
    const v = yield* b;
    return v * 2;
  });

  const c = r(function* () {
    cCalledCount++;
    const v2 = yield* a;
    return v2 + 1;
  });

  expect(c.value).toBe(null);
  expect(a.value).toBe(null);
  expect(aCalledCount).toBe(0);
  expect(cCalledCount).toBe(0);

  stabilize();

  expect(c.value).toBe(3);
  expect(a.value).toBe(2);
  expect(a.height).toBe(0);
  expect(c.height).toBe(1);

  expect(aCalledCount).toBe(1);
  expect(cCalledCount).toBe(1);

  b.set(5);

  stabilize();

  expect(c.value).toBe(11); // Update expected value after b.set(5)
  expect(a.value).toBe(10); // Update expected value after b.set(5)

  expect(aCalledCount).toBe(2);
  expect(cCalledCount).toBe(2);

  stabilize();

  expect(aCalledCount).toBe(2);
  expect(cCalledCount).toBe(2);
});

test("switching sources", () => {
  let dCalledCount = 0;
  const a = s(false);
  const b = s(2);
  const c = s(3);

  const d = r(function* () {
    dCalledCount++;
    const which = yield* a;
    if (which) {
      return yield* b;
    } else {
      return yield* c;
    }
  });

  stabilize();
  expect(d.value).toBe(3);

  a.set(true);
  stabilize();
  expect(dCalledCount).toBe(2);
  expect(d.value).toBe(2);

  c.set(4);
  stabilize();
  expect(d.value).toBe(2);
  expect(dCalledCount).toBe(2);
});

test("increasing height", () => {
  let dCalledCount = 0;
  const a = s(false);
  const b = s(2);
  const c = s(3);

  const d1 = r(function* () {
    return yield* c;
  });

  const d = r(function* () {
    dCalledCount++;
    const which = yield* a;
    if (which) {
      return yield* b;
    } else {
      return yield* c;
    }
  });

  stabilize();
  expect(d.value).toBe(3);

  a.set(true);
  stabilize();
  expect(dCalledCount).toBe(2);
  expect(d.value).toBe(2);

  c.set(4);
  stabilize();
  expect(d.value).toBe(2);
  expect(dCalledCount).toBe(2);
});
