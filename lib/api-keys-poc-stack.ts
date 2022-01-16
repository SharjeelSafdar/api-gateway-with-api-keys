import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwInteg from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class ApiKeysPocStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new apigw.HttpApi(this, "MyApi", {
      apiName: "test-api-for-api-keys",
    });

    const myLambda = new lambda.Function(this, "MyLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromInline(`exports.handler = async () => {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Hello, World!",
          }),
        };
      }`),
      handler: "index.handler",
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
