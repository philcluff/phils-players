const mergeAndRemoveNull = (...args) => {
    const result = videojs.mergeOptions(...args);
    // Any header whose value is `null` will be removed.
    Object.keys(result).forEach(k => {
        if (result[k] === null) {
        delete result[k];
        }
    });
    return result;
};