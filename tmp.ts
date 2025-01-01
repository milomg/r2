let minPriority = 0;
let heap: any[][] = [];

let adjustHeightsHeap = [];

function s<T>(v: T) {
  const self = {
    set(v2: T) {
      v = v2
    },
    deps: [] as any[],
    [Symbol.iterator]: function*() {
      if (context) {
        context.arr.push(self);
        self.deps.push(context.me);
      }
      return v;
    }
  }
  return self
}

let context: {
  arr: any[]
  h: number,
  me: any,
} | null = null;

function r(f: () => Generator) {
  const self = {
    h: 0,
    deps: [] as any[],
    v: null,
    [Symbol.iterator]: function* () {
      if (context) {
        if (self.h >= context.h) {
          yield self
        }
        context.arr.push(self);
        self.deps.push(context.me);
      }
      return self.v
    },
    next: undefined as (() => IteratorResult<any, any>) | undefined,
    run() {
      const oldc = context;
      context = {
        arr: [],
        h: 0,
        me: self
      }
      if (!self.next) {
        const gen = f();
        self.next = gen.next;
      }
      let el = self.next();
      const win = el.done;
      self.v = el.value;
      context = oldc;

      return win;
    }
  }

  heap[self.h].push(self);
  minPriority = Math.min(minPriority, self.h);

  return self
}

function removeSourceDeps(el) {

}

function stabilize() {
  outer: while (minPriority < heap.length) {
    while (heap[minPriority].length) {
      const el = heap[minPriority][0]
      const s = el.run()
      if (!s) {
        continue outer;
      } else {
        heap[minPriority].unshift() // remove ourselves
        for (const c of el.deps) {
          heap[c.h].push(c);
        }
      }
    }

    minPriority++;
  }
}

const b = s(1);

const a = r(function* () {
  const v = yield* b;

})

r(function* () {
  const v2 = yield* a;

})

stabilize()

b.set(5)
