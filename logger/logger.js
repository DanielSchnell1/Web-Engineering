const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'silly', // loggt alles ab silly aufwärts
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} | ${level} | ${message}`;
        })
    ),
    transports: [new transports.Console()]
});

module.exports = logger;