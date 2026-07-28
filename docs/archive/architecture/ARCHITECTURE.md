Tradesman SaaS App
Product Architecture Blueprint
This document outlines the foundational product architecture for a modern field-service and tradesman SaaS platform
designed to compete with platforms such as ServiceTitan and Jobber while introducing modern subcontractor
networking and mobile-first workflows.
1. Core Product Areas
Admin Command Center
Company dashboard
Dispatch board
Customers
Jobs
Estimates
Invoices
Employees
Payroll
Expenses
Reports
Settings
Technician Mobile App
Today's jobs
Next location
Job details
Clock in/out
Job notes
Photos
Receipts
Mileage
Complete job
Customer Portal
View estimates
Approve estimates
View invoices
Pay invoices
Appointment status
Service history
Subcontractor Network
Company profiles
Post subcontract jobs
Browse available jobs
Submit bids/offers
Accept/decline work
Subcontractor tracking
Company messaging
Owner Master View
Revenue
Active jobs
Technician performance
Unpaid invoices
Payroll summary
Expenses
Company health metrics
2. Main User Roles
Owner
Full platform access
Admin / Dispatcher
Manage jobs, dispatch, customers, estimates, invoices
Technician
Assigned jobs, time tracking, notes, photos, receipts
Office Staff
Scheduling, billing, customer management
Subcontractor Company
View and accept subcontract work
Customer
View estimates, invoices, and appointments
3. Core App Modules
Authentication & Company System
Login/signup
Company creation
Employee invitations
Role-based permissions
Multi-company support
Customer Management
Customer profiles
Service locations
Equipment history
Notes and files
Job Management
Create job
Assign technician
Status tracking
Photos and notes
Closeout workflow
Dispatch
Calendar view
Technician schedules
Map view
Drag/drop assignment
Route planning
Estimates
Line items
Price book
Customer approvals
Convert estimate to job
Invoices & Payments
Generate invoice
Track payment status
PDF invoices
Customer payment portal
Time Clock & Payroll
Clock in/out
Overtime tracking
Approval workflow
Expenses, Receipts & Mileage
Receipt uploads
Mileage logs
Expense categories
Messaging & Notifications
Technician messages
Customer alerts
Push/email notifications
Subcontractor Network
Post jobs
Submit bids
Accept subcontractors
Reporting
Revenue reports
Technician productivity
Profitability tracking
4. Product Workflow
Primary Workflow
Customer created
Estimate created
Estimate approved
Job created
Technician assigned
Job completed
Invoice generated
Customer payment received
Subcontractor Workflow
Post subcontract job
Receive bids
Accept subcontractor
Track work completion
Update payment/reporting
5. MVP Scope
MVP Features
Company accounts
User roles
Customers
Jobs
Dispatch board
Technician dashboard
Estimates
Invoices
Time entries
Receipts
Basic subcontractor system
Future Features
AI dispatching
Advanced payroll
Accounting integrations
OCR receipt scanning
Advanced analytics
6. Recommended App Structure
Frontend Structure
/app/(admin)
/app/(technician)
/app/(customer)
/app/(network)
Shared Components
/shared/components
/shared/forms
/shared/hooks
/shared/api
/shared/utils
7. Recommended Build Order
Development Sequence
Auth + company system
Roles/permissions
Customers
Jobs
Dispatch board
Technician job view
Estimates
Invoices
Time clock
Receipts/mileage
Subcontractor network
Reports
The long-term goal of this platform is not simply to replicate existing field-service software, but to become the
operating system for modern trades companies through mobile-first workflows, subcontractor collaboration, real-time
dispatching, and scalable business management tools.