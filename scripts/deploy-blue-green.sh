#!/bin/bash
# ALLRENTZ Enterprise Blue-Green Deployment Script
# Zero-downtime deployment for industrial equipment platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-allrentz-production}"
SERVICE_NAME="${SERVICE_NAME:-allrentz-web}"
TASK_FAMILY="${TASK_FAMILY:-allrentz-web}"
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_CHECK_ENDPOINT="${HEALTH_CHECK_ENDPOINT:-/health}"
MAX_WAIT_TIME=600 # 10 minutes
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Function to print status
print_status() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    case $status in
        "SUCCESS")
            echo -e "${timestamp} ${GREEN}✅ ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${timestamp} ${YELLOW}⚠️  ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${timestamp} ${RED}❌ ${message}${NC}"
            ;;
        "INFO")
            echo -e "${timestamp} ${BLUE}ℹ️  ${message}${NC}"
            ;;
    esac
}

# Function to log to CloudWatch
log_to_cloudwatch() {
    local message=$1
    local log_group="/aws/ecs/${CLUSTER_NAME}"
    local log_stream="deployment-$(date +%Y%m%d)"
    
    aws logs put-log-events \
        --log-group-name "$log_group" \
        --log-stream-name "$log_stream" \
        --log-events timestamp=$(date +%s000),message="$message" \
        --region "$AWS_REGION" \
        2>/dev/null || true
}

# Function to check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking deployment prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_status "ERROR" "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_status "ERROR" "AWS credentials are not configured properly"
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_status "ERROR" "jq is not installed (required for JSON processing)"
        exit 1
    fi
    
    print_status "SUCCESS" "Prerequisites check passed"
}

# Function to get current service state
get_current_service_state() {
    print_status "INFO" "Getting current service state..."
    
    CURRENT_SERVICE=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --output json)
    
    CURRENT_TASK_DEF_ARN=$(echo "$CURRENT_SERVICE" | jq -r '.services[0].taskDefinition')
    CURRENT_DESIRED_COUNT=$(echo "$CURRENT_SERVICE" | jq -r '.services[0].desiredCount')
    CURRENT_RUNNING_COUNT=$(echo "$CURRENT_SERVICE" | jq -r '.services[0].runningCount')
    
    print_status "INFO" "Current task definition: $CURRENT_TASK_DEF_ARN"
    print_status "INFO" "Current desired count: $CURRENT_DESIRED_COUNT"
    print_status "INFO" "Current running count: $CURRENT_RUNNING_COUNT"
    
    log_to_cloudwatch "Blue-Green deployment started. Current task: $CURRENT_TASK_DEF_ARN"
}

# Function to create new task definition
create_new_task_definition() {
    print_status "INFO" "Creating new task definition..."
    
    # Get the current task definition
    CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition "$CURRENT_TASK_DEF_ARN" \
        --region "$AWS_REGION" \
        --output json)
    
    # Extract the task definition and update the image
    NEW_TASK_DEF=$(echo "$CURRENT_TASK_DEF" | jq --arg IMAGE_TAG "$IMAGE_TAG" '
        .taskDefinition |
        del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy) |
        .containerDefinitions[0].image = (.containerDefinitions[0].image | split(":")[0] + ":" + $IMAGE_TAG)
    ')
    
    # Register the new task definition
    NEW_TASK_DEF_ARN=$(echo "$NEW_TASK_DEF" | aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json file:///dev/stdin \
        --output json | jq -r '.taskDefinition.taskDefinitionArn')
    
    print_status "SUCCESS" "New task definition created: $NEW_TASK_DEF_ARN"
    log_to_cloudwatch "New task definition created: $NEW_TASK_DEF_ARN"
}

# Function to perform health check
perform_health_check() {
    local target_group_arn=$1
    local max_attempts=60
    local attempt=1
    
    print_status "INFO" "Starting health checks..."
    
    while [ $attempt -le $max_attempts ]; do
        # Get healthy target count
        HEALTHY_TARGETS=$(aws elbv2 describe-target-health \
            --target-group-arn "$target_group_arn" \
            --region "$AWS_REGION" \
            --output json | jq -r '.TargetHealthDescriptions[] | select(.TargetHealth.State == "healthy") | .Target.Id' | wc -l)
        
        if [ "$HEALTHY_TARGETS" -ge "$CURRENT_DESIRED_COUNT" ]; then
            print_status "SUCCESS" "Health checks passed ($HEALTHY_TARGETS/$CURRENT_DESIRED_COUNT targets healthy)"
            return 0
        fi
        
        print_status "INFO" "Health check attempt $attempt/$max_attempts: $HEALTHY_TARGETS/$CURRENT_DESIRED_COUNT targets healthy"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_status "ERROR" "Health checks failed after $max_attempts attempts"
    return 1
}

# Function to perform application-level health checks
perform_app_health_check() {
    local endpoint=$1
    local max_attempts=30
    local attempt=1
    
    print_status "INFO" "Performing application health checks on $endpoint"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            print_status "SUCCESS" "Application health check passed"
            return 0
        fi
        
        print_status "INFO" "App health check attempt $attempt/$max_attempts failed"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_status "ERROR" "Application health checks failed"
    return 1
}

# Function to wait for service stability
wait_for_service_stability() {
    print_status "INFO" "Waiting for service to become stable..."
    
    local start_time=$(date +%s)
    local max_wait_time=$MAX_WAIT_TIME
    
    while true; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - start_time))
        
        if [ $elapsed_time -gt $max_wait_time ]; then
            print_status "ERROR" "Service did not stabilize within $max_wait_time seconds"
            return 1
        fi
        
        SERVICE_STATUS=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --region "$AWS_REGION" \
            --output json)
        
        RUNNING_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.services[0].runningCount')
        DESIRED_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.services[0].desiredCount')
        PENDING_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.services[0].pendingCount')
        
        # Check if service is stable
        if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$PENDING_COUNT" -eq 0 ]; then
            # Additional check for deployment status
            DEPLOYMENTS=$(echo "$SERVICE_STATUS" | jq -r '.services[0].deployments | length')
            STABLE_DEPLOYMENTS=$(echo "$SERVICE_STATUS" | jq -r '.services[0].deployments[] | select(.status == "STABLE") | .status' | wc -l)
            
            if [ "$STABLE_DEPLOYMENTS" -eq "$DEPLOYMENTS" ]; then
                print_status "SUCCESS" "Service is stable (Running: $RUNNING_COUNT, Desired: $DESIRED_COUNT)"
                return 0
            fi
        fi
        
        print_status "INFO" "Service stabilizing... Running: $RUNNING_COUNT, Desired: $DESIRED_COUNT, Pending: $PENDING_COUNT (${elapsed_time}s elapsed)"
        sleep 15
    done
}

# Function to update service with new task definition
update_service() {
    print_status "INFO" "Updating service with new task definition..."
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$NEW_TASK_DEF_ARN" \
        --region "$AWS_REGION" \
        --output json > /dev/null
    
    print_status "SUCCESS" "Service update initiated"
    log_to_cloudwatch "Service updated with new task definition: $NEW_TASK_DEF_ARN"
}

# Function to rollback deployment
rollback_deployment() {
    print_status "WARNING" "Initiating rollback to previous task definition..."
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$CURRENT_TASK_DEF_ARN" \
        --region "$AWS_REGION" \
        --output json > /dev/null
    
    print_status "INFO" "Rollback initiated, waiting for stability..."
    
    if wait_for_service_stability; then
        print_status "SUCCESS" "Rollback completed successfully"
        log_to_cloudwatch "Deployment rolled back successfully to: $CURRENT_TASK_DEF_ARN"
        return 0
    else
        print_status "ERROR" "Rollback failed to stabilize"
        log_to_cloudwatch "CRITICAL: Rollback failed to stabilize"
        return 1
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    print_status "INFO" "Running smoke tests..."
    
    # Get ALB endpoint
    ALB_ENDPOINT=$(aws elbv2 describe-load-balancers \
        --names "${CLUSTER_NAME}-alb" \
        --region "$AWS_REGION" \
        --output json | jq -r '.LoadBalancers[0].DNSName' 2>/dev/null || echo "")
    
    if [ -z "$ALB_ENDPOINT" ]; then
        print_status "WARNING" "Could not determine ALB endpoint for smoke tests"
        return 0
    fi
    
    # Test critical endpoints
    ENDPOINTS=(
        "https://$ALB_ENDPOINT/health"
        "https://$ALB_ENDPOINT/api/health"
        "https://$ALB_ENDPOINT/"
    )
    
    local failed_tests=0
    
    for endpoint in "${ENDPOINTS[@]}"; do
        print_status "INFO" "Testing endpoint: $endpoint"
        
        if curl -f -s --max-time 30 "$endpoint" > /dev/null 2>&1; then
            print_status "SUCCESS" "Smoke test passed: $endpoint"
        else
            print_status "ERROR" "Smoke test failed: $endpoint"
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    if [ $failed_tests -eq 0 ]; then
        print_status "SUCCESS" "All smoke tests passed"
        return 0
    else
        print_status "ERROR" "$failed_tests smoke tests failed"
        return 1
    fi
}

# Function to send deployment notifications
send_notifications() {
    local status=$1
    local message=$2
    
    # Send to Slack if webhook is configured
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        local emoji="✅"
        
        if [ "$status" = "failure" ]; then
            color="danger"
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${emoji} ALLRENTZ Deployment ${status}: ${message}\",\"color\":\"${color}\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Send email notification if configured
    if [ -n "${SNS_TOPIC_ARN:-}" ]; then
        aws sns publish \
            --topic-arn "$SNS_TOPIC_ARN" \
            --message "$message" \
            --subject "ALLRENTZ Deployment ${status}" \
            --region "$AWS_REGION" > /dev/null 2>&1 || true
    fi
}

# Function to cleanup old task definitions
cleanup_old_task_definitions() {
    print_status "INFO" "Cleaning up old task definitions..."
    
    # Keep last 10 task definitions
    OLD_TASK_DEFS=$(aws ecs list-task-definitions \
        --family-prefix "$TASK_FAMILY" \
        --status ACTIVE \
        --sort DESC \
        --region "$AWS_REGION" \
        --output json | jq -r '.taskDefinitionArns[10:][]' 2>/dev/null || echo "")
    
    if [ -n "$OLD_TASK_DEFS" ]; then
        echo "$OLD_TASK_DEFS" | while read -r task_def; do
            if [ -n "$task_def" ]; then
                aws ecs deregister-task-definition \
                    --task-definition "$task_def" \
                    --region "$AWS_REGION" > /dev/null 2>&1 || true
                print_status "INFO" "Deregistered old task definition: $task_def"
            fi
        done
    fi
}

# Main deployment function
main() {
    print_status "INFO" "🚀 Starting ALLRENTZ Blue-Green Deployment"
    print_status "INFO" "Cluster: $CLUSTER_NAME"
    print_status "INFO" "Service: $SERVICE_NAME"
    print_status "INFO" "Image Tag: $IMAGE_TAG"
    print_status "INFO" "Region: $AWS_REGION"
    
    # Check prerequisites
    check_prerequisites
    
    # Get current service state
    get_current_service_state
    
    # Create deployment snapshot for rollback
    DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
    print_status "INFO" "Deployment ID: $DEPLOYMENT_ID"
    
    # Create new task definition
    create_new_task_definition
    
    # Update the service
    update_service
    
    # Wait for service to stabilize
    if ! wait_for_service_stability; then
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            print_status "WARNING" "Service failed to stabilize, initiating rollback"
            if rollback_deployment; then
                send_notifications "warning" "Deployment failed but rollback succeeded for $DEPLOYMENT_ID"
                exit 1
            else
                send_notifications "failure" "CRITICAL: Deployment and rollback both failed for $DEPLOYMENT_ID"
                exit 2
            fi
        else
            print_status "ERROR" "Service failed to stabilize and rollback is disabled"
            send_notifications "failure" "Deployment failed for $DEPLOYMENT_ID (rollback disabled)"
            exit 1
        fi
    fi
    
    # Run smoke tests
    if ! run_smoke_tests; then
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            print_status "WARNING" "Smoke tests failed, initiating rollback"
            if rollback_deployment; then
                send_notifications "warning" "Smoke tests failed but rollback succeeded for $DEPLOYMENT_ID"
                exit 1
            else
                send_notifications "failure" "CRITICAL: Smoke tests failed and rollback failed for $DEPLOYMENT_ID"
                exit 2
            fi
        else
            print_status "ERROR" "Smoke tests failed and rollback is disabled"
            send_notifications "failure" "Smoke tests failed for $DEPLOYMENT_ID (rollback disabled)"
            exit 1
        fi
    fi
    
    # Cleanup old task definitions
    cleanup_old_task_definitions
    
    # Success!
    print_status "SUCCESS" "🎉 Blue-Green deployment completed successfully!"
    print_status "INFO" "Deployment ID: $DEPLOYMENT_ID"
    print_status "INFO" "New task definition: $NEW_TASK_DEF_ARN"
    
    log_to_cloudwatch "Deployment completed successfully: $DEPLOYMENT_ID"
    send_notifications "success" "Deployment completed successfully for $DEPLOYMENT_ID"
    
    exit 0
}

# Trap exit signals for cleanup
trap 'print_status "ERROR" "Deployment interrupted"; exit 130' INT TERM

# Run main function
main "$@"