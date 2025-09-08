#!/bin/bash

# RebalanceX AWS Deployment Script
# Quick deployment using ECS and RDS
set -e

echo "🚀 RebalanceX AWS Deployment Script"
echo "======================================"

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY="rebalancex-backend"
CLUSTER_NAME="rebalancex-cluster"
SERVICE_NAME="rebalancex-service"
TASK_FAMILY="rebalancex-task"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

echo "📊 Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   ECR URI: $ECR_URI"

# Step 1: Create ECR repository if it doesn't exist
echo ""
echo "🏗️  Step 1: Setting up ECR repository..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION > /dev/null 2>&1 || {
    echo "Creating ECR repository..."
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION
}

# Step 2: Login to ECR
echo ""
echo "🔐 Step 2: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Step 3: Build and push Docker image
echo ""
echo "🏗️  Step 3: Building and pushing Docker image..."
cd apps/backend
docker build -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $ECR_URI:latest
docker tag $ECR_REPOSITORY:latest $ECR_URI:$(date +%Y%m%d-%H%M%S)
docker push $ECR_URI:latest
cd ../..

echo "✅ Docker image pushed successfully!"

# Step 4: Create ECS cluster if it doesn't exist
echo ""
echo "🏗️  Step 4: Setting up ECS cluster..."
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    echo "Creating ECS cluster..."
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
else
    echo "ECS cluster already exists"
fi

# Step 5: Create task definition
echo ""
echo "🏗️  Step 5: Creating ECS task definition..."

# Create task definition JSON
cat > task-definition.json << EOF
{
    "family": "$TASK_FAMILY",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "rebalancex-backend",
            "image": "$ECR_URI:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "production"
                },
                {
                    "name": "PORT",
                    "value": "3001"
                },
                {
                    "name": "STELLAR_NETWORK",
                    "value": "testnet"
                }
            ],
            "secrets": [
                {
                    "name": "DATABASE_URL",
                    "valueFrom": "arn:aws:ssm:$AWS_REGION:$AWS_ACCOUNT_ID:parameter/rebalancex/database-url"
                },
                {
                    "name": "JWT_SECRET",
                    "valueFrom": "arn:aws:ssm:$AWS_REGION:$AWS_ACCOUNT_ID:parameter/rebalancex/jwt-secret"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/rebalancex",
                    "awslogs-region": "$AWS_REGION",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION
rm task-definition.json

# Step 6: Create CloudWatch log group
echo ""
echo "📊 Step 6: Setting up CloudWatch logging..."
aws logs create-log-group --log-group-name "/ecs/rebalancex" --region $AWS_REGION 2>/dev/null || echo "Log group already exists"

# Step 7: Get default VPC and subnets
echo ""
echo "🌐 Step 7: Getting VPC configuration..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION | tr '\t' ',')

echo "   VPC ID: $VPC_ID"
echo "   Subnets: $SUBNET_IDS"

# Step 8: Create or update ECS service
echo ""
echo "🏗️  Step 8: Creating/updating ECS service..."

# Check if service exists
if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    echo "Updating existing service..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition $TASK_FAMILY \
        --region $AWS_REGION
else
    echo "Creating new service..."
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition $TASK_FAMILY \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up database connection string in AWS Systems Manager Parameter Store:"
echo "   aws ssm put-parameter --name '/rebalancex/database-url' --value 'your-database-url' --type SecureString"
echo ""
echo "2. Set up JWT secret:"
echo "   aws ssm put-parameter --name '/rebalancex/jwt-secret' --value 'your-jwt-secret' --type SecureString"
echo ""
echo "3. Check service status:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
echo ""
echo "4. View logs:"
echo "   aws logs tail /ecs/rebalancex --follow"
echo ""
echo "🔗 Service will be available at the public IP of the running task."
echo "   Use 'aws ecs list-tasks --cluster $CLUSTER_NAME' and 'aws ecs describe-tasks' to get the public IP."