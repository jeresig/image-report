const url = require("url");

const cheerio = require("cheerio");

const extractImagesAndLinks = (baseURL, data) => {
    const matches = [];

    const $ = cheerio.load(data);
    const imgs = $("img").toArray();
    const links = $("a").toArray();

    for (const img of imgs) {
        if (!img.attribs.src) {
            continue;
        }

        const title = img.attribs.title || img.attribs.alt;

        const match = {
            image: {
                url: url.resolve(baseURL, img.attribs.src),
                title,
            },
        };

        const a = $(img)
            .closest("a")
            .get(0);

        if (a && a.attribs.href) {
            match.link = {
                url: url.resolve(baseURL, a.attribs.href),
                title,
            };
        }

        matches.push(match);
    }

    for (const link of links) {
        if (!link.attribs.href) {
            continue;
        }

        const img = $(link).find("img");

        if (img.length > 0) {
            continue;
        }

        matches.push({
            url: url.resolve(baseURL, link.attribs.href),
            title: $(link).text(),
        });
    }

    return matches;
};

const extractTitleAndText = data => {
    const $ = cheerio.load(data);

    return {
        title: $("title").text(),
        text: $("body")
            .text()
            .replace(/\s+/g, " "),
    };
};

module.exports = {
    extractImagesAndLinks,
    extractTitleAndText,
};
