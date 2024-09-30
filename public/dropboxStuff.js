// DROPBOX STUFF

var client = new Dropbox.Dropbox({
    accessToken: "VwxXLi8UYbUAAAAAAAAAAb50njFQWlnCiu2qv_YfPLljm84I52jPlXy1EU_cCKP1",
    clientId: "zdu6rukwbro7aj2"
});

var appDir = "ShapeColorSpace";
var forDebugging = "";
var showError = function(error) {
    console.log(error.status)
};


//Get file list from dropbox diretory

function getFileListDropbox() {

    return new Promise(function(resolve, reject) {
        client.readdir(trial.datadir, function(error, string, filestat, filestat_array) {
            if (error) {
                return showError(error); //Something went wrong
            }

            var q2 = 0;
            for (var q = 0; q <= filestat_array.length - 1; q++) {
                if (filestat_array[q].isFile == true && filestat_array[q].name.indexOf(trial.subjid) != -1) {
                    datafiles[q2] = [filestat_array[q].name, filestat_array[q].modifiedAt.toISOString()];
                    q2++;
                }
            }

            datafiles.sort(function(a, b) {
                if (a > b) {
                    return -1;
                }
                if (a < b) {
                    return 1;
                }
                return 0;
            }); //sort in descending order

            resolve(1);
        })
    }).then();
}

async function parseParameterFilefromDropbox(jsontxt_filepath) {
    // From a JSON.txt of the format: 
    // [{param:val, param:val}, {param:val, param:val}]
    // Returns an array of identical format
    var datastring = await loadTextFilefromDropbox(jsontxt_filepath);
    parameters = JSON.parse(datastring);
    return parameters;
}


async function getImageListDropboxRecursive(dirpath) {
    var file_list = [];

    if (dirpath.endsWith('.png')) {
        return [dirpath]
    }

    try {
        var entries = [];
        response = await client.filesListFolder({
            path: dirpath,
            recursive: true
        });
        entries.push(...response.entries);

        // Use response.has_more to propagate 
        var num_iterations = 0;
        var iteration_limit = 100;
        while (response.has_more == true) {
            response = await client.filesListFolderContinue(response.cursor);
            entries.push(...response.entries);

            num_iterations = num_iterations + 1;
            if (num_iterations > iteration_limit) {
                throw 'Hit iteration limit of ' + iteration_limit + '. Check your imagebag directory is not insanely large.'
            }
        }

        var q2 = 0;
        for (var q = 0; q <= entries.length - 1; q++) {
            if (entries[q][".tag"] == "file" && entries[q].name.endsWith(".png")) {
                file_list.push(entries[q].path_display); //'/'+entries[q].name)
                q2++;
            }
        }

        datafiles.sort(function(a, b) {
            if (a > b) {
                return -1;
            }
            if (a < b) {
                return 1;
            }
            return 0;
        }); //sort in descending order

        return file_list
    } catch (error) {
        console.error(error)
    }
}
async function loadImageBagPaths(imagebagroot_s, idx) //(imagebagroot_s)
{
    // 				console.log("loadImageBagPaths ");
    try {
        var bagitems_paths = []; // Can also be paths to a single .png file.
        var bagitems_labels = []; // The labels are integers that index elements of imagebagroot_s. So, a label of '0' means the image belongs to the first imagebag.

        // Case 1: input = string. output = array of .png imagenames
        if (typeof(imagebagroot_s) == "string") {
            bagitems_paths = await getImageListDropboxRecursive(imagebagroot_s);
            for (var i_item = 0; i_item < bagitems_paths.length; i_item++) {
                bagitems_labels.push(0)
            }
            return [bagitems_paths, bagitems_labels]
        }

        // Case 2: input = array of (array of) paths. output = array of arrays of .png imagenames 	
        for (var i = 0; i < imagebagroot_s.length; i++) {
            // If this class's imagebag consists of one (1) root. 
            if (typeof(imagebagroot_s[i]) == "string") {
                var i_itempaths = await getImageListDropboxRecursive(imagebagroot_s[i]);
                bagitems_paths.push(...i_itempaths);

                for (var i_item = 0; i_item < i_itempaths.length; i_item++) {
                    bagitems_labels.push(i)
                }
            }
            // If this class's imagebag consists of multiple roots.
            else if (typeof(imagebagroot_s[i]) == "object") {
                var i_itempaths = [];
                for (var j = 0; j < imagebagroot_s[i].length; j++) {
                    i_itempaths.push(...await getImageListDropboxRecursive(imagebagroot_s[i][j]));
                }
                bagitems_paths.push(...i_itempaths);

                for (var i_item = 0; i_item < i_itempaths.length; i_item++) {
                    bagitems_labels.push(i)
                }
            }
        }
    } catch (error) {
        console.log(error)
    }

    return [bagitems_paths, bagitems_labels]
}


async function loadBagfromDropbox(imagebags_parameter) {

    // console.log("loadBagfromDropbox ");
    // Locate all .png in directory and subdirectories specified in imagebags_parameter
    // Return in ONE 1-dimensional array, along with label vector that indexes given imagbags_order
    try {
        var funcreturn = await loadImageBagPaths(imagebags_parameter);
    } catch (error) {
        console.log('Path loading failed', error)
    }
    var imagebag_paths = funcreturn[0];
    var imagebag_labels = funcreturn[1];

    // Load all .png blobs into an array. 
    // Todo: fix array load (promises elements aren't actually fulfilled)
    try {
        var imagebag = await loadImageArrayfromDropbox(imagebag_paths)
    } catch (error) {
        console.log('Image array load failed', error)
    }

    return [imagebag, imagebag_labels, imagebag_paths]
}

async function loadImageArrayfromDropbox(imagepathlist) {
    try {
        var MAX_SIMULTANEOUS_REQUESTS = 500; // Empirically chosen 
        var MAX_TOTAL_REQUESTS = 3000; // Empirically chosen

        if (imagepathlist.length > MAX_TOTAL_REQUESTS) {
            throw "Under the Dropbox API, cannot load more than " + MAX_TOTAL_REQUESTS + " images at a short time period. You have requested " +
                imagepathlist.length + ". Consider using an image loading strategy that reduces the request rate on Dropbox.";
            return
        }

        if (imagepathlist.length > MAX_SIMULTANEOUS_REQUESTS) {
            var image_array = [];

            for (var i = 0; i < Math.ceil(imagepathlist.length / MAX_SIMULTANEOUS_REQUESTS); i++) {
                var lb = i * MAX_SIMULTANEOUS_REQUESTS;
                var ub = i * MAX_SIMULTANEOUS_REQUESTS + MAX_SIMULTANEOUS_REQUESTS;
                var partial_pathlist = imagepathlist.slice(lb, ub);

                // var partial_image_requests = partial_pathlist.map(loadImagefromDropbox);
                var partial_image_requests = [];
                for (var j = 0; j < partial_pathlist.length; j++) {
                    partial_image_requests.push(loadImagefromDropbox(partial_pathlist[j]))
                }

                var partial_image_array = await Promise.all(partial_image_requests);
                image_array.push(...partial_image_array);
            }

        } else { // If number of images is less than MAX_SIMULTANEOUS_REQUESTS, request them all simultaneously: 

            var image_requests = imagepathlist.map(loadImagefromDropbox);

            var image_array = await Promise.all(image_requests)
        }
        return image_array
    } catch (err) {
        console.log(err)
    }

}



function readPerformanceHistoryfromDropbox(filenum) {
    debugger;
    return new Promise(function(resolve, reject) {

        client.filesDownload({
            path: trial.datadir + datafiles[filenum][0]
        }, function(error, string, filestat, httpinfo) {
            if (error) {
                return showError(error); //Something went wrong
            }

            var file = {
                data: JSON.parse(string)
            };

            if (typeof(file.data[0].Weight) != "undefined") {
                env["weight"] = file.data[0].Weight;
            } else {
                env["weight"] = 10;
            }
            env["species"] = file.data[0].Species;
            env["homecage"] = file.data[0].Homecage;
            env["separated"] = file.data[0].Separated;
            env["liquid"] = file.data[0].Liquid;
            env["tablet"] = file.data[0].Tablet;
            env["pump"] = file.data[0].Pump;
            trial["objectlist"] = file.data[0].TestedObjects;
            trial["nway"] = file.data[0].Nway;
            trial["samplegrid"] = file.data[0].SampleGridIndex;
            trial["testgrid"] = file.data[0].TestGridIndex;
            trial["rewardStage"] = file.data[0].RewardStage;
            trial["rewardper1000"] = file.data[0].RewardPer1000Trials;
            trial["punish"] = file.data[0].PunishTimeOut;
            trial["fixationdur"] = file.data[0].FixationDuration;
            trial["fixationradius"] = file.data[0].FixationRadius;
            trial["fixationmove"] = file.data[0].FixationMove;
            trial["sampleON"] = file.data[0].SampleON;
            trial["sampleOFF"] = file.data[0].SampleOFF;
            trial["keepSampleON"] = file.data[0].KeepSampleON;
            trial["hidetestdistractors"] = file.data[0].HideTestDistractors;
            trial["sampleblocksize"] = file.data[0].SampleBlockSize;
            trial["nstickyresponse"] = file.data[0].NStickyResponse;
            trial["ImageFolderSample"] = file.data[0].ImageFolderSample;
            trial["ImageFolderTest"] = file.data[0].ImageFolderTest;
            trial["taskVersion"] = file.data[0].TaskVersion;
            trial["packsz"] = file.data[0].packsz;
            trial["perobj"] = file.data[0].perobj;
            funcreturn = updateTask("readtaskstageonly"); //read task stage only
            trialhistory.trainingstage[trialhistory.current] = funcreturn;

            for (var i = 0; i <= file.data[0].CorrectItem.length - 1; i++) {
                if (file.data[0].CorrectItem[i] == file.data[0].Response[i] | file.data[0].RewardStage == 0) {
                    trialhistory.correct[trialhistory.current] = 1;
                } else {
                    trialhistory.correct[trialhistory.current] = 0;
                }
                trialhistory.current++;
            }

            resolve(1);
        })
    }).then();
}

//Read parameter file in dropbox

function loadTextFilefromDropbox(textfile_path) {

    return new Promise(function(resolve, reject) {
        console.log("Read textfile " + textfile_path)
        client.filesDownload({
                path: textfile_path
            }).then(function(data) {
                var reader = new FileReader()
                reader.onload = function(e) {
                    var data = JSON.parse(reader.result)
                    resolve(reader.result)
                }
                reader.readAsText(data.fileBlob)
            })
            .catch(function(error) {
                console.log(data)
                console.error(error)
            })
    })
}


//Write parameter file to dropbox
function writeParameterstoDropbox() {
    // console.log("writeParameterstoDropbox: " + trial.params);

    return new Promise(function(resolve, reject) {
        var dataobj = [],
            datastr;
        dataobj.push({
            Weight: env.weight,
            Species: env.species,
            Homecage: env.homecage,
            Separated: env.separated,
            Liquid: env.liquid,
            Tablet: env.tablet,
            Pump: env.pump,
            TestedObjects: trial.objectlist,
            Nway: trial.nway,
            SampleGridIndex: trial.samplegrid,
            TestGridIndex: trial.testgrid,
            RewardStage: trial.rewardStage,
            RewardPer1000Trials: trial.rewardper1000,
            PunishTimeOut: trial.punish,
            FixationDuration: trial.fixationdur,
            FixationRadius: trial.fixationradius,
            FixationMove: trial.fixationmove,
            SampleON: trial.sampleON,
            SampleOFF: trial.sampleOFF,
            KeepSampleON: trial.keepSampleON,
            HideTestDistractors: trial.hidetestdistractors,
            SampleBlockSize: trial.sampleblocksize,
            NStickyResponse: trial.nstickyresponse,
            ImageFolderSample: trial.ImageFolderSample,
            ImageFolderTest: trial.ImageFolderTest,
            TaskVersion: trial.TaskVersion,
            packsz: trial.packsz,
            perobj: trial.perobj,
            // RewardDuration: trial.reward,
        });
        datastr = JSON.stringify(dataobj);
        client.writeFile(trial.params, datastr, function(error, filestat) {
            if (error) {
                return showError(error); //Something went wrong
            }
            resolve(1);
        })
    }).then();
}


//async function loadImagefromDropbox(imagepath){
async function loadSampleImagefromDropbox(src, idx) {
    // Loads and returns a single image located at imagepath into an Image()
    // Upon failure (e.g. from Dropbox API limit), will retry up to MAX_RETRIES. 
    // Will wait between retries with linear increase in waittime between tries.
    //debugger;

    let imagepath = imagesSample.folder + src + ".png";

    return new Promise(
        function(resolve, reject) {
            try {
                imagesSamplePack[curridx + idx] = new Image();
                // console.log(curridx+idx)

                var MAX_RETRIES = 5;
                var backoff_time_seed = 500; // ms; is multiplied by retry number.
                var retry_number = 0;
                //while(true && retry_number <= MAX_RETRIES){
                try {
                    console.log("Looking for:  " + imagesSample.folder + src + ".png");
                    client.filesDownload({
                        path: imagesSample.folder + src + ".png"
                    }).then(
                        function(data) {
                            var data_src = window.URL.createObjectURL(data.fileBlob);
                            var image = new Image();
                            image.src = window.URL.createObjectURL(data.fileBlob);


                            image.onload = function() {
                                resolve(image)
                            };
                            imagesSamplePack[curridx + idx].src = data_src;
                        }
                    )
                } catch (error) {
                    retry_number = retry_number + 1;
                    console.log(error);
                    console.log('On retry ' + retry_number);
                    sleep(backoff_time_seed * retry_number)
                    //continue
                }
                //}	
            } catch (error) {
                console.log(error);
                resolve(0)
            }
        }
    )
}

async function loadTestImagefromDropbox(src, idx) {
    // Loads and returns a single image located at imagepath into an Image()
    // Upon failure (e.g. from Dropbox API limit), will retry up to MAX_RETRIES.
    // Will wait between retries with linear increase in waittime between tries.

    let imagepath = imagesTest.folder + src + ".png";

    return new Promise(
        function(resolve, reject) {
            try {
                imagesTestPack[curridx + idx] = new Image();
                let imagepath = imagesTest.folder + src + ".png";
                var MAX_RETRIES = 5;
                var backoff_time_seed = 500; // ms; is multiplied by retry number.
                var retry_number = 0;

                try {
                    client.filesDownload({
                        path: imagesTest.folder + src + ".png"
                    }).then(
                        function(data) {
                            var data_src = window.URL.createObjectURL(data.fileBlob);
                            var image = new Image();

                            image.onload = function() {
                                resolve(image)
                            };
                            image.src = data_src;
                            imagesTestPack[curridx + idx].src = data_src;

                        }
                    )
                } catch (error) {
                    retry_number = retry_number + 1;
                    console.log(error);
                    console.log('On retry ' + retry_number);
                    sleep(backoff_time_seed * retry_number)
                    //continue
                }
                //}
            } catch (error) {
                console.log(error);
                resolve(0)
            }
        }
    )
}

// asynchronous image capture
function takephoto(currtrial, currstage) {
    canvascaptureobj.setAttribute('width', video.clientWidth);
    canvascaptureobj.setAttribute('height', video.clientHeight);
    var context = canvascaptureobj.getContext('2d');
    context.drawImage(videoobj, 0, 0, videoobj.clientWidth, videoobj.clientHeight);
    //context.drawImage(videoobj,0,0,50,50);
    var data = canvascaptureobj.toDataURL('image/png');
    if (data != 'data:,') {
        var imageBufferArray = _base64ToArrayBuffer(data);
        filename = trial.filename.slice(0, -4);
        client.writeFile("/MonkData/imagecapture/" + trial.subjid + "/" + filename + "_" + ("0000" + currtrial).slice(-4) + ".png", imageBufferArray, function(error, filestat) {
            if (error) {
                return showError(error); //Something went wrong
            }
        })
    }
}

function batterySnapshot(currtrial, currstage) {
    filename = trial.filename.slice(0, -4);
    // Get trial time
    var d = new Date;
    trialTime[currtrial] = d.getFullYear().toString() + '-' + ("00" + (d.getMonth() + 1).toString()).slice(-2) + '-' + ("00" + d.getDate().toString()).slice(-2) + '_' + ("00" + d.getHours().toString()).slice(-2) + '-' + ("00" + d.getMinutes().toString()).slice(-2) + '-' + ("00" + d.getSeconds().toString()).slice(-2);
    // Get battery percent
    batteryPercent[currtrial] = ("000" + (battery.ldt[battery.current - 1][0] * 100).toString()).slice(-3);
    // Save file
    var success = false
    var i = 1;
    var timeout_seed = 1000;
    var max_retries = 10;

    while (!success && i < max_retries) {
        try {
            client.filesUpload({
                path: "/MonkData/imagecapture/" + trial.subjid + "/" + filename + "_" + ("0000" + currtrial).slice(-4) + "_" + ("000" + (battery.ldt[battery.current - 1][0] * 100).toString()).slice(-3) + ".txt",
                contents: '',
                mode: {
                    [".tag"]: "overwrite"
                }
            })
        } catch (error) {
            console.log(error)
            console.log('Trying to write in ' + (timeout_seed * i) + 'ms...on try ' + i)
            sleep(timeout_seed * i)
            i++
            continue;
        }
        success = true
    }
}

function writeDatatoDropbox() {
    return new Promise(function(resolve, reject) {
        var dataobj = [],
            datastr;
        dataobj.push({
            Subject: trial.subjid,
            Tablet: trial.tabletid,
            Weight: env.weight,
            Species: env.species,
            Homecage: env.homecage,
            Separated: env.separated,
            Liquid: env.liquid,
            Tablet: env.tablet,
            Pump: env.pump,
            TestedObjects: trial.objectlist,
            Nway: trial.nway,
            SampleGridIndex: trial.samplegrid,
            TestGridIndex: trial.testgrid,
            ImageFolderSample: trial.ImageFolderSample,
            ImageFolderTest: trial.ImageFolderTest,
            TaskVersion: trial.TaskVersion,
            packsz: trial.packsz,
            perobj: trial.perobj,
            RewardStage: trial.rewardStage,
            RewardPer1000Trials: trial.rewardper1000,
            RewardDuration: trial.reward,
            PunishTimeOut: trial.punish,
            FixationDuration: trial.fixationdur,
            FixationRadius: trial.fixationradius,
            FixationMove: trial.fixationmove,
            SampleON: trial.sampleON,
            SampleOFF: trial.sampleOFF,
            KeepSampleON: trial.keepSampleON,
            HideTestDistractors: trial.hidetestdistractors,
            SampleBlockSize: trial.sampleblocksize,
            NStickyResponse: trial.nstickyresponse,
            Params: trial.params,

            PreSequence: trial.sequencepre,
            PreSequenceTimes: trial.tsequencepre,
            ImageSequence: trial.sequence,
            ImageSequenceTimes: trial.tsequence,
            PostSequence: trial.sequencepost,
            PostSequenceTimes: trial.tsequencepost,
            PixelRatio: devicePixelRatio,
            BackingStoreRatio: backingStoreRatio,
            CanvasScale: canvasScale,
            WindowWidth: windowWidth,
            WindowHeight: windowHeight,
            XGridCenter: xgridcent,
            YGridCenter: ygridcent,

            SampleImageDir: imagesSample.folder,
            TestImageDir: imagesTest.folder,
            AllSampleSerials: imagesSample.serial,
            AllTestSerials: imagesTest.serial,

            FixationGridIndex: trial.fixationgrid,
            Sample: trial.sample,
            SampleC: trial.sampleC,
            Test: trial.test,
            TestC: trial.testC,
            TestLum: trial.testLum,
            ShownLumLum: trial.shownLum,
            Response: trial.response,
            CorrectItem: trial.correctItem,
            StartTime: trial.tstart,
            FixationXYT: trial.xytfixation,
            ResponseXYT: trial.xytresponse,
            BatteryLDT: battery.ldt,
            BatteryPercent: batteryPercent,
            TrialTime: trialTime,
        });
        datastr = JSON.stringify(dataobj); //no pretty print for now, saves space and data file is unwieldy to look at for larger numbers of trials

        var success = false
        var i = 1;
        var timeout_seed = 1000;
        var max_retries = 10;

        while (!success && i < max_retries) {
            try {
                response = client.filesUpload({
                    path: trial.datadir + trial.filename,
                    contents: datastr,
                    mode: {
                        [".tag"]: "overwrite"
                    }
                })
                //FLAGS.need2saveParameters = 0;
            } catch (error) {
                console.log(error)
                console.log('Trying to write in ' + (timeout_seed * i) + 'ms...on try ' + i)
                sleep(timeout_seed * i)
                i++
                continue;
            }
            success = true
        }
    })
};
// DROPBOX STUFF (end)