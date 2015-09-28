var sample_stream = require('./index.js');
var configJSON = {
    streamUID: "***",
    streamType: "public",
    hasSettings: true,
    token: "***",
    portNumber: "3000"
};
sample_stream.config(configJSON);

/*************Custom code**********/
var counter = 0;
function updateAll() {
    sample_stream.retrieveSettings(function (settingsArray) {
        var pushArray = [];
        settingsArray.forEach(function (element) {
            pushArray.push({data: getData(element), settingsItem: element});
        });
        sample_stream.sendDeliverRequests(pushArray);
        sample_stream.dbCleanUp();
    });
}

function getData(element) {
    switch (element.OutputSettings) {
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
    counter++;
    resolve({data: getData(settings)});
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settings) {
    // success
    counter--;
    updateAll();
};

// This function is called when the server starts
sample_stream.startServer(function () {
    console.log("Start");

    // when the server starts, send the couter to all that are listening
    updateAll();
});


