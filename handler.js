'use strict';

const AWS = require('aws-sdk');
const eventbridge = new AWS.EventBridge({appVersion : '2015-10-07'});
const lambda = new AWS.Lambda();

module.exports.alice = async event => {
  const data = await createSchedule("testRuleX" , 1);
  console.log(data)

  return {
    statusCode: 200,
    body: JSON.stringify( { message: 'Alice was called'  }  )
  };
};

module.exports.bob = async event => {
  console.log(event)
  console.log("event schedule called")
  setTimeout(async () =>{
    console.log("triggered")
    await endSchedule( "testRuleX" )
  }, 60000);
  
  return;
};

const endSchedule = async (ruleName)=>{

  var removeTargetparams = {
    Ids: [
      'MyTargetId', 
    ],
    Rule:ruleName,
    EventBusName: 'default',
    Force: true 
  };
  const rmvTrgt =  await eventbridge.removeTargets(removeTargetparams).promise();

  console.log(rmvTrgt)

  var params = {
    Name: ruleName, 
    EventBusName: 'default',
    Force: true 
  };
  
  const res = await eventbridge.deleteRule(params).promise();
  return res
}


 const createSchedule = async (ruleName , timerate) => { 
  var scheduleParams= {
      Name: ruleName,  
      Description: 'Test schedule discription', 
      ScheduleExpression: `rate(${timerate} minute)`,  
      State: "ENABLED"
  };
  const rule = await eventbridge.putRule(scheduleParams).promise()
  
  var putTriggerParams = {
    Rule: ruleName,
    Targets: [  
      {
        Arn: 'arn:aws:lambda:us-east-2:331940607350:function:event-bridge-serverless-dev-bob',
        Id: "MyTargetId" 
      }, 
    ],
    EventBusName: 'default'
  };
  
  await eventbridge.putTargets(putTriggerParams).promise()
  
  const lambdaPermissionParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: 'event-bridge-serverless-dev-bob',
      Principal: 'events.amazonaws.com',
      StatementId: ruleName,
      SourceArn: rule.RuleArn,
  }

  const finalData = await lambda.addPermission(lambdaPermissionParams).promise();
  return finalData
}
