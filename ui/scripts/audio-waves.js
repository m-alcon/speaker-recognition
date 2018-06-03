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

let play1 = document.getElementById("play1");
let play2 = document.getElementById("play2");
let run = document.getElementById("run");
let inside_play = [
    play1.getElementsByTagName("div")[0],
    play2.getElementsByTagName("div")[0]
]
//let title1 = document.getElementById("title1");
//let title2 = document.getElementById("title2");
let speaker1 = document.getElementById("speaker1");
let speaker2 = document.getElementById("speaker2");
let speaker1file = document.getElementById("file1");
let speaker2file = document.getElementById("file2");
let guideTitle = document.getElementById("guide");
let underRun = document.getElementById("under-run");
let adviser = document.getElementById("adviser");
let restart = document.getElementById("restart");
let isActive_1 = false;
let isActive_2 = false;
let isRunning = false;
let lastActive = 0;
let hoverRun = 0;
let readyToRun = [false,false,false,false];
let runColor = normalColor;


let MESSAGES = {
    init: "SPEAKERS, CHOICE YOUR VOICES",
    leftSpeaker: "LEFT SPEAKER, CHOICE YOUR VOICE",
    rightSpeaker: "RIGHT SPEAKER, CHOICE YOUR VOICE",
    run: "YOU ARE READY TO RUN IT",
    different: "DIFFERENT SPEAKERS",
    equal: "SAME SPEAKERS"
}

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
        play1.classList.add("blocked");
        //title1.style.color = blockColor;
    }
    else {
        isActive_2 = false;
        play1.classList.remove("blocked");
        //title1.style.color = normalColor;
    }
}

function blockSpeaker2(wantBlock) {
    if (wantBlock) {
        isActive_1 = true;
        play2.classList.add("blocked");
        //title2.style.color = blockColor;
    }
    else {
        isActive_1 = false;
        play2.classList.remove("blocked");
        //title2.style.color = normalColor;
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
    if (isReadyToRun()) {
        if (runResult == "") {
            guideTitle.textContent = MESSAGES.run;
        }
        else {
            guideTitle.textContent = runResult;
        }
    }
    else if (!isReadyToRun()) {
        guideTitle.textContent = MESSAGES.init;
    }
    else if (!readyToRun[0]) {
        guideTitle.textContent = MESSAGES.leftSpeaker;
    }
    else {
        guideTitle.textContent = MESSAGES.rightSpeaker;
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

function blockRunStart(wantBlock) {
    if (wantBlock) {
        modifyReadyToRun(false);
        restartAdvisers();
    }
    console.log("isready" + isReadyToRun());
    if (isReadyToRun()) {
        run.classList.remove("blocked");
        runColor = normalColor;
        run.style.borderColor = normalColor;
    }
    else {
        run.classList.add("blocked");
        runColor = blockColor;
        run.style.borderColor = blockColor;
    }
}
function blockRun(wantBlock) {
    blockRunStart(wantBlock);
    guideAnimOut = setInterval(fadeOutTextAnimation(),10);
}

// function changePlayButtonSize(size) {
//     if (!size) {
//         size = window.innerWidth <= window.innerHeight ? window.innerWidth : window.innerHeight;
//         size = size*0.5*0.3;
//     }
//     if (readyToRun[0] && readyToRun[1]) {
//         size = size + (size * hoverRun * 0.15)
//     }

//     var halfSize = (size*0.5*0.4).toString() + "px  solid transparent";
//     inside_run.style.borderTop = halfSize;
//     inside_run.style.borderBottom = halfSize;
//     inside_run.style.borderLeftWidth = (size*0.4).toString() + "px";
//     inside_run.style.borderLeftStyle = "solid";
//     inside_run.style.borderLeftStyle = runColor;
// }


function changeButtonSize() {
    var size = window.innerWidth <= window.innerHeight ? window.innerWidth : window.innerHeight;
    size = size*0.5*0.3;
    var circleSize = (size).toString() + "px";
    play1.style.width = circleSize;
    play1.style.height = circleSize;
    play2.style.width = circleSize;
    play2.style.height = circleSize;
    run.style.width = circleSize;
    run.style.height = circleSize;
    underRun.style.width = circleSize;
    adviser.style.width = (size*0.3).toString() + "px";
    adviser.style.height = (size*0.3).toString() + "px";
    //changePlayButtonSize(size);
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

    play1.onclick = () => {
        if (!isActive_2) {
            if (!isActive_1) {
                blockSpeaker2(true);
                blockRestart(true);
                play1.classList.add("active");
                mediaRecorder.start();
                console.log(mediaRecorder.state);
                console.log("recorder1 started");
            }
            else {
                blockSpeaker2(false);
                blockRestart(false);
                lastActive = 1;
                play1.classList.remove("active");
                mediaRecorder.stop();
                console.log(mediaRecorder.state);
                console.log("recorder1 stopped");
            }
        }
    }

    play2.onclick = () => {
        if (!isActive_1) {
            if (!isActive_2) {
                blockSpeaker1(true);
                blockRestart(true);
                play2.classList.add("active");
                mediaRecorder.start();
                console.log(mediaRecorder.state);
                console.log("recorder2 started");
            }
            else {
                blockSpeaker1(false);
                blockRestart(false);
                lastActive = 2;
                play2.classList.remove("active");
                mediaRecorder.stop();
                console.log(mediaRecorder.state);
                console.log("recorder2 stopped");
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

function isReadyToRun() {
    for (let i = 0; i < readyToRun.length; i++) {
        if (!readyToRun[i]) return false;
    }
    return true;
}

function modifyReadyToRun(allTrue) {
    for (let i = 0; i < readyToRun.length; i++) {
        readyToRun[i] = allTrue;
    }
}

function initConfiguration() {
    isActive_1 = false;
    isActive_2 = false;
    isRunning = false;
    lastActive = 0;
    hoverRun = 0;
    modifyReadyToRun(false);
    runColor = normalColor;
    //guideAlpha = 0;
    runResult = "";
    speaker1.value = 0;
    speaker2.value = 0;

    blockRestart(false);
    blockSpeaker1(false);
    blockSpeaker2(false);
    blockRun(true);
    restart.style.display = "none";
    underRun.style.justifyContent = "center";
    changeButtonSize();
    changeAdviserColor();
}

function initConfigurationStart() {
    isActive_1 = false;
    isActive_2 = false;
    isRunning = false;
    lastActive = 0;
    hoverRun = 0;
    modifyReadyToRun(false);
    runColor = normalColor;
    //guideAlpha = 0;
    runResult = "";
    speaker1.value = 0;
    speaker2.value = 0;

    blockRestart(false);
    blockSpeaker1(false);
    blockSpeaker2(false);
    blockRunStart(true);
    guideAnimIn = setInterval(fadeInTextAnimation(),10);
    guideTitle.style.opacity = "1";
    restart.style.display = "none";
    underRun.style.justifyContent = "center";
    changeButtonSize();
    changeAdviserColor();
}

function onSelectChange(select) {
    console.log(select.value);
}

function initEvents() {
    run.onclick = () => {
        if (isReadyToRun() && !isRunning && !isActive_1 && !isActive_2) {
            isRunning = true;
            blockRestart(true);
            blockSpeaker1(true);
            blockSpeaker2(true);
            //title1.style.color = blockColor;
            //title2.style.color = blockColor;
            run.classList.add("animated");
            exec('./bin/checkspeakers', (err, stdout, stderr) => {
                if (err) {
                    return;
                }

                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                if (stdout == 0) {
                    runResult = MESSAGES.different;
                }
                else {
                    runResult = MESSAGES.equal;
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

    speaker1.onchange = () => {
        if (speaker1.value != 0) {
            readyToRun[0] = true;
            if (speaker1file.value != 0)
                highlightAdviser(0);
        }
        else {
            readyToRun[0] = false;
        }
        blockRun();
    };
    speaker1file.onchange = () => {
        if (speaker1file.value != 0) {
            readyToRun[1] = true;
            if (speaker1.value != 0)
                highlightAdviser(0);
        }
        else {
            readyToRun[1] = false;
        }
        blockRun();
    };
    speaker2.onchange = () => {
        if (speaker2.value != 0) {
            readyToRun[2] = true;
            if (speaker2file.value != 0)
                highlightAdviser(1);
        }
        else {
            readyToRun[2] = false;
        }
        blockRun();
    };
    speaker2file.onchange = () => {
        if (speaker1file.value != 0) {
            readyToRun[3] = true;
            if (speaker2.value != 0)
                highlightAdviser(1);
        }
        else {
            readyToRun[3] = false;
        }
        blockRun();
    };

    // play1.onmouseover = () => {hoverRun = 1;changePlayButtonSize(null)};
    // play1.onmouseout = () => {hoverRun = 0;changePlayButtonSize(null)};
    // play2.onmouseover = () => {hoverRun = 1;changePlayButtonSize(null)};
    // play2.onmouseout = () => {hoverRun = 0;changePlayButtonSize(null)};
}

function init() {
    initConfigurationStart();
    initEvents();
    initAudio();
}

window.addEventListener('resize', onResize)
window.addEventListener('load', init);



