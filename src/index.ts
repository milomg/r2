interface Signal<T> {
  height: -1;
  set: (v: T) => void;
  observers: Computed<unknown>[];
  observerSlots: number[];
  [Symbol.iterator]: () => Generator<unknown, T, void>;
}

interface Computed<T> {
  height: number;
  heapSlot: number;
  observers: Computed<unknown>[];
  observerSlots: number[];
  sources: (Computed<unknown> | Signal<unknown>)[];
  sourceSlots: number[];
  value: T;
  pushed: boolean;
  [Symbol.iterator]: () => Generator<unknown, T, void>;
  gen?: Generator<unknown, T, void>;
  run: () => boolean;
}

let maxHeightInHeap = 0;

let heap: Computed<unknown>[][] = [];
let adjustHeap: Computed<unknown>[][] = [];
for (let i = 0; i < 2010; i++) {
  heap[i] = [];
  adjustHeap[i] = [];
}

export function increaseHeapSize(n: number) {
  for (let i = heap.length; i < n; i++) {
    heap[i] = [];
    adjustHeap[i] = [];
  }
}

export function s<T>(v: T): Signal<T> {
  const self: Signal<T> = {
    set(v2: T) {
      v = v2;
      for (const o of self.observers) {
        heap[o.height].push(o);
      }
    },
    observers: [],
    observerSlots: [],
    height: -1,
    [Symbol.iterator]: function* () {
      if (running) {
        running.sources.push(self as Signal<unknown>);
        running.sourceSlots.push(self.observerSlots.length);
        self.observers.push(running);
        self.observerSlots.push(running.sourceSlots.length - 1);
      }
      return v;
    },
  };
  return self;
}

let running: Computed<unknown> | null = null;

export function r<T>(f: () => Generator<unknown, T, void>): Computed<T> {
  const self: Computed<T> = {
    height: 0,
    heapSlot: -1,
    observers: [],
    observerSlots: [],
    sources: [],
    sourceSlots: [],
    value: null as T,
    pushed: false,
    [Symbol.iterator]: function* () {
      if (running) {
        running.sources.push(self);
        self.observers.push(running);
        if (self.height >= running.height) {
          yield;
        }
      }
      return self.value;
    },
    gen: undefined,
    run() {
      const oldRunning = running;
      running = self;
      if (!self.gen) {
        self.gen = f();
        removeSourceDeps(self);
        self.sources = [];
        self.sourceSlots = [];
      }
      let el = self.gen.next();
      if (el.done) {
        self.value = el.value;
        self.gen = undefined;
      }
      running = oldRunning;

      // return true if we ran to completion without changing height
      // otherwise, something yielded and told us we were at the wrong height
      return !!el.done;
    },
  };

  // 0 == self.h
  self.heapSlot = heap[0].length;
  heap[0].push(self);

  return self;
}

// taken from solidjs
function removeSourceDeps(el: Computed<unknown>) {
  while (el.sources!.length) {
    const source = el.sources!.pop()!,
      index = el.sourceSlots!.pop()!,
      obs = source.observers;
    if (obs && obs.length) {
      const n = obs.pop()!,
        s = source.observerSlots!.pop()!;
      if (index < obs.length) {
        n.sourceSlots![s] = index;
        obs[index] = n;
        source.observerSlots![index] = s;
      }
    }
  }
}

function adjustHeights(initial: Computed<unknown>) {
  let maxHeightInAdjustHeap = initial.height;
  adjustHeap[initial.height].push(initial);
  for (let i = initial.height; i <= maxHeightInAdjustHeap; i++) {
    while (adjustHeap[i].length) {
      const el = adjustHeap[i].pop()!;
      let maxSourceHeight = el.height;
      let foundLargerHeight = false;
      for (const s of el.sources) {
        if (s.height >= maxSourceHeight) {
          maxSourceHeight = s.height + 1;
          foundLargerHeight = true;
        }
      }
      if (foundLargerHeight) {
        el.height = maxSourceHeight;
        if (maxSourceHeight > maxHeightInHeap)
          maxHeightInHeap = maxSourceHeight;
        heap[maxSourceHeight].push(el);
        if (el.heapSlot >= 0) {
          const last = heap[i].pop()!;
          if (el.heapSlot < heap[i].length) {
            heap[i][el.heapSlot] = last;
            last.heapSlot = el.heapSlot;
          }
        }
        for (const o of el.observers) {
          adjustHeap[o.height].push(o);
          if (o.height > maxHeightInAdjustHeap)
            maxHeightInAdjustHeap = o.height;
        }
      }
    }
  }
}

export function stabilize() {
  // we never insert something of lower height, only of larger height
  for (let i = 0; i <= maxHeightInHeap; i++) {
    while (heap[i].length) {
      const el = heap[i].shift()!;
      const step = el.run();
      el.heapSlot = -1;
      if (!step) {
        adjustHeights(el);
      } else {
        el.pushed = false;
        for (const o of el.observers) {
          if (!o.pushed) {
            o.pushed = true;
            heap[o.height].push(o);
            if (o.height > maxHeightInHeap) maxHeightInHeap = o.height;
          }
        }
      }
    }
  }
}
