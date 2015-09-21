var sample_stream = require('./index.js');

/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "helloworldStream";
sample_stream.streamType = "public";
sample_stream.defaultSettings = {
    "D9533B80884A4604156FDCDD68709936": {
        "uniqueLabel": "D9533B80884A4604156FDCDD68709936",
        "userSettings": {"default": {"name": "default"}}
    }
};
sample_stream.options = false;
sample_stream.token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VySURcIjoxLFwicm9sZVwiOlwiQURNSU5cIixcIndhdGNoSWRcIjotMX0iLCJpc3MiOiJodHRwczpcL1wvdmVjdG9yd2F0Y2guY29tIiwiaWF0IjoxNDQwMDc0MTYyfQ.U_aMr1YSnrQuN9UqdIyc7wfcDSheqp0Acy_Zo3EzyRQ";

/*************Custom code**********/
var counter = 0;
function updateAll() {
    sample_stream.sendDeliverRequests([{
        data: counter
    }]);
}

// every hour, increment the counter and send it to all those that are listening

// This function is called every time a user adds the stream to a watch face
sample_stream.registerSettings = function (resolve, reject, settings) {
    console.log("Registering settings:");
    console.log(settings);
    counter++;
    // return the current counter value to be used
    reject("Error in registration");
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settings) {
    console.log("Unregistering settings:");
    console.log(settings);
    // success
    counter--;
};

// This function is called when the server starts
sample_stream.startServer(function () {
    console.log("Start");
    // when the server starts, send the couter to all that are listening
    //updateAll();
});
