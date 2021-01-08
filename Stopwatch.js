class Stopwatch {

  constructor() {
    this.running = false;
    this.latestPlay = null;
    this.executionMillis = 0;
  }

  start() {
    this.running = true;
    this.latestPlay = performance.now();
    return;
  }

  pause() {
    this.running = false;
    this.executionMillis += performance.now() - this.latestPlay;
    this.latestPlay = null;
    return;
  }

  reset() {
    this.running = false;
    this.latestPlay = null;
    this.executionMillis = 0;
    return;
  }

  setState(running) {
    this.running = running;
    if (this.running) {
      this.start();
    } else {
      this.pause();
    }
    return;
  }

  update() {
    if (this.running) {
      let now = performance.now();
      let delta = this.latestPlay === null ? 0 : (now - this.latestPlay);
      this.executionMillis += delta;
      this.latestPlay = now;
    }
    return this.executionMillis;
  }

  isRunning() {
    return this.running;
  }

  get now() {
    return this.executionMillis;
  }

}

export const Clock = new Stopwatch();
