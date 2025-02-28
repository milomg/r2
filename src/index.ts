let heap: any[][] = [];
let adjustHeightsHeap: any[][] = [];

for (let i = 0; i < 128; i++) {
  heap[i] = [];
  adjustHeightsHeap[i] = [];
}

export function s<T>(name: string, v: T) {
  const self = {
    name,
    set(v2: T) {
      v = v2;
      for (const o of self.observers) {
        heap[o.h].push(o);
      }
    },
    observers: [] as any[],
    h: -1,
    [Symbol.iterator]: function* () {
      if (context) {
        context.sources.push(self);
        self.observers.push(context.me);
      }
      return v;
    },
  };
  return self;
}

let context: {
  sources: any[];
  h: number;
  me: any;
} | null = null;

export function r<A, B, C>(name: string, f: () => Generator<A, B, C>) {
  const self = {
    h: 0,
    name,
    observers: [] as any[],
    sources: [] as any[],
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
        h: self.h,
        me: self,
      };
      if (!self.next) {
        const gen = f();
        self.next = gen.next.bind(gen);
        removeSourceDeps(self);
        self.sources = context.sources;
      } else {
        context.sources = self.sources;
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
  for (const s of el.sources) {
    s.observers.splice(s.observers.indexOf(el), 1);
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
