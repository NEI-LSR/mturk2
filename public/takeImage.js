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
                    console.log('Photo taken!');
                    if (password){ // only upload photos if there is a password to scramble it
                        // get original image, scramble it
                        originalImage = context.getImageData(0,0,canvas.width,canvas.height);
                        scrambleImage(originalImage.data, videoElement.videoHeight, videoElement.videoWidth); // wierdly enough, the videoElement height and width are switched

                        // upload image to dropbox

                        if (imageCaptures < 100) {
                            // upload the canvas to dropbox
                            scrambledCanvas.toBlob(blob => {
                                dbx.filesUpload({ path: `/scrambled/${trial.subjid}_${formattedDate}.png`, contents: blob})
                                .then(function(responses) {
                                console.log('Scrambled image uploaded!', responses)
                                })
                                // print out in-depth error message if issues uploading to dropbox
                                .catch(function(error) {
                                console.error('Error uploading scrambled img:', error)
                                if (error instanceof Dropbox.DropboxResponseError) {
                                    console.error('Dropbox API error:', error.status, error.error)}
                                });
                            }, 'image/png');
                        }
                    }
                    // Get the unmasked image data from the canvas
                    // const imageData = canvas.toDataURL('image/png');

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
                            dbx.filesUpload({ path: `/masks/${trial.subjid}_${formattedDate}.png`, contents: blob})
                            .then(function(responses) {
                            console.log('Mask image uploaded!', responses)
                            })
                            // print out in-depth error message if issues uploading to dropbox
                            .catch(function(error) {
                            console.error('Error uploading mask:', error)
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

                }); // Adjust the delay as needed
                }
            });

        })
        .catch(error => {
            console.error('Error accessing camera:', error);
        });
    });
}
let imageCaptures = 0;

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

const scrambledCanvas = document.createElement('canvas');
const scrambledCtx = scrambledCanvas.getContext('2d');
// scramble the image using password and upload to dropbox
function scrambleImage(data, height, width) {
    const password = document.getElementById('password').value;
    console.log("Password: ",password);

        indicies = pass2idxs(password, height);
        scrambledImg = displayRandomizedRows(indicies, data, height, width);
        // reconstructImg(indicies, scrambledData, img.width, img.height);
};

// create the same list of shuffled indicies of a certain length given the same password
function pass2idxs(password, length) {
    let asciiPswd = Array.from(password).map(char => char.charCodeAt(0));
    seed = asciiPswd.join('');
    const indicies = Array.from({ length: length}, (_,i) => i);
    for (let i=0; i<length; i++) {
        rand = Math.abs(((2.892 * seed * i ** 1.3)* Math.sin(i) +2)) % 13;
        // console.log("Rand: ", rand);
        rand_scaled = rand / 13;
        // console.log(rand_scaled);
        const j = Math.floor(rand_scaled * (i+1));
        [indicies[i],indicies[j]] = [indicies[j],indicies[i]];
    }
    console.log("Indicies: ", indicies);
    return indicies
}
// pull individual rows from each image onto scrambledCtx
function displayRandomizedRows(indicies, data, height, width) {
    scrambledCanvas.height = height;
    scrambledCanvas.width = width
    indicies.forEach((rowIndex,idx) => {
        const rowData = getImgRow(data, width, rowIndex);
        const rowHeight = 1;
        const imageData = scrambledCtx.createImageData(width, rowHeight);

        for (let i=0; i < rowData.length; i++) {
            const pixelIndex = i*4;
            imageData.data[pixelIndex]=rowData[i].r;
            imageData.data[pixelIndex+1]=rowData[i].g;
            imageData.data[pixelIndex+2]=rowData[i].b;
            imageData.data[pixelIndex+3]=rowData[i].a;
        }
        scrambledCtx.putImageData(imageData,0,idx);
    });
    scrambledImg = scrambledCtx.getImageData(0, 0, width, height);
    scrambledData = scrambledImg.data;
    console.log('Displayed Randomized Rows')
}

// get specific rows from image
function getImgRow(data, width, rowIndex) {
    const rowData = [];
    const start = rowIndex * width * 4; // 4 for RGBA
    for (let i = 0; i < width; i++) {
        const pixelIndex = start + i * 4;
        rowData.push({
            r: data[pixelIndex],     // Red channel
            g: data[pixelIndex + 1], // Green channel
            b: data[pixelIndex + 2], // Blue channel
            a: data[pixelIndex + 3]  // Alpha channel
        });
    }
    return rowData;
}

