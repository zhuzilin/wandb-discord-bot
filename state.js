'use strict';

// subscription singleton
const state = {
  subscriptions: {
    channels: {},

    add(channelId, command, interval, timestamp) {
      if (channelId in this.channels) {
        const sub = this.channels[channelId];
        return {
          success: false,
          sub,
        };
      }
      const sub = { command, interval, timestamp };
      this.channels[channelId] = sub;
      return {
        success: true,
        sub,
      };
    },

    get(channelId) {
      if (channelId in this.channels) {
        return this.channels[channelId];
      }
      return null;
    },

    remove(channelId) {
      if (channelId in this.channels) {
        const sub = this.channels[channelId];
        delete this.channels[channelId];
        return {
          success: true,
          sub,
        };
      }
      return {
        success: false,
        sub: null,
      };
    },

    includes(channelId, timestamp) {
      if (channelId in this.channels) {
        const sub = this.channels[channelId];
        return sub.timestamp == timestamp;
      }
      return false;
    },
  },
};

module.exports = {
  state,
};
