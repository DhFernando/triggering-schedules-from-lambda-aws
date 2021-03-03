'use strict';

const AWS = require('aws-sdk');
const eventbridge = new AWS.EventBridge({appVersion : '2015-10-07'});
const lambda = new AWS.Lambda();

module.exports.alice = async (params) => {
  const { ruleName , startAt ,duration } = params.pathParameters

  const startCRON = `cron(${startAt} 11 3 3 ? 2021)`;
  
  const endCRON = `cron(${ ( parseInt(startAt) + parseInt(duration) ) } 11 3 3 ? 2021)`

  const data = await createSchedule( ruleName , startCRON); 
  const data2 = await endCreateSchedule( ruleName , endCRON ); 

  return {
    statusCode: 200,
    body: JSON.stringify( { message: 'Alice was called'  }  )
  };
};

module.exports.bob = async event => { 
  console.log("event schedule started")
  return;
};

module.exports.bobEnd = async event => {  
  const resRemovePersmissionX = await endSchedule(event.ruleName);
  console.log(resRemovePersmissionX)
  return;
};
 
const endSchedule = async (ruleName)=>{

  var removeTargetparams = {
    Ids: [
      'MyTargetId-Start', 
    ],
    Rule:`${ruleName}-start`,
    EventBusName: 'default',
    Force: true 
  };
  const rmvTrgt =  await eventbridge.removeTargets(removeTargetparams).promise();

  var removeTargetparams2 = {
    Ids: [
      'MyTargetId-End', 
    ],
    Rule:`${ruleName}-end`,
    EventBusName: 'default',
    Force: true 
  };
  const rmvTrgt2 =  await eventbridge.removeTargets(removeTargetparams2).promise();

  console.log(rmvTrgt2)

  var params = {
    Name: `${ruleName}-start`, 
    EventBusName: 'default',
    Force: true 
  };
  
  const res = await eventbridge.deleteRule(params).promise();

  var params2 = {
    Name: `${ruleName}-end`, 
    EventBusName: 'default',
    Force: true 
  };
  
  const res2 = await eventbridge.deleteRule(params2).promise();


  var params3 = {
    FunctionName: "event-bridge-serverless-dev-bobEnd",  
    StatementId: `${ruleName}-end`
   };

  const resRemovePersmission = await lambda.removePermission(params3).promise();

  var params4 = {
    FunctionName: "event-bridge-serverless-dev-bob",  
    StatementId: `${ruleName}-start`
   };

  const resRemovePersmission4 = await lambda.removePermission(params4).promise();
  return resRemovePersmission4
}


 const createSchedule = async (ruleName , startCRON ) => { 
  var scheduleParams= {
      Name: `${ruleName}-start`,  
      Description: 'Test schedule discription', 
      ScheduleExpression: startCRON,  
      State: "ENABLED"
  };
  const rule = await eventbridge.putRule(scheduleParams).promise()
  
  var putTriggerParams = {
    Rule: `${ruleName}-start`,
    Targets: [  
      {
        Arn: 'arn:aws:lambda:ap-south-1:331940607350:function:event-bridge-serverless-dev-bob',
        Id: "MyTargetId-Start" ,
        Input: JSON.stringify({ Id: "MyTargetId-Start" , ruleName })
      }, 
    ],
    EventBusName: 'default',
    
  };
  
  await eventbridge.putTargets(putTriggerParams).promise()
  
  const lambdaPermissionParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: 'event-bridge-serverless-dev-bob',
      Principal: 'events.amazonaws.com',
      StatementId: `${ruleName}-start`,
      SourceArn: rule.RuleArn,
  }

  const finalData = await lambda.addPermission(lambdaPermissionParams).promise();
  return finalData
}

const endCreateSchedule = async (ruleName , endCRON) => { 
  var scheduleParams= {
      Name: `${ruleName}-end`,  
      Description: 'Test schedule discription', 
      ScheduleExpression: endCRON,  
      State: "ENABLED"
  };
  const rule = await eventbridge.putRule(scheduleParams).promise()
  
  var putTriggerParams = {
    Rule: `${ruleName}-end`,
    Targets: [  
      {
        Arn: 'arn:aws:lambda:ap-south-1:331940607350:function:event-bridge-serverless-dev-bobEnd',
        Id: "MyTargetId-End" ,
        Input: JSON.stringify({ ruleName })
      }, 
    ],
    EventBusName: 'default',
    
  };
  
  await eventbridge.putTargets(putTriggerParams).promise()
  
  const lambdaPermissionParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: 'event-bridge-serverless-dev-bobEnd',
      Principal: 'events.amazonaws.com',
      StatementId: `${ruleName}-end`,
      SourceArn: rule.RuleArn,
  }

  const finalData = await lambda.addPermission(lambdaPermissionParams).promise();
  return finalData
}
