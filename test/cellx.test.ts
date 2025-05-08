import { expect, test } from "vitest";
import { r, s, stabilize } from "../src";

type Computed<T> = ReturnType<typeof r<T>>;

test("cellx", () => {
  const start = {
    prop1: s(1),
    prop2: s(2),
    prop3: s(3),
    prop4: s(4),
  };

  let layer: {
    prop1: Computed<number>;
    prop2: Computed<number>;
    prop3: Computed<number>;
    prop4: Computed<number>;
  } = start as any;

  for (let i = 2; i > 0; i--) {
    const m = layer;
    const s = {
      prop1: r(function* () {
        return yield* m.prop2;
      }),
      prop2: r(function* () {
        return (yield* m.prop1) - (yield* m.prop3);
      }),
      prop3: r(function* () {
        return (yield* m.prop2) + (yield* m.prop4);
      }),
      prop4: r(function* () {
        return yield* m.prop3;
      }),
    };

    r(function* () {
      return yield* s.prop1;
    });
    r(function* () {
      return yield* s.prop2;
    });
    r(function* () {
      return yield* s.prop3;
    });
    r(function* () {
      return yield* s.prop4;
    });

    layer = s;
  }

  const end = layer;

  stabilize();

  const before = [
    end.prop1.value,
    end.prop2.value,
    end.prop3.value,
    end.prop4.value,
  ] as const;
  expect(end.prop1.height).toBe(1);

  start.prop1.set(4);
  start.prop2.set(3);
  start.prop3.set(2);
  start.prop4.set(1);
  stabilize();

  const after = [
    end.prop1.value,
    end.prop2.value,
    end.prop3.value,
    end.prop4.value,
  ] as const;
  console.log(before, after);
});
