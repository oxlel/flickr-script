var config = require("config");
var Flickr = require("flickrapi"),
    flickrOptions = {
        api_key: config.get("api_key"),
        secret: config.get("secret")
    };

Flickr.tokenOnly(flickrOptions, function (error, flickr) {
    if (error) console.error(error);

    // entry point
});