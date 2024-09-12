// CANVAS SETUP
// Sync: Setup heads-up display canvas
function setupCanvasHeadsUp() {
    canvasobj = document.getElementById("canvasheadsup");

    canvasobj.width = window.innerWidth;
    canvasobj.height = Math.round(window.innerHeight * canvas.headsupfraction);
    canvas.offsettop = canvasobj.height;

    if (canvas.headsupfraction == 0) {
        canvasobj.style.display = "none";
    } else {
        canvasobj.style.display = "block";
    }

    var context = canvasobj.getContext('2d');
    context.fillStyle = "rgb(" + grayPoint[0].toString() + "," + grayPoint[1].toString() + "," + grayPoint[2].toString() + ")";
    context.fillRect(0, 0, canvasobj.width, canvasobj.height);

    canvasobj.addEventListener('mousedown', mousedown_listener, false);
    canvasobj.addEventListener('touchstart', touchstart_listener, false);
}

// Sync: Setup canvas
function setupCanvas(id) {
    str = "canvas" + id;
    canvasobj = document.getElementById(str);

    // center in page
    canvasobj.style.top = canvas.offsettop + "px";
    canvasobj.style.left = canvas.offsetleft + "px";
    canvasobj.width = windowWidth;
    canvasobj.height = windowHeight;
    canvasobj.style.margin = "0 auto";

    canvasobj.style.display = "block"; //visible

    // assign listeners
    // handle touch & mouse behavior independently http://www.html5rocks.com/en/mobile/touchandmouse/
    canvasobj.addEventListener('mousedown', mousedown_listener, false);
    canvasobj.addEventListener('mousemove', mousemove_listener, false);
    canvasobj.addEventListener('mouseup', mouseup_listener, false);
    canvasobj.addEventListener('touchstart', touchstart_listener, false);
    canvasobj.addEventListener('touchend', touchend_listener, false);

    // store canvas size
    canvasSize = [canvasobj.width, canvasobj.height];
} //setupCanvas

// Sync: Adjust canvas for the device pixel ratio & browser backing store size
// from http://www.html5rocks.com/en/tutorials/canvas/hidpi/#disqus_thread
function scaleCanvasforHiDPI(id) {
    if (devicePixelRatio !== backingStoreRatio) {
        str = "canvas" + id;
        canvasobj = document.getElementById(str);
        context = canvasobj.getContext("2d");
        var oldWidth = canvasobj.width;
        var oldHeight = canvasobj.height;

        canvasobj.width = oldWidth * canvasScale;
        canvasobj.height = oldHeight * canvasScale;

        canvasobj.style.width = windowWidth + "px";
        canvasobj.style.height = windowHeight + "px";
        canvasobj.style.margin = "0 auto";

        context.scale(canvasScale, canvasScale);
    } //if
} //scaleCanvasforHiDPI
// CANVAS SETUP (end)