import Clock from './Stopwatch';
import Config from './Config';
import Dagger from './Dagger';
import Hook from './Hook';
import Pudge from './Pudge';
import Meat from './Meat';

const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';
const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });

function setDomAttributes(domElement, attributes) {
  for (const [attr, value] of Object.entries(attributes)) {
    domElement.setAttribute(attr, value);
  }
  return;
}


export default class Controller {

  constructor(cursorSetter) {
    this.dagger = null;
    this.hook = null;
    this.pudge = null;
    this.meatArray = null;
    this.objectArray = null;
    this.castableInputMap = new Map();
    this.inputMode = InputMode.Move;

    this.cursorSetter = cursorSetter;
    this.dashboardContainer = null;
    this.dashboardElements = null;
    this.indicatorContainer = null;
    this.indicatorElements = null;
    this.battleField = null;
    this.timerValue = 0;
    this.timerElement = null;
  }

  setBoundary(width, height) {
    Config.setBoundary(width, height);
    this.dashboardElements.boundary.textContent = `${width}*${height}`;
    return;
  }

  getScreenLayerElements() {
    return [
      this.dashboardElements.dagger,
      this.dashboardContainer,
      this.indicatorContainer,
      this.timerElement,
    ];
  }

  buildDashboard() {
    const dagger = document.createElement("canvas");
    setDomAttributes(dagger, {
      'width': '60',
      'height': '60',
      'class': 'dashboardDagger',
    });

    const experience = document.createElementNS(SVG_NAMESPACE_URI, "circle");
    setDomAttributes(experience, {
      'cx': '95',
      'cy': '30',
      'r': '28',
      'fill': 'transparent',
      'stroke': 'orange',
      'stroke-width': '4',
      'pathLength': '1000',
      'stroke-dashoffset': '250',
      'stroke-dasharray': '0',
    });

    const level = document.createElementNS(SVG_NAMESPACE_URI, "text");
    setDomAttributes(level, {
      'x': '95',
      'y': '30',
      'dominant-baseline': 'central',
      'text-anchor': 'middle',
      'textLength': '40',
      'lengthAdjust': 'spacing',
      'class': 'dashboardLevel',
    });

    const score = document.createElementNS(SVG_NAMESPACE_URI, "text");
    setDomAttributes(score, {
      'x': '135',
      'y': '30',
      'dominant-baseline': 'central',
      'text-anchor': 'start',
      'class': 'dashboardScore',
    });

    const boundary = document.createElementNS(SVG_NAMESPACE_URI, "text");
    setDomAttributes(boundary, {
      'x': '100%',
      'y': '0',
      'dominant-baseline': 'hanging',
      'text-anchor': 'end',
      'class': 'dashboardBoundary',
    });

    this.dashboardContainer = document.createElementNS(SVG_NAMESPACE_URI, "svg");
    setDomAttributes(this.dashboardContainer, {
      'width': '100%',
      'height': '60',
      'class': 'dashboard',
    });
    this.dashboardContainer.append(experience, level, score, boundary);
    this.dashboardElements = { dagger, experience, level, score, boundary }

    level.textContent = 'Lv0';
    score.textContent = 0;
    return;
  }

  buildIndicator() {
    const score = document.createElement("span");
    score.style.color = 'tomato';

    const combo = document.createElement("span");
    combo.style.color = 'springgreen';

    this.indicatorContainer = document.createElement("div");
    this.indicatorContainer.className = 'indicator';
    this.indicatorContainer.append(score, combo);
    this.indicatorElements = { score, combo };
    return;
  }

  initialize(initTimerValue, windowInnerWidth, windowInnerHeight) {
    this.buildDashboard();
    this.buildIndicator();
    this.timerElement = document.createElement("div");
    this.timerElement.className = 'timer';
    this.timerValue = initTimerValue;
    this.setBoundary(windowInnerWidth, windowInnerHeight);

    this.dagger = new Dagger(this.dashboardElements.dagger);
    this.hook = new Hook(document.createElementNS(SVG_NAMESPACE_URI, 'line'));
    this.pudge = new Pudge(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
    this.pudge.addCastable(this.dagger, this.hook);
    this.meatArray = [];
    for (let i = Config.meatAmount; i > 0; --i) {
      const meat = new Meat(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
      meat.randomizePosition();
      this.meatArray.push(meat);
    }

    this.battleField = document.createElementNS(SVG_NAMESPACE_URI, "svg");
    this.battleField.setAttribute('class', 'battleField');
    this.battleField.append(
      this.hook.aniElem,
      this.pudge.aniElem,
      ...this.meatArray.map(meat => meat.aniElem),
    );

    this.objectArray = Array.of(this.dagger, this.hook, this.pudge, ...this.meatArray);
    this.castableInputMap.set(InputMode.Dagger, this.dagger);
    this.castableInputMap.set(InputMode.Hook, this.hook);
    return;
  }

  emitIndicator(x, y, score, combo) {
    this.indicatorElements.score.textContent = `+${score}`;
    this.indicatorElements.combo.textContent = `#${combo}`;
    Object.assign(this.indicatorContainer.style, {
      'left': `${x.toFixed(0)}px`,
      'top': `${y.toFixed(0)}px`,
      'animationName': 'none',
    });

    const rect = this.indicatorContainer.getBoundingClientRect();
    const dx = Math.min(Config.x - rect.right, 0) - Math.min(rect.left, 0);
    const dy = Math.min(Config.y - rect.bottom, 0) - Math.min(rect.top, 0);
    Object.assign(this.indicatorContainer.style, {
      'left': `${(x + dx).toFixed(0)}px`,
      'top': `${(y + dy).toFixed(0)}px`,
      'animationName': 'indicatorAnimation',
    });
    return;
  }

  updateModels() {
    if (!Clock.isRunning()) {
      return false;
    }
    let victim = this.hook.tryAttack(this.meatArray);
    if (victim != null) {
      const distance = Math.hypot(victim.x - this.pudge.x, victim.y - this.pudge.y);
      const combo = this.hook.streak;
      const score = Config.gainScore(distance, victim.currentSpeed, combo);
      this.emitIndicator(victim.x, victim.y, score, combo);
      const expValue = Math.round(Config.expValue * 1000);
      const expAttribute = `${expValue} ${1000 - expValue}`;
      this.dashboardElements.experience.setAttribute('stroke-dasharray', expAttribute);
      this.dashboardElements.level.textContent = Config.displayLevelText;
      this.dashboardElements.score.textContent = Config.currentScore.toString();
    }
    const previousUpdate = Clock.now;
    const elapse = (Clock.update() - previousUpdate) * 0.001;
    this.objectArray.forEach(o => o.updateModel(elapse));
    return (this.timerValue -= elapse) < 0;
  }

  updateViews() {
    if (Clock.isRunning()) {
      this.timerElement.textContent = this.timerValue.toFixed(0);
      this.objectArray.forEach(o => o.updateView());
    }
    return;
  }

  playerMove(x, y) {
    if (!Clock.isRunning()) {
      return;
    }
    this.pudge.registerMove(x, y);
    this.cursorSetter(InputMode.Move);
    return;
  }

  keyEventHandler(keyString) {
    const running = Clock.isRunning();
    if (keyString === "Escape") {
        Clock.setState(!running);
        return;
    }
    if (!running) {
      return;
    }
    let inputMode = null;
    if (keyString === " ") {
      inputMode = InputMode.Dagger;
    } else if (keyString === "t") {
      inputMode = InputMode.Hook;
    } else {
      console.log('UnusedKey', keyString);
      return;
    }
    if (this.castableInputMap.get(inputMode).isReady()) {
      this.cursorSetter(this.inputMode = inputMode);
    } else {
      this.cursorSetter(InputMode.Move);
    }
    return;
  }

  launchInput(x, y) {
    if (!Clock.isRunning()) {
      return;
    }
    switch (this.inputMode) {
      case InputMode.Hook:
        this.hook.register(this.pudge, x, y);
        break;
      case InputMode.Dagger:
        this.dagger.register(this.pudge, x, y);
        break;
    }
    this.cursorSetter(this.inputMode = InputMode.Move);
    return;
  }

}
