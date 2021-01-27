import { SVG_NAMESPACE_URI, computeMaxStreak, setDomAttributes } from './Util';
import { Clock } from './Stopwatch';
import { Config, InputMode } from './Config';
import { Dagger, Hook } from './Castable';
import { Pudge, Meat } from './Movable';
import { Controller } from './Controller';


const controller = new Controller(newCursor => document.body.style.cursor = newCursor);


window.addEventListener('resize', function (event) {
  Config.setBoundary(window.innerWidth, window.innerHeight);
});


window.addEventListener('contextmenu', function (event) {
  event.preventDefault();
  event.stopPropagation();
});


const gameMouseListener = function (event) {
  switch (event.button) {
    case 2:  // right-click
      controller.playerMove(event.clientX, event.clientY);
      break;
    case 0:  // left-click
      controller.launchInput(event.clientX, event.clientY);
      break;
    default:
      console.log(event.button, event.clientX, event.clientY);
  }
};


const gameKeyListener = function (event) {
  if (event.key === 'Tab') {
    event.preventDefault();
  }
  switch (event.key.toUpperCase()) {
    case "ESCAPE":
      Clock.setState(!Clock.isRunning());
      break;
    case " ":
      controller.setInputMode(InputMode.Dagger);
      break;
    case "T":
      controller.setInputMode(InputMode.Hook);
      break;
    default:
      console.log(event.key);
  }
};


const buildDashboard = function () {
  const dashboard = document.createElementNS(SVG_NAMESPACE_URI, "svg");
  setDomAttributes(dashboard, {
    'width': '100%',
    'height': '60',
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
  });

  const score = document.createElementNS(SVG_NAMESPACE_URI, "text");
  setDomAttributes(score, {
    'x': '135',
    'y': '30',
    'dominant-baseline': 'central',
    'text-anchor': 'start',
  });

  const boundary = document.createElementNS(SVG_NAMESPACE_URI, "text");
  setDomAttributes(boundary, {
    'x': '100%',
    'y': '0',
    'dominant-baseline': 'hanging',
    'text-anchor': 'end',
  });

  dashboard.append(experience, level, score, boundary);
  return { dashboard, experience, level, score, boundary };
};


const buildScreen = function () {
  const { dashboard, ...icons } = buildDashboard();
  const dagger = document.createElement("canvas");
  setDomAttributes(dagger, {
    'width': '60',
    'height': '60',
  });
  const timer = document.createElement("div");
  const scoreIndicator = document.createElement("span");
  scoreIndicator.style.color = 'tomato';
  const comboIndicator = document.createElement("span");
  comboIndicator.style.color = 'springgreen';
  const indicators = document.createElement("div");
  indicators.append(scoreIndicator, comboIndicator);

  return {
    dashboard, ...icons, dagger, timer,
    scoreIndicator, comboIndicator, indicators,
  };
};


const gameStart = function () {
  console.log('Game Start !');
  const dynamicObjects = buildScreen();
  for (const [id, element] of Object.entries(dynamicObjects)) {
    element.setAttribute('id', id);
  }
  document.querySelector('#screenLayer').replaceChildren(
    dynamicObjects.dashboard,
    dynamicObjects.dagger,
    dynamicObjects.timer,
    dynamicObjects.indicators,
  );
  Config.reset((w, h) => dynamicObjects.boundary.textContent = `${w}*${h}`);
  Config.setBoundary(window.innerWidth, window.innerHeight);

  const dagger = new Dagger(dynamicObjects.dagger);
  const hook = new Hook(document.createElementNS(SVG_NAMESPACE_URI, 'line'));
  const pudge = new Pudge(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  pudge.addCastable(hook, dagger);

  const buildMeat = () => new Meat(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  const meatArray = Array.from({ 'length': Config.meatAmount }, buildMeat);
  meatArray.forEach(meat => meat.randomizePosition());

  const battleField = document.createElementNS(SVG_NAMESPACE_URI, "svg");
  battleField.setAttribute('id', 'battleField');
  battleField.append(hook.aniElem, pudge.aniElem, ...meatArray.map(meat => meat.aniElem));
  document.querySelector('#battleFieldLayer').replaceChildren(battleField);

  controller.initialize(60, dynamicObjects);
  controller.setObjects({ pudge, hook, dagger, meatArray });
  Clock.setState(true);
  window.addEventListener('keydown', gameKeyListener);
  window.addEventListener('mousedown', gameMouseListener);
  document.querySelector('#information').style.display = 'none';
};


const gameOver = function (hookTrialArray) {
  console.log('Game Over !');
  Clock.setState(false);
  window.removeEventListener('keydown', gameKeyListener);
  window.removeEventListener('mousedown', gameMouseListener);
  const [bestRecord, currentScore] = Config.updateAndGetRecord();
  const difference = bestRecord - currentScore;
  const successCount = hookTrialArray.reduce((accu, value) => accu + value, 0);
  const accuracy = Math.round(100 * successCount / Math.max(hookTrialArray.length, 1));
  const maxStreak = computeMaxStreak(hookTrialArray);
  document.querySelector('#message').innerHTML = [
    "~ 遊戲結束 ~",
    `本次分數 ${currentScore} / 歷史最高分數 <abbr title='差距 ${difference}'>${bestRecord}</abbr>`,
    `[肉鉤] 使用次數 ${hookTrialArray.length} 命中率 ${accuracy}% 最高連擊 ${maxStreak}`,
  ].join('<br />');
  document.querySelector('#information').style.display = 'grid';
};


document.querySelector('#button').addEventListener('click', gameStart);


window.setInterval(function () {
  let gameIsOver = controller.updateModels();
  if (gameIsOver) {
    gameOver(controller.hook.trialArray);
  }
}, Config.modelUpdatePeriod);


void function raf() {
  controller.updateViews();
  window.requestAnimationFrame(raf);
}();
