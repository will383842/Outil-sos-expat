#!/bin/bash

# SOS Expat - Dependency Management Commands
# Date: 2026-02-14

echo "================================"
echo "SOS Expat Dependency Commands"
echo "================================"

# Quick Status Check
check_status() {
    echo ""
    echo "=== DEPENDENCY STATUS ==="
    echo ""
    echo "Frontend outdated:"
    cd sos && npm outdated 2>&1 | wc -l
    cd ..
    echo ""
    echo "Backend outdated:"
    cd sos/firebase/functions && npm outdated 2>&1 | wc -l
    cd ../../..
}

# Security Audit
security_audit() {
    echo ""
    echo "=== SECURITY AUDIT ==="
    echo ""
    echo "Frontend:"
    cd sos && npm audit --audit-level=moderate
    cd ..
    echo ""
    echo "Backend:"
    cd sos/firebase/functions && npm audit --audit-level=moderate
    cd ../../..
}

# Check critical packages
check_critical() {
    echo ""
    echo "=== CRITICAL PACKAGES ==="
    echo ""
    echo "Firebase ecosystem:"
    cd sos && npm list firebase firebase-admin firebase-functions 2>&1 | head -10
    cd ..
    echo ""
    echo "Stripe ecosystem:"
    cd sos && npm list stripe @stripe/stripe-js @stripe/react-stripe-js 2>&1 | head -10
    cd ..
}

# Build verification
verify_build() {
    echo ""
    echo "=== BUILD VERIFICATION ==="
    cd sos
    echo "TypeScript check..."
    npm run typecheck
    echo "Build..."
    npm run build
    cd ..
}

# Run tests
run_tests() {
    echo ""
    echo "=== RUNNING TESTS ==="
    cd sos
    npm run test:run
    cd ..
}

# Update Sentry patches (SAFE)
update_sentry() {
    echo ""
    echo "=== UPDATING SENTRY (SAFE) ==="
    cd sos
    npm update @sentry/react @sentry/node
    npm update zod
    npm run build
    npm run test:run
    cd ..
}

# Update Firebase minor (SAFE)
update_firebase_minor() {
    echo ""
    echo "=== UPDATING FIREBASE MINOR (SAFE) ==="
    cd sos
    npm update firebase
    npm run test:e2e
    cd ..
}

# Update phone validation (SAFE)
update_phone() {
    echo ""
    echo "=== UPDATING PHONE VALIDATION (SAFE) ==="
    cd sos
    npm update libphonenumber-js
    npm run test:run
    cd ..
}

# Update UI components (SAFE)
update_ui() {
    echo ""
    echo "=== UPDATING UI COMPONENTS (SAFE) ==="
    cd sos
    npm update @mui/material puppeteer recharts
    npm run build
    cd ..
}

# Show outdated packages grouped by risk
show_risk_levels() {
    echo ""
    echo "=== PACKAGES BY RISK LEVEL ==="
    echo ""
    echo "FROZEN (Do not update):"
    echo "  - stripe@14.25.0"
    echo "  - @stripe/stripe-js@7.9.0"
    echo "  - @stripe/react-stripe-js@3.10.0"
    echo "  - twilio@4.23.0"
    echo ""
    echo "HIGH PRIORITY (Update this week):"
    echo "  - @sentry/react"
    echo "  - @sentry/node"
    echo ""
    echo "RECOMMENDED (Update February):"
    echo "  - firebase"
    echo "  - libphonenumber-js"
    echo "  - @mui/material"
    echo "  - puppeteer"
}

# Menu
show_menu() {
    echo ""
    echo "Select an action:"
    echo "1. Check dependency status"
    echo "2. Run security audit"
    echo "3. Check critical packages"
    echo "4. Verify build"
    echo "5. Run tests"
    echo "6. Update Sentry (SAFE)"
    echo "7. Update Firebase minor (SAFE)"
    echo "8. Update phone validation (SAFE)"
    echo "9. Update UI components (SAFE)"
    echo "10. Show packages by risk level"
    echo "11. Exit"
    echo ""
}

# Main
if [ "$1" == "" ]; then
    show_menu
    read -p "Enter choice [1-11]: " choice
    case $choice in
        1) check_status ;;
        2) security_audit ;;
        3) check_critical ;;
        4) verify_build ;;
        5) run_tests ;;
        6) update_sentry ;;
        7) update_firebase_minor ;;
        8) update_phone ;;
        9) update_ui ;;
        10) show_risk_levels ;;
        11) exit 0 ;;
        *) echo "Invalid choice" ;;
    esac
else
    case $1 in
        status) check_status ;;
        audit) security_audit ;;
        critical) check_critical ;;
        build) verify_build ;;
        test) run_tests ;;
        sentry) update_sentry ;;
        firebase) update_firebase_minor ;;
        phone) update_phone ;;
        ui) update_ui ;;
        risks) show_risk_levels ;;
        *) echo "Usage: $0 [status|audit|critical|build|test|sentry|firebase|phone|ui|risks]" ;;
    esac
fi
