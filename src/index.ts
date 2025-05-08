let maxHeightInHeap = 0;

let heap: (Computed<unknown> | null)[] = [];
let adjustHeap: Computed<unknown>[][] = [];
for (let i = 0; i < 2010; i++) {
  heap[i] = null;
  adjustHeap[i] = [];
}

export function increaseHeapSize(n: number) {
  for (let i = heap.length; i < n; i++) {
    heap[i] = null;
    adjustHeap[i] = [];
  }
}

function insertIntoHeap(n: Computed<unknown>) {
  const newHStart = heap[n.height];
  if (newHStart == null) {
    heap[n.height] = n;
  } else {
    newHStart.prevHeap.nextHeap = n;
    n.prevHeap = newHStart.prevHeap;
    newHStart.prevHeap = n;
    n.nextHeap = newHStart;
  }
}

function deleteFromHeap(n: Computed<unknown>) {
  if (heap[n.height] == n) {
    heap[n.height] = n.nextHeap;
  }
  if (heap[n.height] == n) {
    heap[n.height] = null;
  } else {
    n.prevHeap.nextHeap = n.nextHeap;
    n.nextHeap.prevHeap = n.prevHeap;
  }
  n.prevHeap = n;
  n.nextHeap = n;
}

class Signal<T> {
  constructor(public value: T) {}
  observers: Computed<unknown>[] = [];
  observerSlots: number[] = [];
  height = -1;
  set(v2: T) {
    this.value = v2;
    for (const o of this.observers) {
      insertIntoHeap(o);
    }
  }
  *[Symbol.iterator]() {
    if (running) {
      running.sources.push(this as Signal<unknown>);
      running.sourceSlots.push(this.observerSlots.length);
      this.observers.push(running);
      this.observerSlots.push(running.sourceSlots.length - 1);
    }
    return this.value;
  }
}
export function s<T>(v: T): Signal<T> {
  return new Signal(v);
}

let running: Computed<unknown> | null = null;

class Computed<T> {
  height = 0;
  nextHeap: Computed<unknown> = null as any;
  prevHeap: Computed<unknown> = null as any;
  observers: Computed<unknown>[] = [];
  observerSlots: number[] = [];
  sources: (Computed<unknown> | Signal<unknown>)[] = [];
  sourceSlots: number[] = [];
  value: T = null as T;
  pushed = true;
  gen: Generator<unknown, T, void> | undefined = undefined;
  constructor(private f: () => Generator<unknown, T, void>) {
    this.nextHeap = this;
    this.prevHeap = this;
    insertIntoHeap(this);
  }
  *[Symbol.iterator]() {
    if (running) {
      running.sources.push(this);
      running.sourceSlots.push(this.observerSlots.length);
      this.observers.push(running);
      this.observerSlots.push(running.sourceSlots.length - 1);
      if (this.height >= running.height) {
        yield;
      }
    }
    return this.value;
  }

  run() {
    const oldRunning = running;
    running = this;
    if (!this.gen) {
      this.gen = this.f();
      removeSourceDeps(this);
      this.sources = [];
      this.sourceSlots = [];
    }
    let el = this.gen.next();
    if (el.done) {
      this.value = el.value;
      this.gen = undefined;
    }
    running = oldRunning;

    // return true if we ran to completion without changing height
    // otherwise, something yielded and told us we were at the wrong height
    return !!el.done;
  }
}

export function r<T>(f: () => Generator<unknown, T, void>): Computed<T> {
  return new Computed(f);
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
        if (el.pushed) deleteFromHeap(el);
        el.height = maxSourceHeight;
        if (maxSourceHeight > maxHeightInHeap)
          maxHeightInHeap = maxSourceHeight;
        insertIntoHeap(el);

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
    let el = heap[i];
    while (el) {
      deleteFromHeap(el);
      el.pushed = false;
      const step = el.run();
      if (!step) {
        adjustHeights(el);
        el.pushed = true;
      } else {
        for (const o of el.observers) {
          if (!o.pushed) {
            insertIntoHeap(o);
            o.pushed = true;
            if (o.height > maxHeightInHeap) maxHeightInHeap = o.height;
          }
        }
      }
      el = heap[i];
    }
  }
}
