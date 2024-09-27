//issue: 

// const script = document.createElement('script');
// script.src = 'js/opencv.js';
// script.async = true; // Make it asynchronous
// script.onload = () => {
//     openCvReady(); // Call your function when the script loads
// };
// document.head.appendChild(script); // Add the script to the <head>


// use accessToken to access conwaylab dropbox - used to upload masks, logs, and trial data
const accessToken = 'VwxXLi8UYbUAAAAAAAAAAb50njFQWlnCiu2qv_YfPLljm84I52jPlXy1EU_cCKP1' 
const dbx = new Dropbox.Dropbox({ accessToken})

// function save_logs() {
//     // Find date and subject for the log's file name to be uploaded to Dropbox
//     const currentDate = new Date();
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth() + 1;
//     const day = currentDate.getDate();
//     const formattedDaySubj = `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}-${trial.subjid}`;

//     // Compile logs and error logs
//     const allLogs = [...logs].join('\n');
//     const blob = new Blob([allLogs], { type: 'text/plain' });
//     const file = new File([blob], 'console_output.txt', { type: 'text/plain' });

//     // Upload logs - overwrite existing file
//     dbx.filesUpload({
//         path: `/logs/${formattedDaySubj}-log.txt`, 
//         contents: file, 
//         mode: { ".tag": "overwrite" }
//     })
//     .then(function(responses) {
//         console.log('Logs uploaded!', responses);
//     })
//     .catch(function(error) {
//         console.error('Error uploading logs:', error);
//     });
// }

// define variables for take_image outside of the take_image function so that the variables are re-used not duplicated
// this will help with garbage collection
let green_canvas,red_canvas,blue_canvas,orange_canvas,gold_canvas,purple_canvas,green_context,red_context;
let blue_context,orange_context,gold_context,purple_context,combinedCanvas,combinedContext,file,blob;
let formattedDate, hsv, outputString;


function take_image(captureLocation) {
    console.log('attempting video capture - making screen black');
    // console.log(`Subject: ${trial.subjid}`)
    function showBlackCanvas() {
        // block the screen while image capture is occuring so the monkeys can't continually tap and overwhelm code.
        // Create the canvas element, append to body, and display
        const canvas = document.createElement('div');
        canvas.id = 'coverCanvas';
        document.body.appendChild(canvas);
        document.body.style.overflow = 'hidden'; //prevent scrolling
        document.documentElement.style.overflow = 'hidden'; // Disable scrolling on html
        canvas.style.display = 'block';

        // Hide canvas after 3s
        setTimeout(() => {
            canvas.style.display = 'none';
            document.body.removeChild(canvas); // Remove the canvas from the DOM
        }, 3000); // Change this duration as needed
    }

    // cause error intentionally 
    // console.error("Test error");

    showBlackCanvas();
    // create a promise that will be resolved when the script decides if there is a human present or not
    return new Promise(async (resolve,reject) => {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const videoElement = document.getElementById('video');

            if (!videoElement) {
                console.error('Video element with ID "video" not found!');
                return;
            }

            videoElement.srcObject = stream;

            // find date and time for filenames and text on images
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const day = currentDate.getDate();
            const hours = currentDate.getHours();
            const minutes = currentDate.getMinutes();
            const seconds = currentDate.getSeconds();
            const formattedDate = `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}----${hours}:${minutes}:${seconds}`

            let imageCaptured = false; //flag to see if image has already been captured

            if (imageCaptures > 100) {
                console.log('Image captures greater than 100, no more images taken')
            }

            videoElement.addEventListener('canplay', () => { // Wait for the 'canplay' event
                if (!imageCaptured) { // prevent more than one image capture from triggering at the same time
                    imageCaptured = true;

                    imageCaptures++; // increments by one to keep track of how many images taken
                    console.log('image captures: ', imageCaptures, 'click from: ', captureLocation, 'at: ', formattedDate);
                    setTimeout(() => {
                    // Create a canvas element
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;
                    const context = canvas.getContext('2d');

                    // Draw the current video frame to the canvas
                    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                    // Get the unmasked image data from the canvas
                    const imageData = canvas.toDataURL('image/png');
                    console.log('Photo taken!');

                    // Create a download link and click it to save the unmasked image - uncomment for debugging
                    // const downloadLink = document.createElement('a');
                    // downloadLink.href = imageData;
                    // downloadLink.download = 'captured_photo.png';
                    // downloadLink.click();

                    // // create each color's canvas and context which the mask will be saved to
                    function createMaskAndCanvas(videoElement) {
                        const color_canvas = document.createElement('canvas');
                        color_canvas.width = videoElement.videoWidth;
                        color_canvas.height = videoElement.videoHeight;
                        const color_context = color_canvas.getContext('2d');
                        return [color_canvas, color_context]
                    }

                    // read image from canvas and convert to hsv 
                    let src = cv.imread(canvas);
                    let hsv = new cv.Mat();
                    cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB); // Convert RGBA to RGB
                    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV); // Convert RGB to HSV
                    // Clean up
                    src.delete();

                    // make a color mask of the image
                    function createColorMask(hsv, lowValues, highValues) {
                        // define color ranges and masks
                        let low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), lowValues);
                        let high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), highValues);
                        let mask = new cv.Mat();
                        cv.inRange(hsv, low, high, mask);
                        // clean up
                        low.delete();
                        high.delete();
                        return mask;
                    }

                    // if the subject is human, create color mask
                    outputString = "Number of pixels in each mask:\n";
                    if (trial.subjid === "Human_1"){
                        let humanMask = createColorMask(hsv, [0/2, 0.3*255, 0, 0], [20/2, 255, 255, 0]);
                        let humanPixels = cv.countNonZero(humanMask);
                        if (humanPixels > 10000){ // if there is enouch pixels in the human mask, than we have found a human
                            outputString += `Human Found; Pixels ${humanPixels}`
                            let humanPresent = true;    
                            resolve(humanPresent);    
                            console.log(`Human Found: ${humanPresent}; Pixels ${humanPixels}`);}    
                        else {
                            let humanPresent = false;
                            resolve(humanPresent);
                            console.log(`No human found: ${humanPresent}; Pixels ${humanPixels}`)
                        }
                        humanMask.delete();
                        humanPixels.delete();    
                    } 
                    else {
                        // for non-human subjects, resolve the code
                        let monkPresent = true;
                        resolve(monkPresent)
                    }
             
                    // create canvas, mask, and context for each color
                    [green_canvas, green_context] = createMaskAndCanvas(videoElement);
                    [red_canvas, red_context] = createMaskAndCanvas(videoElement);
                    [blue_canvas, blue_context] = createMaskAndCanvas(videoElement);
                    [orange_canvas, orange_context] = createMaskAndCanvas(videoElement);
                    [gold_canvas, gold_context] = createMaskAndCanvas(videoElement);
                    [purple_canvas, purple_context] = createMaskAndCanvas(videoElement);

                    let maskGreen = createColorMask(hsv,[144/2, 0, 0, 0], [184/2, 255, 255, 0]); // [0-180, 0-255, 0-255, ?]
                    let maskRed = createColorMask(hsv, [0, 0, 0, 0], [40/2, 255, 255, 0]);  
                    let maskBlue = createColorMask(hsv, [94, 0, 0, 0], [126, 255, 255, 0]);
                    let maskOrange = createColorMask(hsv, [0/2, 0, 0, 0], [20/2, 255, 255, 0]);
                    let maskGold = createColorMask(hsv, [31/2, 0, 0, 0], [51/2, 255, 255, 0]);
                    let maskPurple = createColorMask(hsv, [265/2, 0, 0, 0], [360/2, 255, 255, 0]);
                    
                    // count the number of pixels in each mask
                    let redPixels = cv.countNonZero(maskRed);
                    let greenPixels = cv.countNonZero(maskGreen);
                    let bluePixels = cv.countNonZero(maskBlue);
                    let orangePixels = cv.countNonZero(maskOrange);
                    let goldPixels = cv.countNonZero(maskGold);
                    let purplePixels = cv.countNonZero(maskPurple);

                    // create an array of objects to store the color names and their values
                    let pixelValues = [
                        { color: "Red", value: redPixels },
                        { color: "Green", value: greenPixels },
                        { color: "Blue", value: bluePixels },
                        { color: "Orange", value: orangePixels },
                        { color: "Gold", value: goldPixels },
                        { color: "Purple", value: purplePixels}
                    ];
                    // sort the array in decending order by the number of pixels in mask
                    pixelValues.sort((a,b) => b.value - a.value);

                    // create the output string for colorRank and write on image
                    pixelValues.forEach(item => {
                        outputString += `${item.color}: ${item.value}\n`;
                    });
                    if ((pixelValues[0].value - pixelValues[1].value) > 10000){
                        outputString += `Color: ${pixelValues[0].color}`;
                    } else {
                        outputString += "Color: Unkown"
                    }
                    console.log(outputString);
                    console.log(redPixels)
                    // context.fillText("test", 10, 30); // Draw text at (10, 30)


                    // plot mask to hidden canvas so it can be saved later
                    function plotMask(mask, maskTitle, canvasElement, context, fontColor, height) {
                        let MaskColor = new cv.Mat()
                        cv.cvtColor(mask, MaskColor, cv.COLOR_GRAY2RGB);
                        cv.imshow(canvasElement, MaskColor) // plot the mask
                        MaskColor.delete()
                        context.font = "40px Arial"
                        context.fillStyle = fontColor
                        context.fillText(maskTitle, 10, green_canvas.height - 10) 
                    }
                    plotMask(maskGreen, `Green Mask: ${greenPixels}`, green_canvas, green_context, "green", green_canvas.height);
                    plotMask(maskRed, `Red Mask: ${redPixels}`, red_canvas, red_context, "red", red_canvas.height);
                    plotMask(maskBlue, `Blue Mask: ${bluePixels}`, blue_canvas, blue_context, "blue", blue_canvas.height);
                    plotMask(maskOrange, `Orange Mask: ${orangePixels}`, orange_canvas, orange_context, "orange", orange_canvas.height);
                    plotMask(maskGold, `Gold Mask: ${goldPixels}`, gold_canvas, gold_context, "gold", gold_canvas.height);
                    plotMask(maskPurple, `Purple Mask: ${purplePixels}`, purple_canvas, purple_context, "purple", purple_canvas.height);

                    // draw canvas to combinedCanvas 
                    const combinedCanvas = document.createElement('canvas');
                    const combinedContext = combinedCanvas.getContext('2d');

                    // base the width of the new canvas on the combined canvases
                    combinedCanvas.width = green_canvas.width + red_canvas.width + blue_canvas.width; 
                    combinedCanvas.height = green_canvas.height + orange_canvas.height;
                    // draw each mask output to the combined canvas 
                    combinedContext.drawImage(green_canvas, 0, 0);
                    combinedContext.drawImage(red_canvas, green_canvas.width, 0);
                    combinedContext.drawImage(blue_canvas, green_canvas.width + red_canvas.width, 0);
                    combinedContext.drawImage(orange_canvas, 0, green_canvas.height);
                    combinedContext.drawImage(gold_canvas, orange_canvas.width, green_canvas.height);
                    combinedContext.drawImage(purple_canvas, orange_canvas.width + gold_canvas.width, green_canvas.height);
                    
                    // Set text properties for better appearance
                    combinedContext.textAlign = 'center';
                    combinedContext.textBaseline = 'middle';
                    combinedContext.font = '16px Arial';
                    combinedContext.fillStyle = 'white';

                    // Draw the text at the center of the combined canvas
                    combinedContext.fillText(outputString, combinedCanvas.width / 2, combinedCanvas.height / 2);
                    combinedContext.fillText(`Num_captures: ${imageCaptures}    click from: ${captureLocation}     at: ${formattedDate}     Subject: ${trial.subjid}`, combinedCanvas.width / 2, combinedCanvas.height / 2 + 20); // Draw text at (10, 30)

                    if (imageCaptures < 100) {
                        // upload the canvas to dropbox
                        combinedCanvas.toBlob(blob => {
                        // canvas.toBlob(blob => {
                            const file = blob

                            // upload file to dropbox
                            dbx.filesUpload({ path: `/masks/${trial.subjid}_${formattedDate}.png`, contents: file})
                            .then(function(responses) {
                            console.log('Mask image uploaded!', responses)
                            })
                            // print out in-depth error message if issues uploading to dropbox
                            .catch(function(error) {
                            console.error('Error uploading file:', error)
                            if (error instanceof Dropbox.DropboxResponseError) {
                                console.error('Dropbox API error:', error.status, error.error)}
                            });
                        }, 'image/png');
                    }

                    // Stop the video stream
                    stream.getTracks().forEach(track => track.stop());


                    // Remove canvas and download link (if added to the DOM)
                    if (canvas.parentNode) {  // Check if it's in the DOM
                        canvas.parentNode.removeChild(canvas); 
                    }

                    // save logs
                    // save_logs();

                    // delete all the opencv .mat 
                    maskGreen.delete();
                    maskRed.delete();
                    maskBlue.delete();
                    maskOrange.delete();
                    maskGold.delete();
                    maskPurple.delete();
                    hsv.delete();
                    // delete accumulating strings
                    outputString = null;

                    // if (downloadLink.parentNode) { 
                    //     downloadLink.parentNode.removeChild(downloadLink);
                    // }
                    
                    // // Optionally remove the download link if it's added to the DOM
                    // downloadLink.remove();

                    // resolve the promise with humanPresent - removed to convert to async function
                    // resolve(humanPresent);
                   
                // return humanPresent
                }); // Adjust the delay as needed
                }
            });

        })
        .catch(error => {
            console.error('Error accessing camera:', error);
        });
    });
}

// MOUSE & TOUCH EVENTS
// let mousedown_active = false;
// let taking_image = false;
let imageCaptures = 0;
let lastRunTime = 0;
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
                    // if (!taking_image) {
                        // taking_image = true; // Set to true to prevent further clicks
                        // take image, make mask, save logs in take_image()
                        take_image('Fixation dot').then(subjFound => {
                            console.log('subjFound:', subjFound);
                            if (subjFound) { // If the subject has been found, proceed with task
                                console.log('Subject present in the image.');
                                trial.brokeFixation = 0;
                                trial.xytfixation[trial.current] = [x, y, Math.round(performance.now())];
                                // Start timer
                                fixationTimer = setTimeout(function() {
                                    waitforClick.next(1);
                                }, trial.fixationdur);
                                console.log("trial.fixationdur", trial.fixationdur)
                            } else {
                                console.log('No human is present in the image.');
                            }
                            // taking_image = false; // Reset after processing is complete
                            // mousedown_active = false;
                            // console.log("taking_image = false")
                        });
                    // }
                }
            }
            fixation_dot();
        }
        

        if (trial.waitingforResponse == 1 || automatic_progress == true) {
            // if (automatic_progress){
            //     setTimeout(() => {
            //         console.log("5 second delay");
            //     }, 5000);
            // }
            
            console.log('Test box')
            //determine if clicked in test box
            // take_image('test box') // take image and label it test box - for now just collecting data
            // save logs
            // save_logs();
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
    // } else {
    //     console.log("not enough time passed to initiate another mousedown listener")
    // }
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
        // console.log('touchstart listener')
    // define current time and elapsed time to ensure that clicks don't happen too quickly
    // const currentTime = Date.now();
    // const timeElapsed = currentTime - lastRunTime; 
    // if (timeElapsed > 2000) {

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
                    // if (!taking_image){
                    // taking_image = true;
                    // take image, make masks, save logs
                    take_image('Clicked on fixation dot').then(subjFound => { // take image and label it fixation dot
                        console.log('subjFound:', subjFound);
                        if (subjFound) { // if the subject is found, progress to the options
                            // if (x >= boundingBoxFixation.x[0] && x <= boundingBoxFixation.x[1] &&
                            //     y >= boundingBoxFixation.y[0] && y <= boundingBoxFixation.y[1]) { // check if subject clicked in fixation box – redundant should remove
                                trial.brokeFixation = 0;
                                trial.xytfixation[trial.current] = [x, y, Math.round(performance.now())];
                                //Start timer
                                fixationTimer = setTimeout(function() {
                                    waitforClick.next(1)
                                }, 0); // modified from trial.fixationdur
                            } //if clicked fixation
                        // taking_image = false;
                    })
                // }
            }
        }

        if (trial.waitingforResponse == 1) {
            //determine if clicked in test box
            console.log('clicked on test box screen')
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
    // } else {
    //     console.log('Not enough time has passed to initiate another touch event')
    // }
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