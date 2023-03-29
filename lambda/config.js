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