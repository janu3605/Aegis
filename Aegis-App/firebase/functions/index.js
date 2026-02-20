// Firebase Cloud Functions - Main Entry Point
// Export all functions here

const sosFunction = require('./sendSOS');

// Export all functions
module.exports = {
  sendSOSAlert: sosFunction.sendSOSAlert,
  sendSOSAlertHTTP: sosFunction.sendSOSAlertHTTP,
};
