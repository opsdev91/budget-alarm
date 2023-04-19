/////////////////////////////////////////
// Lambda function to subscribe to SNS topic and publish tiered messages to a Slack channel
/////////////////////////////////////////

const https = require("https");
const AWS = require('aws-sdk');
const sns = new AWS.SNS();


exports.handler = function (event, context) {
  const TopicArn = event.Records[0].Sns.TopicArn;
  const params = {
      ResourceArn: TopicArn,
  };

  sns.listTagsForResource(params).promise()
      .then(response => {
          const tags = response.Tags;
          let accountEmail = '';
          let accountName = '';
          let accountID = '';
          let threshold = '';
          let forecastedAmount = '';
          for (const tag of tags) {
              if (tag.Key === 'email') {
                  accountEmail = tag.Value;
              }
              if (tag.Key === 'accountName') {
                accountName = tag.Value;
              }
              if (tag.Key === 'accountID') {
                accountID = tag.Value;
              }
              if (tag.Key === 'threshold') {
                 threshold = tag.Value;
              }
          }
          console.log("From SNS:", event.Records[0].Sns.Message);
          const message = event.Records[0].Sns.Message;
          const regex = /FORECASTED Amount: \$(\d+\.\d+)/;
          const match = regex.exec(message);
          if (match) {
            forecastedAmount = match[1];
            console.log(forecastedAmount);
            } else {
            console.log("FORECASTED Amount not found in message");
            }

          const options = {
            hostname: 'slack.com',
            path: '/api/chat.postMessage',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.token}`,
              'Content-Type': 'application/json; charset=utf-8'
            }
          };
          
          const body = {
            "channel": process.env.channel,
            "blocks": [
              {
                "type": "header",
                "text": {
                  "type": "plain_text",
                  "text": ":rotating_light: AWS Budget Alert :rotating_light:",
                  "emoji": true
                }
              },
              {
                "type": "divider"
              },
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": ":moneybag: Our AWS budget has been exceeded."
                }
              },
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": `:chart_with_upwards_trend: Your FORECASTED Cost budget has exceeded the limit for the current month. The current FORECASTED Cost is $${forecastedAmount}, slightly higher than the threshold limit of $${threshold} :worried:`
                }
              },
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": ":mag: Please review your AWS resource usage to ensure we stay within our budget."
                }
              },
              {
                "type": "divider"
              },
              {
                "type": "context",
                "elements": [
                  {
                    "type": "mrkdwn",
                    "text": `*Account ID:* ${accountID}`
                  },
                  {
                    "type": "mrkdwn",
                    "text": `*Account Name:* ${accountName}`
                  },
                  {
                    "type": "mrkdwn",
                    "text": `*Account Email:* ${accountEmail}`
                  }
                ]
              }
            ]
          };
          
          const data = JSON.stringify(body);
        
          return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
              let responseData = '';
              res.on('data', (chunk) => {
                responseData += chunk;
              });
              res.on('end', () => {
                const responseBody = JSON.parse(responseData);
                resolve(responseBody);
              });
            });
            
            req.on('error', (err) => {
              console.error(err);
              reject(err);
            });
            
            req.write(data);
            req.end();
          });
      });
};