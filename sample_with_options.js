var sample_stream = require('./index.js');

/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "helloworldStream";
sample_stream.streamType = "public";
sample_stream.hasSettings = true;
sample_stream.establishDBConnection('', '', '', '');
sample_stream.token = "";

/*************Custom code**********/
var counter = 0;
function updateAll() {
    sample_stream.retrieveSettings(function (settingsArray) {
        var pushArray = [];
        console.log(settingsArray);
        settingsArray.forEach(function (element) {
            pushArray.push([getData(element), element]);
        });
        sample_stream.sendDeliverRequests(pushArray);
    });
}

function getData(element) {
    switch (element.OutputSetting) {
        case 'positive':
            return counter;
        case 'negative':
            return ((counter != 0) ? -counter : 0);
        default:
            return counter;
    }
}

// every hour, increment the counter and send it to all those that are listening

// This function is called every time a user adds the stream to a watch face
sample_stream.registerSettings = function (resolve, reject, settings) {
    console.log("Registering settings:");
    console.log(settings);
    counter++;
    sample_stream.storeSettings(settings, function () {
        // return the current counter value to be used
        resolve(getData(settings));
    });

};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settings) {
    console.log("Unregistering settings:");
    console.log(settings);
    // success
    counter--;
    sample_stream.deleteSettings(settings, function () {
        updateAll();
    });
};

// This function is called when the server starts
sample_stream.startServer(function () {
    console.log("Start");

    // when the server starts, send the couter to all that are listening
    updateAll();
});
