export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();

export const convertEpochToSeconds = givenTimestamp => {
    return Math.floor((EPOCH_TIME_MILLISECONDS / 1000 + givenTimestamp));
};
