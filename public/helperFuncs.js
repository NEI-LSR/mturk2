//CALIBRATION

// multiple subjects (gui)
// closed-loop interaction (gui)
// training (algorithm)
// webcam or snapshots (in the future when it becomes available on chrome, use mediarecoder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
// package images for loading
// photosensor bar
// battery status & timer
// subject list
// vitals: task time, total trials, %correct, estimated juice, battery life

// stage 1: touch fixation dot
// stage 2: flash sample, touch 1-way test
// stage 3: flash sample, touch 1-way test with distractor
// stage 4: add more distractors

// Versions
// 0 - touch screen, get juice
// 1 - flashing touch dot in center, touch, get juice
// 2 - touch white dot, dot disappear, color shows up, 1 color shape, touch same, reward
// 3 - touch white dot, dot disappear, color shows up, 2 color shape (1 same, 1 diff), touch same, reward
// 4 - touch white dot, dot disappear, color shows up, 2 shape (1 same, 1 diff), touch same, reward
// 5 - touch white dot, dot disappear, shape shows up, 2 color (1 same, 1 diff), touch same, reward
// 6 -
function updateHeadsUpDisplay() {
    var textobj = document.getElementById("headsuptext");

    // Overall performance
    var ncorrect = 0;
    for (var i = 0; i <= trial.correctItem.length - 1; i++) {
        if (trial.correctItem[i] == trial.response[i]) {
            ncorrect++;
        }
    }
    var pctcorrect = Math.round(100 * ncorrect / trial.response.length);

    // Task type
    var task1 = "";
    var task2 = "";
    task1 = "Match to Sample var" + trial.imageFolderSample;
    task2 = trial.sampleON + "ms, " + trial.nway + "-way, " + trial.objectlist.length + "-obj";


    textobj.innerHTML = trial.subjid + ": <font color=green><b>" + pctcorrect + "%</b></font> " + "(" + ncorrect + " of " + trial.response.length + ")" + "<br>" + "Estimated Reward: <font color=green><b>" + Math.round(trial.rewardper1000 * ncorrect / 1000) + "mL</b></font> (" + Math.round(trial.rewardper1000) + " per 1000)" + "<br> " + "<br>" + " Stage " + trial.currentstage + ": " + task1 + "<br>" + task2;
}


// HELPER FUNCTIONS

//Define spawn function to make generator work with Promises (from: https://gist.github.com/jakearchibald/31b89cba627924972ad6)
function spawn(generatorFunc) {
    function continuer(verb, arg) {
        var result;
        try {
            result = generator[verb](arg);
        } catch (err) {
            return Promise.reject(err);
        }
        if (result.done) {
            return result.value;
        } else {
            return Promise.resolve(result.value).then(onFulfilled, onRejected);
        }
    }
    var generator = generatorFunc();
    var onFulfilled = continuer.bind(continuer, "next");
    var onRejected = continuer.bind(continuer, "throw");
    return onFulfilled();
}

/* Randomize array element order in-place.  Using Fisher-Yates shuffle algorithm. http://bost.ocks.org/mike/shuffle/ */
// To test your shuffling algorithm: go to http://bost.ocks.org/mike/shuffle/compare.html
function delCell(array, cell) {
    var arrayLength = array.length;
    if (cell == 0) {
        array = array.slice(cell + 1, arrayLength);
    } else if (cell == arrayLength) {
        array = array.slice(0, cell);
    } else {
        var array1 = array.slice(0, cell);
        array = array1.concat(array.slice(cell + 1, arrayLength));
    }

    return array
}


function shuffleArray(array) {
    // Expand to index vector if needed
    if (array.length == 1) {
        var len = array[0];
        for (var i = 0; i <= len - 1; i++) {
            array[i] = i;
        }
    }

    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}


function getTest(nway) {

    var shapes = [0, 0, 0, 0];
    var colors = [0, 0, 0, 0];
    var rewards = [0, 0, 0, 0];
    var luminances = [0, 0, 0, 0];
    var idx;

    /////  Choose the shapes and colors here

    //
    for (var i = 0; i < nway; i++) {
        sidx = getRandomStimulusIndex();
        lidx = getRandomLuminanceIndex();
        shapes[i] = getShapeFromIndex(sidx);
        colors[i] = getColorFromIndex(sidx);
        rewards[i] = getRewardFromIndex(sidx);
        luminances[i] = getLuminanceFromIndex(lidx);
        console.log("Got luminance " + luminances[i] + " from index " + lidx + " at " + i);
    }

    return {
        rewardArray: rewards,
        testArray: shapes,
        testColor: colors,
        testLums: luminances
    };
}

function getRandomStimulusIndex() {
    var i;
    var randVal = Math.random();
    var spaceSize = frequencySpace.length;
    var total = frequencySpace[0];

    for (i = 1; i < spaceSize; i++) {
        if (randVal < total) {
            break;
        } else {
            total += frequencySpace[i];
        }
    }
    return i - 1;
}

 function getRandomLuminanceIndex() {
	var val = 0;
	var randVal = 0;
	var spaceSize = lumContrast.length;

	while (val==0 | val==spaceSize) {
		randVal = Math.random();
		for (val = 0; val < spaceSize; val++) {
			if (randVal < lumContrast[val]) {
				break;
			}
		}
	}
	return val-1;
}

function getColorFromIndex(idx) {
    return idx % nColors;
}

function getShapeFromIndex(idx) {
    return Math.floor(idx / nShapes);
}

function getRewardFromIndex(idx) {
    return rewardSpace[idx];
}

function getLuminanceFromIndex(idx) {
    return idx;
}


// convert base64 to buffer array (from: http://stackoverflow.com.80bola.com/questions/27524283/save-image-to-dropbox-with-data-from-canvas?rq=1)

function _base64ToArrayBuffer(base64) {
    base64 = base64.split('data:image/png;base64,').join('');
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    var i;
    for (i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}


function getImageList(images, foldernum) {
    images.serial = [];
    images.obj = [];
    images.packpointer = [];
    images.packserial = [];
    images.packpos = [];
    images.pixLR = [];

    var potentialImages = {
        serial: [],
        obj: [],
    }

    var imagesPack = {
        packserial: [],
    }

    var perobj = 1;

    perobj = trial.perobj * trial.packsz; //100;


    var cnt = 0;
    for (var j = 0; j <= perobj - 1; j++) {
        potentialImages.serial[cnt] = trial.objectlist[0] * perobj + j;
        potentialImages.obj[cnt] = trial.objectlist[0];
        cnt = cnt + 1;
    }

    // Get images
    var cnt = 0;
    for (var q = 0; q <= potentialImages.serial.length - 1; q++) {
        images.serial[cnt] = potentialImages.serial[q];
        images.packserial[cnt] = trial.packsz * Math.floor(potentialImages.serial[q] / trial.packsz);
        images.packpos[cnt] = potentialImages.serial[q] - images.packserial[cnt];
        images.obj[cnt] = potentialImages.obj[q];
        cnt = cnt + 1;
    }

    // Get packs, assign images to packs
    var isnewpack = 1;
    var packcnt = 0;
    for (var q = 0; q <= images.serial.length - 1; q++) {
        isnewpack = 1;
        for (var q2 = 0; q2 <= imagesPack.packserial.length - 1; q2++) {
            if (images.packserial[q] == imagesPack.packserial[q2]) {
                isnewpack = 0;
            }
        }

        if (isnewpack == 1) {
            imagesPack.packserial[packcnt] = images.packserial[q];
            for (var q2 = 0; q2 <= images.serial.length - 1; q2++) {
                if (images.packserial[q2] == images.packserial[q]) {
                    images.packpointer[q2] = packcnt;
                }
            }
            packcnt = packcnt + 1;
        }
    }
    return {
        images: images,
        imagesPack: imagesPack
    };
}


function printObject(o) {
    var out = '';
    for (var p in o) {
        out += p + ': ' + o[p] + '\n';
    }
    alert(out);
}

// HELPER FUNCTIONS (end)
