import * as Meyda from 'meyda';
// https://meyda.js.org/audio-features.html

Meyda.bufferSize = BUFF_SIZE;

import {Deck, OrthographicView} from '@deck.gl/core';
import {TextLayer, ScatterplotLayer} from '@deck.gl/layers';
import * as d3Chromatic from 'd3-scale-chromatic';

import {BUFF_ARR_SIZE, BUFF_SIZE} from './constants';

let deck = null;

const FEATURES = 'mfcc';
const NUM_FEATURES = 13;

const sinebow = (d) => {
  const chromaStr = d3Chromatic.interpolateSinebow(d);
  const arr = chromaStr.replace('rgb(', '').replace(')', '').split(', ').map(x => Number(x))
  arr[3] = 140;
  return arr;
};

let selectedColorScale = sinebow;

function addLists(list0, list1) {
  if (list0.length !== list1.length) {
    throw Error('mismatched lengths');
  }
  const newOutput = [];
  for (let i = 0; i < list0.length; i++) {
    newOutput.push(list0[i] + list1[i])
  }
  return newOutput;
}

function getFeaturegram(leftstream) {
  const featureArray = [];
  for (let i = 0; i < BUFF_ARR_SIZE; i++) {
    if (leftstream[i] && leftstream[i].length === BUFF_SIZE) {
      const featuregram = Meyda.extract(FEATURES, leftstream[i]);
      featureArray.push(featuregram)
    }
  }
  return featureArray;
}

function getSharp(leftstream) {
  const featureArray = [];
  for (let i = 0; i < BUFF_ARR_SIZE; i++) {
    if (leftstream[i] && leftstream[i].length === BUFF_SIZE) {
      const featuregram = Meyda.extract('perceptualSharpness', leftstream[i]);
      featureArray.push(featuregram)
    }
  }
return featureArray.reduce((a, b) => a + b) / featureArray.length;
}

const INITIAL_VIEW_STATE = {
  target: [0, 0],
  rotationX: 0,
  rotationOrbit: 0,
  zoom: 5
};

function enumerateRows(data) {
  const sumArr = data.reduce((a, b) => addLists(a, b))
  for (let i = 0; i < sumArr.length; i++) {
    sumArr[i] = [i, sumArr[i] / data.length];
  }
  return sumArr;
}

function newLayer(data) {
  return [
      new ScatterplotLayer({
        id: 'pointCloud',
        data: enumerateRows(data),
        getPosition: d => [d[0], 0],
        getFillColor: d => {
          return selectedColorScale(d[1] / 50)
        },
        stroked: false, 
        getRadius: d => Math.max(Math.log10(d[1] * 100), 0),
        lineWidthMaxPixels: 1
      }),
      new ScatterplotLayer({
        id: 'pointCloud',
        data: enumerateRows(data),
        getPosition: d => [-d[0], 0],
        getFillColor: d => {
          return selectedColorScale(d[1] / 50)
        },
        stroked: false, 
        getRadius: d => Math.max(Math.log10(d[1] * 100), 0),
        lineWidthMaxPixels: 1
      })

    ]
}

export function renderMessage(msg) {
  document.getElementById('app-container').innerText = msg;
}

export function visualize(cg) {
  deck.setProps({layers: newLayer(cg)})
}

export function reinitVis() {
  const data = [[...new Array(NUM_FEATURES + 3).keys()].map(x => 0)];
  visualize(data);
}

export function initVis() {
  if (deck) {
    reinitVis();
    return
  }
  const data = [[...new Array(NUM_FEATURES).keys()].map(x => 0)];
  const vis = new Deck({
    views: [new OrthographicView()],
    getTooltip: info => info.index != -1 ? {text: `${JSON.stringify(info.object)}`} : null,
    initialViewState: INITIAL_VIEW_STATE,
    controller: false,
    container: 'app-container',
    layers: newLayer(data)
  });
  deck = vis;
}

export function pulseCheck(channel) {
    const cg = getFeaturegram(channel);
    visualize(cg);
}
