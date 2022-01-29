import { Stack, StackProps, aws_apigateway, aws_iam } from "aws-cdk-lib";
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
    const userpoolClient = userpool.addClient("myUserpoolClient", {
      authFlows: {
        userPassword: true,
      },
    });
    userpool.addDomain("myUserpoolDomain", {
      cognitoDomain: {
        domainPrefix: "api-keys-poc",
      },
    });

    const authorizer = new apigwAuth.HttpUserPoolAuthorizer(
      "myAuthorizer",
      userpool,
      {
        userPoolClients: [userpoolClient],
        userPoolRegion: this.region,
        identitySource: ["$request.header.Authorization"],
      }
    );

    const api = new apigw.HttpApi(this, "MyApi", {
      apiName: "test-api-for-api-keys",
    });

    const lambdaIntegration = new apigwInteg.HttpLambdaIntegration(
      "lambdaInteg",
      myLambda
    );

    // This route requires no authorization
    api.addRoutes({
      path: "/open",
      integration: lambdaIntegration,
      methods: [apigw.HttpMethod.GET],
    });

    // This route requires authorization
    api.addRoutes({
      path: "/closed",
      integration: lambdaIntegration,
      methods: [apigw.HttpMethod.GET],
      authorizer,
      authorizationScopes: ["email"],
    });

    const restApi = new aws_apigateway.RestApi(this, "myRestApi", {
      restApiName: "test-rest-api",
      // Apply resource policies to the Rest API
      // policy: new aws_iam.PolicyDocument({
      //   statements: [new aws_iam.PolicyStatement({})],
      // }),
    });

    const restLambdaIntegration = new aws_apigateway.LambdaIntegration(
      myLambda
    );

    const restAuthorizer = new aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "restAuth",
      {
        cognitoUserPools: [userpool],
      }
    );

    // This route requires no authorization
    const openResource = restApi.root.addResource("open");
    openResource.addMethod("GET", restLambdaIntegration);

    // This route requires authorization
    const closedResource = restApi.root.addResource("closed");
    closedResource.addMethod("GET", restLambdaIntegration, {
      authorizationType: aws_apigateway.AuthorizationType.COGNITO,
      authorizer: restAuthorizer,
      authorizationScopes: ["email"],
      apiKeyRequired: true,
    });

    // This route requires no authorization
    const thirdResource = restApi.root.addResource("three");
    thirdResource.addMethod("POST", restLambdaIntegration, {
      requestParameters: {
        "method.request.querystring.id": true,
      },
      // Either define a method request validator here
      // requestValidator: new aws_apigateway.RequestValidator(this, "ad", {
      //   restApi,
      //   requestValidatorName: "MyValidator1",
      //   validateRequestParameters: true,
      // }),
      // Or just give the configrations for the validator, and CDK will create a validator itself.
      requestValidatorOptions: {
        requestValidatorName: "MyValidator2",
        validateRequestParameters: true,
        validateRequestBody: true,
      },
      // I need to implement a request model
      requestModels: {
        "application/json": new aws_apigateway.Model(this, "asd", {
          restApi,
          modelName: "MyModel1",
          description: "Mera model, meri merzi",
          contentType: "application/json",
          schema: {
            title: "Third Endpoint Response Model",
            properties: {
              username: { type: aws_apigateway.JsonSchemaType.STRING },
              age: { type: aws_apigateway.JsonSchemaType.NUMBER },
            },
            required: ["username"],
          },
        }),
      },
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.a": true,
          },
          responseModels: {
            "application/json": new aws_apigateway.Model(this, "asdw", {
              restApi,
              modelName: "MyModel2",
              description: "Mera model, meri marzi, phir say",
              schema: {
                title: "Hello",
                properties: {
                  abc: { type: aws_apigateway.JsonSchemaType.STRING },
                },
                required: ["abc"],
              },
            }),
          },
        },
      ],
    });

    const usagePlan = restApi.addUsagePlan("basic", {
      name: "Basic0",
      throttle: {
        burstLimit: 2,
        rateLimit: 10,
      },
    });

    usagePlan.addApiStage({
      stage: restApi.deploymentStage,
      api: restApi,
    });

    const apiKey = restApi.addApiKey("key1", {
      apiKeyName: "Shark",
    });

    usagePlan.addApiKey(apiKey);
  }
}
