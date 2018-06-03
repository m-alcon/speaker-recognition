const fs = require("fs");
const toBuffer = require("blob-to-buffer")
const {exec} = require("child_process");

window.AudioContext = window.AudioContext || window.webkitAudioContext;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
let rafID = null;
let analyserContext = null;
let canvasWidth, canvasHeight;
let recIndex = 0;
let widthTh = 768;
let isHorizontal = null;
let canvas = null;

let blockColor = "rgb(70, 70, 70)";
let normalColor = "white";
let adviserColors = ["aqua","blue"];

let record1 = document.getElementById("record1");
let record2 = document.getElementById("record2");
let run = document.getElementById("run");
let inside_run = run.getElementsByClassName("triangle")[0];
let title1 = document.getElementById("title1");
let title2 = document.getElementById("title2");
let guideTitle = document.getElementById("guide");
let underRun = document.getElementById("under-run");
let adviser = document.getElementById("adviser");
let restart = document.getElementById("restart");
let isActive_1 = false;
let isActive_2 = false;
let isRunning = false;
let lastActive = 0;
let hoverRun = 0;
let readyToRun = [false,false];
let runColor = normalColor;

let KEYFRAMES = {
    out: [
        {opacity: 1},
        {opacity: 0}
    ],
    in: [
        {opacity: 0},
        {opacity: 1}
    ]
}

let runResult = "";



// VISUAL

function blockSpeaker1(wantBlock) {
    if (wantBlock) {
        isActive_2 = true;
        record1.classList.add("blocked");
        title1.style.color = blockColor;
    }
    else {
        isActive_2 = false;
        record1.classList.remove("blocked");
        title1.style.color = normalColor;
    }
}

function blockSpeaker2(wantBlock) {
    if (wantBlock) {
        isActive_1 = true;
        record2.classList.add("blocked");
        title2.style.color = blockColor;
    }
    else {
        isActive_1 = false;
        record2.classList.remove("blocked");
        title2.style.color = normalColor;
    }
}

function blockRestart (wantBlock) {
    if (wantBlock) {
        restart.classList.add("blocked");
    }
    else {
        restart.classList.remove("blocked");
    }
}

function fadeInTextAnimation() {
    var animIn = guideTitle.animate(KEYFRAMES.in, 1000);
}

function fadeOutTextAnimation() {
    var animOut = guideTitle.animate(KEYFRAMES.out, 1000);
    animOut.onfinish = () => {
        changeGuideTitle();
        fadeInTextAnimation();
    }
}

function changeGuideTitle() {
    if (readyToRun[0] && readyToRun[1]) {
        if (runResult == "") {
            guideTitle.textContent = "YOU ARE READY TO RUN IT";
        }
        else {
            guideTitle.textContent = runResult;
        }
    }
    else if (!readyToRun[0] && !readyToRun[1]) {
        guideTitle.textContent = "SPEAKERS, RECORD YOUR VOICES";
    }
    else if (!readyToRun[0]) {
        guideTitle.textContent = "ALICE, RECORD YOUR VOICE";
    }
    else {
        guideTitle.textContent = "BOB, RECORD YOUR VOICE";
    }
}

function afterResultChanges() {
    restart.style.display = "block";
    underRun.style.justifyContent = "space-between";
    guideAnimOut = setInterval(fadeOutTextAnimation(),10);
    console.log("pid out: " + guideAnimOut);
}

function changeAdviserColor() {
    let rand = Math.floor(Math.random() * 166);
    adviserColors[0] =  "hsl( " + (180-rand) + ", 100%, 50%)";
    adviserColors[1] =  "hsl( " + (180+rand) + ", 100%, 50%)";
}

function highlightAdviser(num) {
    adviser.children[num].style.backgroundColor = adviserColors[num];
}

function restartAdviser(num) {
    adviser.children[num].style.backgroundColor = blockColor;
}

function restartAdvisers () {
    restartAdviser(0);
    restartAdviser(1);
}

function blockRun(wantBlock) {
    if (wantBlock) {
        readyToRun[0] = false;
        readyToRun[1] = false;
        restartAdvisers();
    }
    if (readyToRun[0] && readyToRun[1]) {
        run.classList.remove("blocked");
        runColor = normalColor;
        run.style.borderColor = normalColor;
        inside_run.style.borderLeftColor = normalColor;
    }
    else {
        run.classList.add("blocked");
        runColor = blockColor;
        run.style.borderColor = blockColor;
        inside_run.style.borderLeftColor = blockColor;
    }
    console.log("wtfmaaan");
    guideAnimOut = setInterval(fadeOutTextAnimation(),10);
    console.log("ruserious");
    console.log("pid out: " + guideAnimOut);
}

function changeRunButtonSize(size) {
    if (!size) {
        size = window.innerWidth <= window.innerHeight ? window.innerWidth : window.innerHeight;
        size = size*0.5*0.3;
    }
    if (readyToRun[0] && readyToRun[1]) {
        size = size + (size * hoverRun * 0.15)
    }

    var halfSize = (size*0.5*0.4).toString() + "px  solid transparent";
    inside_run.style.borderTop = halfSize;
    inside_run.style.borderBottom = halfSize;
    inside_run.style.borderLeftWidth = (size*0.4).toString() + "px";
    inside_run.style.borderLeftStyle = "solid";
    inside_run.style.borderLeftStyle = runColor;
}


function changeButtonSize() {
    var size = window.innerWidth <= window.innerHeight ? window.innerWidth : window.innerHeight;
    size = size*0.5*0.3;
    var circleSize = (size).toString() + "px";
    record1.style.width = circleSize;
    record1.style.height = circleSize;
    record2.style.width = circleSize;
    record2.style.height = circleSize;
    run.style.width = circleSize;
    run.style.height = circleSize;
    underRun.style.width = circleSize;
    adviser.style.width = (size*0.3).toString() + "px";
    adviser.style.height = (size*0.3).toString() + "px";
    changeRunButtonSize(size);
}

function onResize() {
    //if (isHorizontal && window.innerWidth < widthTh) {
        canvasWidth = canvas.clientWidth;//canvas.clientWidth;
        canvasHeight = 1024;

        analyserContext.canvas.width = canvasWidth;
        analyserContext.canvas.height = canvasHeight;
        //isHorizontal = !isHorizontal
        isHorizontal = true;
        console.log("little");
    //}
    // else if (!isHorizontal && window.innerWidth >= widthTh) {
    //     canvasWidth = 1024;//canvas.clientWidth;
    //     canvasHeight = canvas.clientHeight;

    //     analyserContext.canvas.width = canvasWidth;
    //     analyserContext.canvas.height = canvasHeight;
    //     isHorizontal = !isHorizontal
    //     console.log("big");
    // }
    changeButtonSize();

}

// WAVES

function updateAnalysers() {
    let numBars = analyserNode.frequencyBinCount;
    let freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqByteData);
    analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
    analyserContext.fillStyle = '#000000';
    analyserContext.lineCap = 'round';
    let visualBars = 200;
    let step = Math.floor(numBars/visualBars);
    let max = numBars/2;
    let totalBarWidth = canvasWidth/visualBars;
    let relation = canvasWidth/max;
    let spaceBarWidth = totalBarWidth * 0.01;
    let barWidth = totalBarWidth * 0.98;
    for (let i = 0; i < max; i += step) {
        analyserContext.fillStyle = "hsl( " + Math.round((i*360)/max) + ", 100%, 50%)";
        let mean = 0;
        for (let j = i; j < i+step; ++j)
            if (freqByteData[i+j])
                mean = mean + freqByteData[i+j]
        if (isHorizontal) {
            mean = (mean*canvasHeight/(step*2))/256 //Ajustamos al height del canvas
            let barHeight = (mean+4)*2
            let posBar = canvasHeight/2 - (mean+4)
            analyserContext.fillRect(i*relation + spaceBarWidth, posBar , barWidth, barHeight);
        }
        else {
            mean = (mean*canvasWidth/step)/256 //Ajustamos al width del canvas
            analyserContext.fillRect(0, i*3, mean+8, 8);
        }
    }
    rafID = window.requestAnimationFrame( updateAnalysers );
}

function updateWaves (stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
    updateAnalysers();
}

// RECORD

function saveBlob(blob) {
    toBuffer(blob, (err,buffer) => {
        if(err) throw err;

        fs.writeFile('audio/audio'+lastActive+'.wav',buffer, e => {
            if (e) throw e;
            console.log('wav saved')
        });

    });
}

function recordAudio(stream) {
    var chunks = [];
    var mediaRecorder = new MediaRecorder(stream);

    record1.onclick = () => {
        if (!isActive_2) {
            if (!isActive_1) {
                blockSpeaker2(true);
                blockRestart(true);
                restartAdviser(0);
                record1.classList.add("active");
                mediaRecorder.start();
                console.log(mediaRecorder.state);
                console.log("recorder1 started");
            }
            else {
                blockSpeaker2(false);
                blockRestart(false);
                lastActive = 1;
                record1.classList.remove("active");
                mediaRecorder.stop();
                console.log(mediaRecorder.state);
                console.log("recorder1 stopped");
                readyToRun[0] = true;
                highlightAdviser(0);
                blockRun();
            }
        }
    }

    record2.onclick = () => {
        if (!isActive_1) {
            if (!isActive_2) {
                blockSpeaker1(true);
                blockRestart(true);
                restartAdviser(1);
                record2.classList.add("active");
                mediaRecorder.start();
                console.log(mediaRecorder.state);
                console.log("recorder2 started");
            }
            else {
                blockSpeaker1(false);
                blockRestart(false);
                lastActive = 2;
                record2.classList.remove("active");
                mediaRecorder.stop();
                console.log(mediaRecorder.state);
                console.log("recorder2 stopped");
                readyToRun[1] = true;
                highlightAdviser(1);
                blockRun();
            }
        }
    }

    mediaRecorder.onstop = function(e) {
        var audio = document.createElement('audio');
        var blob = new Blob(chunks, { 'type' : 'audio/wav' });
        chunks = [];
        var audioURL = URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped");

        saveBlob(blob);
    }

    mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
    }
}

function gotStream(stream) {
    updateWaves(stream);
    recordAudio(stream);
}

function initAudio() {
    canvas = document.getElementById("audioWave");
    analyserContext = canvas.getContext('2d');
    isHorizontal = !(window.innerWidth >= widthTh);
    onResize();

	if (!navigator.getUserMedia)
		navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	if (!navigator.cancelAnimationFrame)
		navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
	if (!navigator.requestAnimationFrame)
		navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

	navigator.getUserMedia({
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        },
    }, gotStream, function(e) {
        alert('Error getting audio');
        console.log(e);
    });
}

// INITIALIZATIONS

function initConfiguration() {
    isActive_1 = false;
    isActive_2 = false;
    isRunning = false;
    lastActive = 0;
    hoverRun = 0;
    readyToRun = [false,false];
    runColor = normalColor;
    //guideAlpha = 0;
    runResult = "";

    blockRestart(false);
    blockSpeaker1(false);
    blockSpeaker2(false);
    blockRun(true);
    restart.style.display = "none";
    underRun.style.justifyContent = "center";
    changeButtonSize();
    changeAdviserColor();
}

function initEvents() {
    run.onclick = () => {
        if (readyToRun[0] && readyToRun[1] && !isRunning && !isActive_1 && !isActive_2) {
            isRunning = true;
            blockRestart(true);
            blockSpeaker1(true);
            blockSpeaker2(true);
            title1.style.color = blockColor;
            title2.style.color = blockColor;
            run.classList.add("animated");
            exec('./bin/checkspeakers', (err, stdout, stderr) => {
                if (err) {
                    return;
                }

                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                if (stdout == 0) {
                    runResult = "DIFFERENT SPEAKERS"
                }
                else {
                    runResult = "SAME SPEAKER"
                }
                isRunning = false;
                blockRestart(false);
                blockSpeaker1(false);
                blockSpeaker2(false);
                run.classList.remove("animated");
                afterResultChanges();
            });
        }
    }

    restart.onclick = () => {
        if (!isRunning) {
            restart.style.display = "none";
            initConfiguration();
        }
    }

    run.onmouseover = () => {hoverRun = 1;changeRunButtonSize(null)};
    run.onmouseout = () => {hoverRun = 0;changeRunButtonSize(null)};
}

function init() {
    initConfiguration();
    initEvents();
    initAudio();
}

window.addEventListener('resize', onResize)
window.addEventListener('load', init);



