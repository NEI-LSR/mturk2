// VARIABLES begin
// Variables (general)
document.body.style.backgroundColor = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";

// list the subjects to be selected
var subjectlist = [
	"Human_1",
	"__________________",
    "Yuri_321_Training",
    "Tina_183_Training",
    "Sally_344_Training",
    "Buzz_319_Training",
	"__________________",
    "Monkey_Test",
];

// high and low HSV color threshold values for each subject's mask
var lowhumanHSV = [0/2, 0.3*255, 0, 0]
var highhumanHSV = [20/2, 255, 255, 0]

// list the tablets to be selected
var tabletlist = [
	"Other",
	"__________________",
	"Voyager_midgray",
	"Sputnik_midgray",
	"Discovery_midgray",
	"Curiosity_midgray",
	"Apollo_midgray",
	"__________________",
	// "__________________",
	// "Voyager",
	// "Sputnik",
	// "Discovery",
	// "Curiosity",
	// "Apollo",
	// "__________________",
    // "Tablet_4",
    // "Tablet_3",
    // "Tablet_2",
    // "Tablet_1",
];

var durationlist = [
	"0.05",
	"0.1",
	"0.3",
	"0.5",
	"0.75",
	"1.0",
];

var numrewlist = [
	"10",
	"20",
	"50",
	"75",
	"100",
	"150",
	"200",
];

// allow different reward duration depending on subject (added 9/5/21)
var monkey_reward_dur = {
	'Sally_344_Training': 50,
	'Yuri_321_Training': 50,
	'Tina_183_Training': 50,
	'Buzz_319_Training': 50,
	'Monkey_Test':300,
	"Human_1": 300,
}

var inter_trial_timeout = 500 //ms, default trial spacing (added 9/15/21)

var max_trial = 2500 // max number of trials allowed (added 9/15/21)

var durlistobj = document.getElementById("pumpdur_list");
var rewlistobj = document.getElementById("numrew_list");
var calibratebutton = document.getElementById("calibrate_button");
var subjectdialog = document.getElementById("start_dialog");
var subjectlistobj = document.getElementById("subjid_list");
var tabletlistobj = document.getElementById("tabletid_list");
var primepumpbutton = document.getElementById("pump_button");
var buzzerbutton = document.getElementById("buzzer_button");
var startbutton = document.getElementById("start_button");

calibratebutton.onclick = function() {
    calibratePump();
};

primepumpbutton.onclick = function() {
    primePump();
};

buzzerbutton.onclick = function() {
    testBuzzer();
};

startbutton.onclick = function() {
    start_paradigm();
};

//populate lists
for (var q = durationlist.length - 1; q >= 0; q--) {
    // add menu option
    var opt = document.createElement('option');
    opt.value = q;
    opt.innerHTML = durationlist[q];
    durlistobj.appendChild(opt);
}
durlistobj.addEventListener("change", durlist_listener, false);

for (var q = numrewlist.length - 1; q >= 0; q--) {
    // add menu option
    var opt = document.createElement('option');
    opt.value = q;
    opt.innerHTML = numrewlist[q];
    rewlistobj.appendChild(opt);
}
rewlistobj.addEventListener("change", rewlist_listener, false);

for (var q = subjectlist.length - 1; q >= 0; q--) {
    // add menu option
    var opt = document.createElement('option');
    opt.value = q;
    opt.innerHTML = subjectlist[q];
    subjectlistobj.appendChild(opt);
}
subjectlistobj.addEventListener("change", subjectlist_listener, false);

for (var q = tabletlist.length - 1; q >= 0; q--) {
    // add menu option
    var opt = document.createElement('option');
    opt.value = q;
    opt.innerHTML = tabletlist[q];
    tabletlistobj.appendChild(opt);
}
tabletlistobj.addEventListener("change", tabletlist_listener, false);

var subjectIsMonkey = 1;

var tabletParamfile = {
    dir: "/parameterfiles/",
    name: null,
    data: null,
    ver: null,
    date: null,
    datahasChanged: false,
    filehasChanged: false,
}
var subjectParamfile = {
    dir: "/parameterfiles/",
    name: null,
    data: null,
    ver: null,
    date: null,
    datahasChanged: false,
    filehasChanged: false,
}
var canvas = {
    blank: 0,
    sample: 1,
    test: 2,
    fix: 3,
    reward: 4,
    photoreward: 5,
    punish: 6,
    front: 0,
    sequencepre: [0, 3],
    tsequencepre: [0, 100],
    sequence: [0, 1, 0, 2], //0=gray 1=sample 2=test 3=fix 4=reward 5=punish
    tsequence: [0, 100, 200, 300], //timing between frames
    sequenceSkipSample: [0, 2, 0], //0=gray 1=sample 2=test 3=fix 4=reward 5=punish
    tsequenceSkipSample: [0, 100, 200], //timing between frames
    sequencepost: [0, 4, 4, 0],
    tsequencepost: [0, 100, 200, 300],
    headsupfraction: 1 / 3,
    offsetleft: 0,
    offsettop: 0,
};
var imagesSample = {
    folder: "/images/imagepacks/imp",
    //packsz: 8,
    serial: [],
    obj: [],
    packpointer: [],
    packserial: [],
    packpos: [],
    pixLR: [],
}; //filenames will be placed in images[idx].src
var imagesTest = {
    folder: "/images/imagepacks/imp",
    //packsz: 8,
    serial: [],
    obj: [],
    packpointer: [],
    packserial: [],
    packpos: [],
    pixLR: [],
}; //filenames will be placed in imagesProto[idx].src
var imagesSamplePack;
var imagesTestPack;
var fixImageFromDropbox;
var frame = {
    current: 0,
    shown: [],
}
var boundingBoxFixation = []; //where the fixation dot is on the canvas
var boundingBoxesTest; //where the test images are on the canvas
var waitforClick; //variable to hold generator
var fixationTimer; //variable to hold timer
var xgrid = [];
var ygrid = [];
var xgridcent = [];
var ygridcent = [];
var curridx = null;
var battery = {
    current: 0,
    ldt: [],
}
var datafiles = [];
var ndatafiles2read = 5;

// Variables (updatable through parameter file)
var env = {};
var trial = {
    subjid: "Test",
    datadir: "/MonkData/",
};
var trialhistory = {
    trainingstage: [],
    correct: [],
    current: 0,
}
// VARIABLES end

// Screen, Video, & Audio initialization begin
// Prevent window scrolling and bounce back effect - commented out because just returning error
document.body.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, false);

//Audio pulses for reward
var audiocontext = new(window.AudioContext || window.webkitAudioContext)();
var merger = audiocontext.createChannelMerger(2);
merger.connect(audiocontext.destination);
var gainNode = audiocontext.createGain();
gainNode.connect(audiocontext.destination);

var devicePixelRatio = window.devicePixelRatio || 1;
var visiblecanvasobj = document.getElementById("canvas" + canvas.front);
var visiblecontext = visiblecanvasobj.getContext("2d");
var backingStoreRatio = visiblecontext.webkitBackingStorePixelRatio ||
    visiblecontext.mozBackingStorePixelRatio ||
    visiblecontext.msBackingStorePixelRatio ||
    visiblecontext.oBackingStorePixelRatio ||
    visiblecontext.backingStorePixelRatio || 1;
var canvasScale = devicePixelRatio / backingStoreRatio;

//Start video stream

navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

//Monitor Battery - from: http://www.w3.org/TR/battery-status/

try{
navigator.getBattery().then(function(batteryobj) {
    battery.ldt[battery.current] = [batteryobj.level, batteryobj.dischargingTime, Math.round(performance.now())];
    battery.current++;

    batteryobj.addEventListener('levelchange', function() {
        battery.ldt[battery.current] = [batteryobj.level, batteryobj.dischargingTime, Math.round(performance.now())];
        battery.current++;
    })
});
} catch (error) {
    console.error('Error accessing battery information', error);
} // catch added on 9/16/24 to see if it would prevent the grey screen when you first access webpage after a while

// Screen, Video, & Audio initialization end

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

//Generator DMS task
spawn(function*() {

    // GET PARAMFILE NAME
    subjectdialog.showModal();
    yield subjidPromise();

    if (datafiles.length < ndatafiles2read) {
        ndatafiles2read = datafiles.length;
    }
    for (i = 0; i <= ndatafiles2read - 1; i++) {
        yield readPerformanceHistoryfromDropbox(i);
    }

    tabletParamfile.name = tabletParamfile.dir + trial.tabletid + "_params.txt";
    subjectParamfile.name = subjectParamfile.dir + trial.subjid + "_params.txt";
    trial.need2loadParameters = 1;
    trial.need2loadImages = 1;


    for (trial.current = 0; trial.current < max_trial; trial.current++) {

        if (trial.need2loadParameters == 1) {

            yield parseParameterFilefromDropbox(tabletParamfile.name)
            tabletParams = parameters[0]

            yield parseParameterFilefromDropbox(subjectParamfile.name)
            subjectParams = parameters[0]

            console.log(tabletParams.red);
            colorRed = tabletParams.red;
            colorGreen = tabletParams.green;
            colorBlue = tabletParams.blue;
            grayPoint = tabletParams.grey;
            lumContrast = tabletParams.lumContrast;
            tabletName = tabletParams.calibname;
            trial.ImageFolderSample = tabletParams.imageFolderIndex;
            trial.ImageFolderTest = tabletParams.imageFolderIndex;

            frequencySpace = subjectParams.frequencySpace;
            rewardSpace = subjectParams.rewardSpace;

            for (var k in tabletParams) {
                if (tabletParams.hasOwnProperty(k)) {
                    trial[k] = tabletParams[k];
                }
            }

            for (var k in subjectParams) {
                if (subjectParams.hasOwnProperty(k)) {
                    trial[k] = subjectParams[k];
                }
            }

            env["weight"] = trial.Weight;
            env["species"] = trial.Species;
            env["homecage"] = trial.Homecage;
            env["separated"] = trial.Separated;
            env["liquid"] = trial.Liquid;
            env["tablet"] = trial.Tablet;
            env["pump"] = trial.Pump;

            subjectIsMonkey = (trial.Species).toLowerCase() == "macaque";

            console.log("isMonkey");
            console.log(subjectIsMonkey);

            trial.objectlist = trial.TestedObjects;
            trial.nway = trial.Nway;
            trial.samplegrid = trial.SampleGridIndex;
            trial.testgrid = trial.TestGridIndex;
            trial.rewardper1000 = trial.RewardPer1000Trials;
            trial.extrarewardmult = trial.ExtraRewardMult;
            trial.punish = trial.PunishTimeOut;
            trial.fixationdur = trial.FixationDuration;
            trial.fixationradius = trial.FixationRadius;
            trial.fixationmove = trial.FixationMove;
            trial.sampleON = trial.SampleON;
            trial.sampleOFF = trial.SampleOFF;
            trial.keepSampleON = trial.KeepSampleON;
            trial.hidetestdistractors = trial.HideTestDistractors;
            trial.sampleblocksize = trial.SampleBlockSize;
            trial.nstickyresponse = trial.NStickyResponse;
            trial.taskVersion = trial.TaskVersion;
            trial.packsz = trial.packsz;
            trial.perobj = trial.perobj;
            trial.counter = trial.counter;
            trial.tabletParams = tabletParams.name;
            trial.subjectarams = subjectParams.name;
            trial.objectlist = trial.TestedObjects;
            trial.testgrid = trial.TestGridIndex;
            trial.samplegrid = trial.SampleGridIndex;

            canvas.tsequence = [0, 100, 100 + trial.sampleON, 100 + trial.sampleON + trial.sampleOFF]; //timing between frames

            imagesSample.folder = "/images/imagepacks" + trial.ImageFolderSample + "/imp";
            imagesTest.folder = "/images/imagepacks" + trial.ImageFolderTest + "/imp";

            canvas.headsupfraction = 0;
            setupCanvasHeadsUp()
            windowWidth = window.innerWidth; // get true window dimensions at last moment
            windowHeight = window.innerHeight;

            for (i = 0; i <= canvas.punish; i++) {
                setupCanvas(i);
            }
            if (devicePixelRatio !== 1) {
                scaleCanvasforHiDPI(canvas.sample);
                scaleCanvasforHiDPI(canvas.test);
            }

            //reset trial tracking variables
            var d = new Date;
            var datestr = d.getFullYear().toString() + '-' + ("00" + (d.getMonth() + 1).toString()).slice(-2) + '-' + ("00" + d.getDate().toString()).slice(-2) + '_' + ("00" + d.getHours().toString()).slice(-2) + '-' + ("00" + d.getMinutes().toString()).slice(-2) + '-' + ("00" + d.getSeconds().toString()).slice(-2);
            trial.filename = datestr + "_" + trial.subjid + "_" + trial.tabletid + ".txt";
            trial.current = 0;
            trial.fixationgrid = [];
            trial.routineIdx = [];
            trial.sample = [];
            trial.sampleC = [];
            trial.test = [];
            trial.testC = [];
            trial.testLum = [];
            trial.sampleserial = [];
            trial.sampleserialC = [];
            trial.testserial = [];
            trial.testserialC = [];
            trial.tstart = []
            trial.xytfixation = [];
            trial.xytresponse = [];
            trial.response = [];
            trial.correctItem = [];
            trial.sampleblockidx = 0;
            trial.stickyresponse = 0;
            trial.rewardStage = [];

            trial.need2loadParameters = 0;

            renderReward();
            renderPhotoReward();
            renderPunish();
            renderBlank();

        } // done loading parameters if have to

        if (trial.need2loadImages == 1) {
            // SELECT IMAGES
            funcreturn = getImageList(imagesSample, trial.ImageFolderSample);
            imagesSample = funcreturn.images;
            imagesSamplePack = funcreturn.imagesPack;
            funcreturn = getImageList(imagesTest, trial.ImageFolderTest);
            imagesTest = funcreturn.images;
            imagesTestPack = funcreturn.imagesPack;
            // SELECT IMAGES (end)

            trial.narrowWeights = [];
            trial.broadWeights = [];
            // LOAD IMAGES
            imageSamplepromises = imagesSamplePack.packserial.map(loadSampleImagefromDropbox); //create array of image load Promises
            yield Promise.all(imageSamplepromises); //simultaneously evaluate array of image load promises

            imageTestpromises = imagesTestPack.packserial.map(loadTestImagefromDropbox); //create array of image load Promises
            yield Promise.all(imageTestpromises); //simultaneously evaluate array of image load promises

            // pixel locations of image within pack - individual images must be square
            imagesSample.wd = imagesSamplePack[0].height;
            imagesSample.ht = imagesSamplePack[0].height;

            imagesTest.wd = imagesTestPack[0].height;
            imagesTest.ht = imagesTestPack[0].height;

            for (i = 0; i <= imagesTest.serial.length - 1; i++) {
                imagesTest.pixLR[i] = [imagesTest.packpos[i] * imagesTest.wd, (imagesTest.packpos[i] + 1) * imagesTest.wd - 1];
            }
            // LOAD IMAGES (end)

            // MAKE THE IMAGE DISPLAY GRID (3x3)
            var cnt = 0;
            for (var i = 1; i <= 3; i++) {
                for (var j = 1; j <= 3; j++) {
                    xgrid[cnt] = i - 1 / 2;
                    ygrid[cnt] = j - 1 / 2;
                    cnt++;
                }
            }

            //center x & y grid within canvas
            var dx = (document.body.clientWidth - canvas.offsetleft) * devicePixelRatio / 2 / canvasScale - xgrid[4] * imagesSample.wd / canvasScale;
            var dy = (document.body.clientHeight - canvas.offsettop) * devicePixelRatio / 2 / canvasScale - ygrid[4] * imagesSample.ht / canvasScale;
            for (var i = 0; i <= xgrid.length - 1; i++) {
                xgridcent[i] = xgrid[i] * imagesSample.wd / canvasScale + dx;
                ygridcent[i] = ygrid[i] * imagesSample.ht / canvasScale + dy;
            }
            // MAKE THE IMAGE DISPLAY GRID (end)
            // renderBlank();
            renderReward();
            renderPhotoReward();
            renderPunish();
            renderBlank();
            trial.need2loadImages = 0;
        } // done loading images if need to

// 		console.log(trial);

        trial.fixationgrid[trial.current] = 4; // center

        // get indices of shapes and colors, and get rewards
        funcreturn = getTest(trial.nway);

        trial.test[trial.current] = funcreturn.testArray;
        trial.testC[trial.current] = funcreturn.testColor;
        trial.testLum[trial.current] = funcreturn.testLums;

        //trial.correctItem[trial.current]=-2;//=funcreturn.correctItem;

        //GET IMAGE SERIALS
        trial.sampleserial[trial.current] = imagesSample.serial[trial.sample[trial.current]];
        var testserial = [];
        for (var q in trial.test[trial.current]) {
            testserial[q] = imagesTest.serial[trial.test[trial.current][q]];
        }
        trial.testserial[trial.current] = testserial;
        // CHOOSE FIXATION, SAMPLE, TEST (end)
        //FIXATION
        trial.stage = 0;

        //buffer fixation, sample & test
        sleep(inter_trial_timeout);
				renderFixation();
        bufferTrialImages();

        //fixation
        trial.tstart[trial.current] = Math.round(performance.now());
        frame.shown = [];
        for (var q in canvas.sequencepre) {
            frame.shown[q] = 0
        };
        frame.current = 0;
        yield displayTrial(canvas.sequencepre, canvas.tsequencepre);
        audiocontext.suspend();
        yield fixationPromise();
        trial.waitingforFixation = 0;

        trial.stage = 1;
        // sample & test

        frame.shown = [];
        for (var q in canvas.sequence) {
            frame.shown[q] = 0
        };
        frame.current = 0;
        yield displayTrial(canvas.sequence, canvas.tsequence); //}
        audiocontext.suspend();
        yield responsePromise();
        trial.waitingforResponse = 0;

        if (typeof trial.counter !== 'undefined' && trial.counter == 1) {
            document.getElementById("trialcounter").style = "z-index:100; height: 30px;";
            document.getElementById("trialcounter").innerHTML = "Trial " + trial.current;
        }

        batterySnapshot(trial.current, trial.stage);

        trial.stage = 2;

        frame.shown = [];
        for (var q in canvas.sequencepost) {
            frame.shown[q] = 0
        };
        frame.current = 0;

        trial.reward = funcreturn.rewardArray[trial.response[trial.current]];
        trial.rewardStage[trial.current] = funcreturn.rewardArray;

        yield displayTrial(canvas.sequencepost, canvas.tsequencepost);

        yield dispenseReward(trial.reward, subjectIsMonkey, monkey_reward_dur[trial.subjid]);
        //update the running trial history
        if (trial.current == 0) {
            funcreturn = updateTask("readtaskstageonly");
            trialhistory.trainingstage[trialhistory.current] = funcreturn;
            trial["currentstage"] = trialhistory.trainingstage[trialhistory.current];
        }
        if (trial.response[trial.current] == trial.correctItem[trial.current]) {
            trialhistory.correct[trialhistory.current] = 1;
        } else {
            trialhistory.correct[trialhistory.current] = 0;
        }
        trialhistory.current++;

        //save data
        writeDatatoDropbox(); //async - no need to wait for data to write
        updateHeadsUpDisplay(); // async

        // Check if need to update task
        updateTask("writeifneeded");
        if (trial.need2loadParameters == 1) {
            yield writeParameterstoDropbox();
        }
    }
}) //spawn
