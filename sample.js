var sample_stream = require('./index.js');

/*************Custom code**********/
var counter = 0;
var array = [];
var token = '***';
function updateAll() {
    array.push(sample_stream.packageRequestForData(counter++, ""));
    sample_stream.sendDeliverRequests(array);
}

/*************Custom code**********/
/*The streamUUID is provided by Vector*/
sample_stream.streamUUID = "sampleStream";

sample_stream.defaultSetting = {"sampleStreamDefaultChannel": {'uniquelabel': "sampleStreamDefaultChannel", userSettingsMap:{
    "setting" : "default"
}}};
sample_stream.token = token;
sample_stream.registerSettings = function (userId, settingsMap, callback) {
    counter++;
    setTimeout(function () {
        callback(counter);
        return counter;
    }, 1000);
};
sample_stream.startServer(function () {
    console.log("Listening to port %s", 3000);
    //updateAll();
});