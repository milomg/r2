// import { run, bench, boxplot, summary } from 'mitata';
import { bench } from "vitest";
import { r, s, stabilize } from "../../src";
import { batch, createMemo, createSignal } from "./queue";

type Computed<T> = ReturnType<typeof r<T>>;

bench("cellx", () => {
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

  for (let i = 2000; i > 0; i--) {
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
});

bench("cellx-solid", () => {
  const start = {
    prop1: createSignal(1),
    prop2: createSignal(2),
    prop3: createSignal(3),
    prop4: createSignal(4),
  };
  let layer: {
    prop1: () => number;
    prop2: () => number;
    prop3: () => number;
    prop4: () => number;
  } = {
    prop1: start.prop1[0],
    prop2: start.prop2[0],
    prop3: start.prop3[0],
    prop4: start.prop4[0],
  };
  for (let i = 2000; i > 0; i--) {
    const m = layer;
    const s = {
      prop1: createMemo(() => m.prop2()),
      prop2: createMemo(() => m.prop1() - m.prop3()),
      prop3: createMemo(() => m.prop2() + m.prop4()),
      prop4: createMemo(() => m.prop3()),
    };
    layer = s;
  }
  const end = layer;

  const before = [end.prop1(), end.prop2(), end.prop3(), end.prop4()] as const;
  batch(() => {
    start.prop1[1](4);
    start.prop2[1](3);
    start.prop3[1](2);
    start.prop4[1](1);
  });
  const after = [end.prop1(), end.prop2(), end.prop3(), end.prop4()] as const;
});
