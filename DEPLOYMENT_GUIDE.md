# Real Estate App Deployment Guide

Your frontend is already deployed at: https://real-estate-alpha-sandy.vercel.app/

To make it work with the database, you need to deploy the Spring Boot backend. Here are the deployment options:

## Option 1: Deploy Backend to Railway (Recommended)

### Step 1: Prepare for Railway Deployment

1. **Create a Railway account** at https://railway.app/
2. **Install Railway CLI** (optional but helpful)

### Step 2: Deploy to Railway

1. **Connect your GitHub repository** to Railway
2. **Create a new project** and select your repository
3. **Railway will auto-detect** your Spring Boot application
4. **Set environment variables** in Railway dashboard:
   ```
   SPRING_DATASOURCE_URL=jdbc:postgresql://ep-fragrant-shadow-a1eedihz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   SPRING_DATASOURCE_USERNAME=neondb_owner
   SPRING_DATASOURCE_PASSWORD=npg_cpDYJIgwd85B
   SPRING_JPA_HIBERNATE_DDL_AUTO=update
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRATION=86400000
   ```

### Step 3: Update Vercel Environment Variables

1. Go to your **Vercel dashboard**
2. Select your **real-estate project**
3. Go to **Settings > Environment Variables**
4. Add this variable:
   ```
   VITE_API_BASE_URL=https://your-railway-app-name.up.railway.app/api
   ```
5. **Redeploy** your Vercel app

## Option 2: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to https://render.com/ and sign up
2. Connect your GitHub account

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure:
   - **Name**: real-estate-backend
   - **Environment**: Java
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/real-estate-app-0.0.1-SNAPSHOT.jar`

### Step 3: Set Environment Variables
Add these in Render dashboard:
```
SPRING_DATASOURCE_URL=jdbc:postgresql://ep-fragrant-shadow-a1eedihz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
SPRING_DATASOURCE_USERNAME=neondb_owner
SPRING_DATASOURCE_PASSWORD=npg_cpDYJIgwd85B
SPRING_JPA_HIBERNATE_DDL_AUTO=update
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=86400000
```

### Step 4: Update Vercel
Set `VITE_API_BASE_URL=https://your-render-app.onrender.com/api` in Vercel

## Option 3: Deploy Backend to Heroku

### Step 1: Install Heroku CLI
Download from https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Deploy to Heroku
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-real-estate-backend

# Set environment variables
heroku config:set SPRING_DATASOURCE_URL="jdbc:postgresql://ep-fragrant-shadow-a1eedihz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
heroku config:set SPRING_DATASOURCE_USERNAME=neondb_owner
heroku config:set SPRING_DATASOURCE_PASSWORD=npg_cpDYJIgwd85B
heroku config:set SPRING_JPA_HIBERNATE_DDL_AUTO=update
heroku config:set JWT_SECRET=your-secret-key-here

# Deploy
git push heroku main
```

### Step 3: Update Vercel
Set `VITE_API_BASE_URL=https://your-real-estate-backend.herokuapp.com/api` in Vercel

## Testing the Deployment

After deployment:

1. **Check backend health**: Visit `https://your-backend-url.com/api/properties`
2. **Test frontend**: Visit https://real-estate-alpha-sandy.vercel.app/
3. **Test authentication**: Try registering/logging in
4. **Test property features**: Browse properties, add new ones

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your backend URL is added to CORS configuration
2. **Database Connection**: Verify Neon database credentials
3. **Environment Variables**: Check all variables are set correctly
4. **Build Failures**: Ensure Java 21 is specified in deployment platform

### Backend Health Check Endpoint:
Add this to test if backend is running:
```java
@GetMapping("/health")
public ResponseEntity<String> health() {
    return ResponseEntity.ok("Backend is running!");
}
```

## Current Configuration Status:

✅ **Frontend**: Deployed on Vercel  
✅ **Database**: Neon PostgreSQL configured  
✅ **CORS**: Updated for Vercel domain  
✅ **Environment Variables**: Configured for production  
⏳ **Backend**: Needs deployment  

## Next Steps:

1. Choose a deployment platform (Railway recommended)
2. Deploy the Spring Boot backend
3. Update Vercel environment variables
4. Test the full application

Your app will be fully functional once the backend is deployed!
