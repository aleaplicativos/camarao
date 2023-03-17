// GLOBALS, elements used everywhere
const shrimp = document.getElementById('🍤');
const gradient = document.getElementById('🌈');
const shapesContainer = document.getElementById('🔺');
const baseShapes = Array.from(shapesContainer.querySelectorAll('clipPath'));
const activeShape = _.sample(baseShapes);
window.shrimpRotation = 0;
const colorPairs = _.shuffle([
['#DDDE05', '#1C1924'],
['#FDFC57', '#76201D'], // outrun
['#00ff80', '#240049'],
['#D83949', '#06123B'], // outrun2
['#ECD56D', '#5A3EC8']]);

let activeColorIndex = 0;
const colorTransitionTime = 2000;
const colorPersistanceTime = 10000;
let stepPx = 50;
const startingOffset = shrimp.getBoundingClientRect().width;
let shapesArray = [];

function init() {
  setDimensions();
  startRaf();

  window.addEventListener('resize', _.debounce(() => {
    pauseRaf();
    // launch those on next frame because tweenmax on firefox fucks up otherwise
    requestAnimationFrame(setDimensions);
    requestAnimationFrame(startRaf);
  }, 100));

  // start the fading of gradient
  setInterval(changeGradientColors, colorPersistanceTime + colorTransitionTime);
}
init();

function setDimensions() {
  const diagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);

  // first we scale the svg so it fits the wholw window
  const minShapeRadius = getLineLength(document.getElementById(`${activeShape.id}-min-radius`));
  const targetMinShapeRadius = diagonal / 2;
  const initialSvgWIdth = shapesContainer.getBoundingClientRect().width;
  const scaledSvgWidth = Math.ceil(targetMinShapeRadius * initialSvgWIdth / minShapeRadius);
  shapesContainer.setAttribute('width', scaledSvgWidth);
  shapesContainer.setAttribute('height', scaledSvgWidth);

  // then we calculate how many shapes we can draw
  const stepsAvailableDistance = targetMinShapeRadius - startingOffset;
  const nSteps = Math.floor(stepsAvailableDistance / stepPx);

  const svgTransformScale = d3.scaleLinear().
  domain([0, stepsAvailableDistance]).
  range([0, 1]);

  deleteShapes(shapesArray);
  shapesArray = generateShapes({ nSteps, svgTransformScale });
}

// Init the shrimp rotation plugin
Draggable.create(shrimp, {
  type: 'rotation',
  throwProps: true,
  throwResistance: 1,
  onPress: e => {
    shrimp.classList.add('grabbing');
    document.body.classList.add('grabbing');
  },
  onRelease: e => {
    shrimp.classList.remove('grabbing');
    document.body.classList.remove('grabbing');
  },
  onDrag: e => {
    window.shrimpRotation = shrimp._gsTransform.rotation;
  },
  onThrowUpdate: e => {
    window.shrimpRotation = shrimp._gsTransform.rotation;
  } });



var rafPaused = false;
function pauseRaf() {
  rafPaused = true;
}
function startRaf() {
  rafPaused = false;
  update();
}

var previousT = performance.now();
var t = performance.now();
function update() {
  if (rafPaused)
  return;

  shapesArray.forEach((shape, i) => {
    // this magic number affects the rotation differential
    // between the bigger and smaller shapes
    TweenMax.to(shape, 0.3 * (shapesArray.length - i), {
      // instead this magic number affects the inertia of the shapes
      rotation: window.shrimpRotation / 3,
      transformOrigin: '50% 50%',
      ease: Power1.easeOut });

  });

  // If it's less than the defined minimum fps, 
  // and if this happen often, 
  // decrease the shape number
  const minimumFPS = 45;
  t = performance.now();
  if (t - previousT > 1000 / minimumFPS) {
    attemptDecreaseSteps();
  }
  previousT = t;

  requestAnimationFrame(update);
}



function decreaseSteps({ howMuch }) {
  console.warn('PERFORMANCE ISSUES!! Decreasing shapes...');
  stepPx = stepPx + howMuch;
  pauseRaf();
  // launch those on next frame because tweenmax on firefox fucks up otherwise
  requestAnimationFrame(setDimensions);
  requestAnimationFrame(startRaf);
}
// check if there are at least 10 dropped frames over 1 sec
const attemptDecreaseSteps = invokeIfCalledOften(() => decreaseSteps({ howMuch: 10 }), { minInvocations: 8, intervalSpan: 300 });


function generateShapes({ nSteps, svgTransformScale }) {
  // FIRST HANDLE THE CLIPPATH SCALED SHAPES
  // generate the shapes
  const scaledShapes = _.range(1, nSteps + 1).map(i => {
    const cloneShape = activeShape.cloneNode(true);
    cloneShape.id = `${activeShape.id}-${i}`;
    return cloneShape;
  });

  // and add them to the defs
  const shapesFragment = document.createDocumentFragment();
  scaledShapes.forEach(shape => shapesFragment.appendChild(shape));
  shapesContainer.querySelector('#defs').appendChild(shapesFragment);

  // now scale them down, using tweenmax for browser consistency
  scaledShapes.forEach((shape, i) => {
    TweenMax.to(shape.children[0], 0, {
      scale: 1 - _.round(svgTransformScale((i + 1) * stepPx), 2),
      transformOrigin: `50% ${activeShape.id === 'triangle' ? '66.6666%' : '50%'}` });

  });


  // NOW HANDLE THE CLIPPED RECTANGLE SHAPES
  // clone the gradient rectangle to which we'll apply the clip
  const clippedShape = shapesContainer.querySelector(`[clip-path]`);
  clippedShape.setAttribute('clip-path', `url(#${activeShape.id})`);
  const scaledClippedShapes = _.range(1, nSteps + 1).map(i => {
    const cloneShape = clippedShape.cloneNode(true);
    cloneShape.setAttribute('clip-path', `url(#${activeShape.id}-${i})`);
    return cloneShape;
  });

  // and add them to the dom
  const clippedShapesFragment = document.createDocumentFragment();
  scaledClippedShapes.forEach(shape => clippedShapesFragment.appendChild(shape));
  shapesContainer.appendChild(clippedShapesFragment);

  return [clippedShape, ...scaledClippedShapes];
}

function deleteShapes(shapesArray) {
  shapesArray.forEach((el, i) => {
    if (i > 0) {
      el.remove();
      document.getElementById(`${activeShape.id}-${i}`).remove();
    }
  });
}

setColors.call(gradient, colorPairs[activeColorIndex]);
function changeGradientColors() {
  const nextColorIndex = activeColorIndex + 1 === colorPairs.length ? 0 : activeColorIndex + 1;
  const colorInterpolator = d3.interpolate(
  { colors: colorPairs[activeColorIndex] },
  { colors: colorPairs[nextColorIndex] });

  activeColorIndex = nextColorIndex;

  const interpolatingObject = { val: 0 };
  TweenMax.to(interpolatingObject, colorTransitionTime / 1000, {
    val: 1,
    ease: Linear.easeNone,
    onUpdate() {
      const { colors } = colorInterpolator(interpolatingObject.val);
      const colorPair = colors.map(color => rgb2hex(color));
      setColors.call(gradient, colorPair);
    } });

}


// HELPER FUNCTIONS
function getLineLength(lineElement) {
  const { width, height } = lineElement.getBoundingClientRect();
  const diagonal = Math.sqrt(width ** 2 + height ** 2);
  return diagonal;
}

// to be used on a <linearGradient> node using the :: operator
function setColors(colorPair) {
  const el = this;

  el.children[0].setAttribute('stop-color', colorPair[0]);
  el.children[1].setAttribute('stop-color', colorPair[1]);
}

function rgb2hex(rgb) {
  rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
  return rgb && rgb.length === 4 ? "#" +
  ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
}

function invokeIfCalledOften(fn, { minInvocations, intervalSpan }) {
  let timeoutTracker = [];
  let invocationCounter = 0;
  return () => {
    timeoutTracker.push(setTimeout(() => {
      invocationCounter--;
      timeoutTracker.shift();
    }, intervalSpan));
    invocationCounter++;

    if (invocationCounter >= minInvocations) {
      fn();
      invocationCounter = 0;
      timeoutTracker.forEach(timeout => clearTimeout(timeout));
      timeoutTracker = [];
    }
  };
}










// Canvas helper functions, to be called using the :: operator
function drawImageRotated(image, angle) {
  const ctx = this;
  const canvas = ctx.canvas;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate(toRadians(angle));
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.rotate(-toRadians(angle));
  ctx.translate(-centerX, -centerY);
}

function clear() {
  const ctx = this;
  const canvas = ctx.canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


// Other helper functions
function cloneCanvas(originalCanvas) {
  const newCanvas = document.createElement('canvas');
  const newContext = newCanvas.getContext('2d');

  newCanvas.width = originalCanvas.width;
  newCanvas.height = originalCanvas.height;

  newContext.drawImage(originalCanvas, 0, 0);

  return newCanvas;
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return new Promise(resolve => image.addEventListener('load', ({ currentTarget }) => resolve(currentTarget)));
}