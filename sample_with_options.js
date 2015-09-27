var sample_stream = require('./index.js');
var configJSON = {
    streamUID: "24673c3e7f44534ce255d2ddc8460817",
    streamType: "public",
    hasSettings: true,
    token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VySURcIjoxLFwicm9sZVwiOlwiQURNSU5cIixcIndhdGNoSWRcIjotMX0iLCJpc3MiOiJodHRwczpcL1wvdmVjdG9yd2F0Y2guY29tIiwiaWF0IjoxNDQwMDc0MTYyfQ.U_aMr1YSnrQuN9UqdIyc7wfcDSheqp0Acy_Zo3EzyRQ",
    portNumber: "3000",
    database: {
        host: "***",
        user: "***",
        password: "***",
        database: "***"
    }
};
//////TODO test register/unregister!!!!!!!!!!!!!!!!
sample_stream.config(configJSON);
sample_stream.debugMode = true;

/*************Custom code**********/
var counter = 0;
function updateAll() {
    sample_stream.retrieveSettings(function (settingsArray) {
        var pushArray = [];
        settingsArray.forEach(function (element) {
            pushArray.push({data: getData(element), settingsItem: element});
        });
        sample_stream.sendDeliverRequests(pushArray);
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
    console.log("Registering settings:");
    console.log(settings);
    counter++;
    resolve({data: getData(settings)});
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settings) {
    console.log("Unregistering settings:");
    console.log(settings);
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


