var fs = require("fs");
var moment = require("moment");

// initialise script (using the nodejs package "commander")
var program = require("commander");
var datetimeregex = /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|0[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/i
program
    .version("1.0")
    .usage("[options]")
    .option("-s --start-date <YYYY-MM-DD HH:mm:ss>", "Start date/time", datetimeregex)
    .option("-e --end-date <YYYY-MM-DD HH:mm:ss>", "End date/time", datetimeregex)
    .option("-o --output-file <output file>", "Output csv file")
    .parse(process.argv);

// validate the program input
var validate = require("./validate");
if (!validate.validateInput(program)) {
    process.exit(1);
}

// used to resolve relative path names to absolute path names
var resolve = require("path").resolve;

var input = {
    startDate: moment(program.startDate),
    endDate: moment(program.endDate),
    outputFile: resolve(program.outputFile)
}

// input is now correctly formatted + validated - main functionality of script can begin
var config = require("config");

var Flickr = require("flickrapi");
var flickrOptions = {
    api_key: config.get("api_key"),
    secret: config.get("secret")
};

var outputData = [];
var currentPhoto = 0;

/**
 * Logs a message with a timestamp
 * @param m     message to log
 */
function logstamp(m) {
    console.log("[" + moment().format("YYYY-MM-DD HH:mm:ss") + "] " + m);
}

function fillGeoData(flickr, callback) {
    var photo = outputData[currentPhoto];

    flickr.photos.geo.getLocation({
        "photo_id": photo.id
    }, function (err, result) {
        if (err) {
            logstamp("ERROR from Flickr API - " + err);
            logstamp("Skipping this photo")
        } else {
            outputData[currentPhoto].y = result.photo.location.latitude;
            outputData[currentPhoto].x = result.photo.location.longitude;
            logstamp("Found geospatial data for photo #" + (currentPhoto+1) + " of " + outputData.length);
        }
        
        currentPhoto++;

        if (currentPhoto == outputData.length) {
            callback(null);
            return;
        }

        setTimeout(function () {
            fillGeoData(flickr, callback);
        }, 1010); // wait just over a second (to prevent rate limiting)
    });
}

var duplicates = 0;
var currentPage = 0;
var segments = [];
var currentSegment = 0;
var ids = [];
var foundAllPhotos = false;

function fillPhotoData(flickr, callback) {
    if(foundAllPhotos) return;

    var startDate = segments[currentSegment].startDate;
    var endDate = segments[currentSegment].endDate;

    logstamp("Checking the date/time range: (" + startDate.format("YYYY-MM-DD HH:mm:ss") + 
        " - " + endDate.format("YYYY-MM-DD HH:mm:ss") + ")");

    // 6dCBhRRTVrJiB5xOrg is the flickr place id for the continent of Europe
    flickr.photos.search({
            "min_taken_date": startDate.format("YYYY-MM-DD HH:mm:ss"),
            "max_taken_date": endDate.format("YYYY-MM-DD HH:mm:ss"),
            "place_id": "6dCBhRRTVrJiB5xOrg",
            "accuracy": 16,
            "per_page": 200,
            "page": currentPage
        }, function (err, result) {
            if(err) {
                logstamp("ERROR from Flickr API - " + err);
                logstamp("Attempting to retry...")

                // attempt to retry
                setTimeout(function () {
                    fillPhotoData(flickr, callback);
                }, 1010); // wait just over a second (to prevent rate limiting)
                return;
            }

            if(currentPage == 0) {
                if(parseInt(result.photos.total) > 4000) {
                    logstamp("Too many photos returned (" + parseInt(result.photos.total) + ") - splitting date range");
                    // split the current segment, and push the two new segments to the end of the list
                    var diffInMs = Math.abs(moment(startDate).diff(endDate));
                    var middleGap = diffInMs / 2;
                    var middleDate = moment(startDate).add(middleGap, "ms");
                    segments.push({startDate: startDate, endDate: middleDate});
                    segments.push({startDate: middleDate, endDate: endDate});
                    currentSegment++;
                    setTimeout(function () {
                        fillPhotoData(flickr, callback);
                    }, 1010); // wait just over a second (to prevent rate limiting)
                    return;
                } else {
                    logstamp("Processing ~" + parseInt(result.photos.total) + " photos in the date/time range: (" + 
                        startDate.format("YYYY-MM-DD HH:mm:ss") + " - " + endDate.format("YYYY-MM-DD HH:mm:ss") + ")");
                }
            }

            for(var p in result.photos.photo) {
                var photo = result.photos.photo[p];

                // only add this photo if we have not seen it before
                if(ids.indexOf(photo.id) == -1) {
                    ids.push(photo.id);
                    outputData.push({
                        x: null, 
                        y: null,
                        url: "https://farm" + photo.farm + ".staticflickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret + ".jpg",
                        id: photo.id
                    });
                } else {
                    duplicates++;
                }
            }

            currentPage++;
            logstamp("Found photo data for page #" + currentPage + " of " + result.photos.pages);
            if(currentPage >= result.photos.pages) {
                currentSegment++;
                if(currentSegment == segments.length) {
                    callback(null);
                    foundAllPhotos = true;
                    return;
                } else {
                    currentPage = 0;
                }
            }
            setTimeout(function () {
                fillPhotoData(flickr, callback);
            }, 1010); // wait just over a second (to prevent rate limiting)
        }
    );
}

Flickr.tokenOnly(flickrOptions, function (error, flickr) {
    if (error) console.error(error);

    segments.push({startDate: input.startDate, endDate: input.endDate});
    fillPhotoData(flickr, function(error) {
        if(error) console.error(error);
        
        logstamp("Found exactly " + outputData.length + " photos in this range");
        logstamp(duplicates + " duplicate photos will be ignored");

        fillGeoData(flickr, function(err) {
            if(err) console.error(err);

            logstamp("Writing output data to file")

            fs.writeFileSync(input.outputFile, "id,x,y,url\n");
            for(var p in outputData) {
                var photo = outputData[p];
                if(photo.x != null && photo.y != null) {
                    fs.appendFileSync(input.outputFile, photo.id + "," + photo.x + "," + photo.y + "," + photo.url + "\n");    
                }
            }

            logstamp("Script completed successfully");
            process.exit(0);
        });
    });  
});