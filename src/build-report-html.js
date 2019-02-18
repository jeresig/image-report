const url = require("url");

const {html, Component} = require("htm/preact");
const render = require("preact-render-to-string");

const BASE_URL = process.env.BASE_URL || "../";

class Match extends Component {
    render({title, url: uri, lastUpdated, imageID, sourceTitle, sourceUrl}) {
        const imageURL = url.resolve(BASE_URL, `images/${imageID}.jpg`);

        return html`
            <div>
                <a href=${uri}>
                    <img src=${imageURL} />
                    <span class="title">${title}</span>
                </a>
            </div>
        `;
    }
}

class Report extends Component {
    render({matches}) {
        return html`
            <div>
                ${matches.map(
                    match =>
                        html`
                            <${Match} ...${match} />
                        `
                )}
            </div>
        `;
    }
}

const buildReportHTML = matches => {
    return render(
        html`
            <${Report} matches=${matches} />
        `
    );
};

module.exports = buildReportHTML;
