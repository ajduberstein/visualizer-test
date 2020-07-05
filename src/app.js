import hark from 'hark';

import {renderMessage, pulseCheck, initVis} from './vis';

import {BUFF_ARR_SIZE, BUFF_SIZE} from './constants';

import './style.css';

let context = null;
let scriptNode = null;
let leftchannel = [];
const NUM_CHANNELS = 1;

let recordingLength = 0;
const audioContextType = window.AudioContext || window.webkitAudioContext;

let timer = null;

function onMediaSuccess(stream) {
  const track = stream.getTracks()[0];
  context = new audioContextType();
  const source = context.createMediaStreamSource(stream); // create a ScriptProcessorNode
  if (!context.createScriptProcessor) {
    scriptNode = context.createJavaScriptNode(BUFF_SIZE, NUM_CHANNELS, NUM_CHANNELS);
  } else {
    scriptNode = context.createScriptProcessor(BUFF_SIZE, NUM_CHANNELS, NUM_CHANNELS);
  }

  scriptNode.onaudioprocess = (e) => {
    const left = e.inputBuffer.getChannelData(0);
    if (leftchannel.length < BUFF_ARR_SIZE) {
      leftchannel.push(new Float32Array(left));
      recordingLength += BUFF_SIZE;
      
    } else {
      leftchannel.splice(0, 1);
      leftchannel.push(new Float32Array(left));
    }
  }
  // connect the ScriptProcessorNode with the input audio
  source.connect(scriptNode);
  scriptNode.connect(context.destination);
}


function getMedia() {
  let stream = null;

  renderMessage('Enable microphone use and play audio');
  const promise = navigator.mediaDevices.getUserMedia({video: false, audio: true});
  promise.then(stream => {
    renderMessage(null);

    const speechEvents = hark(stream, {interval: 10, threshold: -60, play: false});
    
    speechEvents.on('speaking', () => {
      onMediaSuccess(stream);
      timer = setInterval(() => pulseCheck(leftchannel), 100);
    });
    
    speechEvents.on('stopped_speaking', () => {
      clearBuffers();
    });
  }).catch(err => err)
}

function clearBuffers() {
  leftchannel = [];
  recordingLength = 0;
  if (timer) {
    clearInterval(timer);
  }
  initVis();
}

function main() {
  const div = document.getElementById('app-container');
  initVis();
  getMedia();
}

main();
