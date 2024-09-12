// STATES

// Promise: Select Subject
function subjidPromise() {
    var resolveFunc
    var errFunc
    p = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        errFunc = reject;
    }).then(function(resolveval) {
        console.log('User selected ' + resolveval)
    });

    function* waitforclickGenerator() {
        var imclicked = [-1];
        while (true) {
            imclicked = yield imclicked;
            resolveFunc(imclicked);
        }
    }

    waitforClick = waitforclickGenerator(); // start async function
    waitforClick.next(); //move out of default state
    return p;
}

function durlist_listener(event) {
   calibrationTime = durationlist[this.value];
    return
}

function rewlist_listener(event) {
   numCalibrations = numrewlist[this.value];
    return
}

function subjectlist_listener(event) {
    console.log("subject selected");
    trial.subjid = subjectlist[this.value];
    return
}

function tabletlist_listener(event) {
    console.log("tablet selected");
    trial.tabletid = tabletlist[this.value];
    return
}

function start_paradigm() {
    subjectdialog.close();
    waitforClick.next(1);
    return
}


// Promise: fixation
function fixationPromise() {
    var resolveFunc
    var errFunc
    p = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        errFunc = reject;
    }).then(function(resolveval) {
        console.log('User clicked ' + resolveval)
    });

    function* waitforclickGenerator() {
        var imclicked = [-1];
        while (true) {
            imclicked = yield imclicked;
            resolveFunc(imclicked);
        }
    }

    trial.waitingforFixation = 1;
    waitforClick = waitforclickGenerator(); // start async function
    waitforClick.next(); //move out of default state
    return p;
}


// Promise: response
function responsePromise() {
    var resolveFunc
    var errFunc
    p = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        errFunc = reject;
    }).then(function(resolveval) {
        console.log('User clicked ' + resolveval)
    });

    function* waitforclickGenerator() {
        var imclicked = [-1];
        while (true) {
            imclicked = yield imclicked;
            resolveFunc(imclicked);
        }
    }

    trial.waitingforResponse = 1;
    waitforClick = waitforclickGenerator(); // start async function
    waitforClick.next(); //move out of default state
    return p;
}



function getAudioParams(type, isMonkey, reward_dur) {

    var fq = 1;
    var dur = .1;
    var nrew = 1;
    var interv = 300;
    var typ = 'sine';
    var gn = juiceGain;
    var chan = 0;

    switch (type) {
        case 0: // punish
 	      	fq = isMonkey ? audioFrequencyMonkey : buzzerFrequencyHuman;
            dur = 8000;
            nrew = 1;
            interv = 0;
 	      	typ = isMonkey ? "sine" : "square";
 	      	gn = juiceGain;
 	      	chan = buzzerChan;
            break;
        case 1: // no reward
            // do nothing
            fq = 0;
            dur = 0;
            nrew = 0;
            interv = 0;
            typ = "sine";
            gn = 0;
            chan = rewardChan;
            break;
        case 2: // one reward beep
 	      	 fq = isMonkey ? audioFrequencyMonkey : rewardFrequencyHuman;
            dur = reward_dur;
            nrew = 1;
            interv = 0;
            typ = "sine";
            gn = juiceGain;
            chan = rewardChan;
            break;
        case 3: // two reward beeps
 	      	 fq = isMonkey ? audioFrequencyMonkey : rewardFrequencyHuman;
            dur = reward_dur;
            nrew = 2;
            interv = 300;
            typ = "sine";
            gn = juiceGain;
            chan = rewardChan;
            break;
    }

    return {
        freq: fq,
        durat: dur / 1000,
        count: nrew,
        interval: interv / 1000,
        type: typ,
        gain: gn,
        chan: chan,
    };
}


// Promise: dispense reward (through audio control)
function dispenseReward(rewardVal, isMonkey, reward_dur) {
    return new Promise(function(resolve, reject) {

        audiocontext.resume();

        // get the oscillator values for the reward type
        // require frequency, duration, count, inter, gain based on rewardVal
        //         freq: fq,
        //         durat: dur,  (s)
        //         count: nrew
        //         interval: interv
        //         type: typ
        //         gain: gn

        aparams = getAudioParams(rewardVal, isMonkey, reward_dur);

        console.log(aparams);

        gainNode.gain.value = aparams.gain;
        gainNode.gain.value = 0.0;
        var npulses = aparams.count;
        var totalDurat = npulses * (aparams.durat + aparams.interval);

        console.log("rewardVal" + rewardVal);

        var startTime = audiocontext.currentTime;

       switch (rewardVal) {

            case 0: // buzzer
                var osc = audiocontext.createOscillator();
                osc.type = aparams.type;
                osc.frequency.value = aparams.freq;
				osc.connect( merger, 0, aparams.chan);
                osc.connect(gainNode);
                osc.start(startTime);
                osc.stop(startTime + aparams.durat);

                break;
            case 1:
                // DO NOTHING
                break;
            case 2: // small reward
                var osc = audiocontext.createOscillator();
                osc.type = aparams.type;
                osc.frequency.value = aparams.freq;
				osc.connect( merger, 0, aparams.chan);
                osc.connect(gainNode);
                osc.start(startTime);
              osc.stop(startTime + aparams.durat);

                break;
            case 3: // big reward
                var osc1 = audiocontext.createOscillator();
                osc1.type = aparams.type;
                osc1.frequency.value = aparams.freq;
				osc1.connect( merger, 0, aparams.chan);
                osc1.connect(gainNode);
                osc1.start(startTime);
                osc1.stop(startTime + aparams.durat);

                startTime += aparams.durat;
                startTime += aparams.interval;

                var osc2 = audiocontext.createOscillator();
                osc2.type = aparams.type;
                osc2.frequency.value = aparams.freq;
 				osc2.connect( merger, 0, aparams.chan);
                osc2.connect(gainNode);
                osc2.start(startTime);
                osc2.stop(startTime + aparams.durat);

                break;
        }

        setTimeout(function() {
            console.log('sound done');
            resolve(1);
            audiocontext.suspend();
        }, 500 + totalDurat * 1000);
    }).then();
}

function calibratePump() {

	var interPumpInterval = 500;

	pumpOnTime = calibrationTime*1000;
	var cycleTime = pumpOnTime + interPumpInterval;
	var totalTime = numCalibrations * cycleTime;

    audiocontext.resume();

    pumpFunc = setInterval(pumpCycle, cycleTime);
	setTimeout(stopPumpCycle, totalTime);

}

function pumpCycle() {

	var pdelay = 0;  // in seconds

	console.log('pumpCycle');

	gainNode.gain.value = 0.0;
	primeosc = audiocontext.createOscillator();
	primeosc.type = 'sine'; //Square wave
	primeosc.frequency.value = audioFrequencyMonkey; //frequency in hertz
	primeosc.connect( merger, 0, rewardChan);
	primeosc.connect(gainNode); //Connect sound to output

	timenow = audiocontext.currentTime;
	primeosc.start(timenow + pdelay);
	primeosc.stop(timenow + pdelay + pumpOnTime/1000);

}

function stopPumpCycle() {
	clearInterval(pumpFunc);
}


function primePump() {
    var primeTime = 1;
    audiocontext.resume();

    var timenow = audiocontext.currentTime;

    var primeosc = audiocontext.createOscillator();
    primeosc.type = 'sine'; //Square wave
    primeosc.frequency.value = audioFrequencyMonkey; //frequency in hertz
    primeosc.connect(gainNode); //Connect sound to output
    gainNode.gain.value = 0.0;
	primeosc.connect( merger, 0, rewardChan);
    primeosc.start(timenow);
    console.log("Started");
    primeosc.stop(timenow + primeTime);

    setTimeout(function() {
        audiocontext.suspend();
        console.log("Suspended");
    }, 500 + primeTime * 1000);
}

function testBuzzer() {
    var buzzTime = 1;
    audiocontext.resume();

    var timenow = audiocontext.currentTime;

    var primeosc = audiocontext.createOscillator();
    primeosc.type = 'sine'; //Square wave
    primeosc.frequency.value = audioFrequencyMonkey; //frequency in hertz
    primeosc.connect(gainNode); //Connect sound to output
    gainNode.gain.value = 0.0;
	primeosc.connect( merger, 0, buzzerChan);
    primeosc.start(timenow);
    console.log("Started");
    primeosc.stop(timenow + buzzTime);

    setTimeout(function() {
        audiocontext.suspend();
        console.log("Suspended");
    }, 2000 + buzzTime * 1000);
}

// STATES (end)
