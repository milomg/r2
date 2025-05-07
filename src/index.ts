interface Signal<T> {
  name: string;
  set: (v: T) => void;
  observers: any[];
  observerSlots: number[];
  h: number;
  [Symbol.iterator]: () => Generator<unknown, T, void>;
}

let heap: any[][] = [];
let adjustHeightsHeap: any[][] = [];

for (let i = 0; i < 128; i++) {
  heap[i] = [];
  adjustHeightsHeap[i] = [];
}

export function s<T>(name: string, v: T): Signal<T> {
  const self: Signal<T> = {
    name,
    set(v2: T) {
      v = v2;
      for (const o of self.observers) {
        heap[o.h].push(o);
      }
    },
    observers: [],
    observerSlots: [],
    h: -1,
    [Symbol.iterator]: function* () {
      if (context) {
        context.sources.push(self);
        context.sourceSlots.push(self.observerSlots.length);
        self.observers.push(context.me);
        self.observerSlots.push(context.sourceSlots.length - 1);
      }
      return v;
    },
  };
  return self;
}

let context: {
  sources: any[];
  sourceSlots: number[];
  h: number;
  me: any;
} | null = null;

export function r<A, B, C>(name: string, f: () => Generator<A, B, C>) {
  const self = {
    h: 0,
    name,
    observers: [] as any[],
    observerSlots: [],
    sources: [] as any[],
    sourceSlots: [] as number[],
    v: null as B,
    [Symbol.iterator]: function* () {
      if (context) {
        context.sources.push(self);
        self.observers.push(context.me);
        if (self.h >= context.h) {
          yield self;
        }
      }
      return self.v as B;
    },
    next: undefined as (() => IteratorResult<any, any>) | undefined,
    run() {
      const oldc = context;
      context = {
        sources: [],
        sourceSlots: [],
        h: self.h,
        me: self,
      };
      if (!self.next) {
        const gen = f();
        self.next = gen.next.bind(gen);
        removeSourceDeps(self);
        self.sources = context.sources;
        self.sourceSlots = context.sourceSlots;
      } else {
        context.sources = self.sources;
        context.sourceSlots = self.sourceSlots;
      }
      let el = self.next();
      const win = el.done;
      if (win) {
        self.v = el.value;
        self.next = undefined;
      }
      context = oldc;

      return win;
    },
  };

  heap[self.h].push(self);

  return self;
}

function removeSourceDeps(el: any) {
  const n2 = el;
  while (n2.sources!.length) {
    const source = n2.sources!.pop(),
      index = n2.sourceSlots!.pop(),
      obs = source.observers;
    if (obs && obs.length) {
      const n = obs.pop(),
        s = source.observerSlots!.pop();
      if (index < obs.length) {
        n.sourceSlots![s] = index;
        obs[index] = n;
        source.observerSlots![index] = s;
      }
    }
  }
}

function adjustHeights(n: any) {
  adjustHeightsHeap[n.h].push(n);
  for (let i = n.h; i < adjustHeightsHeap.length; i++) {
    while (adjustHeightsHeap[i].length) {
      const el = adjustHeightsHeap[i].shift();
      let maxh = el.h;
      let found = false;
      for (const c of el.sources) {
        if (c.h >= maxh) {
          maxh = c.h + 1;
          found = true;
        }
      }
      if (found) {
        heap[i].splice(heap[i].indexOf(el), 1);
        el.h = maxh;
        heap[maxh].push(el);
        for (const c of el.observers) {
          adjustHeightsHeap[c.h].push(c);
        }
      }
    }
  }
}

export function stabilize() {
  // we never insert something of lower height, only of larger height
  for (let i = 0; i < heap.length; i++) {
    while (heap[i].length) {
      const el = heap[i][0];
      const s = el.run();
      if (!s) {
        adjustHeights(el);
      } else {
        heap[i].shift(); // remove ourselves
        for (const c of el.observers) {
          heap[c.h].push(c);
        }
      }
    }
  }
}
