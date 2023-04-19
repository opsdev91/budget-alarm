#!/usr/bin/env node
import { App, Stack } from "aws-cdk-lib";
// import { PolicyStatement, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";
// import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { BudgetNotifier } from "../../src/budgetNotifier";
import { NotificationType } from "../../src/notificationType";
import accounts from "../../src/config/account.json";
const app = new App();
const stack = new Stack(app, "BudgetNotifierStack");

for (const account of accounts) {
  new BudgetNotifier(stack, "notifier" + account.id, {
    // topicArn: topic.topicArn,
    // Filter on the availability zone `eu-central-1`
    // availabilityZones: ['ap-southeast-1'],
    linkedAccount: [account.id],
    rootAccount: "368886022624",
    // costCenter: 'MyCostCenter',
    // Limit and unit defining the budget limit
    limit: account.limit,
    unit: "USD",
    // When breaching the threshold of 85% of the 10 USD notifications will be send out.
    threshold: account.threshold,
    notificationType: NotificationType.FORECASTED,
  });
}
