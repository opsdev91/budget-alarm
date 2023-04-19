/////////////////////////////////////////
// Centralized config file for Lambda
/////////////////////////////////////////

const config = {
    slack: {
      hostname: 'hooks.slack.com',
      port: 443,
      endpoint: "https://hooks.slack.com/services/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",
      channel: "aws-budget",
      username: "AWS SNS via Lambda",
      icon_emoji: ":email:"
    }
  };
  
  module.exports = config;