const fs = require("fs");
const toBuffer = require("blob-to-buffer")

function saveBlob(blob) {
    toBuffer(blob, (err,buffer) => {
        if(err) throw err;

        fs.writeFile('audio/audio.wav',buffer, e => {
            if (e) throw e;
            console.log('wav saved')
        });

    });
}

function gotStream(stream) {
    var chunks = [];
    var record = document.getElementById("record");
    var stop = document.getElementById("stop");
    var mediaRecorder = new MediaRecorder(stream);

    record.onclick = function () {
        mediaRecorder.start();
        console.log(mediaRecorder.state);
        console.log("recorder started");
        record.style.background = "red";
        record.style.color = "black";
    }

    stop.onclick = function() {
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        console.log("recorder stopped");
        record.style.background = "";
        record.style.color = "";
    }

    mediaRecorder.onstop = function(e) {
        var audio = document.createElement('audio');
        var blob = new Blob(chunks, { 'type' : 'audio/wav' });
        chunks = [];
        var audioURL = URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped");

        saveBlob(blob);

        // const downloadEl = document.createElement('a');
        // downloadEl.style = 'display: block';
        // downloadEl.innerHTML = 'download';
        // downloadEl.download = 'audio.webm';
        // downloadEl.href = audioURL;
        // const audioEl = document.createElement('audio');
        // audioEl.controls = true;
        // const sourceEl = document.createElement('source');
        // sourceEl.src = audioURL;
        // sourceEl.type = 'audio/webm';
        // audioEl.appendChild(sourceEl);
        // document.getElementById("main").appendChild(audioEl);
        // document.getElementById("main").appendChild(downloadEl);
    }

    mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
    }
}

function initMedia() {
    if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

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

function onRecord() {

}


window.addEventListener("load", initMedia);


