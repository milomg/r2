import { expect, test } from "vitest";
import { r, s, stabilize } from "../src";

test("basic", () => {
  let aCalledCount = 0;
  let cCalledCount = 0;
  const b = s("b", 1);

  const a = r("a", function* () {
    aCalledCount++;
    const v = yield* b;
    return v * 2;
  });

  const c = r("c", function* () {
    cCalledCount++;
    const v2 = yield* a;
    return v2 + 1;
  });

  expect(c.v).toBe(null);
  expect(a.v).toBe(null);
  expect(aCalledCount).toBe(0);
  expect(cCalledCount).toBe(0);

  stabilize();

  expect(c.v).toBe(3);
  expect(a.v).toBe(2);
  expect(a.h).toBe(0);
  expect(c.h).toBe(1);

  expect(aCalledCount).toBe(1);
  expect(cCalledCount).toBe(1);

  b.set(5);

  stabilize();

  expect(c.v).toBe(11); // Update expected value after b.set(5)
  expect(a.v).toBe(10); // Update expected value after b.set(5)

  expect(aCalledCount).toBe(2);
  expect(cCalledCount).toBe(2);

  stabilize();

  expect(aCalledCount).toBe(2);
  expect(cCalledCount).toBe(2);
});

test("switching sources", () => {
  let dCalledCount = 0;
  const a = s("a", false);
  const b = s("b", 2);
  const c = s("c", 3);

  const d = r("d", function* () {
    dCalledCount++;
    const which = yield* a;
    if (which) {
      return yield* b;
    } else {
      return yield* c;
    }
  });

  stabilize();
  expect(d.v).toBe(3);

  a.set(true);
  stabilize();
  expect(dCalledCount).toBe(2);
  expect(d.v).toBe(2);

  c.set(4);
  stabilize();
  expect(d.v).toBe(2);
  expect(dCalledCount).toBe(2);
});

test("increasing height", () => {
  let dCalledCount = 0;
  const a = s("a", false);
  const b = s("b", 2);
  const c = s("c", 3);

  const d1 = r("d1", function* () {
    return yield* c;
  });

  const d = r("d", function* () {
    dCalledCount++;
    const which = yield* a;
    if (which) {
      return yield* b;
    } else {
      return yield* c;
    }
  });

  stabilize();
  expect(d.v).toBe(3);

  a.set(true);
  stabilize();
  expect(dCalledCount).toBe(2);
  expect(d.v).toBe(2);

  c.set(4);
  stabilize();
  expect(d.v).toBe(2);
  expect(dCalledCount).toBe(2);
});
