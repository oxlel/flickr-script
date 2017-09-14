var fs = require("fs");
var resolve = require("path").resolve;

(function () {
    /**
     * Abstracted away into this file for clean code. 
     * Checks the "commander" program to ensure required inputs have been set
     */
    module.exports.validateInput = function (program) {
        // check inputs have been set
        if (program.startDate == undefined) {
            console.error("Start date (--start-date) must be defined");
            return false;
        }

        if (program.endDate == undefined) {
            console.error("End date (--end-date) must be defined");
            return false;
        }

        if (program.outputFile == undefined) {
            console.error("Output file (--output-file) must be defined");
            return false;
        }

        // check regexes passed
        if (program.startDate === true) {
            console.error("Start date/time (--start-date) must have the form 'YYYY-MM-DD HH:MM:SS'");
            return false;
        }

        if (program.endDate === true) {
            console.error("End date/time (--end-date) must have the form 'YYYY-MM-DD HH:MM:SS'");
            return false;
        }

        return true;
    }
}());