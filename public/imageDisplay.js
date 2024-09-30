// IMAGE DISPLAY
// Sync: buffer trial images
function bufferTrialImages() {
    // (pre)render canvas (synchronous)
    function renderCanvas(idxcv, idxim, usesample, grid) {
        var canvasobj = document.getElementById("canvas" + idxcv);
        var context = canvasobj.getContext('2d');
        context.fillStyle = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";
        context.fillRect(0, 0, canvasobj.width, canvasobj.height);

        var indpos
        indpos = grid;

        var xleft = [];
        var ytop = [];
        var xbound = [];
        var ybound = [];
        var dispLum;

        for (var i = 0; i < idxim.length; i++) {
            img = idxim[i];

            xleft[i] = xgridcent[indpos[i]] - 0.5 * imagesTest.wd / canvasScale;
            ytop[i] = ygridcent[indpos[i]] - 0.5 * imagesTest.ht / canvasScale;


// see if we can show the RGB at this lum.  If not, bump up the lum
// imageLum[i] = 0;




			clrIdx = imageColor[i];
			lumIdx = imageLum[i];
			
			while (colorRed[lumIdx][clrIdx] < 0 || colorGreen[lumIdx][clrIdx] < 0 || colorBlue[lumIdx][clrIdx] < 0) {
				lumIdx++;
			}
			
			trial.shownLum[i] = lumIdx;
//             console.log("Lum switch  " + imageLum[i], lumIdx);

            context.fillStyle = "rgb(" + colorRed[lumIdx][clrIdx] + "," + colorGreen[lumIdx][clrIdx] + "," + colorBlue[lumIdx][clrIdx] + ")";

            console.log(context.fillStyle);
            context.fillRect(xleft[i] + 1, ytop[i] + 1, imagesSample.wd / canvasScale - 1, imagesSample.ht / canvasScale - 1);

            var packPtrIdx = img + trial.packsz * packTest;
            var imagePackIdx = imagesTest.packpointer[packPtrIdx];
            var swd = imagesTest.wd / canvasScale;
            var sht = imagesTest.ht / canvasScale;
            var testPtr = imagesTestPack[imagePackIdx];

            context.drawImage(testPtr,
                imagesTest.pixLR[img][0], 0, imagesTest.wd, imagesTest.ht, xleft[i], ytop[i],
                swd, sht);

            xbound[i] = [xleft[i], xleft[i] + imagesTest.wd / canvasScale];
            ybound[i] = [ytop[i], ytop[i] + imagesTest.ht / canvasScale];

            xbound[i][0] = xbound[i][0] + canvas.offsetleft;
            xbound[i][1] = xbound[i][1] + canvas.offsetleft;
            ybound[i][0] = ybound[i][0] + canvas.offsettop;
            ybound[i][1] = ybound[i][1] + canvas.offsettop;
        };


        // bounding boxes of images on canvas
        return {
            x: xbound,
            y: ybound
        };
    }

    //buffer (sample & test canvases)
    //sample

    var imageColor = [-1];
    var imageLum = [-1];

    colorSample = 0;
    colorTest = 0;
    packSample = 0;
    packTest = 0;

    var focalColor = imageColor;

    testImageIdx = trial.test[trial.current];

    for (var i = 0; i <= testImageIdx.length - 1; i++) {
        testImageIdx[i] = testImageIdx[i] - trial.packsz * Math.floor(testImageIdx[i] / trial.packsz);
    }

    trial.test[trial.current] = testImageIdx;

    imageColor = trial.testC[trial.current];
    imageLum = trial.testLum[trial.current];
    trial.shownLum = new Array(imageLum.length);
    for (i=0; i<imageLum.length; i++) {
  	  trial.shownLum[i] = imageLum[i];
    }

    boundingBoxesTest = renderCanvas(canvas.test, testImageIdx, false, trial.testgrid);

}

// Promise: display trial images
function displayTrial(sequence, tsequence) {
    var resolveFunc
    var errFunc
    p = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        errFunc = reject;
    }).then(function() {
    });

    var start = null;

    function updateCanvas(timestamp) {
        if (!start) start = timestamp;
        if (timestamp - start > tsequence[frame.current]) {

            // Move canvas in front
            var prev_canvasobj = document.getElementById("canvas" + canvas.front);
            var curr_canvasobj = document.getElementById("canvas" + sequence[frame.current]);
            if (canvas.front != canvas.blank) {
                prev_canvasobj.style.zIndex = "0";
            } // move back

            if (sequence[frame.current] != canvas.blank) {
                curr_canvasobj.style.zIndex = "100";
                canvas.front = sequence[frame.current];
            } // move to front
            else {
                canvas.front = canvas.blank;
            }

            frame.shown[frame.current] = 1;
            frame.current++;
        }; // if show new frame

        // continue if not all frames shown
        if (frame.shown[frame.shown.length - 1] != 1) {
            window.requestAnimationFrame(updateCanvas);
        } else {
            resolveFunc(1);
        }
    }

    //requestAnimationFrame advantages: goes on next screen refresh and syncs to browsers refresh rate on separate clock (not js clock)
    window.requestAnimationFrame(updateCanvas); // kick off async work
    return p
} //displayTrial

function renderBlank() {
    var canvasobj = document.getElementById("canvas" + canvas.blank);
    var context = canvasobj.getContext('2d');

    context.fillStyle = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";
    context.fillRect(0, 0, canvasobj.width, canvasobj.height);

    context.fillStyle = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";
    context.fillRect(0, 0, canvasobj.width, 60);
}

function renderReward() {
}

function renderPhotoReward() {
}


function renderPunish() {
}

function renderFixation() {
    var canvasobj = document.getElementById("canvas" + canvas.fix);
    var context = canvasobj.getContext('2d');
    context.clearRect(0, 0, canvasobj.width, canvasobj.height);

    var xcent = xgridcent[trial.fixationgrid[trial.current]];
    var ycent = ygridcent[trial.fixationgrid[trial.current]];

    var base_image = document.getElementById("fixgif");
    context.drawImage(base_image, xcent - base_image.width / 2, ycent - base_image.height / 2);
    boundingBoxFixation.x = [xcent - base_image.width / 2 + canvas.offsetleft, xcent + base_image.width / 2 + canvas.offsetleft];
    boundingBoxFixation.y = [ycent - base_image.height / 2 + canvas.offsettop, ycent + base_image.height / 2 + canvas.offsettop];

    context.fillStyle = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";
    context.fillRect(0, 0, canvasobj.width, 40);
}
// IMAGE DISPLAY (end)
