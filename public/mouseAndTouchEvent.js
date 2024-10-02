// MOUSE & TOUCH EVENTS
// let mousedown_active = false;
// let taking_image = false;
// let lastRunTime = 0;

function mousedown_listener(event) {
    console.log("mousedown_listener")
    // const currentTime = Date.now();
    // const timeElapsed = currentTime - lastRunTime;
    // if (!mousedown_active){
    // if (timeElapsed >= 2000) { // check to see if more than 2 seconds has elapsed
    //     lastRunTime = currentTime;
        // mousedown_active = true;
        // console.log('mousedown_active = true')
        if (typeof event === 'undefined') {
            console.log('no click, loading images, initializing response promise');
            return
        };

        var x = event.clientX
        var y = event.clientY 

        if (trial.waitingforFixation == 1 || automatic_progress == true) {
            console.log('Fixation dot - computer');
            // Move taking_image outside the function to maintain its state
            function fixation_dot() {
                if ((x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] && 
                    y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) || automatic_progress == true) { // Check if subject clicked in fixation box
                        take_image('Fixation dot').then(subjFound => {
                            console.log('subjFound:', subjFound);
                            if (subjFound) { // If the subject has been found, proceed with task
                                console.log('Subject present in the image.');
                                trial.brokeFixation = 0;
                                trial.xytfixation[trial.current] = [x, y, Math.round(performance.now())];
                                // Start timer
                                // fixationTimer = setTimeout(function() {
                                    waitforClick.next(1);
                                    console.log("waitforClick.next(1)");
                                // }, trial.fixationdur);
                                console.log("trial.fixationdur", trial.fixationdur)
                            } else {
                                console.log('No human is present in the image.');
                            }
                        });
                }
            }
            fixation_dot();
        }
        

        if (trial.waitingforResponse == 1 || automatic_progress == true) {
            console.log('Test box - computer')
            //determine if clicked in test box
            take_image('test box') // take image and label it test box - for now just collecting data

            if (trial.taskVersion == 0) {
                boundingBoxesTest.x[0] = [0, document.body.clientWidth];
                boundingBoxesTest.y[0] = [0, document.body.clientHeight];
                // mousedown_active = false;

            }
            for (var q = 0; q <= boundingBoxesTest.x.length - 1; q++) {
                if (x >= boundingBoxesTest.x[q][0] && x <= boundingBoxesTest.x[q][1] &&
                    y >= boundingBoxesTest.y[q][0] && y <= boundingBoxesTest.y[q][1]) {
                    trial.response[trial.current] = q;
                    trial.xytresponse[trial.current] = [x, y, Math.round(performance.now())];
                    waitforClick.next(q);
                    // mousedown_active = false;
                    return
                }
            }
        }
}

function mousemove_listener(event) {
    // console.log('mousemove_listener')
    if (trial.waitingforFixation == 1 && trial.brokeFixation == 0) {
        var x = event.clientX
        var y = event.clientY

        if (x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] &&
            y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) {
            //holding fixation
        } else {
            // moved from fixation dot, cancel fixation timers
            trial.brokeFixation = 1;
            clearTimeout(fixationTimer);
        }
    }
}

function mouseup_listener(event) {
    // console.log('mouseup listener')
    if (trial.waitingforFixation == 1 && trial.brokeFixation == 0) {
        // broke touch with fixation dot too early, cancel fixation timers
        trial.brokeFixation = 1;
        clearTimeout(fixationTimer);
    }
}

function touchstart_listener(event) {
    console.log('touchstart listener')

        event.preventDefault(); //prevents additional downstream call of click listener
        if (typeof event === 'undefined') {
            console.log('no click, loading images, initializing responsepromise');
            return
        };

        var x = event.targetTouches[0].pageX;
        var y = event.targetTouches[0].pageY;

        if (trial.waitingforFixation == 1) {
            //determine if clicked on fixation dot - where tablet fixation clicks register
            console.log('fixation dot - tablet')
            if (x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] &&
                y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) {  // verify that clock is within fixation box before taking picture
                    take_image('Clicked on fixation dot').then(subjFound => { // take image and label it fixation dot
                        console.log('subjFound:', subjFound);
                        if (subjFound) { // if the subject is found, progress to the options
                                trial.brokeFixation = 0;
                                trial.xytfixation[trial.current] = [x, y, Math.round(performance.now())];
                                //Start timer
                                // fixationTimer = setTimeout(function() {
                                    waitforClick.next(1)
                                // }, 0); // modified from trial.fixationdur
                            } //if clicked fixation
                    })
            }
        }

        if (trial.waitingforResponse == 1) {
            //determine if clicked in test box
            console.log('clicked on test box screen - tablet')
            // take_image('clicked on test box')
            if (trial.taskVersion == 0) {
                boundingBoxesTest.x[0] = [0, document.body.clientWidth];
                boundingBoxesTest.y[0] = [0, document.body.clientHeight];
            }
            for (var q = 0; q <= boundingBoxesTest.x.length - 1; q++) {
                if (x >= boundingBoxesTest.x[q][0] && x <= boundingBoxesTest.x[q][1] &&
                    y >= boundingBoxesTest.y[q][0] && y <= boundingBoxesTest.y[q][1]) {
                    take_image('clicked on test box') // moved to be after verifying the click is within bounding box 
                    trial.response[trial.current] = q;
                    trial.xytresponse[trial.current] = [x, y, Math.round(performance.now())];
                    waitforClick.next(q);
                    return
                }
            }
        }
}

function touchmove_listener(event) {
    console.log('touchmove listener')
    if (trial.waitingforFixation == 1 && trial.brokeFixation == 0) {
        var x = event.targetTouches[0].pageX;
        var y = event.targetTouches[0].pageY;

        if (x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] &&
            y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) {
            //holding fixation
            console.log('holding fixation')
        } else {
            // moved from fixation dot, cancel fixation timers
            trial.brokeFixation = 1;
            clearTimeout(fixationTimer);
        }
    } else if (trial.waitingforFixation == 1 && trial.brokeFixation == 1) {
        //check if moved back into fixation
        var x = event.targetTouches[0].pageX;
        var y = event.targetTouches[0].pageY;

        if (x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] &&
            y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) {

            //re-gained fixation
            trial.brokeFixation = 0;
            //Start timer
            fixationTimer = setTimeout(function() {
                waitforClick.next(1)
            }, trial.fixationdur);
        }
    }
}

function touchend_listener(event) {
    console.log('touchend listener')
    if (trial.waitingforFixation == 1 && trial.brokeFixation == 0) {
        // broke touch with fixation dot too early, cancel fixation timers
        trial.brokeFixation = 1;
        clearTimeout(fixationTimer);
    }
}
// MOUSE & TOUCH EVENTS (end)