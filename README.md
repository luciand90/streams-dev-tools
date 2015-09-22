Npm package for developing VectorWatch streams
==============
Installation and Usage
----------------------

To install the latest version available on NPM:

    npm install stream-dev-tools


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
    - Public streams
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

