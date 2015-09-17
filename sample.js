var sample_stream = require('./index.js');

/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "sampleStream";
sample_stream.options = false;
sample_stream.token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VySURcIjoxLFwicm9sZVwiOlwiQURNSU5cIixcIndhdGNoSWRcIjotMX0iLCJpc3MiOiJodHRwczpcL1wvdmVjdG9yd2F0Y2guY29tIiwiaWF0IjoxNDQwMDc0MTYyfQ.U_aMr1YSnrQuN9UqdIyc7wfcDSheqp0Acy_Zo3EzyRQ";

/*************Custom code**********/
var counter = 0;
/*function updateAll() {
    sample_stream.sendDeliverRequests([{
        data: counter
    }]);
}*/

// every hour, increment the counter and send it to all those that are listening
//setInterval(updateAll, 1000*3600); // every hour, increment the counter

// This function is called every time a user adds the stream to their watch face
sample_stream.registerSettings = function (callback, settings) {
    console.log('test');
    counter++;
    // return the current counter value to be used
    callback(counter);
};

// This function is called every time a user removes the stream from a watch face
sample_stream.unregisterSettings = function (settings) {
    // success
    counter--;
};

// This function is called when the server starts
sample_stream.startServer(function () {
    console.log("Start");
    // when the server starts, send the couter to all that are listening
    //updateAll();
});
