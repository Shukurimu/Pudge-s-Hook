export const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';

export function getVectorPoint(vectorFrom, vectorTo, multiplier) {
  return vectorFrom + (vectorTo - vectorFrom) * multiplier;
}

export function computeMaxStreak(arr) {
  return arr.reduce((accumulator, currentValue) => {
    if (currentValue) {
      accumulator.max = Math.max(accumulator.max, ++accumulator.current);
    } else {
      accumulator.current = 0;
    }
    return accumulator;
  }, { 'max': 0, 'current': 0 }).max;
}

export function setDomAttributes(domElement, attributes) {
  for (const [attr, value] of Object.entries(attributes)) {
    domElement.setAttribute(attr, value);
  }
  return;
}
