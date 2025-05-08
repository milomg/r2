import { bench } from "vitest";
import { r, s, stabilize } from "../../src";
import { batch, createMemo, createSignal } from "./queue";

bench("updateComputations1to4", () => {
  const a = s(1);
  for (let i = 0; i < 4; i++) {
    r(function* () {
      const v = yield* a;
    });
  }
  stabilize();

  for (let i = 0; i < 10000; i++) {
    a.set(i);
    stabilize();
  }
});

bench("updateComputations1to4-solid", () => {
  const [a, setA] = createSignal(1);
  for (let i = 0; i < 4; i++) {
    createMemo(function () {
      const v = a();
    });
  }
  batch(() => {});

  for (let i = 0; i < 10000; i++) {
    batch(() => {
      setA(i);
    });
  }
});
