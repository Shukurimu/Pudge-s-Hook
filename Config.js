'use strict';


class Config {
  // Time-based values are measured in millisecond.
  static ModelUpdatePeriod = 12;
  static HookProjectileSpeed = 1600;
  static DaggerDistanceRatio = 0.75;
  static DaggerPenaltyRatio = 0.8;
  static DaggerBackswing = 120;
  static DaggerCooldown = 2400;
  static PudgeMovementSpeed = 300;
  static PudgeCollisionSize = 20;
  static MeatCollisionSize = 24;
  static MeatAmount = 10;
  static LevelList = [
    {
      'displayLevelText': "Lv1",
      'scoreThreshold': 3600,
      'hookDistanceRatio': 0.35,
      'meatSpeedMin': 40,
      'meatSpeedRange': 100,
      'meatTrendPeriod': 4200,
    },
    {
      'displayLevelText': "Lv2",
      'scoreThreshold': 10800,
      'hookDistanceRatio': 0.50,
      'meatSpeedMin': 65,
      'meatSpeedRange': 200,
      'meatTrendPeriod': 3600,
    },
    {
      'displayLevelText': "Lv3",
      'scoreThreshold': 32400,
      'hookDistanceRatio': 0.65,
      'meatSpeedMin': 90,
      'meatSpeedRange': 300,
      'meatTrendPeriod': 3000,
    },
    {
      'displayLevelText': "Lv4",
      'scoreThreshold': Infinity,
      'hookDistanceRatio': 0.80,
      'meatSpeedMin': 115,
      'meatSpeedRange': 400,
      'meatTrendPeriod': 2400,
    },
  ];
  static currentLevel = 0;
  static currentScore = 0;
  static x = 800;
  static y = 600;
  static diagonal = 1000;

  static get current() {
    return this.LevelList[this.currentLevel];
  }

  static setBoundary(boundaryX, boundaryY) {
    this.x = boundaryX;
    this.y = boundaryY;
    this.diagonal = Math.hypot(boundaryX, boundaryY);
    document.querySelector('#boundary').innerHTML = `${boundaryX}*${boundaryY}`;
    return;
  }

  static get daggerMaxDistance() {
    return this.diagonal * this.DaggerDistanceRatio;
  }

  static get hookCastRange() {
    return this.diagonal * this.current.hookDistanceRatio;
  }

  static reset(boundaryX, boundaryY) {
    this.currentLevel = 0;
    this.currentScore = 0;
    this.setBoundary(boundaryX, boundaryY);
    return;
  }

  static gainScore(distance, meatMovementSpeed, hookStreak) {
    const prediction = distance + meatMovementSpeed * (0.7 + 0.3 * hookStreak);
    const difficulty = Math.cbrt(this.x * this.y);
    const levelBonus = 50 * this.currentLevel;
    const score = Math.floor(prediction + difficulty + levelBonus);
    console.log(~~distance, ~~meatMovementSpeed, hookStreak, score);
    const newScore = this.currentScore += score;
    this.currentLevel = this.LevelList.findIndex(c => c.scoreThreshold >= newScore);
    return score;
  }

  static get expValue() {
    if (this.currentLevel === this.LevelList.length - 1) {
      return 1;
    }
    const base = this.currentLevel === 0 ? 0
               : this.LevelList[this.currentLevel - 1].scoreThreshold;
    const total = this.current.scoreThreshold;
    return (this.currentScore - base) / total;
  }

  static get record() {
    return Number.parseInt(window.localStorage.getItem('score') ?? '0', 10);
  }

}


class Clock {
  static running = false;
  static latestPlay = null;
  static executionMillis = 0;

  static reset() {
    this.running = false;
    this.latestPlay = null;
    this.executionMillis = 0;
    return;
  }

  static play() {
    this.running = true;
    this.latestPlay = performance.now();
    return;
  }

  static stop() {
    this.running = false;
    this.executionMillis += performance.now() - this.latestPlay;
    this.latestPlay = null;
    return;
  }

  static toggle() {
    if (this.running ^= true) {
      this.play();
    } else {
      this.stop();
    }
    return;
  }

  static update() {
    if (this.running) {
      let now = performance.now();
      let delta = this.latestPlay === null ? 0 : (now - this.latestPlay);
      this.executionMillis += delta;
      this.latestPlay = now;
    }
    return this.executionMillis;
  }

  static get now() {
    return this.executionMillis;
  }

}


class AbstractObject {

  constructor() {
    this.x = 0;
    this.y = 0;
  }

  updateModel(elapse) {
    throw undefined;
  }

  updateView() {
    throw undefined;
  }

}


function getVectorPoint(vectorFrom, vectorTo, multiplier) {
  return vectorFrom + (vectorTo - vectorFrom) * multiplier;
}

const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });

// export { Config, Clock, AbstractObject, getVectorPoint, InputMode };
