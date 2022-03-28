class Logger {

    /** 
     * A simple method to print console logs
    * @param {*} msg the message to print
    */
    logMsg(msg) {

        let debug = true;

        if (debug) {

            console.log(msg);

        }

    }

}

// Exposing the Logger class as a module
module.exports.Logger = Logger;