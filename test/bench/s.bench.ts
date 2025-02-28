import { bench } from "vitest";
import { r, s, stabilize } from "../../src";

bench("updateComputations1to4", () => {
  const a = s("a", 1);
  for (let i = 0; i < 4; i++) {
    r("b" + i, function* () {
      const v = yield* a;
    });
  }
  stabilize();

  for (let i = 0; i < 10000; i++) {
    a.set(i);
    stabilize();
  }
});
