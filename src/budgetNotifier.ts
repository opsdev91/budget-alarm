import { CfnBudget } from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";
import { BudgetNotifierProps } from "./budgetNotifierProps";
import { NotificationType } from "./notificationType";
import { TimeUnit } from "./timeUnit";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Tags, Duration } from "aws-cdk-lib";
import { PolicyStatement, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import * as path from "path";
import {
  OrganizationsClient,
  DescribeAccountCommand,
} from "@aws-sdk/client-organizations";
import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";

export class BudgetNotifier extends Construct {
  constructor(scope: Construct, id: string, props: BudgetNotifierProps) {
    super(scope, id);
    if (props.linkedAccount) {
      for (const accountId of props.linkedAccount) {
        this.getAccountName(accountId)
          .then((accountInfo) => {
            const accountName_space: string = accountInfo[0];
            const accountEmail: string = accountInfo[1];
            const accountName: string = accountName_space.replace(/\s+/g, "-");
            const myLambda = this.createLambda(accountId, accountName);
            const subscribers = this.createSubscribers(
              accountId,
              accountEmail,
              accountName,
              myLambda,
              props
            );
            let costFilters: any;
            this.validateProperties(props);
            if (accountId !== props.rootAccount) {
              costFilters = this.createCostFilters(accountId, props);
            }
            new CfnBudget(this, "myCnfBudget" + accountId, {
              budget: {
                budgetType: "COST",
                timeUnit: props.timeUnit ? props.timeUnit : TimeUnit.MONTHLY,
                budgetLimit: {
                  amount: props.limit,
                  unit: props.unit,
                },
                budgetName: accountName + "-" + accountId,
                costFilters: costFilters,
              },

              notificationsWithSubscribers: [
                {
                  notification: {
                    comparisonOperator: "GREATER_THAN",
                    threshold: props.threshold,
                    thresholdType: "PERCENTAGE",
                    notificationType: props.notificationType
                      ? props.notificationType
                      : NotificationType.ACTUAL,
                  },
                  subscribers: subscribers,
                },
              ],
            });
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }

  private validateProperties(props: BudgetNotifierProps): void {
    if (props.recipients && props.recipients.length > 10) {
      throw new Error(
        "The maximum number of 10 e-mail recipients is exceeded."
      );
    }

    if (props.threshold <= 0) {
      throw new Error("Thresholds less than or equal to 0 are not allowed.");
    }
  }
  private createLambda(accountId: string, accountName: string): any {
    const lambdaFunction = new Function(this, "my-lambda" + accountId, {
      memorySize: 1024,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: Code.fromAsset(path.join(__dirname, "../lambda")),
      functionName: accountName + "-" + accountId,
      environment: {
        token: String(process.env.token),
        channel: String(process.env.channel),
      },
    });
    const policyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["SNS:ListTagsForResource"],
      sid: "ListTagsForResource",
      resources: ["*"],
    });
    // const policy = new Policy(this, "my-policy", {
    //   policyName: "my-policy",
    //   statements: [policyStatement],
    // });

    if (lambdaFunction) {
      lambdaFunction.role?.addToPrincipalPolicy(policyStatement);
    }
    return lambdaFunction;
  }

  private createSubscribers(
    accountId: string,
    accountEmail: string,
    accountName: string,
    lambda: any,
    props: BudgetNotifierProps
  ) {
    const thresholdCost: string = String(
      (Number(props.threshold) * Number(props.limit)) / 100
    );
    const subscribers = new Array<CfnBudget.SubscriberProperty>();
    const topic = new Topic(this, "topic" + accountId, {
      topicName: accountName + "-" + accountId,
    });
    Tags.of(topic).add("accountName", accountName);
    Tags.of(topic).add("email", accountEmail);
    Tags.of(topic).add("accountID", accountId);
    Tags.of(topic).add("thresholdCost", thresholdCost);
    Tags.of(topic).add("threshold", String(props.threshold));
    Tags.of(topic).add("limit", String(props.limit));

    // Add Slack webhook here
    // topic.addSubscription(new UrlSubscription('https://foobar.com/'));
    topic.addSubscription(new LambdaSubscription(lambda));
    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("budgets.amazonaws.com")],
      actions: ["SNS:Publish"],
      sid: "budgetAllowSNSPublish",
      resources: [topic.topicArn],
    });
    topic.addToResourcePolicy(statement);
    if (props.recipients) {
      for (const recipient of props.recipients) {
        subscribers.push({
          address: recipient,
          subscriptionType: "EMAIL",
        });
      }
    }
    if (topic.topicArn) {
      subscribers.push({
        address: topic.topicArn,
        subscriptionType: "SNS",
      });
    }

    return subscribers;
  }

  private createCostFilters(accountId: string, props: BudgetNotifierProps) {
    const tags: Array<string> = [];
    if (props.application) {
      tags.push("user:Application$" + props.application);
    }

    if (props.costCenter) {
      tags.push("user:Cost Center$" + props.costCenter);
    }

    if (props.service) {
      tags.push("user:Service$" + props.service);
    }

    const costFilters: any = {};

    if (tags && tags.length > 0) {
      costFilters.TagKeyValue = tags;
    }
    const availabilityZones: Array<string> = [];
    if (props.availabilityZones) {
      for (const az of props.availabilityZones) {
        availabilityZones.push(az);
      }
      costFilters.AZ = availabilityZones;
    }
    const accounts: Array<string> = [];
    accounts.push(accountId);
    // if (props.linkedAccount) {
    //   for (const account of props.linkedAccount) {
    //     linkedAccount.push(account);
    //   }
    costFilters.LinkedAccount = accounts;

    return costFilters;
  }
  private async getAccountName(accountId: string): Promise<string[]> {
    const client = new OrganizationsClient({ region: "ap-southeast-1" });
    const input = new DescribeAccountCommand({ AccountId: accountId });

    try {
      const response = await client.send(input);
      return [response.Account?.Name || "", response.Account?.Email || ""];
    } catch (error) {
      console.log(
        `Error occurred while retrieving account name for account ID ${accountId}: ${error}`
      );
      return [""];
    }
  }
}
