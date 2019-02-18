const fs = require("fs");
const path = require("path");
const util = require("util");

const mkdirp = require("mkdirp-sync");

require("dotenv").config();

const download = require("./download.js");
const buildReportHTML = require("./build-report-html.js");
const connectDB = require("./database.js");
const {sendEmail} = require("./email.js");
const {extractImagesAndLinks} = require("./extract-html.js");

const writeFile = util.promisify(fs.writeFile);
const symlink = util.promisify(fs.symlink);
const unlink = util.promisify(fs.unlink);

if (!process.env.DB_PATH) {
    console.error("Please specify a database path.");
    process.exit(1);
}

const DB_PATH = path.resolve(process.cwd(), process.env.DB_PATH);
const IMAGES_DIR = path.resolve(
    process.cwd(),
    process.env.IMAGES_DIR || "images"
);

const downloadSource = async (db, source) => {
    const {title, url, id: sourceID, type} = source;

    console.log(`Checking ${title}...`);

    const data = await download(url);
    const matches = extractImagesAndLinks(url, data);

    let linkCount = 0;

    for (const match of matches) {
        let {image, link} = match;

        if (type === "images-and-links") {
            if (!image || !link) {
                continue;
            }
        } else if (type === "images-only") {
            if (!image) {
                continue;
            }

            // Create a fake placeholder link
            link = {
                url: `${url}#${image.url}`,
                title: image.title || title,
            };
        } else if (type === "links-only") {
            if (!link) {
                continue;
            }

            // Create a fake placeholder image
            image = {
                url: "placeholder",
                title: link.title,
            };
        }

        try {
            const {lastID: linkID} = await db.insertLink({
                sourceID,
                url: link.url,
                title: link.title,
            });

            await db.insertImage({
                linkID,
                sourceID,
                url: image.url,
            });

            linkCount += 1;
        } catch (e) {
            // Link already exists.
        }
    }

    await db.updateSource({sourceID});

    console.log(`Source ${title}: ${linkCount} new links and images found.`);
};

const downloadImage = async (db, image) => {
    const {id, url} = image;
    let status = -1;

    if (url !== "placeholder") {
        console.log(`Downloading image: ${url}`);

        try {
            const data = await download(url);

            const filePath = path.join(IMAGES_DIR, `${image.id}.jpg`);
            await writeFile(filePath, data);

            status = 2;
        } catch (e) {
            console.error(`Error downloading image "${image.url}".`);
            console.error(e.message);
        }
    }

    await db.updateImage({id, status});
};

const shouldGenReport = () => !!process.env.REPORTS_DIR;

const genReport = async matches => {
    const output = buildReportHTML(matches);

    const reportID = new Date().toISOString();
    const reportsDir = path.resolve(process.cwd(), process.env.REPORTS_DIR);
    const filePath = path.join(reportsDir, `${reportID}.html`);
    const latestPath = path.join(reportsDir, "index.html");

    mkdirp(reportsDir);
    await writeFile(filePath, output);
    if (fs.existsSync(latestPath)) {
        await unlink(latestPath);
    }
    await symlink(filePath, latestPath);
};

const shouldSendEmailReport = () =>
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.EMAIL_TO &&
    !!process.env.EMAIL_FROM &&
    !!process.env.BASE_URL;

const sendEmailReport = async matches => {
    const date = new Date().toDateString();
    const subject = `Report: ${date}, ${matches.length} matches`;
    const output = buildReportHTML(matches);

    sendEmail({
        to: process.env.EMAIL_TO,
        from: process.env.EMAIL_FROM,
        subject,
        message: output,
    });
};

const main = async db => {
    if (!shouldGenReport() && !shouldSendEmailReport()) {
        console.error("Please configure reports or email.");
        process.exit(1);
    }

    const startTime = Date.now();

    // TODO: Make the database if it doesn't exist

    const sources = await db.getSources();

    for (const source of sources) {
        try {
            await downloadSource(db, source);
        } catch (e) {
            console.error(`Error downloading source "${source.title}".`);
            console.error(e.message);
        }
    }

    // Make the images output directory if it doesn't exist
    mkdirp(IMAGES_DIR);

    const images = await db.getPendingImages();

    for (const image of images) {
        try {
            await downloadImage(db, image);
        } catch (e) {
            console.error(`Error saving image "${image.url}".`);
            console.error(e.message);
        }
    }

    const matches = await db.getLatestMatches(startTime);

    console.log(`${matches.length} match(es) found.`);

    if (matches.length === 0) {
        return;
    }

    if (shouldGenReport()) {
        console.log("Generating report...");

        try {
            await genReport(matches);
        } catch (e) {
            console.error("Error generating report.");
            console.error(e);
        }
    }

    if (shouldSendEmailReport()) {
        console.log("Sending email report...");

        try {
            await sendEmailReport(matches);
        } catch (e) {
            console.error("Error sending email report.");
            console.error(e);
        }
    }
};

connectDB(DB_PATH).then(main);
