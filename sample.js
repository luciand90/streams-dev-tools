var sample_stream = require('./index.js');

/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "sampleStream";
sample_stream.token      = "****";

/*************Custom code**********/
var counter = 0;
function updateAll() {
    counter++;
    sample_stream.sendDeliverRequests([{
        settings: {},
        data: counter
    }]);
}

// every hour, increment the counter and send it to all those that are listening
setInterval(updateAll, 1000*3600); // every hour, increment the counter

// This function is called every time a user adds the stream to their watch face
sample_stream.registerSettings = function (settingsMap, callback) {
    // return the current counter value to be used
    callback(counter);
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settingsMap, callback) {
    // success
    callback(true);
};

// This function is called when the server starts
sample_stream.startServer(function () {
    console.log("Start");
    // when the server starts, send the couter to all that are listening
    updateAll();
});
