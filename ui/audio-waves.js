const fs = require("fs");
const toBuffer = require("blob-to-buffer");
const {spawn} = require("child_process");

window.AudioContext = window.AudioContext || window.webkitAudioContext;

let audioContext = new window.AudioContext;
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
var extraStyle = document.createElement("style");
document.head.appendChild(extraStyle);
extraStyle = extraStyle.sheet

let play1 = document.getElementById("play1");
let play2 = document.getElementById("play2");
let run = document.getElementById("run");
let inside_play = [
    play1.getElementsByTagName("div")[0],
    play2.getElementsByTagName("div")[0]
]

let speakerData = []
let speaker1 = document.getElementById("speaker1");
let speaker2 = document.getElementById("speaker2");
let speaker1file = document.getElementById("file1");
let speaker2file = document.getElementById("file2");
let guideTitle = document.getElementById("guide");
let underRun = document.getElementById("under-run");
let adviser = document.getElementById("adviser");
let restart = document.getElementById("restart");
let isActivePlay = [false,false];
let isBlockedPlay = [false,false];
let isRunning = false;
let netLoaded = false;
let readyToRun = [false,false,false,false];
let audioPlayer1 = {obj: null,source: null}
let audioPlayer2 = {obj: null,source: null}
let audioNull = {obj: null,source: null}
let actualAudio = {obj: null,source: null}
let wantedMessage = "";
let dot3anim = null;
let MESSAGES = {
    init: "SPEAKERS, CHOICE YOUR VOICES",
    leftSpeaker: "LEFT SPEAKER, CHOICE YOUR VOICE",
    rightSpeaker: "RIGHT SPEAKER, CHOICE YOUR VOICE",
    ready: "YOU ARE READY TO RUN IT",
    waitNet: "LOADING COMPARATOR<span>.</span><span>.</span><span>.</span>",
    run: "RUNNING",
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

let program = spawn("./bin/checkspeakers");

// SPEAKER LIST

function createSpeakerList() {
    fs.readFile("./scripts/speaker-audio-list.dat", "utf-8" , (err, data) => {
        if (err) throw err;
        data = data.split("\n");
        for (let i = 0; i < data.length; ++i) {
            let speakerOption1 = document.createElement("option");
            speakerOption1.text = "Speaker " + i;
            speakerOption1.value = i+1;
            let speakerOption2 = speakerOption1.cloneNode(true)
            speaker1.appendChild(speakerOption1);
            speaker2.appendChild(speakerOption2);
            data[i] = data[i].split(" ");
        }
        speakerData = data;
    });
}

function createFile1List() {
    let saveDefault = speaker1file.options[0];
    speaker1file.options.length = 0;
    speaker1file.appendChild(saveDefault);
    for (let i = 0; i < speakerData[speaker1.value].length; ++i) {
        let fileOption = document.createElement("option");
        fileOption.text = i;
        fileOption.value = i+1;
        speaker1file.appendChild(fileOption);
    }
}

function createFile2List() {
    let saveDefault = speaker2file.options[0];
    speaker2file.options.length = 0;
    speaker2file.appendChild(saveDefault);
    for (let i = 0; i < speakerData[speaker2.value].length; ++i) {
        let fileOption = document.createElement("option");
        fileOption.text = i;
        fileOption.value = i+1;
        speaker2file.appendChild(fileOption);
    }
}

// VISUAL

function blockPlayer1(wantBlock) {
    if (wantBlock == null) {
        if (!isBlockedPlay[0] && !isActivePlay[1]) {
            play1.classList.remove("blocked");
        }
        else if (isBlockedPlay[0] || isActivePlay[1]) {
            play1.classList.add("blocked");
        }
    }
    else if (wantBlock) {
        isBlockedPlay[0] = true;
        play1.classList.add("blocked");
    }
    else {
        isBlockedPlay[0] = false;
        if (!isActivePlay[1])
            play1.classList.remove("blocked");
    }
}

function blockPlayer2(wantBlock) {
    if (wantBlock == null) {
        if (!isBlockedPlay[1] && !isActivePlay[0]) {
            play2.classList.remove("blocked");
        }
        else if (isBlockedPlay[1] || isActivePlay[0]) {
            play2.classList.add("blocked");
        }
    }
    else if (wantBlock) {
        isBlockedPlay[1] = true;
        play2.classList.add("blocked");
    }
    else {
        isBlockedPlay[1] = false;
        if (!isActivePlay[0])
            play2.classList.remove("blocked");
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
    var animIn = guideTitle.animate(KEYFRAMES.in, 250);
}

function fadeOutTextAnimation() {
    var animOut = guideTitle.animate(KEYFRAMES.out, 250);
    animOut.onfinish = () => {
        guideTitle.innerHTML = wantedMessage;
        fadeInTextAnimation();
    }
}

function changeGuideTitle() {
    if (isRunning) {
        wantedMessage = MESSAGES.run;
    }
    else if (isReadyToRun()) {
        if (runResult == "") {
            if (netLoaded) {
                clearInterval(dot3anim);
                wantedMessage = MESSAGES.ready;
            }
            else {
                wantedMessage = MESSAGES.waitNet;
            }
        }
        else {
            wantedMessage = runResult;
        }
    }
    else if (!readyToRun[1] && readyToRun[3]) {
        wantedMessage = MESSAGES.leftSpeaker;
    }
    else if (!readyToRun[3] && readyToRun[1]) {
        wantedMessage = MESSAGES.rightSpeaker;
    }
    else if (!readyToRun[1] && !readyToRun[3]) {
        wantedMessage = MESSAGES.init;
    }
}

function afterResultChanges() {
    restart.style.display = "block";
    underRun.style.justifyContent = "space-between";
    changeGuideTitle();
    fadeOutTextAnimation();
}

function changeColors() {
    // adviser colors
    let rand = Math.floor(Math.random() * 166);
    let color1 = "hsl( " + (180-rand-10) + ", 100%, 50%)";
    let color2 = "hsl( " + (180+rand+10) + ", 100%, 50%)";
    adviserColors[0] =  color1;
    adviserColors[1] =  color2;

    // selectors outline colors
    speaker1.style.outlineColor = color1;
    speaker1file.style.outlineColor = color1;
    speaker2.style.outlineColor = color2;
    speaker2file.style.outlineColor = color2;
    if (extraStyle.cssRules.length > 0) {
        extraStyle.deleteRule(3);
        extraStyle.deleteRule(2);
        extraStyle.deleteRule(1);
        extraStyle.deleteRule(0);
    }
    extraStyle.insertRule("#play1.pushable.active .inside-pushable "+
        "{border-left-color: " + color1 + "}",0);
    extraStyle.insertRule("#play2.pushable.active .inside-pushable "+
        "{border-left-color: " + color2 + "}",1);
    // run animation colors
    extraStyle.insertRule("@keyframes changeColor {" +
        "0% {color: "+ color1 + ";}" +
        "50% {color: "+ color2 + ";}" +
        "100% {color: "+ color1 + ";}}",2);
    extraStyle.insertRule("@keyframes dots {" +
        "0% {color: "+ color1 + ";}" +
        "40% {color: "+ normalColor + ";}" +
        "50% {color: "+ color2 + ";}" +
        "90% {color: "+ normalColor + ";}" +
        "100% {color: "+ color1 + ";}}",3);
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

function blockRun() {
    if  (isReadyToRun() && !isActivePlay[0] && !isActivePlay[1]) {
        run.classList.remove("blocked");
        run.style.borderColor = normalColor;
    }
    else {
        run.classList.add("blocked");
        run.style.borderColor = blockColor;
    }
    changeGuideTitle();
    if (guideTitle.innerHTML != wantedMessage)
        fadeOutTextAnimation();
}

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
}

function onResize() {
    canvasWidth = canvas.clientWidth;
    canvasHeight = 1024;

    analyserContext.canvas.width = canvasWidth;
    analyserContext.canvas.height = canvasHeight;
    isHorizontal = true;
    changeButtonSize();

}

// WAVES

function updateAnalysers() {
    let numBars = analyserNode.frequencyBinCount/5;
    let freqByteData = new Uint8Array(numBars);
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

function updateWaves () {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = actualAudio.source;
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    soundContext = audioContext.createGain();
    soundContext.gain.value = 1;
    inputPoint.connect( soundContext );
    soundContext.connect( audioContext.destination );
    updateAnalysers();
}

// PLAYERS

function createAudio(audio,id,source) {
    audio = document.createElement("audio");
    audio.id = id;
    audio.loop = true;
    audio.src = source;
    audio.type = "audio/wav";
    audio.volume = 1.0;
    return audio;
}

function initAudio() {
    canvas = document.getElementById("audioWave");
    analyserContext = canvas.getContext('2d');
    isHorizontal = !(window.innerWidth >= widthTh);
    onResize();
    updateWaves()
}

// SELECTOR

function restartSelectors() {
    speaker1.value = 0;
    speaker2.value = 0;
    speaker1file.value = 0;
    speaker2file.value = 0;
}

function blockSelector1(wantBlock) {
    if (wantBlock) {
        speaker1.classList.add("blocked");
        speaker1file.classList.add("blocked");
    } else {
        speaker1.classList.remove("blocked");
        speaker1file.classList.remove("blocked");
    }
}

function blockSelector2(wantBlock) {
    if (wantBlock) {
        speaker2.classList.add("blocked");
        speaker2file.classList.add("blocked");
    } else {
        speaker2.classList.remove("blocked");
        speaker2file.classList.remove("blocked");
    }
}

// INITIALIZATIONS

function isReadyToRun() {
    if(!netLoaded) return false;
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
    isActivePlay[0] = false;
    isActivePlay[1] = false;
    isRunning = false;
    modifyReadyToRun(false);
    runResult = "";
    restartSelectors();
    blockPlayer1(true);
    blockPlayer2(true);
    speaker1file.classList.add("blocked");
    speaker2file.classList.add("blocked");
    blockRestart(false);
    blockRun();
    modifyReadyToRun();
    restartAdvisers();
    restart.style.display = "none";
    underRun.style.justifyContent = "center";
    changeButtonSize();
    changeColors();
    actualAudio = audioNull;
}

function initConfigurationStart() {
    isActivePlay[0] = false;
    isActivePlay[1] = false;
    isRunning = false;
    modifyReadyToRun(false);
    runResult = "";
    restartSelectors();
    blockPlayer1(true);
    blockPlayer2(true);
    blockRestart(false);
    blockRun();
    modifyReadyToRun();
    restartAdvisers();
    speaker1file.classList.add("blocked");
    speaker2file.classList.add("blocked");
    fadeInTextAnimation();
    guideTitle.style.opacity = "1";
    restart.style.display = "none";
    underRun.style.justifyContent = "center";
    changeButtonSize();
    changeColors();
}

function onSelectChange(select) {
    console.log(select.value);
}

function initEvents() {
    play1.onclick = () => {
        if (!isActivePlay[1] && !isBlockedPlay[0]) {
            if (!isActivePlay[0]) {
                isActivePlay[0] = true;
                blockPlayer2();
                blockRestart(true);
                blockSelector1(true);
                play1.classList.add("active");
                blockRun();
                actualAudio = audioPlayer1;
                initAudio();
                actualAudio.obj.play();
            }
            else {
                isActivePlay[0] = false;
                blockPlayer2();
                blockRestart(false);
                blockSelector1(false);
                play1.classList.remove("active");
                blockRun();
                actualAudio.obj.pause();
            }
        }
    }

    play2.onclick = () => {
        if (!isActivePlay[0] && !isBlockedPlay[1]) {
            if (!isActivePlay[1]) {
                isActivePlay[1] = true;
                blockPlayer1();
                blockRestart(true);
                blockSelector2(true);
                play2.classList.add("active");
                blockRun();
                actualAudio = audioPlayer2;
                initAudio();
                actualAudio.obj.play();
            }
            else {
                isActivePlay[1] = false;
                blockPlayer1();
                blockRestart(false);
                blockSelector2(false);
                play2.classList.remove("active");
                blockRun();
                actualAudio.obj.pause();
            }
        }
    }

    run.onclick = () => {
        if (isReadyToRun() && !isRunning && !isActivePlay[0] && !isActivePlay[1]) {
            isRunning = true;
            blockRestart(true);
            blockPlayer1(true);
            blockPlayer2(true);
            blockSelector1(true);
            blockSelector2(true);
            changeGuideTitle();
            if (guideTitle.innerHTML != wantedMessage)
                fadeOutTextAnimation();
            run.classList.add("animated");
            let speakersString = speakerData[speaker1.value-1][speaker1file.value-1] + "\n" +
                speakerData[speaker2.value-1][speaker2file.value-1] + "\n"
            console.log(speakersString)
            program.stdin.write(speakersString);
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
            readyToRun[1] = false;
            createFile1List();
            speaker1file.value = 0;
            speaker1file.classList.remove("blocked");
            restartAdviser(0);
            blockPlayer1(true);
            runResult = "";
        }
        else {
            readyToRun[0] = false;
        }
        blockRun();
    };
    speaker1file.onchange = () => {
        if (speaker1file.value != 0) {
            readyToRun[1] = true;
            if (speaker1.value != 0) {
                highlightAdviser(0);
                blockPlayer1(false);
                let spk_file = speakerData[speaker1.value-1][speaker1file.value-1];
                spk_file = spk_file.substring(0, spk_file.length-2) + ".wav";
                audioPlayer1.obj = createAudio(audioPlayer1.obj,"audio1","./audio/" + spk_file);
                audioPlayer1.obj = speaker1.appendChild(audioPlayer1.obj);
                audioPlayer1.source = audioContext.createMediaElementSource(audioPlayer1.obj);
            }
        }
        else {
            readyToRun[1] = false;
        }
        blockRun();
    };
    speaker2.onchange = () => {
        if (speaker2.value != 0) {
            readyToRun[2] = true;
            readyToRun[3] = false;
            createFile2List();
            speaker2file.value = 0;
            speaker2file.classList.remove("blocked");
            restartAdviser(1);
            blockPlayer2(true);
            runResult = "";
        }
        else {
            readyToRun[2] = false;
        }
        blockRun();
    };
    speaker2file.onchange = () => {
        if (speaker2file.value != 0) {
            readyToRun[3] = true;
            if (speaker2.value != 0) {
                highlightAdviser(1);
                blockPlayer2(false);
                let spk_file = speakerData[speaker2.value-1][speaker2file.value-1];
                spk_file = spk_file.substring(0, spk_file.length-2) + ".wav";
                audioPlayer2.obj = createAudio(audioPlayer2.obj,"audio2","./audio/" + spk_file);
                audioPlayer2.obj = speaker2.appendChild(audioPlayer2.obj);
                audioPlayer2.source = audioContext.createMediaElementSource(audioPlayer2.obj);
            }
        }
        else {
            readyToRun[3] = false;
        }
        blockRun();
    };
}

function initProgram() {
    program.stdout.on("data", data => {
        console.log(data.toString())
        if(data == "ready") {
            wantedMessage = MESSAGES.ready;
            blockRun();
        }
        else if (data == 0) {
            runResult = MESSAGES.different;
        }
        else {
            runResult = MESSAGES.equal;
        }
        isRunning = false;
        blockRestart(false);
        blockPlayer1(false);
        blockPlayer2(false);
        blockSelector1(false);
        blockSelector2(false);
        run.classList.remove("animated");
        afterResultChanges();
    });

    program.stderr.on('data', (data) => {
        console.log(`program stderr: ${data}`);
    });
}

function init() {
    initProgram();
    createSpeakerList();
    initConfigurationStart();
    initEvents();
    audioNull.obj = createAudio(audioNull.obj,"audioNull","./audio/null.wav");
    audioNull.obj = run.appendChild(audioNull.obj);
    audioNull.source = audioContext.createMediaElementSource(audioNull.obj);
    actualAudio = audioNull;
    initAudio();
}

window.addEventListener('resize', onResize)
window.addEventListener('load', init);



