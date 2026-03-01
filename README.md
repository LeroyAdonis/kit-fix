# Jersey Repair Service Platform

## Project Overview
This is a Jersey Repair Service web application designed to provide customized repair services for jerseys, ensuring they look as good as new. It allows users to submit requests for repairs and track their order status.

## Features
- User registration and login
- Create and edit repair requests
- Track order status and history
- Payment integration
- User reviews and ratings

## Tech Stack
- **Frontend:** React.js, CSS, HTML
- **Backend:** Node.js, Express
- **Database:** Firebase
- **Authentication:** Firebase Authentication

## Application Pages Breakdown
- **Home Page:** Overview and introduction
- **Repair Request Page:** Form to submit repair requests
- **Order Tracking Page:** View status of current repairs
- **Profile Page:** User details and order history

## Repair Service Tiers with Pricing
- **Basic Repair:** $15
- **Standard Repair:** $25
- **Premium Repair:** $40

## Delivery/Pickup Workflows
1. **User submits a repair request.**  
2. **System confirms and schedules pickup/delivery.**  
3. **User can track the status through the application.**

## Firebase Data Structure
- **Users**  
  - userId  
    - name  
    - email  
    - repairRequests  

- **RepairRequests**  
  - requestId  
    - userId  
    - repairType  
    - status  
    - price  

## Design Features
- Intuitive user interface with easy navigation  
- Responsive design for mobile and desktop users

## Installation Instructions
1. Clone the repository: `git clone https://github.com/LeroyAdonis/kit-fix.git`
2. Navigate to the project directory: `cd kit-fix`
3. Install dependencies: `npm install`
4. Start the application: `npm start`

## Environment Variables
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`

## Project Structure
- **src/**: Contains all source files
- **public/**: Contains public static files
- **components/**: React components
- **services/**: API services