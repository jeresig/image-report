const sqlite = require("sqlite");
const SQL = require("sql-template-strings");

class Database {
    constructor({db}) {
        this.db = db;
    }

    getLatestMatches(startTime) {
        return this.db.all(SQL`
            SELECT
                links.title as title,
                links.url as url,
                links.last_updated as lastUpdated,
                images.id as imageID,
                sources.title as sourceTitle,
                sources.url as sourceUrl
            FROM links
            INNER JOIN images ON images.link_id = links.id
            INNER JOIN sources ON sources.id = links.source_id
            WHERE links.status = 2
                AND images.status = 2
                AND images.last_updated >= ${startTime}
            ORDER BY links.last_updated DESC;
        `);
    }

    getSources() {
        return this.db.all(SQL`SELECT * FROM sources;`);
    }

    getPendingLinks() {
        return this.db.all(SQL`SELECT * FROM links WHERE status = 1;`);
    }

    getPendingImages() {
        return this.db.all(SQL`SELECT * FROM images WHERE status = 1;`);
    }

    insertLink({sourceID, url, title}) {
        return this.db.run(SQL`
            INSERT INTO links
            (source_id, url, title, last_updated, status)
            VALUES(
                ${sourceID},
                ${url},
                ${title},
                strftime("%s", "now"),
                1
            );
        `);
    }

    insertImage({linkID, sourceID, url}) {
        return this.db.run(SQL`
            INSERT INTO images
            (link_id, source_id, url, last_updated, status)
            VALUES(
                ${linkID},
                ${sourceID},
                ${url},
                strftime("%s", "now"),
                1
            );
        `);
    }

    updateSource({sourceID}) {
        return this.db.run(SQL`
            UPDATE sources
                SET last_updated = strftime("%s", "now")
                WHERE id = ${sourceID};
        `);
    }

    updateLink({id, title, text, status}) {
        return this.db.run(SQL`
            UPDATE links
                SET last_updated = strftime("%s", "now"),
                    title = ${title},
                    text = ${text},
                    status = ${status}
                WHERE id = ${id};
        `);
    }

    updateImage({id, status}) {
        return this.db.run(SQL`
            UPDATE images
                SET last_updated = strftime("%s", "now"),
                    status = ${status}
                WHERE id = ${id};
        `);
    }
}

const connect = dbPath =>
    sqlite.open(dbPath, {Promise}).then(db => new Database({db}));

module.exports = connect;
