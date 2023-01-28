import Clock from './Stopwatch';
import Config from './Config';
import Controller from './Controller';


const controller = new Controller(newCursor => document.body.style.cursor = newCursor);


window.addEventListener('resize', function (event) {
  controller.setBoundary(window.innerWidth, window.innerHeight);
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
  } else {
    controller.keyEventHandler(event.key);
  }
};


document.querySelector('#button').addEventListener('click', function () {
  console.log('Game Start !');
  Config.reset();
  const argsTimer = parseInt(new URL(document.location.href).searchParams.get('t'));
  const initTimer = Number.isSafeInteger(argsTimer) ? Math.min(60, Math.max(1, argsTimer)) : 60;
  controller.initialize(initTimer, window.innerWidth, window.innerHeight);
  document.querySelector('#screenLayer').replaceChildren(...controller.getScreenLayerElements());
  document.querySelector('#battleFieldLayer').replaceChildren(controller.battleField);

  Clock.setState(true);
  window.addEventListener('keydown', gameKeyListener);
  window.addEventListener('mousedown', gameMouseListener);
  document.querySelector('#information').style.display = 'none';
});


const gameOver = function () {
  console.log('Game Over !');
  Clock.setState(false);
  window.removeEventListener('keydown', gameKeyListener);
  window.removeEventListener('mousedown', gameMouseListener);
  const [bestRecord, currentScore] = Config.updateAndGetRecord();
  const difference = bestRecord - currentScore;
  for (const [id, textArray] of [
    ['message', ["~ 遊戲結束 ~"]],
    ['discriptionMeat', [`本次分數 ${currentScore}`]],
    ['discriptionRight', [`歷史最高 ${bestRecord}`]],
    ['discriptionLeft', [`差距 ${difference}`]],
    ['discriptionHook', controller.hook.getAnalyzeTextArray()],
    ['discriptionDagger', controller.dagger.getAnalyzeTextArray()],
  ]) {
    document.querySelector(`#${id}`).innerHTML = textArray.join('<br />');
  }
  document.querySelector('#information').style.display = 'grid';
};


window.setInterval(function () {
  if (controller.updateModels()) {
    gameOver();
  }
}, Config.modelUpdatePeriod);


void function raf() {
  controller.updateViews();
  window.requestAnimationFrame(raf);
}();
