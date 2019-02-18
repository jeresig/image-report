const request = require("request-promise-native");

const download = uri =>
    request({
        uri,
        gzip: true,
        jar: true,
        timeout: 10000,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/71.0.3578.98 Safari/537.36",
        },
    });

module.exports = download;
