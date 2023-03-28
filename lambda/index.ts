const https = require("https");
const util = require("util");
const config = {
  slack: {
    hostname: "hooks.slack.com",
    port: 443,
    endpoint:
      "https://hooks.slack.com/services/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",
    channel: "aws-budget",
    username: "AWS SNS via Lambda",
    icon_emoji: ":email:",
  },
};

exports.handler = (event, context) => {
  const TopicArn = event.Records[0].Sns.TopicArn;
  const accountName = TopicArn.split(":").pop();
  console.log(JSON.stringify(event, null, 2));
  console.log("From SNS:", event.Records[0].Sns.Message);

  const postData = {
    channel: config.slack.channel,
    username: config.slack.username,
    text: "*" + accountName + "*",
    icon_emoji: config.slack.icon_emoji,
  };

  var severity = "good";
  const message = event.Records[0].Sns.Message;
  if (message.startsWith("ERROR")) {
    severity = "danger";
  } else if (message.startsWith("WARNING")) {
    severity = "warning";
  } else {
    severity = "good";
  }
  console.log("Message: " + message);
  console.log("Severity: " + severity);

  postData.attachments = [
    {
      color: severity,
      text: message,
    },
  ];

  var options = {
    method: "POST",
    hostname: config.slack.hostname,
    port: config.slack.port,
    path: config.slack.endpoint,
  };

  var req = https.request(options, function (res) {
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
      context.done(null);
    });
  });

  console.log("postData" + postData);
  req.on("error", function (e) {
    console.log("problem with request: " + e.message);
  });

  req.write(util.format("%j", postData));
  req.end();
};
