//////TODO test register/unregister!!!!!!!!!!!!!!!!
sample_stream.storeSettings({city: "Bucharest", channelLabel: "uniqueLabel"}, function () {
    sample_stream.retrieveSettings(function (settingsArray) {
        console.log(settingsArray);
        var newSettings = {};
        newSettings.channelLabel = "D9533B80884A4604156FDCDD68709936";
        newSettings.city = "Athens";
        sample_stream.storeSettings(newSettings,
            function () {
                sample_stream.retrieveSettings(function (settingsArray) {
                    console.log("got new settings array");
                    console.log(settingsArray);
                });
            },
            function () {

            });
    }, function () {
    });
});
