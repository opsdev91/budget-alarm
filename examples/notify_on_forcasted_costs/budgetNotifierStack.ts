#!/usr/bin/env node
import { App, Stack } from "aws-cdk-lib";
// import { PolicyStatement, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";
// import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { BudgetNotifier } from "../../src/budgetNotifier";
import { NotificationType } from "../../src/notificationType";

const app = new App();
const stack = new Stack(app, "BudgetNotifierStack");

new BudgetNotifier(stack, "notifier", {
  // topicArn: topic.topicArn,
  // Filter on the availability zone `eu-central-1`
  // availabilityZones: ['ap-southeast-1'],
  linkedAccount: ["240365136232"],
  // costCenter: 'MyCostCenter',
  // Limit and unit defining the budget limit
  limit: 100,
  unit: "USD",
  // When breaching the threshold of 85% of the 10 USD notifications will be send out.
  threshold: 70,
  notificationType: NotificationType.FORECASTED,
});
