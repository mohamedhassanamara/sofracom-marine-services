// Same tokens as the website; scans the admin and the shared UI kit.
const path = require('path');
const site = require('../../tailwind.config.js');
const root = path.resolve(__dirname, '..', '..');

module.exports = {
    ...site,
    content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{js,jsx}'), path.join(root, 'components/**/*.{js,jsx}')],
};
