# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with custom ALLRENTZ brand colors
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6

### Core Application Structure

**ALLRENTZ** is a compliance-first industrial equipment rental marketplace with multi-role authentication and AI-powered matching.

#### Key Architectural Patterns

1. **Multi-Role Authentication System**
   - Role-based access control: `customer`, `vendor`, `admin`, `manager`
   - Demo mode functionality for both customer and vendor roles
   - Supabase auth with profile management in `src/contexts/AuthContext.tsx`

2. **Page-Based Router Architecture**
   - All main pages in `src/pages/` with clear separation by user role
   - Main routes: Landing, Browse, Dashboards (Customer/Vendor), Onboarding flows
   - Each page is self-contained with its own components and logic

3. **Smart Component Organization**
   - `src/components/` - Shared/reusable components
   - `src/components/ui/` - shadcn/ui primitives (auto-generated, don't edit directly)
   - Component naming follows descriptive patterns (e.g., `SmartMatchInterface`, `EquipmentVerificationSystem`)

4. **Service Layer Architecture**
   - `src/services/` contains business logic services
   - `smartMatchEngine.ts` - AI-powered vendor matching with demo data fallbacks
   - `equipment.ts` - Equipment catalog and filtering logic
   - Services handle both authenticated and demo user flows

#### Critical Business Logic

**SmartMatch Engine** (`src/services/smartMatchEngine.ts`):
- Processes equipment rental requests with AI-powered vendor matching
- Handles compliance scoring, performance ratings, and proximity matching
- Supports both real authenticated users and demo mode
- Mock data system simulates realistic vendor responses and availability

**Authentication Flow**:
- Demo accounts: `demo.customer@allrentz.com` and `demo.vendor@allrentz.com` (password: `demo123456`)
- Role-based routing after login directs users to appropriate dashboards
- Profile completion tracking and onboarding flows

**Equipment Categories**:
- Steam Boilers, Frac Tanks, Safety Equipment, Pressure Vessels, Heavy Machinery, Power Generation
- Each with compliance requirements (TWIC, HAZMAT, API certifications)
- Geographic filtering and real-time availability tracking

### Supabase Integration

- Client configuration in `src/integrations/supabase/client.ts`
- Database tables: `profiles`, `smart_match_requests`, equipment inventory
- Real-time subscriptions for live vendor notifications
- Auth state management with automatic profile fetching

### Styling System

- Custom Tailwind config with ALLRENTZ brand colors:
  - `allrentz-red` (#DC2626), `allrentz-gray` (#374151)
  - Industrial design theme with consistent component styling
- CSS custom properties for theming in `src/index.css`
- Responsive design patterns for industrial/mobile usage

### Key Development Patterns

1. **Always check user authentication state** before accessing role-specific features
2. **Demo mode support** - Most features should work without authentication using mock data
3. **Compliance-first design** - All vendor/equipment data includes safety certifications
4. **Mobile-responsive** - Industrial workers often use mobile devices in the field
5. **Error handling** - Graceful fallbacks to demo mode when Supabase operations fail

### File Organization Conventions

- Pages handle routing and layout, delegate business logic to components
- Components should be functional and handle their own state
- Services provide data and business logic, abstract away backend details
- Types and interfaces defined inline or in service files where used

### Demo Data Strategy

Most components support demo mode with realistic industrial equipment data. When building new features:
- Always provide mock data for unauthenticated users
- Use realistic industrial terminology and pricing
- Include compliance/certification information in mock data
- Simulate network delays for realistic user experience

## Environment Setup & Configuration

### Required Environment Variables
No `.env` file is required - Supabase configuration is handled directly in `src/integrations/supabase/client.ts` with public keys.

### Demo Mode Authentication
- **Customer Demo**: `demo.customer@allrentz.com` / `demo123456`
- **Vendor Demo**: `demo.vendor@allrentz.com` / `demo123456`
- Demo accounts auto-create if they don't exist
- Always test features in both authenticated and demo modes

### Auth Troubleshooting
1. If Supabase auth fails, components should gracefully fall back to demo mode
2. Check `AuthContext.tsx` for authentication state management
3. Profile loading happens asynchronously - handle loading states
4. Demo tour triggers automatically after demo login

## Development Guardrails & Rules

### NEVER Edit These Files
- `src/components/ui/*` - Auto-generated shadcn/ui components
- `src/integrations/supabase/types.ts` - Auto-generated database types
- Files marked with "// This file is automatically generated. Do not edit it directly."

### Code Quality Requirements
- **TypeScript**: All new code must be properly typed, no `any` types
- **ESLint**: Must pass `npm run lint` without errors before commits
- **Performance**: Use React.memo for expensive components, lazy loading for routes
- **Accessibility**: All interactive elements need proper ARIA labels and keyboard navigation

### Component Architecture Rules
1. **Pure Components**: Components should not directly call external services
2. **Service Layer**: Business logic belongs in `src/services/`
3. **Error Boundaries**: Wrap risky operations in try/catch with user-friendly fallbacks
4. **Loading States**: Every async operation needs loading UI

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (`SmartMatchInterface.tsx`)
- **Pages**: PascalCase (`CustomerDashboard.tsx`)
- **Services**: camelCase (`smartMatchEngine.ts`)
- **Utilities**: camelCase (`dateHelpers.ts`)

### React Components
- **Functional components only** - no class components
- **Props interfaces**: `ComponentNameProps` (e.g., `SmartMatchFormProps`)
- **Event handlers**: `handleActionName` (e.g., `handleSubmitRequest`)
- **State variables**: descriptive names (`isLoading`, `matchResults`, `selectedEquipment`)

### CSS Classes
- **Tailwind only** - no custom CSS unless absolutely necessary
- **Component variants**: Use `class-variance-authority` patterns
- **Brand colors**: Use `allrentz-red`, `allrentz-gray` variants
- **Industrial theme**: Consistent with existing heavy machinery aesthetic

## File Organization Rules

### Where New Things Go

**New Pages**: `src/pages/`
- Must include in `src/App.tsx` routing
- Follow existing naming pattern (`SomethingManagement.tsx`)

**New Components**: `src/components/`
- Shared/reusable components only
- Page-specific components can stay in pages

**New Business Logic**: `src/services/`
- Always include demo mode fallbacks
- Export both service class and instance

**New Types**: Define inline or in service files
- Don't create separate `types` directory unless absolutely necessary

**New Utilities**: `src/lib/`
- Pure functions only
- Include JSDoc comments

### Component Structure Template
```tsx
// Required imports
// Props interface
// Main component function with:
//   - State management
//   - Event handlers  
//   - Effect hooks
//   - Render JSX
// Export default
```

## Testing Expectations

### Manual Testing Checklist
1. **Demo Mode**: Every feature must work without authentication
2. **Role Switching**: Test customer vs vendor vs admin views
3. **Mobile Responsive**: Test on mobile viewport (field workers use phones)
4. **Error States**: Test network failures, invalid inputs
5. **Loading States**: Test slow connections

### Performance Requirements
- **First Contentful Paint**: < 2 seconds
- **Bundle Size**: Monitor with `npm run build`
- **Memory Usage**: No memory leaks in component unmounting
- **Network Requests**: Minimize API calls, use React Query caching

### Accessibility Standards
- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Readers**: Proper semantic HTML and ARIA labels
- **Color Contrast**: Must meet WCAG AA standards
- **Focus Management**: Visible focus indicators

## Industrial Equipment Domain Knowledge

### Equipment Categories & Compliance
- **Steam Boilers**: ASME certified, pressure vessel inspections
- **Frac Tanks**: Environmental containment, hazmat handling
- **Safety Equipment**: OSHA compliance, confined space gear
- **Heavy Machinery**: Operator certifications, lifting equipment inspections

### Required Certifications
- **TWIC**: Transportation Worker Identification Credential
- **HAZMAT**: Hazardous materials handling
- **ISNET**: Industrial Safety Network
- **API Standards**: American Petroleum Institute certifications
- **PEC SafeLand**: Petrochemical safety training

### Geographic Context
- **Primary Markets**: Houston, Beaumont, Port Arthur, Corpus Christi, Galveston
- **Industrial Clusters**: Gulf Coast refineries, petrochemical complexes
- **Delivery Constraints**: Site access, security clearances, timing windows

## Brand Context

ALLRENTZ targets industrial operations (refineries, terminals, petrochemicals) where equipment downtime is extremely costly. The platform emphasizes:
- Speed (minutes not days for equipment sourcing)
- Compliance (all vendors pre-verified for safety requirements)  
- Real-time tracking (GPS, geofencing, digital documentation)
- Industry expertise (built by someone with field experience)
## ALLRENTZ Enterprise Guardrail – Memory

**Mission**  
Build ALLRENTZ as a world-class industrial equipment rental platform matching or exceeding United Rentals, DOZR, and Amazon in speed, scale, and reliability.

**Core Goals**  
- Initial JS bundle **<400 KB** (phase 1) → **<300 KB** (phase 2)  
- **WCAG AA** compliance, **0 critical axe violations**  
- **Zero runtime crashes** (auth/network) with robust skeleton-loading UX  
- Real-time vendor–customer **SmartMatch** engine with compliance tagging  
- Predictive analytics & utilization dashboards with **zero-trust security**  
- API-driven compliance engine with automated **OSHA/EPA** updates  
- **Observability & Live Ops**: OpenTelemetry tracing, real-time alerting, feature-flag canary deploys  
- **Data portability**: export APIs, retention & deletion policies  
- **SOC 2 / ISO 27001** roadmap; vendor security questionnaires & privacy impact assessments  
- **Customer-centric ops**: 24/7 support SLAs, in-app feedback & NPS tracking  
- **Documentation culture**: Architecture Decision Records (ADRs), auto-generated API docs  
- **FinOps guardrails**: budget alerts, per-customer cost tracking  
- **Internationalization ready**: i18n framework, currency/unit abstraction  
- **Ethical AI & Data Governance**: bias audits, opt-in/out for data use, human-in-loop compliance checks  

**Mindset – Expert Blend**  
- Executive founders mindset for long-horizon vision, operational rigor, scaling strategy, security & governance  
- Claude Code core team mindset for developer-first UX and product craftsmanship  
- Industrial domain experts: **equipment rental, turnaround, and compliance specialists** (start USA/North America, global-ready)

**Implementation Workflow**  
1. **Plan first**: produce detailed plan & to-do list.  
2. **Small PRs**: each diff limited & reviewable.  
3. **Tests**: add/adjust unit & integration tests.  
4. **Accessibility**: alt text, aria, focus states, skip links, contrast checks.  
5. **Metrics**: report perf deltas (bundle split, Web Vitals) and rollback path.

**Stack & Rules**  
- React + TypeScript + Vite  
- shadcn/ui + Tailwind  
- Supabase + TanStack Query  
- **No** low-code, no auto-scaffold tools.  
- Always: plan → small PRs → tests → a11y checks → metrics.
## Risk & Scope Guardrails

- MVP Focus: US-only English; defer full i18n and SOC 2 to Phase 3.
- Data Moat: Phase 1 capture logs → Phase 2 ETL & warehouse for utilization analytics.
- Security & Privacy: Zero-trust, encryption, quarterly pen tests, anonymized analytics.
- Compliance Agility: Modular OSHA/EPA API, quarterly legal reviews.
- Data Quality & Bias: Validation pipelines, multi-vendor input, bias checks.
- Cost & Scale: Cloud auto-scaling, FinOps dashboards, alerting for >20% cost spikes.
- Low-Code Policy: No production-critical low-code; Supabase Studio permitted for internal tooling.
## Risk & Scope Guardrails

- MVP Focus: US-only English; defer full i18n and SOC 2 to Phase 3.
- Data Moat: Phase 1 capture logs → Phase 2 ETL & warehouse for utilization analytics.
- Security & Privacy: Zero-trust, encryption, quarterly pen tests, anonymized analytics.
- Compliance Agility: Modular OSHA/EPA API, quarterly legal reviews.
- Data Quality & Bias: Validation pipelines, multi-vendor input, bias checks.
- Cost & Scale: Cloud auto-scaling, FinOps dashboards, alerting for >20% cost spikes.
- Low-Code Policy: No production-critical low-code; Supabase Studio permitted for internal tooling.

## Refinements for Bulletproof Guardrail

### Phase Priorities (Refinery-Focused)
- **Phase 1 – Refinery MVP**
  - Compliance tagging for critical refinery equipment (e.g., gas detectors, fresh-air systems).
  - Initial JS bundle target: < 418 KB (≈50 % of original audit size).
- **Phase 2 – Data Depth**
  - ETL pipelines for cross-site data silos.
  - 99 % accuracy goal via automated audits and anomaly detection.
- **Phase 3 – Data Moat**
  - Anonymized insights marketplace for utilization benchmarks and predictive analytics.

### Deeper Risk Mitigations
- **Privacy & Security:** Zero-trust architecture *per data type* (row-level security, encryption at rest/in-transit, quarterly penetration tests).
- **Regulatory Volatility:** Modular compliance APIs for rapid OSHA/EPA rule updates and quarterly legal reviews.

### Moats to Defend and Grow
- **Data Network Flywheel:** Shared utilization data targets 15–20 % efficiency gains across vendors.
- **Proprietary Compliance Scoring:** 99 % accuracy through audited algorithms and continuous bias checks.

### AI & Human-in-Loop Guardrails
- AI must always operate with a **human-in-loop** for compliance decisions.
- Quarterly **bias audits** for SmartMatch and predictive-analytics models.

### Customer Validation & Business Impact
- **Motiva Validation:** Automate servicing/billing workflows projected to save \$20–30 K per turnaround.

### Extra Safeguards & Deep Refinery Focus

**Scalability & Cost Controls**
- Build ETL pipelines with auto-scaling (Supabase + AWS S3) and set **monthly spend alerts** to prevent 20–30 % cloud-bill spikes.
- Add a **performance budget** (≤ 300 ms query latency) enforced in CI to catch data-volume surges early.
- Require **pilot testing with two refinery partners** and periodic manual data sampling to keep predictive analytics at ~99 % accuracy.

**Refinery-Specific Enhancements**
- Tag and monitor **critical equipment** (H₂S sensors, fresh-air systems, detector-calibration logs) with automated compliance alerts.
- Provide **manual-override options** for edge cases where automation can’t guarantee accuracy or safety.

**Continuous Validation & Bias Checks**
- Run **quarterly bias audits** on vendor-submitted data; publish anonymized results to maintain trust and avoid skew toward large vendors.
- Conduct **Phase-1/2 pilot programs** (e.g., Motiva) to validate real-world cost savings and predictive-maintenance goals.

## Continuous Improvement & Customer-First Culture

- **Customer-First Mandate**  
  Every decision, feature, and deployment must be evaluated by its impact on end users and vendors.  
  - Prioritize usability and reliability over experimental features.
  - Collect and act on user feedback after every major release.

- **Iterative Growth Loop**  
  1. Plan → Build → Measure → Learn cycle for every feature.
  2. Quarterly “Voice of Customer” sessions with key refinery/terminal partners.
  3. Bi-weekly review of analytics (engagement, performance, a11y) to guide next sprint.

- **Team & Developer Excellence**  
  - Encourage pull requests that include a “what we learned” note.  
  - Share post-mortems openly; focus on improvement, not blame.  
  - Require mentorship: every new contributor pairs with a senior dev for their first 3 PRs.

- **Innovation & Experimentation**  
  - Reserve 10–15 % of sprint capacity for experiments or user-requested refinements.  
  - Track experiment outcomes in `/docs/experiments.md` to capture lessons learned.

- **Quality & Growth Metrics**  
  - Target: NPS ≥ 70 and >99.9 % uptime SLA.  
  - Track customer support response times and defect escape rate.  
  - Continuous a11y audits and performance budgets enforced in CI.

## Enterprise Security Framework

### Zero-Trust Architecture Implementation
- **Identity Verification**: Multi-factor authentication (MFA) mandatory for all users
- **Device Trust**: Hardware security keys required for admin access
- **Network Segmentation**: Micro-segmentation for equipment data access
- **Continuous Verification**: Session validation every 15 minutes for sensitive operations
- **Principle of Least Privilege**: Role-based access with just-in-time permissions

### SAML/SSO Integration Requirements
- **Enterprise Identity Providers**: Support for Okta, Azure AD, AWS SSO
- **SAML 2.0 Compliance**: Full SAML assertion validation and encryption
- **Just-In-Time Provisioning**: Automated user provisioning from corporate directories
- **Session Management**: Single logout across all integrated systems
- **Audit Integration**: All SSO events logged for compliance reporting

### Data Encryption Standards (AES-256)
- **Encryption at Rest**: AES-256 encryption for all databases and file storage
- **Encryption in Transit**: TLS 1.3 minimum for all API communications
- **Key Management**: Hardware Security Module (HSM) for key lifecycle management
- **Field-Level Encryption**: PII and equipment specifications encrypted at field level
- **Key Rotation**: Automated key rotation every 90 days with zero downtime

### Threat Detection and Incident Response
- **SIEM Integration**: Real-time security event monitoring and correlation
- **Anomaly Detection**: Machine learning-based detection of unusual access patterns
- **Automated Response**: Immediate account lockdown for high-risk activities
- **Incident Playbooks**: Documented response procedures for each threat category
- **24/7 SOC**: Security operations center monitoring for critical infrastructure

### Compliance Audit Requirements (SOC 2, ISO 27001)
- **SOC 2 Type II**: Annual third-party audit for security, availability, and confidentiality
- **ISO 27001**: Information security management system certification
- **Continuous Monitoring**: Real-time compliance monitoring with automated reporting
- **Evidence Collection**: Automated collection of audit evidence for all controls
- **Gap Analysis**: Quarterly compliance gap assessments with remediation tracking

## Industrial Compliance Engine

### OSHA PSM Automation Requirements
- **Process Safety Information**: Automated tracking of equipment specifications and safety data
- **Process Hazard Analysis**: Integration with PHA workflows and recommendation tracking
- **Operating Procedures**: Digital procedures with version control and change management
- **Training Records**: Automated tracking of safety training requirements and certifications
- **Incident Investigation**: Structured incident reporting with root cause analysis workflows
- **Emergency Planning**: Integration with facility emergency response plans
- **Compliance Auditing**: Automated PSM audit checklists with evidence collection

### EPA Environmental Reporting Integration
- **Emissions Tracking**: Automated collection of equipment emissions data
- **Waste Management**: Digital waste stream tracking and reporting
- **Permit Compliance**: Automated monitoring of permit conditions and deadlines
- **TRI Reporting**: Toxic Release Inventory automated data collection and submission
- **SPCC Plans**: Spill Prevention Control and Countermeasure plan integration
- **RCRA Compliance**: Hazardous waste generator compliance tracking
- **Air Quality Monitoring**: Real-time air quality data integration and reporting

### API/ASME Certification Tracking
- **Certificate Management**: Digital certificate storage with expiration tracking
- **Inspection Scheduling**: Automated scheduling based on regulatory requirements
- **Vendor Qualification**: Automated verification of contractor certifications
- **Equipment Genealogy**: Complete equipment lifecycle and certification history
- **Non-Conformance Tracking**: Digital tracking of equipment discrepancies
- **Code Compliance**: Automated verification against current API/ASME standards
- **Third-Party Integration**: Direct integration with certification body databases

### Hazmat Handling Compliance Validation
- **DOT Classification**: Automated hazardous material classification and labeling
- **Transportation Compliance**: Integration with DOT transportation requirements
- **Storage Requirements**: Automated validation of storage compatibility and requirements
- **Employee Training**: HAZMAT training tracking and certification management
- **Emergency Response**: Integration with hazmat emergency response procedures
- **Manifest Tracking**: Digital hazardous waste manifest generation and tracking
- **Regulatory Updates**: Automated notification of hazmat regulation changes

### Emergency Response Coordination Protocols
- **Incident Classification**: Automated incident severity assessment and escalation
- **Response Team Notification**: Instant notification to appropriate response teams
- **Resource Deployment**: Automated dispatch of emergency equipment and personnel
- **Communication Protocols**: Multi-channel emergency communication systems
- **Mutual Aid Integration**: Connection with mutual aid networks and response organizations
- **Post-Incident Analysis**: Structured post-incident review and improvement processes
- **Business Continuity**: Integration with business continuity and disaster recovery plans

## Quality Assurance Standards

### Minimum 90% Test Coverage Requirement
- **Unit Testing**: 95% coverage for business logic and utility functions
- **Integration Testing**: 90% coverage for API endpoints and service integrations
- **End-to-End Testing**: Complete user journey coverage for critical workflows
- **Component Testing**: React component testing with React Testing Library
- **Coverage Enforcement**: CI/CD pipeline blocks deployment below coverage thresholds
- **Coverage Reporting**: Daily coverage reports with trend analysis
- **Technical Debt Tracking**: Automated identification of untested code paths

### Automated Accessibility Testing (axe-core)
- **WCAG 2.1 AA Compliance**: Automated testing against accessibility standards
- **Screen Reader Testing**: Automated testing with popular screen reader software
- **Keyboard Navigation**: Comprehensive keyboard accessibility validation
- **Color Contrast**: Automated color contrast ratio validation
- **Focus Management**: Automated focus trap and focus order testing
- **Accessibility Reporting**: Daily accessibility violation reports with prioritization
- **Remediation Tracking**: Automated tracking of accessibility issue resolution

### Load Testing for 10K+ Concurrent Users
- **Performance Baselines**: Established performance benchmarks for all critical paths
- **Scalability Testing**: Automated testing for user load scalability
- **Stress Testing**: System breaking point identification and monitoring
- **Resource Utilization**: CPU, memory, and database performance under load
- **Geographic Distribution**: Load testing from multiple global regions
- **Peak Load Simulation**: Simulation of peak equipment rental demand periods
- **Performance Regression**: Automated detection of performance degradation

### Security Testing with OWASP Standards
- **OWASP Top 10**: Automated testing for all OWASP vulnerability categories
- **Static Application Security Testing (SAST)**: Source code vulnerability scanning
- **Dynamic Application Security Testing (DAST)**: Runtime vulnerability testing
- **Interactive Application Security Testing (IAST)**: Real-time vulnerability detection
- **Dependency Scanning**: Third-party library vulnerability monitoring
- **Penetration Testing**: Quarterly third-party penetration testing
- **Security Code Review**: Mandatory security review for all code changes

### Performance Budgets (<300ms API Response)
- **API Response Time**: 95th percentile response time under 300ms
- **Database Query Performance**: Individual query execution under 100ms
- **Third-Party Integration**: External API calls optimized with circuit breakers
- **CDN Performance**: Static asset delivery optimized globally
- **Real User Monitoring**: Continuous monitoring of actual user performance
- **Performance Alerting**: Automated alerts for performance degradation
- **Optimization Tracking**: Continuous performance improvement measurement

## DevOps & Deployment Pipeline

### GitOps Workflow with Automated Testing
- **Infrastructure as Code**: All infrastructure defined in version-controlled repositories
- **Automated Testing Gates**: Comprehensive testing required before deployment
- **Code Review Requirements**: Mandatory peer review for all production changes
- **Security Scanning**: Automated security vulnerability scanning in CI/CD
- **Compliance Validation**: Automated compliance checks before deployment
- **Rollback Automation**: One-click rollback for failed deployments
- **Deployment Approvals**: Multi-stage approval process for production deployments

### Blue-Green Deployment Strategy
- **Zero-Downtime Deployments**: Seamless switching between blue and green environments
- **Health Check Validation**: Comprehensive health checks before traffic switching
- **Database Migration Strategy**: Safe database migration with rollback capabilities
- **Load Balancer Integration**: Automated traffic switching through load balancers
- **Monitoring Integration**: Real-time monitoring during deployment switches
- **Canary Releases**: Gradual traffic shifting for risk mitigation
- **Automated Rollback**: Automatic rollback on health check failures

### Infrastructure Monitoring (Prometheus/Grafana)
- **System Metrics**: CPU, memory, disk, and network monitoring
- **Application Metrics**: Custom business metrics and performance indicators
- **Database Monitoring**: Query performance, connection pooling, and replication lag
- **Security Monitoring**: Real-time security event monitoring and alerting
- **Cost Monitoring**: Cloud resource utilization and cost optimization
- **SLA Monitoring**: Service level agreement compliance tracking
- **Predictive Alerting**: Machine learning-based anomaly detection and alerting

### Automated Rollback Capabilities
- **Health Check Failures**: Automatic rollback on failed health checks
- **Performance Degradation**: Rollback triggers based on performance thresholds
- **Error Rate Increases**: Automated rollback on elevated error rates
- **Database Rollback**: Safe database rollback procedures and automation
- **Configuration Rollback**: Automated configuration rollback capabilities
- **Multi-Service Rollback**: Coordinated rollback across dependent services
- **Rollback Testing**: Regular testing of rollback procedures and automation

### Multi-Region Deployment Requirements
- **Geographic Distribution**: Deployment across multiple AWS/Azure regions
- **Data Replication**: Cross-region database replication with consistency guarantees
- **CDN Integration**: Global content delivery network for static assets
- **DNS Failover**: Automated DNS failover for regional outages
- **Regional Compliance**: Data residency compliance for different regions
- **Disaster Recovery**: Cross-region disaster recovery and business continuity
- **Performance Optimization**: Region-specific performance optimization

## Customer Experience Standards

### NPS Target ≥70 for Enterprise Accounts
- **Quarterly NPS Surveys**: Systematic Net Promoter Score measurement
- **Customer Success Management**: Dedicated success managers for enterprise accounts
- **Feedback Loop Integration**: Direct integration of customer feedback into product roadmap
- **Issue Resolution Tracking**: Systematic tracking and resolution of customer issues
- **Proactive Outreach**: Proactive communication for potential issues and improvements
- **Customer Advisory Board**: Regular engagement with key customers for product direction
- **Success Metrics Tracking**: Customer success metrics tied to business outcomes

### <2 Second Page Load Times Globally
- **Global CDN**: Content delivery network with edge locations worldwide
- **Image Optimization**: Automated image compression and format optimization
- **Code Splitting**: Dynamic loading of JavaScript bundles
- **Lazy Loading**: Progressive loading of non-critical content
- **Caching Strategy**: Multi-layer caching for optimal performance
- **Performance Monitoring**: Real-time monitoring of page load times globally
- **Performance Budgets**: Strict performance budgets enforced in CI/CD

### 99.9% Uptime SLA Commitment
- **Service Level Agreements**: Formal SLA commitments with penalties
- **High Availability Architecture**: Redundant systems and failover capabilities
- **Monitoring and Alerting**: 24/7 monitoring with immediate incident response
- **Incident Response**: Structured incident response with escalation procedures
- **Root Cause Analysis**: Systematic analysis and prevention of recurring issues
- **Maintenance Windows**: Scheduled maintenance with minimal customer impact
- **SLA Reporting**: Regular reporting on SLA compliance and performance

### 24/7 Support for Critical Equipment
- **Critical Equipment Classification**: Identification and prioritization of critical equipment
- **Emergency Response Team**: Dedicated team for critical equipment issues
- **Response Time Guarantees**: SLA-backed response times for critical issues
- **Escalation Procedures**: Clear escalation paths for unresolved critical issues
- **Customer Communication**: Proactive communication during critical incidents
- **Knowledge Base**: Comprehensive knowledge base for common issues
- **Support Channel Integration**: Multiple support channels (phone, email, chat, mobile app)

### Mobile-First Design for Field Operations
- **Responsive Design**: Optimal experience across all device sizes
- **Offline Functionality**: Core functionality available without internet connection
- **Touch-Optimized Interface**: Interface optimized for touch interaction
- **Field Worker Workflow**: Workflows optimized for field operations and conditions
- **Voice Interface**: Voice commands for hands-free operation
- **Barcode/QR Integration**: Equipment scanning and identification capabilities
- **GPS Integration**: Location-based services for equipment tracking and routing

## Data Governance & Privacy

### GDPR/CCPA Compliance Framework
- **Data Subject Rights**: Automated systems for data access, deletion, and portability requests
- **Consent Management**: Granular consent tracking and management systems
- **Privacy by Design**: Privacy considerations built into all system designs
- **Data Processing Agreements**: Formal agreements with all data processors
- **Privacy Impact Assessments**: Systematic assessment of privacy risks for new features
- **Data Breach Response**: Automated breach detection and notification procedures
- **Regulatory Reporting**: Automated compliance reporting to relevant authorities

### Data Retention and Deletion Policies
- **Retention Schedules**: Defined retention periods for all data categories
- **Automated Deletion**: Systematic deletion of data past retention periods
- **Legal Hold Procedures**: Preservation of data for legal and regulatory requirements
- **Data Classification**: Classification of data based on sensitivity and requirements
- **Backup Management**: Consistent retention policies applied to backup systems
- **Archive Procedures**: Long-term archival for historical and compliance purposes
- **Audit Trail**: Complete audit trail for all data retention and deletion activities

### Customer Consent Management
- **Granular Consent**: Specific consent for different data processing activities
- **Consent Tracking**: Complete history of consent changes and updates
- **Withdrawal Mechanisms**: Easy mechanisms for customers to withdraw consent
- **Minor Protection**: Special protections and consent requirements for minors
- **Third-Party Consent**: Consent management for data sharing with third parties
- **Consent Verification**: Verification and validation of consent authenticity
- **Cross-Border Consent**: Consent management for international data transfers

### Cross-Border Data Transfer Protocols
- **Transfer Impact Assessments**: Systematic assessment of international transfer risks
- **Standard Contractual Clauses**: Implementation of EU-approved transfer mechanisms
- **Adequacy Decisions**: Utilization of countries with adequacy decisions where possible
- **Data Localization**: Compliance with local data residency requirements
- **Transfer Documentation**: Comprehensive documentation of all international transfers
- **Third-Country Monitoring**: Ongoing monitoring of third-country privacy developments
- **Binding Corporate Rules**: Implementation where appropriate for multinational operations

### Audit Logging for All Customer Data Access
- **Access Logging**: Complete logging of all customer data access and modifications
- **User Attribution**: Clear attribution of all data access to specific users
- **Purpose Logging**: Documentation of the business purpose for each data access
- **Retention of Logs**: Long-term retention of audit logs for compliance requirements
- **Log Analysis**: Regular analysis of access patterns for anomaly detection
- **Compliance Reporting**: Automated generation of compliance reports from audit logs
- **Tamper Protection**: Cryptographic protection of audit logs against tampering
