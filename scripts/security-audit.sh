#!/bin/bash
# ALLRENTZ Enterprise Security Audit Script
# Comprehensive security checks for industrial equipment platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUDIT_DATE=$(date +"%Y%m%d_%H%M%S")
AUDIT_DIR="./security-audit-${AUDIT_DATE}"
REPORT_FILE="${AUDIT_DIR}/security-report.html"

# Create audit directory
mkdir -p "${AUDIT_DIR}"

echo -e "${BLUE}🔒 ALLRENTZ Enterprise Security Audit - ${AUDIT_DATE}${NC}"
echo "=================================================="

# Function to print status
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  ${message}${NC}"
            ;;
    esac
}

# Function to check command availability
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        print_status "WARNING" "$1 is not installed. Skipping related checks."
        return 1
    fi
}

# Start HTML report
cat > "${REPORT_FILE}" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>ALLRENTZ Security Audit Report - ${AUDIT_DATE}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #dc2626; }
        .success { color: #16a34a; }
        .warning { color: #eab308; }
        .error { color: #dc2626; }
        .code { background: #f1f5f9; padding: 10px; border-radius: 3px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 ALLRENTZ Enterprise Security Audit</h1>
        <p>Date: ${AUDIT_DATE}</p>
        <p>Platform: Industrial Equipment Rental Security Assessment</p>
    </div>
EOF

print_status "INFO" "Starting comprehensive security audit..."

# 1. Dependency Vulnerability Scan
print_status "INFO" "Checking for vulnerable dependencies..."
echo "<div class='section'><h2>1. Dependency Vulnerability Scan</h2>" >> "${REPORT_FILE}"

if npm audit --json > "${AUDIT_DIR}/npm-audit.json" 2>/dev/null; then
    VULNERABILITIES=$(npm audit --json | jq '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
    if [ "$VULNERABILITIES" -gt 0 ]; then
        print_status "ERROR" "Found ${VULNERABILITIES} npm vulnerabilities"
        echo "<p class='error'>❌ Found ${VULNERABILITIES} npm vulnerabilities</p>" >> "${REPORT_FILE}"
        npm audit >> "${AUDIT_DIR}/npm-audit-details.txt" 2>/dev/null || true
    else
        print_status "SUCCESS" "No npm vulnerabilities found"
        echo "<p class='success'>✅ No npm vulnerabilities found</p>" >> "${REPORT_FILE}"
    fi
else
    print_status "WARNING" "Could not run npm audit"
    echo "<p class='warning'>⚠️ Could not run npm audit</p>" >> "${REPORT_FILE}"
fi

echo "</div>" >> "${REPORT_FILE}"

# 2. License Compliance Check
print_status "INFO" "Checking license compliance..."
echo "<div class='section'><h2>2. License Compliance</h2>" >> "${REPORT_FILE}"

if check_command "license-checker"; then
    license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0' \
        --excludePrivatePackages --summary > "${AUDIT_DIR}/licenses.txt" 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "All licenses are compliant"
        echo "<p class='success'>✅ All licenses are compliant with enterprise policy</p>" >> "${REPORT_FILE}"
    else
        print_status "ERROR" "License compliance issues found"
        echo "<p class='error'>❌ License compliance issues found</p>" >> "${REPORT_FILE}"
        echo "<div class='code'><pre>$(cat ${AUDIT_DIR}/licenses.txt)</pre></div>" >> "${REPORT_FILE}"
    fi
else
    npm install -g license-checker 2>/dev/null || true
fi

echo "</div>" >> "${REPORT_FILE}"

# 3. Security Headers Check
print_status "INFO" "Checking security headers configuration..."
echo "<div class='section'><h2>3. Security Headers</h2>" >> "${REPORT_FILE}"

SECURITY_HEADERS=(
    "Content-Security-Policy"
    "X-Frame-Options"
    "X-Content-Type-Options"
    "X-XSS-Protection"
    "Strict-Transport-Security"
    "Referrer-Policy"
    "Permissions-Policy"
)

echo "<table><tr><th>Header</th><th>Status</th><th>Value</th></tr>" >> "${REPORT_FILE}"

# Check if application is running locally
if curl -s -I http://localhost:8080 > /dev/null 2>&1; then
    for header in "${SECURITY_HEADERS[@]}"; do
        HEADER_VALUE=$(curl -s -I http://localhost:8080 2>/dev/null | grep -i "^${header}:" || echo "Not Set")
        if [[ "$HEADER_VALUE" == "Not Set" ]]; then
            print_status "WARNING" "Security header missing: ${header}"
            echo "<tr><td>${header}</td><td class='error'>❌ Missing</td><td>-</td></tr>" >> "${REPORT_FILE}"
        else
            print_status "SUCCESS" "Security header present: ${header}"
            echo "<tr><td>${header}</td><td class='success'>✅ Present</td><td>${HEADER_VALUE#*: }</td></tr>" >> "${REPORT_FILE}"
        fi
    done
else
    print_status "WARNING" "Application not running on localhost:8080. Cannot check headers."
    echo "<tr><td colspan='3' class='warning'>⚠️ Application not running. Cannot verify headers.</td></tr>" >> "${REPORT_FILE}"
fi

echo "</table></div>" >> "${REPORT_FILE}"

# 4. Environment Variables Security
print_status "INFO" "Checking environment variable security..."
echo "<div class='section'><h2>4. Environment Variables Security</h2>" >> "${REPORT_FILE}"

SENSITIVE_PATTERNS=(
    "password"
    "secret"
    "key"
    "token"
    "api_key"
    "private"
    "credential"
)

ISSUES_FOUND=0
echo "<ul>" >> "${REPORT_FILE}"

# Check .env files
for env_file in .env .env.local .env.production .env.development; do
    if [ -f "$env_file" ]; then
        print_status "WARNING" "Found environment file: $env_file"
        echo "<li class='warning'>⚠️ Environment file present: $env_file</li>" >> "${REPORT_FILE}"
        
        # Check for sensitive data in env files
        for pattern in "${SENSITIVE_PATTERNS[@]}"; do
            if grep -i "$pattern" "$env_file" > /dev/null 2>&1; then
                print_status "ERROR" "Potential sensitive data in $env_file: $pattern"
                echo "<li class='error'>❌ Potential sensitive data in $env_file: contains '$pattern'</li>" >> "${REPORT_FILE}"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        done
    fi
done

if [ $ISSUES_FOUND -eq 0 ]; then
    print_status "SUCCESS" "No obvious sensitive data exposure found"
    echo "<li class='success'>✅ No obvious sensitive data exposure found</li>" >> "${REPORT_FILE}"
fi

echo "</ul></div>" >> "${REPORT_FILE}"

# 5. File Permissions Check
print_status "INFO" "Checking critical file permissions..."
echo "<div class='section'><h2>5. File Permissions</h2>" >> "${REPORT_FILE}"

CRITICAL_FILES=(
    "package.json"
    "package-lock.json"
    ".gitignore"
    "tsconfig.json"
    "vite.config.ts"
)

echo "<table><tr><th>File</th><th>Permissions</th><th>Status</th></tr>" >> "${REPORT_FILE}"

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        PERMS=$(stat -f "%A" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null || echo "unknown")
        if [[ "$PERMS" =~ ^[0-7]{3}$ && "$PERMS" -le 644 ]]; then
            print_status "SUCCESS" "File permissions OK: $file ($PERMS)"
            echo "<tr><td>$file</td><td>$PERMS</td><td class='success'>✅ Secure</td></tr>" >> "${REPORT_FILE}"
        else
            print_status "WARNING" "File permissions may be too open: $file ($PERMS)"
            echo "<tr><td>$file</td><td>$PERMS</td><td class='warning'>⚠️ Review</td></tr>" >> "${REPORT_FILE}"
        fi
    fi
done

echo "</table></div>" >> "${REPORT_FILE}"

# 6. Git Security Check
print_status "INFO" "Checking Git security configuration..."
echo "<div class='section'><h2>6. Git Security</h2>" >> "${REPORT_FILE}"

echo "<ul>" >> "${REPORT_FILE}"

# Check .git directory permissions
if [ -d ".git" ]; then
    GIT_PERMS=$(stat -f "%A" .git 2>/dev/null || stat -c "%a" .git 2>/dev/null || echo "unknown")
    if [[ "$GIT_PERMS" == "755" || "$GIT_PERMS" == "700" ]]; then
        print_status "SUCCESS" ".git directory permissions are secure ($GIT_PERMS)"
        echo "<li class='success'>✅ .git directory permissions secure: $GIT_PERMS</li>" >> "${REPORT_FILE}"
    else
        print_status "WARNING" ".git directory permissions: $GIT_PERMS"
        echo "<li class='warning'>⚠️ .git directory permissions: $GIT_PERMS</li>" >> "${REPORT_FILE}"
    fi
fi

# Check for sensitive files in Git history
SENSITIVE_FILES_IN_GIT=$(git log --name-only --pretty=format: | sort -u | grep -E "\.(pem|key|p12|pfx|crt)$" | head -5 || true)
if [ -n "$SENSITIVE_FILES_IN_GIT" ]; then
    print_status "ERROR" "Potential sensitive files found in Git history"
    echo "<li class='error'>❌ Potential sensitive files in Git history:</li>" >> "${REPORT_FILE}"
    echo "<div class='code'><pre>$SENSITIVE_FILES_IN_GIT</pre></div>" >> "${REPORT_FILE}"
else
    print_status "SUCCESS" "No obvious sensitive files in Git history"
    echo "<li class='success'>✅ No obvious sensitive files in Git history</li>" >> "${REPORT_FILE}"
fi

echo "</ul></div>" >> "${REPORT_FILE}"

# 7. SSL/TLS Configuration (if available)
print_status "INFO" "Checking SSL/TLS configuration..."
echo "<div class='section'><h2>7. SSL/TLS Configuration</h2>" >> "${REPORT_FILE}"

if check_command "openssl"; then
    # This would check actual SSL configuration if the app was deployed
    echo "<p>SSL/TLS checks require deployed application. Checking certificate configurations...</p>" >> "${REPORT_FILE}"
    
    # Check for certificate files in the project
    CERT_FILES=$(find . -name "*.crt" -o -name "*.pem" -o -name "*.key" 2>/dev/null | head -5 || true)
    if [ -n "$CERT_FILES" ]; then
        print_status "WARNING" "Certificate files found in project directory"
        echo "<p class='warning'>⚠️ Certificate files found - ensure they are properly secured</p>" >> "${REPORT_FILE}"
        echo "<div class='code'><pre>$CERT_FILES</pre></div>" >> "${REPORT_FILE}"
    else
        print_status "SUCCESS" "No certificate files in project directory"
        echo "<p class='success'>✅ No certificate files in project directory</p>" >> "${REPORT_FILE}"
    fi
fi

echo "</div>" >> "${REPORT_FILE}"

# 8. Source Code Security Patterns
print_status "INFO" "Scanning source code for security patterns..."
echo "<div class='section'><h2>8. Source Code Security</h2>" >> "${REPORT_FILE}"

DANGEROUS_PATTERNS=(
    "eval\("
    "innerHTML.*="
    "document.write"
    "setTimeout.*string"
    "setInterval.*string"
    "localStorage.setItem.*password"
    "sessionStorage.setItem.*token"
    "console.log.*password"
    "console.log.*secret"
    "alert.*password"
)

echo "<ul>" >> "${REPORT_FILE}"

SECURITY_ISSUES=0
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    MATCHES=$(grep -r "$pattern" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | wc -l || echo "0")
    if [ "$MATCHES" -gt 0 ]; then
        print_status "WARNING" "Found $MATCHES potential security issues with pattern: $pattern"
        echo "<li class='warning'>⚠️ Found $MATCHES matches for potentially dangerous pattern: $pattern</li>" >> "${REPORT_FILE}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + MATCHES))
    fi
done

if [ $SECURITY_ISSUES -eq 0 ]; then
    print_status "SUCCESS" "No dangerous patterns found in source code"
    echo "<li class='success'>✅ No dangerous patterns found in source code</li>" >> "${REPORT_FILE}"
fi

echo "</ul></div>" >> "${REPORT_FILE}"

# 9. Dependencies with Known Issues
print_status "INFO" "Checking for dependencies with known security issues..."
echo "<div class='section'><h2>9. Dependency Security Analysis</h2>" >> "${REPORT_FILE}"

# Check for specific packages with known issues
RISKY_PACKAGES=(
    "lodash@<4.17.21"
    "moment@<2.29.0"
    "minimist@<1.2.6"
    "axios@<0.21.2"
    "jquery@<3.5.0"
)

echo "<table><tr><th>Package</th><th>Status</th><th>Recommendation</th></tr>" >> "${REPORT_FILE}"

for package in "${RISKY_PACKAGES[@]}"; do
    PACKAGE_NAME=${package%@*}
    if npm list "$PACKAGE_NAME" > /dev/null 2>&1; then
        INSTALLED_VERSION=$(npm list "$PACKAGE_NAME" 2>/dev/null | grep "$PACKAGE_NAME" | head -1 || echo "unknown")
        print_status "INFO" "Checking $PACKAGE_NAME: $INSTALLED_VERSION"
        echo "<tr><td>$PACKAGE_NAME</td><td>Installed: $INSTALLED_VERSION</td><td>Please verify version meets security requirements</td></tr>" >> "${REPORT_FILE}"
    fi
done

echo "</table></div>" >> "${REPORT_FILE}"

# 10. Build Security
print_status "INFO" "Checking build security configuration..."
echo "<div class='section'><h2>10. Build Security</h2>" >> "${REPORT_FILE}"

echo "<ul>" >> "${REPORT_FILE}"

# Check for source maps in production build
if [ -d "dist" ]; then
    SOURCE_MAPS=$(find dist -name "*.map" 2>/dev/null | wc -l || echo "0")
    if [ "$SOURCE_MAPS" -gt 0 ]; then
        print_status "WARNING" "Source maps found in dist directory ($SOURCE_MAPS files)"
        echo "<li class='warning'>⚠️ Source maps found in dist directory ($SOURCE_MAPS files) - consider removing for production</li>" >> "${REPORT_FILE}"
    else
        print_status "SUCCESS" "No source maps in dist directory"
        echo "<li class='success'>✅ No source maps in dist directory</li>" >> "${REPORT_FILE}"
    fi
fi

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    if grep -q '"strict": true' tsconfig.json; then
        print_status "SUCCESS" "TypeScript strict mode enabled"
        echo "<li class='success'>✅ TypeScript strict mode enabled</li>" >> "${REPORT_FILE}"
    else
        print_status "WARNING" "TypeScript strict mode not enabled"
        echo "<li class='warning'>⚠️ Consider enabling TypeScript strict mode</li>" >> "${REPORT_FILE}"
    fi
fi

echo "</ul></div>" >> "${REPORT_FILE}"

# Generate Summary
echo "<div class='section'><h2>📊 Security Audit Summary</h2>" >> "${REPORT_FILE}"

TOTAL_CHECKS=10
WARNINGS=$(grep -c "WARNING" "${AUDIT_DIR}/security-report.html" || echo "0")
ERRORS=$(grep -c "ERROR" "${AUDIT_DIR}/security-report.html" || echo "0")
SUCCESS=$(grep -c "SUCCESS" "${AUDIT_DIR}/security-report.html" || echo "0")

echo "<table>" >> "${REPORT_FILE}"
echo "<tr><td><strong>Total Security Checks</strong></td><td>$TOTAL_CHECKS</td></tr>" >> "${REPORT_FILE}"
echo "<tr><td><strong>Successful Checks</strong></td><td class='success'>$SUCCESS</td></tr>" >> "${REPORT_FILE}"
echo "<tr><td><strong>Warnings</strong></td><td class='warning'>$WARNINGS</td></tr>" >> "${REPORT_FILE}"
echo "<tr><td><strong>Errors</strong></td><td class='error'>$ERRORS</td></tr>" >> "${REPORT_FILE}"
echo "</table>" >> "${REPORT_FILE}"

# Security Score Calculation
SECURITY_SCORE=$(( (SUCCESS * 100) / (SUCCESS + WARNINGS + ERRORS) ))
echo "<h3>🔐 Security Score: ${SECURITY_SCORE}%</h3>" >> "${REPORT_FILE}"

if [ $SECURITY_SCORE -ge 90 ]; then
    echo "<p class='success'>✅ Excellent security posture!</p>" >> "${REPORT_FILE}"
    print_status "SUCCESS" "Security audit completed - Excellent security posture! (Score: ${SECURITY_SCORE}%)"
elif [ $SECURITY_SCORE -ge 75 ]; then
    echo "<p class='warning'>⚠️ Good security posture with room for improvement.</p>" >> "${REPORT_FILE}"
    print_status "WARNING" "Security audit completed - Good security posture (Score: ${SECURITY_SCORE}%)"
else
    echo "<p class='error'>❌ Security improvements needed urgently.</p>" >> "${REPORT_FILE}"
    print_status "ERROR" "Security audit completed - Improvements needed (Score: ${SECURITY_SCORE}%)"
fi

echo "</div>" >> "${REPORT_FILE}"

# Close HTML report
cat >> "${REPORT_FILE}" << EOF
    <div class="section">
        <h2>📋 Recommendations</h2>
        <ol>
            <li>Address all HIGH and CRITICAL vulnerabilities immediately</li>
            <li>Implement missing security headers</li>
            <li>Review and secure environment variable handling</li>
            <li>Enable TypeScript strict mode if not already enabled</li>
            <li>Regular security audits (weekly for production environments)</li>
            <li>Implement Content Security Policy (CSP)</li>
            <li>Use HTTPS in all environments</li>
            <li>Regular dependency updates and security patches</li>
        </ol>
    </div>
    <hr>
    <p><em>Report generated by ALLRENTZ Enterprise Security Audit Script - ${AUDIT_DATE}</em></p>
</body>
</html>
EOF

print_status "SUCCESS" "Security audit completed!"
print_status "INFO" "Report available at: ${REPORT_FILE}"
print_status "INFO" "Full audit data in: ${AUDIT_DIR}/"

# Open report if possible
if command -v open &> /dev/null; then
    open "${REPORT_FILE}"
elif command -v xdg-open &> /dev/null; then
    xdg-open "${REPORT_FILE}"
fi

exit 0