exports.CLICK_NONE = 'none';
exports.CLICK_HOLD = 'hold';
exports.CLICK_SINGLE = 'single';
exports.CLICK_DOUBLE = 'double';
exports.CLICK_WAITING = 'waiting';

exports.BUTTON_STATE_ON = 'on';
exports.BUTTON_STATE_OFF = 'off';

exports.BATTERY_STATE_UNKNOWN = 'unknown';

exports.CONNECTIVITY_STATE_CONNECTED = 'on';
exports.CONNECTIVITY_STATE_DISCONNECTED = 'off';

exports.LOG_LEVEL_NONE = 0;
exports.LOG_LEVEL_ERROR = 1;
exports.LOG_LEVEL_WARNING = 2;
exports.LOG_LEVEL_INFO = 3;
exports.LOG_LEVEL_DEBUG = 4;

exports.LOG_PREFIX_INFO = 'INFO';
exports.LOG_PREFIX_DEBUG = 'DEBUG';
exports.LOG_PREFIX_ERROR = 'ERROR';
exports.LOG_PREFIX_WARNING = 'WARNING';

exports.COLON_REGEX = new RegExp(':', 'g');
exports.INITIAL_STATE = Object.freeze({'eventTimestamp': 0, 'pressedTimestamp': 0, 'eventEmitted': exports.CLICK_NONE});
