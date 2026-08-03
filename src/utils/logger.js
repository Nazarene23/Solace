const time = () => {
    return new Date().toLocaleTimeString();
};

module.exports = {

    info(message){
        console.log(`[${time()}] INFO  | ${message}`);
    },

    success(message){
        console.log(`[${time()}] SUCCESS | ${message}`);
    },

    warn(message){
        console.warn(`[${time()}] WARN | ${message}`);
    },

    error(message){
        console.error(`[${time()}] ERROR | ${message}`);
    }

};