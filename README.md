Npm package for developing VectorWatch streams
==============
Installation and Usage
----------------------

To install the latest version available on NPM:

    npm install stream-dev-tools --save

    var sample_stream = require('stream-dev-tools');
    
### Configuration

The developer must set a few things before he can get started:

#### Properties:

    //configJSON - provided by Vector.
    sample_stream.config(configJSON);

    
#### Methods:

These are the methods that need to be implemented so the script can interact with VectorCloud.

##### Public streams:

A stream is considered public when it does not rely on any user info, only the settings are needed:

###### - registerSettings(MANDATORY)

       This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
       The DB(if the stream has settings that need to be stored) is automatically updated.
       When implementing this method the developer must call the 'resolve' function parameter after he retrives/generates the data.
       This will be the information displayed on the watch.
            resolve({data:"..."});
            
       /**
          * @param resolve {Function} DB insert success callback
          * @param reject {Function} DB insert fail callback
          * @param settings {Object} User settings. Example: {"City":"Bucharest", ...}
          * @returns {null}
          * */      
     sample_stream.registerSettings = function (resolve, reject, settings) {};

###### - unregisterSettings(Optional)
    This function is called every time a user no longer has the stream on any watchface.
    The DB(if the stream has settings that need to be stored) is automatically updated.
    
       /**
           * @param resolve {Function} DB insert success callback
           * @param reject {Function} DB insert fail callback
           * @param settings {Object} User settings. Example: {"City":"Bucharest", ...}
           * @returns {null}
           * */  
      sample_stream.unregisterSettings = function (resolve, reject, settings) {};    

##### Private streams:

A stream is considered private when the information generated and displayed on watch is user-based:

###### - registerUser(MANDATORY)
    
     This function is called every time a user adds the stream to a watch face(and selects the desired settings, if needed).
     The DB(if the stream has settings that need to be stored) is automatically updated.
     When implementing this method the developer must call the 'resolve' function parameter after he retrives/generates the data.
          resolve({data:"..."});
          
     /**
         * @param resolve {Function} DB insert success callback
         * @param reject {Function} DB insert fail callback
         * @param userId {int} User ID
         * @param settings {Object} User settings. Example: {"City":"Bucharest", ...}
         * @returns {null}
         * */
            (MANDATORY)
     sample_stream.registerUser = function (resolve, reject, userId, settings) {};
        
###### - unregisterUser(Optional)

     This function is called every time a user no longer has the stream on any watchface.
     The DB(if the stream has settings that need to be stored) is automatically updated.
     /** 
            * @param resolve {Function} DB insert success callback
            * @param reject {Function} DB insert fail callback
            * @param userId {int} User ID
            * @param settings {Object} User settings. Example: {"City":"Bucharest", ...}
            * @returns {null}
            * */
            (Optional)
      ample_stream.unregisterUser = function (resolve, reject, userId, settings) {};

----------------------    

### Methods available

#### startServer
    Starts and configures the express framework.
    /** 
         * @param initAction {Function} Called after the server starts listening.
         * @returns {null}
         * */
    sample_stream.startServer(initAction);

#### sendDeliverRequests
    Sends update request to Vector Cloud, with all the information needed.
    /**
         * @param dataArray {Array} 
            Example: [{data:"Text_to_be_displayed", settingsItem:{...}}]
            data(String) - The text that will be displayed on the watch.
            settingsItem(Object) - The coresponding user settings. All the settings 
         * @returns {null}
         * */
    sample_stream.sendDeliverRequests(dataArray)

#### retrieveSettings
     Get all the settings stored in the DB. On success the resolve(settingsArray) method is called, otherwise the reject(error) method.
     The developer can access the returned array in the resolve(settingsArray) callback, as a parameter.
           Example: sample_stream.retrieveSettings(function (settingsArray) {
                        console.log(settingsArray); -> [{"City":"Bucharest", ...},{"City":"New York", ...}, ...]
                    });
     /**
         * @param resolve {Function} DB select success callback
         * @param reject {Function} DB select fail callback
         * @returns null
         *
         **/
    sample_stream.retrieveSettings (resolve, reject);

#### dbCleanUp
    Delete al settings from the DB.
     /**
         * @param resolve {Function} DB update/delete success callback
         * @param reject {Function} DB update/delete fail callback
         * @returns null
         *
         **/
    sample_stream.dbCleanUp (resolve, reject);
  
----------------------    
    
### Sample

    var sample_stream = require('./index.js');
    var configJSON = {
        streamUID: "***",
        streamType: "public",
        hasSettings: true,
        token: "***",
        portNumber: "3000",
        database: {
            host: "***",
            user: "***",
            password: "***",
            database: "***"
        }
    };
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
    
    sample_stream.registerSettings = function (resolve, reject, settings) {
        console.log("Registering settings:");
        console.log(settings);
        counter++;
        resolve({data: getData(settings)});
    };
    
    sample_stream.startServer(function () {
        console.log("Start");
        //When the server starts, send the counter to all that are listening
        updateAll();
    });




  