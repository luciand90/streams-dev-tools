Npm package for developing VectorWatch streams
==============
Installation and Usage
----------------------

To install the latest version available on NPM:

    npm install stream-dev-tools --save


#### Usage

    var sample_stream = require('stream-dev-tools');
    
### Configuration

The developer must set a few things before he can get started:

Properties:

    //unique identifier provided by Vector.
    sample_stream.streamUUID = "helloworldStream";
    
    //(public/private) - whether the stream would push data to individual users or not.
    sample_stream.streamType = "public";
    
    //(true/false) - whether the stream has user defined settings.
    sample_stream.hasSettings = true;

    //Authorization token.
    sample_stream.token = "";

    
Methods:

    - Public streams:

      /** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
      Called for public streams
          * @param resolve {Function} DB insert success callback
          * @param reject {Function} DB insert fail callback
          * @param settings {Object} user settings
          * @returns {null}
          * */
     sample_stream.registerSettings = function (resolve, reject, settings) {};
     
     /** This function is called every time a user removes the stream from a watch face.
     Called for public streams
           * @param settings {Object} user settings
           * @returns {null}
           * */
      sample_stream.unregisterSettings = function (resolve, reject, settings) {};
      
      
    - Private streams:
    
     /** This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
     Called for private streams
            * @param resolve {Function} DB insert success callback
            * @param reject {Function} DB insert fail callback
            * @param userId {int} User ID
            * @param settings {Object} user settings
            * @returns {null}
            * */
     sample_stream.registerUser = function (resolve, reject, userId, settings) {};
           
     /** This function is called every time a user removes the stream from a watch face.
     Called for private streams
            * @param userId {int} User ID
            * @param settings {Object} user settings
            * @returns {null}
            * */
      ample_stream.unregisterUser = function (userId, settings) {};

### Methods available

    /** Starts ad configures the express framework.
         * @param initAction {Function} Called after the server starts listening.
         * @returns {null}
         * */
    sample_stream.startServer(initAction);
    
    /** Sends update request to Vector Cloud, with all the information needed.
         * @param dataArray {Array}
         * @returns {null}
         * */
    sample_stream.sendDeliverRequests(dataArray)
    
    /** Initialise a mysql db connection
         * @param host {String}
         * @param user {String}
         * @param password {String}
         * @param database {String}
         * @returns {Object}
         * */
    sample_stream.establishDBConnection (host, user, password, database);
    
    /** Store settings in the DB. On success the resolve() method is called, otherwise the reject(error) method.
        * @param settings {Object} User settings
        * @param resolve {Function} DB insert success callback
        * @param reject {Function}DB insert fail callback
        * @returns null
        *
        **/
    sample_stream.storeSettings (settings, resolve, reject);
    
    /** Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, otherwise the reject(error) method.
         * The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
         * @param resolve {Function} DB select success callback
         * @param reject {Function} DB select fail callback
         * @returns null
         *
         **/
    sample_stream.retrieveSettings (resolve, reject);
    
    /** Delete the given setting from the db
         * @param settings {Object} User settings
         * @param resolve {Function} DB update/delete success callback
         * @param reject {Function} DB update/delete fail callback
         * @returns null
         *
         **/
    sample_stream.deleteSettings (settings, resolve, reject);
    
### Sample

    sample_stream.streamUUID = "stream";
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
            settingsArray.forEach(function (setting) {
                //Calculate the data that will be displayed on the watch for an individual set of settings.
                data = ....;
                //Push an element, containing the data and the seeting
                pushArray.push([data, settings]);
            });
            sample_stream.sendDeliverRequests(pushArray);
        });
    }
    
    // This function is called every time a user adds the stream to a watch face
    sample_stream.registerSettings = function (resolve, reject, settings) {
        counter++;
        sample_stream.storeSettings(settings, function () {
            // return the current counter value to be used
            resolve(getData(settings));
        });
    
    };
    
    // This function is called every time a user removes the stream from a watch face
    sample_stream.unregisterSettings = function (settings) {
        counter--;
        sample_stream.deleteSettings(settings, function () {
            updateAll();
        });
    };
    
    // This function is called when the server starts
    sample_stream.startServer(function () {
        updateAll();
    });

  