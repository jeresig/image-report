const util = require("util");

const ses = require("node-ses");

const client = ses.createClient({
    key: process.env.AWS_ACCESS_KEY_ID,
    secret: process.env.AWS_SECRET_ACCESS_KEY,
});

const sendEmail = util.promisify(client.sendEmail.bind(client));

module.exports = {
    sendEmail,
};
