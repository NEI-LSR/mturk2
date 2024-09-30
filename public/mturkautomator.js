//Behavior automation

//reward calculated as a function of body weight, calibrated to maximum for 3000 trials
//reward doubles at the start of each new stage
//move to next stage once hit 75% for last 500 trials

//read parameters & current performance from last data file
//write a new parameter file
//continue with task html


// starttask - zero variables, dialog box, look for data file/update paramfile, otw load paramfile, load images
// updatetask - if above 75%, update paramfile, zero tracking variables, load paramfile, if needed load images


// TASK STRUCTURE
// (1) Touch
// (2) Match,var0
// (3) Distractors,var0
// (4) Delay,var0,500
// TASK DIFFICULTY
// (5) var1,400
// (6) var2,300
// (7) var3,200
// NEW OBJECTS
// (8) 4-way,200
// (9,10,11) 8-way x 3, 200
// (12) RDM: 24-way, 100
function updateTask(writestr) {

    var trainingstages = {
        rewardStage: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        hidetestdistractors: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        keepSampleON: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        imageFolderSample: [0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3],
        sampleON: [500, 500, 500, 500, 400, 300, 200, 200, 200, 200, 200, 100],
        objgroup: [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 24],

        fixationdur: [50, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
        fixationradius: [60, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        fixationmove: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        nway: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        imageFolderTest: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        sampleOFF: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
        sampleblocksize: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        nstickyresponse: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        current: -1,
        mintrials: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
        minpctcorrect: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
        reward: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        hireward: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        hirewardtrials: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 5],
        punish: [3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000],
    }

    if (env.species == "macaque") {
        var trials2reachminimum = 1500;
    } else if (env.species == "marmoset") {
        var trials2reachminimum = 500;
    } else {
        var trials2reachminimum = 1500;
    }


    //DETERMINE TASK STAGE
    //determine current object group
    trial.objgroup = 0;


    trainingstages.current = 1;
    if (writestr == "readtaskstageonly") {
        return trainingstages.current;
    }

    //COMPUTE PERFORMANCE
    var startingindex = -1;
    for (var i = 0; i < trialhistory.trainingstage.length; i++) {
        if (typeof(trialhistory.trainingstage[i]) == "undefined") {} else if (trialhistory.trainingstage[i] == trainingstages.current && startingindex == -1) {
            startingindex = i;
        } else if (trialhistory.trainingstage[i] != trainingstages.current) {
            startingindex = -1; //reset starting index, not a continuous block
        }
    }

    var ntrial = 0;
    var ncorrect = 0;
    var pctcorrect
    if (startingindex == -1) {
        pctcorrect = 0;
    } else {
        //take running average
        var ncompleted = trialhistory.correct.length - startingindex;
        if (ncompleted > trainingstages.mintrials[trainingstages.current]) {
            startingindex = trialhistory.correct.length - trainingstages.mintrials[trainingstages.current];
        }
        for (var i = startingindex; i <= trialhistory.correct.length - 1; i++) {
            if (trialhistory.correct[i] == 1) {
                ncorrect++;
            }
            ntrial++;
        }
        pctcorrect = 100 * ncorrect / ntrial;
    }


    //Determine if updating stage and/or reward
    var updatingstage = 0;
    var updatingreward = 0;

    if (pctcorrect >= trainingstages.minpctcorrect[trainingstages.current] && ntrial >= trainingstages.mintrials[trainingstages.current] && trainingstages.current < trainingstages.sampleON.length - 1) {
        updatingstage = 1;
        trainingstages.current++;
    }

    if (trainingstages.imageFolderSample[trainingstages.current] == 1) {
        console.log('var1')
    }

    var minreward = 1000 * env.weight * 20 / (trials2reachminimum);
    if (updatingstage == 1) {
        trial.rewardper1000 = minreward * trainingstages.hireward[trainingstages.current];
        updatingreward = 1;
    } else if (ntrial > trainingstages.hirewardtrials[trainingstages.current] && Math.round(trainingstages.reward[trainingstages.current] * minreward) != Math.round(trial.rewardper1000)) {
        trial.rewardper1000 = minreward * trainingstages.reward[trainingstages.current];
        updatingreward = 1;
    }

    if (updatingstage == 1 || updatingreward == 1) {
        trial.need2loadParameters = 1;
    } else {
        trial.need2loadParameters = 0;
        return
    }

    if (updatingstage == 0) {
        trial.need2loadImages = 0;
    } else if (updatingstage == 1) {
        if (trial.objgroup != trainingstages.objgroup[trainingstages.current] || trial.imageFolderSample != trainingstages.imageFolderSample[trainingstages.current]) {
            trial.objgroup = trainingstages.objgroup[trainingstages.current];
            trial.need2loadImages = 1;
        } else {
            trial.need2loadImages = 0;
        }
    }

    //update training stage
    trial.hidetestdistractors = trainingstages.hidetestdistractors[trainingstages.current];
    trial.keepSampleON = trainingstages.keepSampleON[trainingstages.current];
    trial.imageFolderSample = trainingstages.imageFolderSample[trainingstages.current];
    trial.sampleON = trainingstages.sampleON[trainingstages.current];
    trial.fixationdur = trainingstages.fixationdur[trainingstages.current];
    trial.fixationradius = trainingstages.fixationradius[trainingstages.current];
    trial.fixationmove = trainingstages.fixationmove[trainingstages.current];
    trial.nway = trainingstages.nway[trainingstages.current];
    trial.imageFolderTest = trainingstages.imageFolderTest[trainingstages.current];
    trial.sampleOFF = trainingstages.sampleOFF[trainingstages.current];
    trial.sampleblocksize = trainingstages.sampleblocksize[trainingstages.current];
    trial.nstickyresponse = trainingstages.nstickyresponse[trainingstages.current];

}