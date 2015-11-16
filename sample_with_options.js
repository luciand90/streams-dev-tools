var streamDevTools = require('./index.js');
var configJSON = {
    streamUID: "***",
    streamType: "public",
    hasSettings: true,
    token: "***",
    portNumber: "3002"
};
var sample_stream = streamDevTools.createStreamNode(configJSON);

/*************Custom code**********/
var counter = 0;
function updateAll() {
    sample_stream.retrieveSettings(function (allSettingsObject) {
        var pushArray = [];
        for (channelLabel in  allSettingsObject) {
            sample_stream.push(allSettingsObject[channelLabel], getData(allSettingsObject[channelLabel]));
        }
        sample_stream.pushNow();
    });
}
setInterval(updateAll, 60 * 60 * 60);

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
    resolve(getData(settings));
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (resolve, reject, settings) {
    // success
    counter--;
    resolve(settings);
};

sample_stream.requestConfig = function (resolve, reject) {
    resolve({
        renderOptions: {
            OutputSettings: {
                type: 'GRID_LAYOUT',
                dataType: 'STATIC'
            }
        },
        settings: {
            OutputSettings: [
                {name: 'positive', value: 1},
                {name: 'negative', value: 2}
            ]
        },
        defaults: {
            OutputSettings: {name: 'positive', value: 1}
        }
    });
};

// This function is called when the server starts
sample_stream.startStreamServer(3002, function () {
    console.log('start server');
    // when the server starts, send the couter to all that are listening
    updateAll();
});


