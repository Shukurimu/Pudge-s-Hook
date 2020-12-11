const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });

class Config {
	static HookProjectileSpeed = 18;
	static DaggerCastPoint = 10;
	static DaggerMaxDistance = 1200;
	static DaggerPenaltyRatio = 0.8;
	static DaggerCooldown = 180;
	static PudgeMovementSpeed = 6;
	static LevelList = [
		{	// Level 1
			'scoreThreshold': 0,
			'hookCastRange': 300,
			'meatSpeedMin': 0.5,
			'meatSpeedRange': 1,
			'meatChangePeriod': 640,
		},
		{	// Level 2
			'scoreThreshold': 23400,
			'hookCastRange': 550,
			'meatSpeedMin': 1.0,
			'meatSpeedRange': 2,
			'meatChangePeriod': 320,
		},
		{	// Level 3
			'scoreThreshold': 86500,
			'hookCastRange': 800,
			'meatSpeedMin': 1.5,
			'meatSpeedRange': 3,
			'meatChangePeriod': 160,
		},
		{	// Level 4
			'scoreThreshold': 179000,
			'hookCastRange': 1050,
			'meatSpeedMin': 2.0,
			'meatSpeedRange': 4,
			'meatChangePeriod': 80,
		},
	];
	static currentLevel = 1;
	static x = 800;
	static y = 600;

	static get current() {
		return this.LevelList[this.currentLevel];
	}

	static reset = (boundaryX, boundaryY) => {
		this.currentLevel = 1;
		this.x = boundaryX;
		this.y = boundaryY;
		console.log('reset', this.x, this.y);
		return;
	}

}


const getVectorPoint = (vectorFrom, vectorTo, multiplier) => {
	return vectorFrom + (vectorTo - vectorFrom) * multiplier;
};


class AbstractObject {

	constructor() {
		this.x = 0;
		this.y = 0;
	}

	updateModel = () => {
		throw undefined;
	}

	updateView = () => {
		throw undefined;
	}

}


class Castable extends AbstractObject {

	constructor(localCast) {
		super();
		this.localCast = localCast;
		this.pending = false;
		this.sourceX = 0;
		this.sourceY = 0;
		this.destX = 0;
		this.destY = 0;
		this.linkedObject = null;
	}

	isReady = () => {
		throw undefined;
	}

	getSourceDestPos = (caster, x, y) => {
		throw undefined;
	}

	register = (caster, x, y) => {
		[ this.sourceX, this.sourceY, this.destX, this.destY ] = this.getSourceDestPos(caster, x, y);
		caster.registerMove(this.sourceX, this.sourceY);
		this.pending = true;
		return;
	}

	unregister = () => {
		this.pending = false;
		return;
	}

	cast = (caster) => {
		throw undefined;
	}

	tryCast = (caster) => {
		if (this.pending && caster.withinRange(this.sourceX, this.sourceY, 1)) {
			this.pending = false;
			this.cast(caster);
			return true;
		} else {
			return false;
		}
	}

	isCasting = () => {
		throw undefined;
	}

	linkObject = (target) => {
		this.unlinkObject();
		this.linkedObject = target;
		target.forceMoveSource = this;
		return;
	}

	unlinkObject = () => {
		if (this.linkedObject != null) {
			this.linkedObject.forceMoveSource = null;
			this.linkedObject.unlinkedPostback();
			this.linkedObject = null;
		}
		return;
	}

}


class Dagger extends Castable {
	static END_ANGLE = Math.PI * 1.5;
	static STATE_READY = 0;
	static STATE_CASTING = 1;
	static STATE_COOLDOWN = 2;

	constructor(canvas) {
		super(true);
		this.context2d = canvas.getContext("2d");
		this.context2d.fillStyle = 'rgba(0, 0, 0, 0.6)';
		this.canvasMidX = canvas.width * 0.5;
		this.canvasMidY = canvas.height * 0.5;
		this.canvasSpan = Math.max(canvas.width, canvas.height);
		canvas.style.backgroundSize = `${canvas.width}px ${canvas.height}px`;

		this.castingStart = Config.DaggerCastPoint + Config.DaggerCooldown;
		this.castingEnd = Config.DaggerCooldown;
		this.progress = 0;
	}

	isReady = () => {
		return this.progress == 0;
	}

	getSourceDestPos = (caster, x, y) => {
		let dx = x - caster.x;
		let dy = y - caster.y;
		let distance = Math.hypot(dx, dy);
		let blinkDistance = distance <= Config.DaggerMaxDistance
											? distance : (Config.DaggerMaxDistance * Config.DaggerPenaltyRatio);
		console.log(`Blink ${distance.toFixed(0)} -> ${blinkDistance.toFixed(0)}`);

		let multiplier = Math.min(blinkDistance / distance, 1.0);
		return [
			caster.x,
			caster.y,
			getVectorPoint(caster.x, x, multiplier),
			getVectorPoint(caster.y, y, multiplier),
		];
	}

	cast = (caster) => {
		this.progress = this.castingStart;
		this.linkObject(caster);
		caster.x = this.destX;
		caster.y = this.destY;
		return;
	}

	isCasting = () => {
		return this.progress > this.castingEnd;
	}

	updateModel = () => {
		if (this.progress == 0) {
			return;
		}
		let remaining = --this.progress - this.castingEnd;
		if (remaining >= 0) {
			let multiplier = remaining / Config.DaggerCastPoint;
			this.x = getVectorPoint(this.destX, this.sourceX, multiplier);
			this.y = getVectorPoint(this.destY, this.sourceY, multiplier);
		} else {
			this.unlinkObject();
		}
		return;
	}

	updateView = () => {
		this.context2d.clearRect(0, 0, this.canvasSpan, this.canvasSpan);
		if (this.progress == 0) {
			return;
		}
		let onCooldown = 1.0 - this.progress / this.castingStart;
		this.context2d.beginPath();
		this.context2d.moveTo(this.canvasMidX, this.canvasMidY);
		this.context2d.arc(
			this.canvasMidX, this.canvasMidY, this.canvasSpan,
			Math.PI * (2.0 * onCooldown - 0.5), Dagger.END_ANGLE,
			// The angle at which the arc starts / ends in radians, measured from the positive x-axis.
		);
		this.context2d.fill();
		return;
	}

}


class Hook extends Castable {
	static STATE_READY = 0;
	static STATE_LENGTHEN = 1;
	static STATE_SHORTEN = 2;

	constructor() {
		super(false);
		this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		this.aniElem.setAttribute('stroke', 'brown');
		this.aniElem.setAttribute('stroke-width', 5);

		this.state = Hook.STATE_READY;
		this.castingFrames = 0;
		this.currentFrames = 0;
	}

	isReady = () => {
		return this.state == Hook.STATE_READY;
	}

	getSourceDestPos = (caster, x, y) => {
		let dx = x - caster.x;
		let dy = y - caster.y;
		let distance = Math.hypot(dx, dy);
		let exceedance = distance - Config.current.hookCastRange;
		let multiplier = Math.max(exceedance, 0.0) / distance;
		return [
			getVectorPoint(caster.x, x, multiplier),
			getVectorPoint(caster.y, y, multiplier),
			x,
			y,
		];
	}

	cast = (caster) => {
		this.state = Hook.STATE_LENGTHEN;
		let castRange = Config.current.hookCastRange;
		this.castingFrames = ~~(castRange / Config.HookProjectileSpeed);  // fast truncate
		this.currentFrames = 0;
		this.sourceX = this.x = caster.x;
		this.sourceY = this.y = caster.y;
		let dx = this.destX - this.sourceX;
		let dy = this.destY - this.sourceY;
		let multiplier = castRange / Math.hypot(dx, dy);
		this.destX = getVectorPoint(this.sourceX, this.destX, multiplier);
		this.destY = getVectorPoint(this.sourceY, this.destY, multiplier);
		return;
	}

	isCasting = () => {
		return this.state != Hook.STATE_READY;
	}

	updateModel = () => {
		switch (this.state) {
			case Hook.STATE_READY:
				return;
			case Hook.STATE_LENGTHEN:
				if (++this.currentFrames >= this.castingFrames) {
					this.state = Hook.STATE_SHORTEN;
				}
				break;
			case Hook.STATE_SHORTEN:
				if (--this.currentFrames <= 0) {
					this.state = Hook.STATE_READY;
					this.unlinkObject();
				}
				break;
		}
		let multiplier = this.currentFrames / this.castingFrames;
		this.x = getVectorPoint(this.sourceX, this.destX, multiplier);
		this.y = getVectorPoint(this.sourceY, this.destY, multiplier);
		return;
	}

	updateView = () => {
		if (this.state == Hook.STATE_READY) {
			this.aniElem.style.opacity = 0;
			return;
		}
		this.aniElem.style.opacity = 1;
		this.aniElem.setAttribute('x1', this.sourceX.toFixed(0));
		this.aniElem.setAttribute('y1', this.sourceY.toFixed(0));
		this.aniElem.setAttribute('x2', this.x.toFixed(0));
		this.aniElem.setAttribute('y2', this.y.toFixed(0));
		return;
	}

	isOffensive = () => {
		return this.state == Hook.STATE_LENGTHEN;
	}

	hit = (prey) => {
		this.state = Hook.STATE_SHORTEN;
		this.linkObject(prey);
		return;
	}

}


class Movable extends AbstractObject {

	constructor(collisionSize) {
		super();
		this.collisionSize = collisionSize;
		this.forceMoveSource = null;
	}

	withinRange = (x, y, value = this.collisionSize) => {
		return Math.hypot(this.x - x, this.y - y) <= value;
	}

	clipPos = (axis) => {  // 'x' or 'y'
		if (this[axis] < this.collisionSize) {
			this[axis] = this.collisionSize;
			return true;
		}
		let boundary = Config[axis] - this.collisionSize;
		if (this[axis] > boundary) {
			this[axis] = boundary;
			return true;
		}
		return false;
	}

	normalMove = () => {
		throw undefined;
	}

	unlinkedPostback = () => {
		return;
	}

	updateModel = () => {
		if (this.forceMoveSource == null) {
			this.normalMove();
		} else {
			this.x = this.forceMoveSource.x;
			this.y = this.forceMoveSource.y;
		}
		return;
	}

	updateView = () => {
		this.aniElem.setAttribute('cx', this.x.toFixed(0));
		this.aniElem.setAttribute('cy', this.y.toFixed(0));
		return;
	}

}


class Pudge extends Movable {

	constructor(collisionSize, ...castableList) {
		super(collisionSize);
		this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		this.aniElem.setAttribute('fill', 'pink');
		this.aniElem.setAttribute('r', collisionSize);

		this.destX = 0;
		this.destY = 0;
		this.castableList = castableList;
	}

	normalMove = () => {
		if (this.castableList.some(c => c.isCasting())) {
			return;
		}
		let dx = this.destX - this.x;
		let dy = this.destY - this.y;
		let distance = Math.hypot(dx, dy);
		if (distance <= Config.PudgeMovementSpeed) {
			this.x = this.destX;
			this.y = this.destY;
			this.castableList.forEach(c => c.tryCast(this) && this.stopAction());
		} else {
			let ratio = Config.PudgeMovementSpeed / distance;
			this.x += dx * ratio;
			this.y += dy * ratio;
		}
		this.clipPos('x');
		this.clipPos('y');
		return;
	}

	registerMove = (x, y) => {
		if (this.castableList.some(c => c.isCasting())) {
			return;
		}
		this.destX = x;
		this.destY = y;
		this.castableList.forEach(c => c.unregister());
		return;
	}

	stopAction = () => {
		this.destX = this.x;
		this.destY = this.y;
		this.castableList.forEach(c => c.unregister());
		return;
	}

}


class Meat extends Movable {

	constructor(collisionSize) {
		super(collisionSize);
		this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		this.aniElem.setAttribute('fill', 'purple');
		this.aniElem.setAttribute('r', collisionSize);

		this.deltaX = 0;
		this.deltaY = 0;
		this.currentSpeed = 0;
		this.countdown = 0;
	}

	unlinkedPostback = () => {
		this.randomizePosition();
		this.randomizeMovement();
		return;
	}

	randomizePosition = () => {
		this.x = Math.random() * Config.x;
		this.y = Math.random() * Config.y;
		return;
	}

	randomizeMovement = () => {
		let setting = Config.current;
		let radians = Math.PI * 2.0 * Math.random();
		this.currentSpeed = setting.meatSpeedMin + Math.random() * setting.meatSpeedRange;
		this.deltaX = this.currentSpeed * Math.cos(radians);
		this.deltaY = this.currentSpeed * Math.sin(radians);
		this.countdown = ~~((Math.random() * 0.5 + 0.5) * setting.meatChangePeriod);
		return;
	}

	normalMove = () => {
		if (--this.countdown < 0) {
			this.randomizeMovement();
		}
		if (this.clipPos('x')) {
			this.deltaX *= -1;
		}
		if (this.clipPos('y')) {
			this.deltaY *= -1;
		}
		this.x += this.deltaX;
		this.y += this.deltaY;
		return;
	}

}


class Controller {
	static objectList = [];
	static meatList = [];
	static pudge = null;
	static hook = null;
	static dagger = null;

	static interval = null;
	static raf = null;
	static running = false;
	static score = 0;
	static castableInputMap = new Map();
	static inputMode = 0;
	static timerElement = null;
	static timerValue = 60;

	static setObjects = (pudge, hook, dagger, meatList) => {
		this.objectList = Array.of(pudge, hook, dagger, ...meatList);
		this.pudge = pudge;
		this.hook = hook;
		this.dagger = dagger;
		this.meatList = meatList;
		this.castableInputMap.set(InputMode.Hook, hook);
		this.castableInputMap.set(InputMode.Dagger, dagger);
		return;
	}

	static reset = (timer) => {
		this.timerElement = timer;
		this.timerElement.innerHTML = 0;
	}

	static updateModels = () => {
		if (this.hook.isOffensive()) {
			for (let meat of this.meatList) {
				if (meat.withinRange(this.hook.x, this.hook.y)) {
					this.hook.hit(meat);
					break;
				}
			}
		}
		this.objectList.forEach(o => o.updateModel());
		// this.timerElement.innerHTML = --this.timerValue;
		return;
	}

	static updateViews = () => {
		this.objectList.forEach(o => o.updateView());
		this.raf = window.requestAnimationFrame(this.updateViews);
		return;
	}

	static start = () => {
		this.pause();
		this.interval = window.setInterval(this.updateModels, 10);
		this.raf = window.requestAnimationFrame(this.updateViews);
		this.running = true;
		return;
	}

	static pause = () => {
		window.clearInterval(this.interval);
		window.cancelAnimationFrame(this.raf);
		this.running = false;
		return;
	}

	static switchMode = () => {
		if (this.running) {
			this.pause();
			return false;
		} else {
			this.start();
			return true;
		}
	}

	static playerMove = (x, y) => {
		this.pudge.registerMove(x, y);
		document.body.style.cursor = InputMode.Move;
		return;
	}

	static setInputMode = (inputMode) => {
		if (this.castableInputMap.get(inputMode).isReady()) {
			this.inputMode = inputMode;
			document.body.style.cursor = inputMode;
		} else {
			document.body.style.cursor = InputMode.Move;
		}
		return;
	}

	static launchInput = (x, y) => {
		switch (this.inputMode) {
			case InputMode.Hook:
				this.hook.register(this.pudge, x, y);
				break;
			case InputMode.Dagger:
				this.dagger.register(this.pudge, x, y);
				break;
		}
		document.body.style.cursor = this.inputMode = InputMode.Move;
		return;
	}

	// var tmp = ~~(vSpeed * vSpeed * 41) + ((index * index + vLevel) << 4) + (Math.pow(vCombo, 3) << 3) + 379;
	// gacha.html("+" + tmp).css({ left: (px - 64), top: (py - 36), opacity: .4 }).animate({ top: "-=49px", opacity: 0 }, 480, "linear");
	static gainScore = (score) => {
		this.score += score;
		let levelConfig = Config.LevelList;
		if (levelConfig.length == Config.currentLevel) {
			return;
		}
		for (let i = Config.currentLevel; i < levelConfig.length; ++i) {
			let threshold = levelConfig[i].scoreThreshold;
			if (this.score >= threshold) {
				continue;
			}
			let base = levelConfig[i - 1].scoreThreshold;
			this.experience = (this.score - base) / (threshold - base);
			Config.currentLevel = i;
			return;
		}
		this.experience = 1.0;
		Config.currentLevel = levelConfig.length;
		return;
	}

}


window.oncontextmenu = (event) => {
	event.preventDefault();
	event.stopPropagation();
	return;
};


window.onmousedown = (event) => {
	if (!Controller.running) {
		return;
	}
	switch (event.button) {
		case 2:  // right-click
			Controller.playerMove(event.clientX, event.clientY);
			break;
		case 0:  // left-click
			Controller.launchInput(event.clientX, event.clientY);
			break;
		default:
			console.log(event.button, event.clientX, event.clientY);
	}
	return;
};


window.onkeydown = (event) => {
	switch (event.which) {
		case 27:  // Escape
			document.title = Controller.switchMode() ? '[Running]' : '[Paused]';
			break;
		case 32:  // Space
			Controller.setInputMode(InputMode.Dagger);
			break;
		case 84:  // T
			Controller.setInputMode(InputMode.Hook);
			break;
		default:
			console.log(event.which);
	}
	return;
};


window.onload = function () {
	Config.reset(window.innerWidth, window.innerHeight);

	const canvas = document.querySelector("#canvas");
	let dagger = new Dagger(canvas);
	let hook = new Hook();
	let pudge = new Pudge(20, hook, dagger);
	let meatList = [
		new Meat(16),
		new Meat(15),
		new Meat(14),
		new Meat(13),
		new Meat(12),
	];

	const svg = document.querySelector("#svg");
	svg.appendChild(hook.aniElem);
	svg.appendChild(pudge.aniElem);
	meatList.forEach(m => svg.appendChild(m.aniElem));

	Controller.setObjects(pudge, hook, dagger, meatList);
	const timer = document.querySelector("#timer");
	Controller.reset(timer);
	Controller.start();
	console.log('Oops');
	return;
};

// var best = Math.max(vScore, localStorage.hook ? Number(localStorage.hook) : 0);
// localStorage.hook = best;