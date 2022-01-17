import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwInteg from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as apigwAuth from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

export class ApiKeysPocStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myLambda = new lambda.Function(this, "MyLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "index.handler",
    });

    const userpool = new cognito.UserPool(this, "myUserpool");
    userpool.addClient("myUserpoolClient", {
      authFlows: {
        userPassword: true,
      },
    });
    userpool.addDomain("myUserpoolDomain", {
      cognitoDomain: {
        domainPrefix: "api-keys-poc",
      },
    });

    const defaultAuthorizer = new apigwAuth.HttpUserPoolAuthorizer(
      "myAuthorizer",
      userpool
    );

    const api = new apigw.HttpApi(this, "MyApi", {
      apiName: "test-api-for-api-keys",
      defaultAuthorizer,
    });

    api.addRoutes({
      path: "/foo",
      integration: new apigwInteg.HttpLambdaIntegration(
        "lambdaInteg",
        myLambda
      ),
      methods: [apigw.HttpMethod.GET],
    });
  }
}
