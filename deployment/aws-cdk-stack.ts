/**
 * AWS CDK Infrastructure for RebalanceX Backend
 * Production-ready deployment with RDS, ECS Fargate, and Load Balancer
 */

import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { Construct } from 'constructs'

interface RebalanceXStackProps extends cdk.StackProps {
  environment: 'staging' | 'production'
  domainName?: string
  hostedZoneId?: string
}

export class RebalanceXStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RebalanceXStackProps) {
    super(scope, id, props)

    // Create VPC
    const vpc = new ec2.Vpc(this, 'RebalanceX-VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    })

    // Database credentials secret
    const dbCredentials = new secretsManager.Secret(this, 'DBCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'rebalancex' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\'
      }
    })

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'RebalanceX-Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15
      }),
      instanceType: props.environment === 'production' 
        ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'rebalancex',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      backupRetention: props.environment === 'production' 
        ? cdk.Duration.days(7) 
        : cdk.Duration.days(1),
      deletionProtection: props.environment === 'production',
      storageEncrypted: true,
      allocatedStorage: props.environment === 'production' ? 100 : 20,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true
    })

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'RebalanceX-Cluster', {
      vpc,
      containerInsights: true,
      clusterName: `rebalancex-${props.environment}`
    })

    // Application secrets
    const appSecrets = new secretsManager.Secret(this, 'AppSecrets', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          JWT_SECRET: '',
          STELLAR_NETWORK: 'testnet',
          COINGECKO_API_KEY: '',
          KALE_DISTRIBUTOR_SECRET: ''
        }),
        generateStringKey: 'JWT_SECRET',
        passwordLength: 64
      }
    })

    // Task definition with container
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'RebalanceX-TaskDef', {
      memoryLimitMiB: props.environment === 'production' ? 2048 : 1024,
      cpu: props.environment === 'production' ? 1024 : 512
    })

    // Log group
    const logGroup = new logs.LogGroup(this, 'RebalanceX-LogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // Container definition
    const container = taskDefinition.addContainer('RebalanceX-Container', {
      image: ecs.ContainerImage.fromAsset('../apps/backend'),
      environment: {
        NODE_ENV: props.environment === 'production' ? 'production' : 'staging',
        PORT: '3001'
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbCredentials, 'connectionString'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'JWT_SECRET'),
        STELLAR_NETWORK: ecs.Secret.fromSecretsManager(appSecrets, 'STELLAR_NETWORK'),
        COINGECKO_API_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'COINGECKO_API_KEY'),
        KALE_DISTRIBUTOR_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'KALE_DISTRIBUTOR_SECRET')
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'rebalancex',
        logGroup
      })
    })

    container.addPortMappings({
      containerPort: 3001,
      protocol: ecs.Protocol.TCP
    })

    // Application Load Balanced Fargate Service
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'RebalanceX-Service', {
      cluster,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: props.environment === 'production' ? 2 : 1,
      listenerPort: 80,
      serviceName: `rebalancex-${props.environment}`,
      
      // Health check configuration
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      
      // Domain configuration (optional)
      ...(props.domainName && props.hostedZoneId ? {
        domainName: props.domainName,
        domainZone: route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.domainName.split('.').slice(-2).join('.')
        })
      } : {})
    })

    // Configure health check
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3
    })

    // Auto scaling
    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: props.environment === 'production' ? 2 : 1,
      maxCapacity: props.environment === 'production' ? 10 : 3
    })

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2)
    })

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2)
    })

    // Allow connections from ECS to RDS
    database.connections.allowFrom(fargateService.service, ec2.Port.tcp(5432))

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name'
    })

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint'
    })

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name'
    })

    // Export values for cross-stack references
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      exportName: `${props.environment}-VpcId`
    })

    new cdk.CfnOutput(this, 'DatabaseCredentials', {
      value: dbCredentials.secretArn,
      description: 'Database credentials secret ARN'
    })
  }
}

// CDK App
const app = new cdk.App()

// Staging stack
new RebalanceXStack(app, 'RebalanceX-Staging', {
  environment: 'staging',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  tags: {
    Environment: 'staging',
    Project: 'RebalanceX'
  }
})

// Production stack (uncomment when ready)
/*
new RebalanceXStack(app, 'RebalanceX-Production', {
  environment: 'production',
  domainName: 'api.rebalancex.com', // Your domain
  hostedZoneId: 'Z1234567890', // Your Route53 hosted zone ID
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  tags: {
    Environment: 'production',
    Project: 'RebalanceX'
  }
})
*/