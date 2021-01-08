const KEY_DISPLAY_LEVEL_TEXT = 1;
const KEY_SCORE_THRESHOLD = 2;
const KEY_HOOK_DISTANCE_RATIO = 4;
const KEY_MEAT_SPEED_MIN = 8;
const KEY_MEAT_SPEED_RANGE = 16;
const KEY_MEAT_TREND_PERIOD = 32;
const LevelArray = [
  // Time-based values are measured in millisecond.
  new Map([
    [KEY_DISPLAY_LEVEL_TEXT, "Lv1"],
    [KEY_SCORE_THRESHOLD, 6000],
    [KEY_HOOK_DISTANCE_RATIO, 0.36],
    [KEY_MEAT_SPEED_MIN, 40],
    [KEY_MEAT_SPEED_RANGE, 100],
    [KEY_MEAT_TREND_PERIOD, 4200],
  ]),
  new Map([
    [KEY_DISPLAY_LEVEL_TEXT, "Lv2"],
    [KEY_SCORE_THRESHOLD, 15000],
    [KEY_HOOK_DISTANCE_RATIO, 0.48],
    [KEY_MEAT_SPEED_MIN, 55],
    [KEY_MEAT_SPEED_RANGE, 175],
    [KEY_MEAT_TREND_PERIOD, 3600],
  ]),
  new Map([
    [KEY_DISPLAY_LEVEL_TEXT, "Lv3"],
    [KEY_SCORE_THRESHOLD, 37500],
    [KEY_HOOK_DISTANCE_RATIO, 0.60],
    [KEY_MEAT_SPEED_MIN, 70],
    [KEY_MEAT_SPEED_RANGE, 250],
    [KEY_MEAT_TREND_PERIOD, 3000],
  ]),
  new Map([
    [KEY_DISPLAY_LEVEL_TEXT, "Lv4"],
    [KEY_SCORE_THRESHOLD, Infinity],
    [KEY_HOOK_DISTANCE_RATIO, 0.72],
    [KEY_MEAT_SPEED_MIN, 85],
    [KEY_MEAT_SPEED_RANGE, 325],
    [KEY_MEAT_TREND_PERIOD, 2400],
  ]),
];


class ConstantConfig {
  get daggerDistanceRatio() {
    return 0.70;
  }
  get modelUpdatePeriod() {
    return 12;
  }
  get hookProjectileSpeed() {
    return 1600;
  }
  get daggerPenaltyRatio() {
    return 0.8;
  }
  get daggerBackswing() {
    return 120;
  }
  get daggerCooldown() {
    return 2400;
  }
  get pudgeMovementSpeed() {
    return 300;
  }
  get pudgeCollisionSize() {
    return 24;
  }
  get meatCollisionSize() {
    return 28;
  }
  get meatAmount() {
    return 10;
  }
}


class LifeConfig extends ConstantConfig {

  constructor() {
    super();
    this.currentLevel = 0;
    this.currentScore = 0;
    this.x = 800;
    this.y = 600;
    this.diagonal = 1000;
  }

  get current() {
    return LevelArray[this.currentLevel];
  }

  get displayLevelText() {
    return this.current.get(KEY_DISPLAY_LEVEL_TEXT);
  }

  get meatSpeedMin() {
    return this.current.get(KEY_MEAT_SPEED_MIN);
  }

  get meatSpeedRange() {
    return this.current.get(KEY_MEAT_SPEED_RANGE);
  }

  get meatTrendPeriod() {
    return this.current.get(KEY_MEAT_TREND_PERIOD);
  }

  setBoundary(boundaryX, boundaryY) {
    this.x = boundaryX;
    this.y = boundaryY;
    this.diagonal = Math.hypot(boundaryX, boundaryY);
    return;
  }

  get daggerMaxDistance() {
    return this.diagonal * this.daggerDistanceRatio;
  }

  get hookCastRange() {
    return this.diagonal * this.current.get(KEY_HOOK_DISTANCE_RATIO);
  }

  reset(boundaryX, boundaryY) {
    this.currentLevel = 0;
    this.currentScore = 0;
    this.setBoundary(boundaryX, boundaryY);
    return;
  }

  gainScore(distance, meatMovementSpeed, hookStreak) {
    const prediction = distance * 1.6 + meatMovementSpeed * (0.8 + 0.2 * hookStreak);
    const difficulty = Math.cbrt(this.x * this.y);
    const levelBonus = 50 * this.currentLevel;
    const score = Math.floor(prediction + difficulty + levelBonus);
    console.log(~~distance, ~~meatMovementSpeed, hookStreak, score);
    const newScore = this.currentScore += score;
    this.currentLevel = LevelArray.findIndex(c => c.get(KEY_SCORE_THRESHOLD) >= newScore);
    return score;
  }

  get expValue() {
    if (this.currentLevel === LevelArray.length - 1) {
      return 1;
    }
    const base = this.currentLevel === 0 ? 0
      : LevelArray[this.currentLevel - 1].get(KEY_SCORE_THRESHOLD);
    const total = this.current.get(KEY_SCORE_THRESHOLD);
    return (this.currentScore - base) / total;
  }

  updateAndGetRecord() {
    const storageId = 'score.v2';
    let bestRecord = Number.parseInt(window.localStorage.getItem(storageId) ?? '0', 10);
    let currentScore = Math.round(this.currentScore);
    if (bestRecord < currentScore) {
      bestRecord = currentScore;
      window.localStorage.setItem(storageId, currentScore.toString());
    }
    return [bestRecord, currentScore];
  }

}


export const Config = new LifeConfig();
export const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });
